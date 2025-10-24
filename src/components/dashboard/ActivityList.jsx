import { useStore } from '../../store/useStore';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function ActivityList() {
  const { receipts, timeEntries } = useStore();

  const recentReceipts = receipts.slice(0, 3);
  const recentTime = timeEntries.slice(0, 2);

  return (
    <div className="px-5 mt-6 mb-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h2>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {recentReceipts.length === 0 && recentTime.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No recent activity</p>
            <p className="text-sm mt-1">Start by scanning a receipt or clocking in</p>
          </div>
        ) : (
          <>
            {recentReceipts.map((receipt) => (
              <div
                key={receipt.id}
                className="flex items-center gap-3 p-4 border-b border-gray-100 last:border-b-0"
              >
                <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center text-xl flex-shrink-0">
                  💰
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 text-sm">
                    {receipt.vendor}
                  </div>
                  <div className="text-xs text-gray-500">
                    {receipt.category} • {formatDate(receipt.date)}
                  </div>
                </div>
                <div className="font-bold text-gray-900">
                  {formatCurrency(receipt.amount)}
                </div>
              </div>
            ))}
            {recentTime.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 p-4 border-b border-gray-100 last:border-b-0"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-xl flex-shrink-0">
                  ⏰
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 text-sm">
                    {entry.workerName}
                  </div>
                  <div className="text-xs text-gray-500">
                    Clocked out • {entry.hours} hours
                  </div>
                </div>
                <div className="text-xs font-semibold text-green-600">
                  ✓ Verified
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}