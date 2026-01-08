// hooks/useWorkerClockIn.js
import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext'
import { useEmployeeStore } from '../../employees/store/employeeStore';
import { firestoreService } from '../../../services/firestoreService';
import { useGeolocation } from '../../../hooks/useGeolocation';
import { calculateDistance } from '../../../shared/utils/distance';

export function useWorkerClockIn(accessKey = null) {
  // const { currentUser } = useAuth();
  // const currentEmployee = useEmployeeStore((state) => state.currentEmployee);

   let currentUser = null;
  let currentEmployee = null;
  let setCurrentEmployee = () => {};
  
  try {
    const auth = useAuth();
    const employeeStore = useEmployeeStore();
    currentUser = auth?.currentUser || null;
    currentEmployee = employeeStore?.currentEmployee || null;
    setCurrentEmployee = employeeStore?.setCurrentEmployee || (() => {});
  } catch (err) {
    console.log('No auth - SMS worker mode');
  }
  
  const [worker, setWorker] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [activeShift, setActiveShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [locationError, setLocationError] = useState(null);
  const [errorType, setErrorType] = useState(null);
  const [isAuthenticatedUser, setIsAuthenticatedUser] = useState(false); // ✅ Track user type

  const { getCurrentLocation } = useGeolocation();

// ✅ Calculate assigned projects based on email presence (user type)
const assignedProjects = worker && projects.length > 0
  ? projects.filter(project => {
      const assignedWorkers = project.assignedWorkers || [];
      const assignedEmployees = project.assignedEmployees || [];
      if (isAuthenticatedUser) {
        // ==========================================
        // AUTHENTICATED USER (has email)
        // ==========================================
        const isAssigned = assignedEmployees.includes(currentUser?.uid);
        console.log(`  ✅ User assigned? ${isAssigned}`);
        return isAssigned;
        
      } else {
        // ==========================================
        // SMS WORKER (no email, anonymous auth)
        // ==========================================
        const inWorkers = assignedWorkers.includes(worker.id);
        const inEmployees = worker.userId && assignedEmployees.includes(worker.userId);
        
        console.log(`  📱 In assignedWorkers? ${inWorkers}`);
        console.log(`  🔗 In assignedEmployees (via userId)? ${inEmployees}`);
        
        const isAssigned = inWorkers || inEmployees;
        console.log(`  ✅ Final result: ${isAssigned}`);
        
        return isAssigned;
      }
    })
  : [];

    const loadWorkerByAccessKey = async (key) => {
    try {
      console.log("Loading worker by access key:", key);
      setLoading(true);

      // ✅ Check if user is authenticated before querying
      if (!currentUser) {
        console.log("⏳ Waiting for authentication...");
        setLoading(true);
        return; // Exit early, will retry when currentUser updates
      }
      
      // Find worker by access key
      const workerResult = await firestoreService.query('workers', [
        { field: 'accessKey', operator: '==', value: key }
      ]);

      console.log("Worker query result:", workerResult);

      if (!workerResult.success || workerResult.data.length === 0) {
        setError('Invalid access link. Please contact your supervisor.');
        setLoading(false);
        return;
      }

      const workerData = workerResult.data[0];

      // Check expiration
      if (workerData.accessKeyExpiresAt) {
        const now = new Date();
        const expiresAt = new Date(workerData.accessKeyExpiresAt);
        if (now > expiresAt) {
          setError('This access link has expired. Please request a new link.');
          setWorker(workerData);
          setLoading(false);
          return;
        }
      }

      console.log("Setting worker:", workerData);
      setWorker(workerData);
      setIsAuthenticatedUser(false);  // SMS worker

      // Load assigned projects
      const projectsResult = await firestoreService.getAll('projects');
      if (projectsResult.success) {
        const assigned = projectsResult.data.filter(p =>
          p.assignedWorkers?.includes(workerData.id)
        );
        console.log("Assigned projects:", assigned);
        setProjects(assigned);
      }

    // ✅ Check for active shift using WORKERID (not userId!)
    const shiftResult = await firestoreService.query('timeEntries', [
        { field: 'workerId', operator: '==', value: workerData.id }, // ← Uses workerId
        { field: 'status', operator: '==', value: 'active' }
      ]);

      if (shiftResult.success && shiftResult.data.length > 0) {
        const shift = shiftResult.data[0];
        setActiveShift(shift);
        console.log("✅ Active shift found:", shift);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading worker by access key:', err);
      setError('Failed to load data: ' + err.message);
      setLoading(false);
    }
  };

// Load worker data
const loadWorkerData = async () => {
  try {
    setLoading(true);

    // ✅ Determine user type by email presence
    const hasEmail = !!currentUser?.email;
    setIsAuthenticatedUser(hasEmail);

    if (hasEmail) {
      // ==========================================
      // AUTHENTICATED USER (Email/Password Login)
      // ==========================================
      console.log("✅ Authenticated user detected (has email)");

      // Company check
      if (!currentEmployee?.companyId) {
        setError('Please join a company before clocking in. Contact your administrator.');
        setLoading(false);
        return;
      }

      // Use employee data directly
      setWorker({
        id: currentEmployee.id,
        name: currentEmployee.name,
        phone: currentEmployee.phone || currentEmployee.phoneNumber,
        companyId: currentEmployee.companyId,
        isAuthenticatedUser: true
      });

      // Load all projects
      const projectsResult = await firestoreService.getAll('projects');
      if (projectsResult.success) {
        setProjects(projectsResult.data);
      }

      // Check for active shift using userId
      const shiftResult = await firestoreService.query('timeEntries', [
        { field: 'userId', operator: '==', value: currentUser.uid },
        { field: 'status', operator: '==', value: 'active' }
      ]);

      if (shiftResult.success && shiftResult.data.length > 0) {
        setActiveShift(shiftResult.data[0]);
      }

      setLoading(false);
      
    } else {
      // ==========================================
      // SMS WORKER (Anonymous Auth, No Email)
      // ==========================================
      console.log("✅ SMS worker detected (no email)");

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
      console.log("✅ Found SMS worker:", workerData.name);
      setWorker({
        ...workerData,
        isAuthenticatedUser: false
      });

      // Load all projects
      const projectsResult = await firestoreService.getAll('projects');
      if (projectsResult.success) {
        setProjects(projectsResult.data);
      }

      // Check for active shift using workerId
      const shiftResult = await firestoreService.query('timeEntries', [
        { field: 'workerId', operator: '==', value: workerData.id },
        { field: 'status', operator: '==', value: 'active' }
      ]);

      if (shiftResult.success && shiftResult.data.length > 0) {
        setActiveShift(shiftResult.data[0]);
      }

      setLoading(false);
    }
    
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

      // ✅ Build time entry based on user type
      const timeEntry = {
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

      // ✅ Add user-specific or worker-specific fields
      if (isAuthenticatedUser) {
        // Authenticated user fields
        timeEntry.userId = currentUser.uid;
        timeEntry.userEmail = currentUser.email;
        timeEntry.userName = currentEmployee.name;
        timeEntry.userPhone = currentEmployee.phone || currentEmployee.phoneNumber;
      } else {
        // ✅ SMS worker fields - workerId is the PRIMARY identifier
        timeEntry.workerId = worker.id;  // ← This never changes!
        timeEntry.workerName = worker.name;
        timeEntry.workerPhone = worker.phone;
        // ✅ Store userId for reference, but DON'T rely on it for lookups
        timeEntry.anonymousUserId = currentUser?.uid; // Optional: for debugging
      }

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
    console.log("useEffect triggered - accessKey:", accessKey, "currentUser:", !!currentUser);
    
    if (accessKey) {
      // ✅ SMS worker - only load if authenticated
      if (currentUser) {
        console.log("Loading via access key (authenticated)");
        loadWorkerByAccessKey(accessKey);
      } else {
        console.log("⏳ Waiting for anonymous authentication...");
        setLoading(true); // Show loading state
      }
    } else if (currentUser && currentEmployee) {
      // Authenticated user - load normally
      console.log("Loading via auth");
      loadWorkerData();
    } else {
      console.log("Waiting for auth or access key...");
    }
  }, [accessKey, currentUser, currentEmployee]);

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
    isAuthenticatedUser,
    clockIn,
    clockOut,
    loadWorkerData,
    errorType,
    setErrorType,
  };
}