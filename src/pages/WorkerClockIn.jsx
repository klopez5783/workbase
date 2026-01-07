import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Clock, MapPin, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { useWorkerClockIn } from '../features/employees/hooks/userWorkerClockIn';
import JoinCompanyModal from '../components/JoinCompanyModal';
import { useAuth } from '../contexts/AuthContext';
import { useRef } from 'react';

export default function WorkerClockIn() {
  const { accessKey } = useParams();
  const [searchParams] = useSearchParams();
  const { ensureSMSWorkerAuth } = useAuth();
  const authAttempted = useRef(false); // ✅ Track if auth was attempted


    // ✅ Authenticate SMS workers before loading data
  useEffect(() => {
    const setupAuth = async () => {

      if (authAttempted.current) {
        console.log("⏭️ Auth already attempted, skipping");
        return;
      }

      console.log("=== Setting up authentication ===");
      console.log("Access Key:", accessKey);
      
      authAttempted.current = true; // ✅ Mark as attempted
      const result = await ensureSMSWorkerAuth(accessKey);
      
      if (result.success) {
        console.log("✅ Authentication ready");
      } else {
        console.error("❌ Authentication failed:", result.error);
      }
      
    };

    setupAuth();
  }, [accessKey]);
  
  // ✅ Use the hook instead of duplicating logic
  const {
    worker,
    projects: assignedProjects,
    selectedProject,
    setSelectedProject,
    activeShift,
    loading,
    actionLoading,
    error,
    success,
    clockIn,
    clockOut,
    isAuthenticatedUser
  } = useWorkerClockIn(accessKey);

  const [requestingSent, setRequestingSent] = useState(false);
  const [showJoinCompanyModal, setShowJoinCompanyModal] = useState(false);
  const [companyToJoin, setCompanyToJoin] = useState(null);

  // Check for auto-clock-in parameters
  const autoAction = searchParams.get('action');
  const autoProjectId = searchParams.get('project');

  // Auto clock-in/out if URL parameters present
  useEffect(() => {
    if (worker && !loading && autoAction && !actionLoading) {
      if (autoAction === 'in' && autoProjectId && !activeShift) {
        setSelectedProject(autoProjectId);
        clockIn();
      } else if (autoAction === 'out' && activeShift) {
        clockOut();
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

  if (error && !worker) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-5">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md shadow-xl">
          <AlertCircle className="mx-auto mb-4 text-red-600" size={64} />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          
          <button
            onClick={handleRequestLink}
            disabled={requestingSent}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {requestingSent ? 'Request Sent!' : 'Request New Link'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Join Company Modal - Only for authenticated users */}
      {showJoinCompanyModal && companyToJoin && isAuthenticatedUser && (
        <JoinCompanyModal
          company={companyToJoin}
          onAccept={() => {/* handle join */}}
          onDecline={() => setShowJoinCompanyModal(false)}
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
                <p className="text-red-900 font-medium whitespace-pre-line">{error}</p>
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
                  onClick={clockOut}
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
                  {assignedProjects.length === 0 ? (
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
                      {assignedProjects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name} - {project.address}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <button
                  onClick={clockIn}
                  disabled={actionLoading || !selectedProject || assignedProjects.length === 0}
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