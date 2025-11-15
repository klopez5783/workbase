import { useState, useEffect } from 'react';
import { Clock, MapPin, AlertCircle, CheckCircle, Loader, X } from 'lucide-react';
import { useEmployeeStore } from '../../employees/store/employeeStore';
import { useAuth } from '../../../contexts/AuthContext';
import { firestoreService } from '../../../services/firestoreService';
import { useGeolocation } from '../../../hooks/useGeolocation';
import { calculateDistance } from '../../../shared/utils/distance';

export default function ClockInButton() {
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

  // Filter assigned projects
  const assignedProjects = projects.filter(project => 
    project.assignedWorkers?.includes(worker?.id)
  );

  useEffect(() => {
    if (currentUser && currentEmployee) {
      loadWorkerData();
    }
  }, [currentUser, currentEmployee]);

  // Auto-dismiss success message after 5 seconds
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

  const loadWorkerData = async () => {
    try {
      setLoading(true);

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

      const workerResult = await firestoreService.query('workers', [
        { field: 'phoneRaw', operator: '==', value: userPhone.replace(/\D/g, '') }
      ]);

      if (!workerResult.success || workerResult.data.length === 0) {
        setError('Not registered as a worker. Please contact your administrator.');
        setLoading(false);
        return;
      }

      const workerData = workerResult.data[0];
      setWorker(workerData);

      const projectsResult = await firestoreService.getAll('projects');
      if (projectsResult.success) {
        setProjects(projectsResult.data);
      }

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

  const onClockIn = async () => {
    if (!selectedProject) {
      setLocationError({ message: 'Please select a job site', canOverride: false });
      return;
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
      return; // ← STOP HERE, don't create time entry
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
      }
    } catch (err) {
      setError('Failed to clock in: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const onClockOut = async () => {
    if (!activeShift) return;

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
    } catch (err) {
      setError('Failed to clock out: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  // Error state (no worker found)
  if (error && !worker) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={24} />
            <p className="text-yellow-800 text-sm font-medium flex-1">{error}</p>
          </div>
          <button
            onClick={() => setError('')}
            className="text-yellow-600 hover:text-yellow-800 transition flex-shrink-0"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    );
  }

  // No worker found
  if (!worker) {
    return null;
  }

  // Active shift view
  if (activeShift) {
    return (
      <div className="space-y-4">
        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                <CheckCircle className="text-green-500 flex-shrink-0" size={24} />
                <p className="text-green-900 font-medium text-sm">{success}</p>
              </div>
              <button
                onClick={() => setSuccess('')}
                className="text-green-600 hover:text-green-800 transition flex-shrink-0"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Currently Clocked In Status */}
        <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="text-green-500 flex-shrink-0" size={24} />
            <div className="flex-1">
              <p className="font-semibold text-green-900">Currently Clocked In</p>
              <p className="text-sm text-green-700">{activeShift.projectName}</p>
              <p className="text-xs text-green-600 mt-1">
                Since {new Date(activeShift.clockIn).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Clock Out Button */}
        <button
          onClick={onClockOut}
          disabled={actionLoading}
          className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {actionLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader className="animate-spin" size={24} />
              Clocking Out...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-3">
              <Clock size={24} />
              Clock Out
            </span>
          )}
        </button>
      </div>
    );
  }

  // Clock in view
  return (
    <div className="space-y-4">
      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <CheckCircle className="text-green-500 flex-shrink-0" size={24} />
              <p className="text-green-900 font-medium text-sm">{success}</p>
            </div>
            <button
              onClick={() => setSuccess('')}
              className="text-green-600 hover:text-green-800 transition flex-shrink-0"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={24} />
              <p className="text-red-900 font-medium text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError('')}
              className="text-red-600 hover:text-red-800 transition flex-shrink-0"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Location Error Message */}
      {locationError && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={24} />
              <div className="flex-1">
                <p className="font-semibold text-red-900 text-sm">
                  {locationError.canOverride ? 'Location Mismatch' : 'Error'}
                </p>
                <p className="text-red-700 text-sm mt-1">{locationError.message}</p>
                {locationError.distance && (
                  <p className="text-red-600 text-xs mt-1">
                    Distance from site: {locationError.distance}m
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setLocationError(null)}
              className="text-red-600 hover:text-red-800 transition flex-shrink-0"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Project Selection or No Projects Message */}
      {assignedProjects.length > 0 ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Job Site
          </label>
          <select
            value={selectedProject}
            onChange={(e) => {
              setSelectedProject(e.target.value);
              setLocationError(null);
            }}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="">Choose a project...</option>
            {assignedProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name} {project.address ? `- ${project.address}` : ''}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 font-medium text-sm">
            No projects assigned yet
          </p>
          <p className="text-yellow-700 text-sm mt-1">
            Contact your manager to be assigned to a project
          </p>
        </div>
      )}

      {/* Clock In Button */}
      <button
        onClick={onClockIn}
        disabled={actionLoading || !selectedProject || assignedProjects.length === 0}
        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {actionLoading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader className="animate-spin" size={24} />
            Verifying Location...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-3">
            <MapPin size={24} />
            Clock In
          </span>
        )}
      </button>

      {/* Helper Text */}
      <p className="text-center text-sm text-gray-500">
        <MapPin size={14} className="inline mr-1" />
        Your location will be verified when you clock in
      </p>
    </div>
  );
}