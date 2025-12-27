import { FileText } from 'lucide-react';

export default function WorkLogSummaryCard({ log, project }) {
  const logTime = log.createdAt?.toDate ? log.createdAt.toDate() : new Date(log.createdAt);

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <FileText className="text-green-600" size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900">{project?.name || 'Unknown Project'}</p>
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {log.translatedDescription || log.description}
          </p>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            <p className="text-xs text-gray-500">
              {logTime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
            <p className="text-xs text-gray-500">
              📸 {log.images?.length || 0} photo{log.images?.length !== 1 ? 's' : ''}
            </p>
            {log.wasTranslated && (
              <p className="text-xs text-purple-600 font-medium">
                🌐 Translated
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}