import { useState } from 'react';
import { MapPin, DollarSign, Users, Calendar, Loader } from 'lucide-react';
import { useProjectStore } from '../store/projectstore';
import { firestoreService } from '../../../services/firestoreService';
import { useGeolocation } from '../../../hooks/useGeolocation';

export default function ProjectForm({ onClose, existingProject = null }) {
  const [name, setName] = useState(existingProject?.name || '');
  const [address, setAddress] = useState(existingProject?.address || '');
  const [clientName, setClientName] = useState(existingProject?.clientName || '');
  const [clientPhone, setClientPhone] = useState(existingProject?.clientPhone || '');
  const [geofenceRadius, setGeofenceRadius] = useState(existingProject?.geofenceRadius || 100);
  const [location, setLocation] = useState(existingProject?.location || null);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [error, setError] = useState('');

  const { getCurrentLocation } = useGeolocation();
  const { addProject, updateProject } = useProjectStore();

  const handleGetCurrentLocation = async () => {
    setGettingLocation(true);
    setError('');
    
    try {
      const coords = await getCurrentLocation();
      setLocation({
        latitude: coords.latitude,
        longitude: coords.longitude,
        address: address || 'Current Location',
      });
      alert(`Location captured: ${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`);
    } catch (err) {
      setError('Failed to get location. Please enable location permissions.');
    }
    
    setGettingLocation(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name || !address || !clientName) {
      setError('Please fill in all required fields');
      return;
    }

    if (!location) {
      setError('Please set the job site location');
      return;
    }

    setLoading(true);
    setError('');

    const projectData = {
      name,
      address,
      location,
      geofenceRadius: Number(geofenceRadius),
      clientName,
      clientPhone,
      status: 'active',
      assignedEmployees: existingProject?.assignedEmployees || [],
      createdAt: existingProject?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (existingProject) {
        // Update existing project
        await firestoreService.update('projects', existingProject.firestoreId, projectData);
        updateProject(existingProject.id, projectData);
      } else {
        // Create new project
        const result = await firestoreService.create('projects', projectData);
        
        if (result.success) {
          addProject({
            id: result.id,
            firestoreId: result.id,
            ...projectData,
          });
        }
      }

      onClose();
    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-5 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {existingProject ? 'Edit Project' : 'Create New Project'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Project Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Project Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Oak St Renovation"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Job Site Address *
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Oak St, Columbus, OH"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              GPS Location *
            </label>
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={gettingLocation}
                className="w-full bg-blue-50 border-2 border-blue-200 text-blue-700 py-3 px-4 rounded-xl font-semibold hover:bg-blue-100 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {gettingLocation ? (
                  <>
                    <Loader className="animate-spin" size={20} />
                    Getting Location...
                  </>
                ) : (
                  <>
                    <MapPin size={20} />
                    Use Current Location
                  </>
                )}
              </button>

              {location && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-green-900 font-semibold text-sm mb-2">
                    ✓ Location Set
                  </p>
                  <p className="text-green-700 text-xs font-mono">
                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </p>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Go to the job site and click "Use Current Location" to capture GPS coordinates
            </p>
          </div>

          {/* Geofence Radius */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Clock-In Radius (meters)
            </label>
            <input
              type="number"
              value={geofenceRadius}
              onChange={(e) => setGeofenceRadius(e.target.value)}
              min="10"
              max="1000"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-2">
              Workers must be within {geofenceRadius}m ({Math.round(geofenceRadius * 3.28)}ft) to clock in
            </p>
          </div>

          {/* Client Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Client Name *
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Client Phone
              </label>
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : existingProject ? 'Update Project' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}