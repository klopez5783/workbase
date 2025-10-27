import { useState } from 'react';
import { Clock, MapPin, AlertCircle, CheckCircle } from 'lucide-react';
import { useClockIn } from '../hooks/useClockIn';
import { useEmployeeStore } from '../../employees/store/employeeStore';
import { useProjectStore } from '../../projects/store/projectStore';

export default function ClockInButton() {
  const [selectedProject, setSelectedProject] = useState('');
  const [locationError, setLocationError] = useState(null);
  const [success, setSuccess] = useState(null);

  const { handleClockIn, handleClockOut, forceClockIn, loading, activeShift } = useClockIn();
  const projects = useProjectStore((state) => state.projects);
  const currentEmployee = useEmployeeStore((state) => state.currentEmployee);

  const assignedProjects = projects.filter((p) =>
    (p.assignedEmployees || []).includes(currentEmployee?.id)
  );

  const onClockIn = async () => {
    if (!selectedProject) {
      alert('Please select a job site');
      return;
    }

    setLocationError(null);
    setSuccess(null);

    const result = await handleClockIn(selectedProject);

    if (!result.success) {
      setLocationError({
        message: result.message,
        distance: result.distance,
        canOverride: result.allowOverride,
      });
    } else {
      setSuccess(result.message);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const onClockOut = async () => {
    const result = await handleClockOut();
    if (result.success) {
      setSuccess('Clocked out successfully');
      setSelectedProject('');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const onForceClockIn = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to clock in from this location? This will be flagged for review.'
    );
    
    if (confirmed) {
      const result = await forceClockIn(selectedProject);
      if (result.success) {
        setLocationError(null);
        setSuccess(result.message);
      }
    }
  };

  if (activeShift) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="text-green-500" size={24} />
            <div>
              <p className="font-semibold text-green-900">Currently Clocked In</p>
              <p className="text-sm text-green-700">{activeShift.projectName}</p>
              <p className="text-xs text-green-600 mt-1">
                Since {new Date(activeShift.clockIn).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onClockOut}
          disabled={loading}
          className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50"
        >
          <div className="flex items-center justify-center gap-3">
            <Clock size={24} />
            {loading ? 'Clocking Out...' : 'Clock Out'}
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="text-green-500" size={20} />
            <p className="text-green-900 font-medium">{success}</p>
          </div>
        </div>
      )}

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
                {project.name} - {project.address}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-4">
          <p className="text-yellow-800 font-medium">
            No projects assigned yet
          </p>
          <p className="text-yellow-700 text-sm mt-1">
            Contact your manager to be assigned to a project
          </p>
        </div>
      )}

      {locationError && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
            <div className="flex-1">
              <p className="font-semibold text-red-900 text-sm">
                Location Mismatch
              </p>
              <p className="text-red-700 text-sm mt-1">{locationError.message}</p>
              {locationError.canOverride && currentEmployee?.role === 'admin' && (
                <button
                  onClick={onForceClockIn}
                  className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition"
                >
                  Clock in anyway (Admin Override)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={onClockIn}
        disabled={loading || !selectedProject || assignedProjects.length === 0}
        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center justify-center gap-3">
          <MapPin size={24} />
          {loading ? 'Verifying Location...' : 'Clock In'}
        </div>
      </button>

      <p className="text-center text-sm text-gray-500">
        <MapPin size={14} className="inline mr-1" />
        Your location will be verified when you clock in
      </p>
    </div>
  );
}