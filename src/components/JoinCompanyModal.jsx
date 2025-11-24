import { Building2, X, CheckCircle, XCircle } from 'lucide-react';

export default function JoinCompanyModal({ company, onAccept, onDecline, loading }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-5 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center gap-3 rounded-t-2xl">
          <Building2 size={28} className="text-white" />
          <div>
            <h2 className="text-xl font-bold text-white">Join Company</h2>
            <p className="text-blue-100 text-sm">You've been invited!</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 mb-6">
            <p className="text-blue-900 font-semibold mb-2">
              You're not associated with any company yet
            </p>
            <p className="text-blue-700 text-sm">
              This project belongs to <strong>{company?.name}</strong>. Would you like to join this company to access their projects and clock in?
            </p>
          </div>

          {/* Company Info */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Company Name</p>
            <p className="text-lg font-bold text-gray-900">{company?.name}</p>
          </div>

          {/* Benefits */}
          <div className="mb-6">
            <p className="text-sm font-semibold text-gray-700 mb-3">By joining, you'll be able to:</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                <span>Clock in and out at company job sites</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                <span>Access assigned projects</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                <span>Submit daily work logs</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                <span>Track your hours worked</span>
              </li>
            </ul>
          </div>

          {/* Note */}
          <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-3 mb-6">
            <p className="text-yellow-900 text-xs">
              <strong>Note:</strong> You can only be part of one company at a time. You can leave a company anytime from your profile.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onDecline}
              disabled={loading}
              className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <XCircle size={18} />
              Decline
            </button>
            <button
              onClick={onAccept}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <CheckCircle size={18} />
              {loading ? 'Joining...' : 'Join Company'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
