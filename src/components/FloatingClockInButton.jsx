import { useState, useEffect } from 'react';
import { Clock, MapPin, Loader, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useEmployeeStore } from '../features/employees/store/employeeStore';
import { firestoreService } from '../services/firestoreService';
import { useGeolocation } from '../hooks/useGeolocation';
import { calculateDistance } from '../shared/utils/distance';
import { X } from 'lucide-react';

export default function FloatingClockInButton() {
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
  const [showModal, setShowModal] = useState(false);

  const { getCurrentLocation } = useGeolocation();

  useEffect(() => {
    if (currentUser && currentEmployee) {
      loadWorkerData();
    }
  }, [currentUser, currentEmployee]);

  // ✅ ADD THIS - Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (error && !worker) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, worker]);

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
        const assignedProjects = projectsResult.data.filter(project => 
          project.assignedWorkers?.includes(workerData.id) || 
          !project.assignedWorkers || 
          project.assignedWorkers.length === 0
        );
        setProjects(assignedProjects);
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

  const handleClockIn = async () => {
    if (!selectedProject) {
      setError('Please select a job site');
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccess('');

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
        setTimeout(() => setShowModal(false), 2000);
      }
    } catch (err) {
      setError('Failed to clock in: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
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
      setTimeout(() => setShowModal(false), 2000);
    } catch (err) {
      setError('Failed to clock out: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ✅ CONDITIONAL RETURNS AFTER ALL HOOKS
  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader className="animate-spin text-blue-600" size={24} />
      </div>
    );
  }

  if (error && !worker) {
    return (
      <div className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full px-5">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <p className="text-yellow-800 text-sm font-medium flex-1">{error}</p>
            <button
              onClick={() => setError('')}
              className="text-yellow-600 hover:text-yellow-800 transition flex-shrink-0"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!worker) {
    return null;
  }

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setShowModal(true)}
        className={`fixed bottom-20 right-5 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center z-40 transition-all active:scale-95 ${
          activeShift
            ? 'bg-gradient-to-r from-red-500 to-red-600'
            : 'bg-gradient-to-r from-blue-500 to-blue-600'
        }`}
      >
        <Clock className="text-white" size={28} />
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-5 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            {/* Header */}
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {activeShift ? 'Clock Out' : 'Clock In'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Success Message */}
              {success && (
                <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="text-green-500" size={24} />
                    <p className="text-green-900 font-medium text-sm">{success}</p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="text-red-500" size={24} />
                    <p className="text-red-900 font-medium text-sm">{error}</p>
                  </div>
                </div>
              )}

              {activeShift ? (
                // Currently Clocked In
                <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
                  <p className="font-semibold text-green-900 mb-2">Currently Clocked In</p>
                  <p className="text-sm text-green-700">{activeShift.projectName}</p>
                  <p className="text-xs text-green-600 mt-2">
                    Since {new Date(activeShift.clockIn).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              ) : (
                // Ready to Clock In
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Job Site
                  </label>
                  {projects.length === 0 ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-yellow-800 text-sm">
                        You're not assigned to any projects.
                      </p>
                    </div>
                  ) : (
                    <select
                      value={selectedProject}
                      onChange={(e) => setSelectedProject(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      <option value="">Choose a project...</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={activeShift ? handleClockOut : handleClockIn}
                disabled={actionLoading || (!activeShift && !selectedProject)}
                className={`w-full py-3 rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  activeShift
                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                    : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                }`}
              >
                {actionLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader className="animate-spin" size={20} />
                    {activeShift ? 'Clocking Out...' : 'Clocking In...'}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Clock size={20} />
                    {activeShift ? 'Clock Out' : 'Clock In'}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}