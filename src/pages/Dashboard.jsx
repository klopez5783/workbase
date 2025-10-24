import { useStore } from '../store/useStore';
import BalanceCard from '../components/dashboard/BalanceCard';
import StatCard from '../components/dashboard/StatCard';
import QuickActions from '../components/dashboard/QuickActions';
import ActivityList from '../components/dashboard/ActivityList';

export default function Dashboard() {
  const { receipts, timeEntries, reports, currentClockIn } = useStore();

  // Calculate today's stats
  const today = new Date().toDateString();
  const todayReceipts = receipts.filter(
    (r) => new Date(r.date).toDateString() === today
  );
  const todayExpenses = todayReceipts.reduce((sum, r) => sum + r.amount, 0);

  const todayEntries = timeEntries.filter(
    (e) => new Date(e.clockIn).toDateString() === today
  );
  const todayHours = todayEntries.reduce((sum, e) => sum + (e.hours || 0), 0);

  const weekReports = reports.filter((r) => {
    const reportDate = new Date(r.date);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return reportDate >= weekAgo;
  });

  return (
    <div className="pb-6">
      <BalanceCard />

      {/* Clock In Banner */}
      {currentClockIn && (
        <div className="mx-5 mt-4 bg-gradient-to-r from-green-50 to-green-100 border-l-4 border-green-500 rounded-xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center text-white flex-shrink-0">
            <span className="text-2xl">⏱</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-green-900 text-sm">
              Currently Clocked In
            </div>
            <div className="text-xs text-green-700 mt-0.5">
              Since{' '}
              {new Date(currentClockIn.clockIn).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              • GPS Verified
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 px-5 mt-4">
        <StatCard
          icon="💰"
          label="Today's Expenses"
          value={`$${todayExpenses.toFixed(0)}`}
          subtitle={`${todayReceipts.length} receipts`}
          color="green"
        />
        <StatCard
          icon="⏰"
          label="Hours Today"
          value={todayHours.toFixed(1)}
          subtitle={`${todayEntries.length} entries`}
          color="blue"
        />
        <StatCard
          icon="📸"
          label="Reports Sent"
          value={weekReports.length}
          subtitle="This week"
          color="orange"
        />
        <StatCard
          icon="📋"
          label="Active Projects"
          value="3"
          subtitle="2 on schedule"
          color="purple"
        />
      </div>

      <QuickActions />
      <ActivityList />
    </div>
  );
}