import { MapPin, Users, Settings, Trash2 } from 'lucide-react';

export default function ProjectCard({ project, onEdit, onDelete, onViewDetails }) {
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    'on-hold': 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900">{project.name}</h3>
          <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
            <MapPin size={14} />
            {project.address}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[project.status]}`}>
          {project.status}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Client:</span>
          <span className="font-semibold text-gray-900">{project.clientName}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Geofence:</span>
          <span className="font-semibold text-gray-900">{project.geofenceRadius}m</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 flex items-center gap-1">
            <Users size={14} />
            Assigned:
          </span>
          <span className="font-semibold text-gray-900">
            {project.assignedEmployees?.length || 0} workers
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onViewDetails}
          className="flex-1 bg-blue-50 text-blue-700 py-2 px-3 rounded-lg font-semibold hover:bg-blue-100 transition text-sm"
        >
          View Details
        </button>
        <button
          onClick={onEdit}
          className="bg-gray-100 text-gray-700 p-2 rounded-lg hover:bg-gray-200 transition"
        >
          <Settings size={18} />ad
        </button>
        <button
          onClick={onDelete}
          className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-100 transition"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}