import { useState, useEffect } from 'react';
import { Clock, Loader, AlertCircle, CheckCircle, X } from 'lucide-react';
import { useWorkerClockIn } from '../features/employees/hooks/userWorkerClockIn';
import JoinCompanyViaCode from './JoinCompanyViaCode';

export default function FloatingClockInButton() {
  const {
    worker,
    assignedProjects,
    selectedProject,
    setSelectedProject,
    activeShift,
    loading,
    actionLoading,
    error,
    setError,
    success,
    clockIn,
    clockOut,
    loadWorkerData,
  } = useWorkerClockIn();

  const [showModal, setShowModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [errorType, setErrorType] = useState(null);

  // Check if error is about joining a company
  // Auto-open Join modal when worker has no company

  // Handle successful company join
  const handleJoinSuccess = async () => {
    setShowJoinModal(false);
    // Reload worker data after joining company
    await loadWorkerData();
  };

  // Handle clock in with modal auto-close
  const handleClockIn = async () => {
    const result = await clockIn();
    if (result.success) {
      setTimeout(() => setShowModal(false), 2000);
    }
  };

  // Handle clock out with modal auto-close
  const handleClockOut = async () => {
    const result = await clockOut();
    if (result.success) {
      setTimeout(() => setShowModal(false), 2000);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader className="animate-spin text-blue-600" size={24} />
      </div>
    );
  }

  // Error state (no worker found)
  if (error && !worker) {
    return (
      <>
        {/* Join Company Modal */}
        {showJoinModal && (
          <JoinCompanyViaCode
            onClose={() => setShowJoinModal(false)}
            onSuccess={handleJoinSuccess}
          />
        )}

        <div className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full px-5">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-yellow-800 text-sm font-medium">{error}</p>
                <span>Floading Button Modal</span>
              </div>
              <button
                onClick={() => setError('')}
                className="text-yellow-600 hover:text-yellow-800 transition flex-shrink-0"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // No worker found
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
                  {assignedProjects.length === 0 ? (
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
                      {assignedProjects.map((project) => (
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