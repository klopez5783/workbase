// hooks/useWorkerClockIn.js
import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext'
import { useEmployeeStore } from '../../employees/store/employeeStore';
import { firestoreService } from '../../../services/firestoreService';
import { useGeolocation } from '../../../hooks/useGeolocation';
import { calculateDistance } from '../../../shared/utils/distance';

export function useWorkerClockIn() {
  const { currentUser } = useAuth();
  const currentEmployee = useEmployeeStore((state) => state.currentEmployee);
  
  const [worker, setWorker] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [activeShift, setActiveShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [locationError, setLocationError] = useState(null);

  const { getCurrentLocation } = useGeolocation();

  // Calculate assigned projects
  const assignedProjects = worker && projects.length > 0
    ? projects.filter(project => 
        project.assignedWorkers?.includes(worker.id)
      )
    : [];

  // Load worker data
  const loadWorkerData = async () => {
    try {
      setLoading(true);

      // ✅ COMPANY CHECK - Users must have a company before loading worker data
      if (currentUser && currentEmployee && !currentEmployee.companyId) {
        setError('Please join a company before clocking in. Contact your administrator.');
        setLoading(false);
        return;
      }

      // Get user profile
      const userResult = await firestoreService.query('users', [
        { field: 'uid', operator: '==', value: currentUser.uid }
      ]);

      if (!userResult.success || userResult.data.length === 0) {
        setError('User profile not found');
        setLoading(false);
        return;
      }

      const userData = userResult.data[0];
      const userPhone = userData.phone || userData.phoneNumber;

      if (!userPhone) {
        setError('No phone number on file. Please contact your administrator.');
        setLoading(false);
        return;
      }

      // Find worker by phone
      const phoneDigits = userPhone.replace(/\D/g, '');
      const workerResult = await firestoreService.query('workers', [
        { field: 'phoneRaw', operator: '==', value: phoneDigits }
      ]);

      if (!workerResult.success || workerResult.data.length === 0) {
        setError('Not registered as a worker. Please contact your administrator.');
        setLoading(false);
        return;
      }

      const workerData = workerResult.data[0];
      console.log("✅ Found worker:", workerData.name);
      setWorker(workerData);

      // Load all projects
      const projectsResult = await firestoreService.getAll('projects');
      if (projectsResult.success) {
        setProjects(projectsResult.data);
      }

      // Check for active shift
      const shiftResult = await firestoreService.query('timeEntries', [
        { field: 'workerId', operator: '==', value: workerData.id },
        { field: 'status', operator: '==', value: 'active' }
      ]);

      if (shiftResult.success && shiftResult.data.length > 0) {
        setActiveShift(shiftResult.data[0]);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading worker data:', err);
      setError('Failed to load data: ' + err.message);
      setLoading(false);
    }
  };

  // Clock in function
  const clockIn = async () => {
    // ✅ Company check before clock-in
    if (currentUser && currentEmployee && !currentEmployee.companyId) {
      setError('You must join a company before clocking in. Contact your administrator.');
      return { success: false };
    }

    if (!selectedProject) {
      setLocationError({ message: 'Please select a job site', canOverride: false });
      return { success: false };
    }

    setActionLoading(true);
    setError('');
    setSuccess('');
    setLocationError(null);

    try {
      const userLocation = await getCurrentLocation();
      const project = projects.find(p => p.id === selectedProject);
      
      if (!project) {
        throw new Error('Project not found');
      }

      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        project.location.latitude,
        project.location.longitude
      );

      const isWithinGeofence = distance <= project.geofenceRadius;

      if (!isWithinGeofence) {
        setError(
          `❌ You're too far from the job site!\n\n` +
          `Your distance: ${Math.round(distance)}m\n` +
          `Required: Within ${project.geofenceRadius}m\n\n` +
          `Please move closer to the job site to clock in.`
        );
        setActionLoading(false);
        return { success: false };
      }

      const timeEntry = {
        workerId: worker.id,
        workerName: worker.name,
        workerPhone: worker.phone,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        projectId: project.id,
        projectName: project.name,
        clockIn: new Date().toISOString(),
        clockInLocation: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          address: project.location.address,
        },
        distanceFromSite: Math.round(distance),
        verified: isWithinGeofence,
        status: isWithinGeofence ? 'active' : 'flagged',
        notes: isWithinGeofence ? '' : 'Clocked in outside geofence',
        clockInMethod: 'app',
      };

      const result = await firestoreService.create('timeEntries', timeEntry);

      if (result.success) {
        setActiveShift({ ...timeEntry, id: result.id });
        setSuccess('✓ Clocked in successfully!');
        setActionLoading(false);
        return { success: true };
      }
    } catch (err) {
      setError('Failed to clock in: ' + err.message);
      setActionLoading(false);
      return { success: false };
    }
  };

  // Clock out function
  const clockOut = async () => {
    if (!activeShift) return { success: false };

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const userLocation = await getCurrentLocation();
      const now = new Date();
      const start = new Date(activeShift.clockIn);
      const hours = (now - start) / (1000 * 60 * 60);

      const updateData = {
        clockOut: now.toISOString(),
        clockOutLocation: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        },
        hours: Number(hours.toFixed(2)),
        status: 'completed',
        updatedAt: now.toISOString(),
      };

      await firestoreService.update('timeEntries', activeShift.id, updateData);

      setSuccess(`✓ Clocked out! Total hours: ${hours.toFixed(2)}`);
      setActiveShift(null);
      setSelectedProject('');
      setActionLoading(false);
      return { success: true, hours: hours.toFixed(2) };
    } catch (err) {
      setError('Failed to clock out: ' + err.message);
      setActionLoading(false);
      return { success: false };
    }
  };

  // Load data on mount
  useEffect(() => {
    if (currentUser && currentEmployee) {
      loadWorkerData();
    }
  }, [currentUser, currentEmployee]);

  // Auto-dismiss success after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Auto-dismiss error after 5 seconds if no worker
  useEffect(() => {
    if (error && !worker) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, worker]);

  // Auto-dismiss location error after 10 seconds
  useEffect(() => {
    if (locationError) {
      const timer = setTimeout(() => setLocationError(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [locationError]);

  return {
    // State
    worker,
    projects,
    assignedProjects,
    selectedProject,
    setSelectedProject,
    activeShift,
    loading,
    actionLoading,
    error,
    setError,
    success,
    setSuccess,
    locationError,
    setLocationError,
    
    // Functions
    clockIn,
    clockOut,
    loadWorkerData,
  };
}