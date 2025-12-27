import { Plus } from 'lucide-react';

export default function ProjectSelectionCard({ project, onSelect, todayLogsCount }) {
  return (
    <button
      onClick={() => onSelect(project)}
      className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition border border-gray-200 text-left"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="font-bold text-gray-900">{project.name}</p>
          <p className="text-sm text-gray-600 mt-1">{project.address}</p>
          <p className="text-xs text-gray-500 mt-2">
            {todayLogsCount > 0 ? (
              <span className="text-green-600 font-medium">
                ✓ {todayLogsCount} log{todayLogsCount !== 1 ? 's' : ''} today
              </span>
            ) : (
              <span className="text-gray-500">
                No logs yet today
              </span>
            )}
          </p>
        </div>
        <div className="flex-shrink-0 ml-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Plus className="text-blue-600" size={20} />
          </div>
        </div>
      </div>
    </button>
  );
}