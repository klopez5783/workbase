import DailyWorkLog from '../pages/DailyWorkLog';

export default function WorkLog() {
  return (
    <div className="p-5 pb-24 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <span className="text-2xl">📝</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Daily Work Log</h2>
            <p className="text-sm text-gray-600">Document your daily progress</p>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
        <p className="text-blue-900 font-medium text-sm mb-2">
          📋 How it works:
        </p>
        <ul className="text-blue-800 text-sm space-y-1 ml-4 list-disc">
          <li>Select your project</li>
          <li>Describe work completed (any language)</li>
          <li>Capture photos of your work</li>
          <li>Submit - translation happens automatically!</li>
        </ul>
      </div>

      {/* Work Log Component */}
      <DailyWorkLog />
    </div>
  );
}