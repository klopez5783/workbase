import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Clock, MapPin, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { firestoreService } from '../services/firestoreService';
import { useGeolocation } from '../hooks/useGeolocation';
import { calculateDistance } from '../shared/utils/distance';
import { useAuth } from '../contexts/AuthContext';
import { useEmployeeStore } from '../features/employees/store/employeeStore';
import JoinCompanyModal from '../components/JoinCompanyModal';

export default function WorkerClockIn() {
  const { accessKey } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { currentEmployee, setCurrentEmployee } = useEmployeeStore();

  const [worker, setWorker] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [activeShift, setActiveShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [requestingSent, setRequestingSent] = useState(false);

  // Company join states
  const [showJoinCompanyModal, setShowJoinCompanyModal] = useState(false);
  const [companyToJoin, setCompanyToJoin] = useState(null);
  const [joiningCompany, setJoiningCompany] = useState(false);


  const { getCurrentLocation } = useGeolocation();

  // Check for auto-clock-in parameters
  const autoAction = searchParams.get('action'); // 'in' or 'out'
  const autoProjectId = searchParams.get('project');

  useEffect(() => {
    // Only load if we have the accessKey and auth is ready
    if (accessKey) {
      loadWorkerData();
    }
  }, [accessKey]);

  // Auto clock-in/out if URL parameters present
  useEffect(() => {
    if (worker && !loading && autoAction && !actionLoading) {
      if (autoAction === 'in' && autoProjectId && !activeShift) {
        // Auto clock-in
        handleAutoClockIn(autoProjectId);
      } else if (autoAction === 'out' && activeShift) {
        // Auto clock-out
        handleAutoClockOut();
      }
    }
  }, [worker, loading, autoAction, autoProjectId, activeShift]);

  const handleRequestLink = async () => {
  try {
    setLoading(true);
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const functions = getFunctions();
    
    const requestLink = httpsCallable(functions, 'requestWorkerLink');
    await requestLink({ accessKey });

    setRequestingSent(true);
    alert('Request sent to your supervisor! You should receive a link shortly.');
  } catch (err) {
    alert('Failed to request link: ' + err.message);
  } finally {
    setLoading(false);
  }
};

 const loadWorkerData = async () => {
  console.log('=== START loadWorkerData ===');
  
  try {
    setLoading(true);
    
    console.log('Access Key from URL:', accessKey);
    
    // Find worker by access key
    const workerResult = await firestoreService.query('workers', [
      { field: 'accessKey', operator: '==', value: accessKey }
    ]);

    console.log('Query result:', workerResult);
    console.log('Number of workers found:', workerResult.data?.length);

    if (!workerResult.success || workerResult.data.length === 0) {
      console.error('❌ Worker not found!');
      setError('Invalid access link. Please contact your supervisor.');
      setLoading(false); // ← Make sure this is here
      return;
    }

    const workerData = workerResult.data[0];
    console.log('Worker found:', workerData);

    // Check expiration
    if (workerData.accessKeyExpiresAt) {
      const now = new Date();
      const expiresAt = new Date(workerData.accessKeyExpiresAt);

      console.log('Current time:', now);
      console.log('Expires at:', expiresAt);
      console.log('Is expired?', now > expiresAt);

      if (now > expiresAt) {
        console.error('❌ Access key expired!');
        setError('This access link has expired. Please request a new link from your supervisor.');
        setWorker(workerData);
        setLoading(false); // ← Make sure this is here
        return;
      }
    }

    console.log('✅ Setting worker data');
    setWorker(workerData);

    // Load projects assigned to this worker
    console.log('Loading projects...');
    const projectsResult = await firestoreService.getAll('projects');
    console.log('Projects result:', projectsResult);

    let assignedProjects = [];
    if (projectsResult.success) {
      assignedProjects = projectsResult.data.filter(project =>
        project.assignedWorkers?.includes(workerData.id) ||
        !project.assignedWorkers ||
        project.assignedWorkers.length === 0
      );
      console.log('Assigned projects:', assignedProjects);
      setProjects(assignedProjects);
    }

    // Check for active shift
    console.log('Checking for active shift...');
    const shiftResult = await firestoreService.query('timeEntries', [
      { field: 'workerId', operator: '==', value: workerData.id },
      { field: 'status', operator: '==', value: 'active' }
    ]);
    console.log('Shift result:', shiftResult);

    if (shiftResult.success && shiftResult.data.length > 0) {
      console.log('Active shift found:', shiftResult.data[0]);
      setActiveShift(shiftResult.data[0]);
    }

    // Check if worker needs to join a company
    console.log("*".repeat(30));
    console.log('Checking company join status...');
    console.log('Current user:', currentUser);
    console.log('Current employee:', currentEmployee);
    console.log("*".repeat(30));

    if (currentUser && currentEmployee && !currentEmployee.companyId && assignedProjects.length > 0) {
      console.log('Worker has no company, needs to join');

      // Get the company from the first project
      const firstProject = assignedProjects[0];
      console.log('\n\nFirst assigned project:', firstProject);
      if (firstProject.createdBy) {
        console.log('Fetching company:', firstProject.createdBy);
        const companyResult = await firestoreService.getById('companies', firstProject.createdBy);

        if (companyResult.success && companyResult.data) {
          console.log('Company found:', companyResult.data);
          setCompanyToJoin(companyResult.data);
          setShowJoinCompanyModal(true);
        }
      }
    }

    console.log('✅ Setting loading to false');
    setLoading(false); // ← CRITICAL: This must be called!
    console.log('=== END loadWorkerData ===');

  } catch (err) {
    console.error('ERROR in loadWorkerData:', err);
    setError('Failed to load data: ' + err.message);
    setLoading(false); // ← Make sure this is here too
  }
};

  const handleAcceptJoin = async () => {
    if (!companyToJoin || !currentUser || !currentEmployee) return;

    try {
      setJoiningCompany(true);

      // Update worker's user profile with companyId
      const updateUserResult = await firestoreService.update('users', currentUser.uid, {
        companyId: companyToJoin.id,
        updatedAt: new Date().toISOString(),
      });

      if (!updateUserResult.success) {
        throw new Error('Failed to update user profile');
      }

      // Add worker to company's workers array
      const currentWorkers = companyToJoin.workers || [];
      const updateCompanyResult = await firestoreService.update('companies', companyToJoin.id, {
        workers: [...currentWorkers, currentUser.uid],
        updatedAt: new Date().toISOString(),
      });

      if (!updateCompanyResult.success) {
        throw new Error('Failed to add worker to company');
      }

      // Update currentEmployee state
      setCurrentEmployee({
        ...currentEmployee,
        companyId: companyToJoin.id,
      });

      // Close modal and show success
      setShowJoinCompanyModal(false);
      setSuccess(`✓ Successfully joined ${companyToJoin.name}! You can now clock in.`);

    } catch (err) {
      console.error('Error joining company:', err);
      setError('Failed to join company: ' + err.message);
    } finally {
      setJoiningCompany(false);
    }
  };

  const handleDeclineJoin = () => {
    setShowJoinCompanyModal(false);
    setError('You must join a company to clock in at job sites. Please contact your supervisor.');
  };

  const handleAutoClockIn = async (projectId) => {
    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const userLocation = await getCurrentLocation();
      const project = projects.find(p => p.id === projectId);
      
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

      const timeEntry = {
        workerId: worker.id,
        workerName: worker.name,
        workerPhone: worker.phone,
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
      };

      const result = await firestoreService.create('timeEntries', timeEntry);

      if (result.success) {
        setActiveShift({ ...timeEntry, id: result.id });
        setSuccess(
          isWithinGeofence
            ? '✓ Auto-clocked in successfully!'
            : '⚠️ Auto-clocked in (outside normal range - will be reviewed)'
        );
      }
    } catch (err) {
      setError('Failed to auto clock-in: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAutoClockOut = async () => {
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

      setSuccess(`✓ Auto-clocked out! Total hours: ${hours.toFixed(2)}`);
      setActiveShift(null);
      setSelectedProject('');
    } catch (err) {
      setError('Failed to auto clock-out: ' + err.message);
    } finally {
      setActionLoading(false);
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
      };

      const result = await firestoreService.create('timeEntries', timeEntry);

      if (result.success) {
        setActiveShift({ ...timeEntry, id: result.id });
        setSuccess(
          isWithinGeofence
            ? '✓ Clocked in successfully!'
            : '⚠️ Clocked in (outside normal range - will be reviewed)'
        );
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
    } catch (err) {
      setError('Failed to clock out: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-5">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4 text-blue-600" size={48} />
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  {error && !worker && (
  <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-5">
    <div className="bg-white rounded-2xl p-8 text-center max-w-md shadow-xl">
      <AlertCircle className="mx-auto mb-4 text-red-600" size={64} />
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h2>
      <p className="text-gray-600 mb-6">{error}</p>
      
      {/* Add this button */}
      <button
        onClick={handleRequestLink}
        disabled={requestingSent}
        className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50"
      >
        {requestingSent ? 'Request Sent!' : 'Request New Link'}
      </button>
    </div>
  </div>
)}

  return (
    <>
      {/* Join Company Modal */}
      {showJoinCompanyModal && companyToJoin && (
        <JoinCompanyModal
          company={companyToJoin}
          onAccept={handleAcceptJoin}
          onDecline={handleDeclineJoin}
          loading={joiningCompany}
        />
      )}

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="max-w-md mx-auto p-5 pt-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <span className="text-white font-bold text-3xl">W</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome, {worker?.name}!</h1>
          <p className="text-gray-600">Clock in/out for your shift</p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="text-green-500" size={24} />
              <p className="text-green-900 font-medium">{success}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-red-500" size={24} />
              <p className="text-red-900 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 space-y-6">
          {activeShift ? (
            // Currently Clocked In
            <>
              <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle className="text-green-500" size={24} />
                  <div>
                    <p className="font-semibold text-green-900">Currently Clocked In</p>
                    <p className="text-sm text-green-700">{activeShift.projectName}</p>
                  </div>
                </div>
                <p className="text-xs text-green-600">
                  Since {new Date(activeShift.clockIn).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              <button
                onClick={handleClockOut}
                disabled={actionLoading}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-center gap-3">
                  <Clock size={24} />
                  {actionLoading ? 'Clocking Out...' : 'Clock Out'}
                </div>
              </button>
            </>
          ) : (
            // Ready to Clock In
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Job Site
                </label>
                {projects.length === 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <p className="text-yellow-800 text-sm font-medium">
                      You're not assigned to any projects yet.
                    </p>
                    <p className="text-yellow-700 text-xs mt-1">
                      Contact your supervisor to get assigned.
                    </p>
                  </div>
                ) : (
                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-base"
                  >
                    <option value="">Choose a project...</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name} - {project.address}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <button
                onClick={handleClockIn}
                disabled={actionLoading || !selectedProject || projects.length === 0}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-center gap-3">
                  <MapPin size={24} />
                  {actionLoading ? 'Clocking In...' : 'Clock In'}
                </div>
              </button>

              <p className="text-center text-sm text-gray-500">
                <MapPin size={14} className="inline mr-1" />
                Your location will be verified when you clock in
              </p>
            </>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Need help? Contact your supervisor</p>
        </div>
      </div>
    </div>
    </>
  );
}