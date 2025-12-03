import { Clock, MapPin, AlertCircle, CheckCircle, Loader, X } from 'lucide-react';
import { useWorkerClockIn } from '../../employees/hooks/userWorkerClockIn';
import JoinCompanyViaCode from '../../../components/JoinCompanyViaCode'; // ✅ Import this
import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useEmployeeStore } from '../../employees/store/employeeStore';

export default function ClockInButton() {
  const { currentUser } = useAuth();
  const { currentEmployee, setCurrentEmployee } = useEmployeeStore();
  
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
    setSuccess,
    locationError,
    setLocationError,
    clockIn,
    clockOut,
    loadWorkerData, // ✅ Add this
  } = useWorkerClockIn();

  const [showCodeModal, setShowCodeModal] = useState(false); // ✅ Changed name
  const [showNoCompanyModal, setShowNoCompanyModal] = useState(false);

  useEffect(() => {
    if (error && !worker) {
      setShowNoCompanyModal(true);
    }
  }, [error, worker]);

  // ✅ Handle successful company join
  const handleJoinSuccess = async (companyData) => {
    console.log('Successfully joined company:', companyData);
    
    // Update employee store with new company
    setCurrentEmployee({
      ...currentEmployee,
      companyId: companyData.companyId,
    });

    // Close modals and clear error
    setShowCodeModal(false);
    setShowNoCompanyModal(false);
    setError('');
    
    // Show success message
    setSuccess(`✓ Successfully joined ${companyData.companyName}! You can now clock in.`);

    // Reload worker data to reflect company change
    await loadWorkerData();
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  // Error state (no company)
  if (showNoCompanyModal) {
    return (
      <>
        {/* Code Entry Modal */}
        {showCodeModal && (
          <JoinCompanyViaCode
            onClose={() => setShowCodeModal(false)}
            onSuccess={handleJoinSuccess}
          />
        )}

        <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={24} />
              <p className="text-yellow-800 text-sm font-medium flex-1">
                {error || "You must join a company before clocking in."}
              </p>
            </div>

            <button
              onClick={() => setShowCodeModal(true)}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition text-sm"
            >
              Join a Company
            </button>
          </div>
        </div>
      </>
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
          onClick={clockOut}
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
        onClick={clockIn}
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