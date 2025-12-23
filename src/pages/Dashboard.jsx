import { useState, useEffect } from 'react';
import { useTimeTrackingStore } from '../features/timeTracking/store/timeTrackingStore';
import { useProjectStore } from '../features/projects/store/projectstore';
import { useEmployeeStore } from '../features/employees/store/employeeStore';
import { firestoreService } from '../services/firestoreService';
import BalanceCard from '../components/dashboard/BalanceCard';
import StatCard from '../components/dashboard/StatCard';
import QuickActions from '../components/dashboard/QuickActions';
import ActivityList from '../components/dashboard/ActivityList';
import WorkerLinkStatus from '../components/WorkerLinkStatus';
import { useAuth } from '../contexts/AuthContext';
import AdminOnboardingWizard from '../features/onboarding/components/AdminOnboardingWizard';

export default function Dashboard() {
  const { timeEntries, activeShift } = useTimeTrackingStore();
  const { projects } = useProjectStore();
  const { currentEmployee } = useEmployeeStore();
  
  // State for Firebase data
  const [receipts, setReceipts] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  // Fetch receipts and reports from Firebase
  useEffect(() => {
    const fetchData = async () => {
      if (!currentEmployee?.companyId) return;

      setLoading(true);
      try {
        // Fetch receipts
        const receiptsResult = await firestoreService.getAll('receipts', {
          where: [['companyId', '==', currentEmployee.companyId]]
        });
        if (receiptsResult.success) {
          setReceipts(receiptsResult.data);
        }

        // Fetch reports
        const reportsResult = await firestoreService.getAll('reports', {
          where: [['companyId', '==', currentEmployee.companyId]]
        });
        if (reportsResult.success) {
          setReports(reportsResult.data);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentEmployee?.companyId]);

  useEffect(() => {
    const checkOnboarding = async () => {
      const userProfile = await firestoreService.getById('users', currentUser.uid);
      
      if (userProfile.success) {
        const needsOnboarding = 
          userProfile.data.role === 'admin' && 
          !userProfile.data.companyId;
        
        setShowOnboarding(needsOnboarding);
      }
    };
    
    if (currentUser) checkOnboarding();
  }, [currentUser]);

  if (showOnboarding) {
    return (
      <AdminOnboardingWizard 
        onComplete={() => {
          setShowOnboarding(false);
          window.location.reload();
        }}
      />
    );
  }

  // Calculate today's receipt stats
  const today = new Date().toDateString();
  const todayReceipts = receipts.filter(
    (r) => new Date(r.date || r.createdAt).toDateString() === today
  );
  const todayExpenses = todayReceipts.reduce((sum, r) => sum + (r.amount || 0), 0);

  // Calculate today's time entries
  const todayEntries = timeEntries.filter(
    (e) => new Date(e.clockIn).toDateString() === today
  );
  const todayHours = todayEntries.reduce((sum, e) => sum + (e.hours || 0), 0);

  // Calculate this week's reports
  const weekReports = reports.filter((r) => {
    const reportDate = new Date(r.date || r.createdAt);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return reportDate >= weekAgo;
  });

  // Calculate active projects (status === 'active')
  const activeProjects = projects.filter(p => p.status === 'active');
  
  // Calculate on-schedule projects (you can customize this logic)
  // For now, assuming all active projects are on schedule
  // You might want to add a 'deadline' or 'status' field to determine this
  const onScheduleProjects = activeProjects.filter(p => {
    // Add your logic here, e.g., check if deadline is in the future
    // or if project has a specific status field
    return true; // Placeholder
  });

  return (
    <div className="pb-6">
      <WorkerLinkStatus /> 
      <BalanceCard />

      {/* Clock In Banner */}
      {activeShift && (
        <div className="mx-5 mt-4 bg-gradient-to-r from-green-50 to-green-100 border-l-4 border-green-500 rounded-xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center text-white flex-shrink-0">
            <span className="text-2xl">⏱</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-green-900 text-sm">
              Currently Clocked In
            </div>
            <div className="text-xs text-green-700 mt-0.5">
              {activeShift.projectName} • Since{' '}
              {new Date(activeShift.clockIn).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        </div>
      )}

      <QuickActions />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 px-5 mt-4">
        <StatCard
          icon="💰"
          label="Today's Expenses"
          value={loading ? '...' : `$${todayExpenses.toFixed(0)}`}
          subtitle={loading ? 'Loading...' : `${todayReceipts.length} receipts`}
          color="green"
        />
        <StatCard
          icon="⏰"
          label="Hours Today"
          value={loading ? '...' : todayHours.toFixed(1)}
          subtitle={loading ? 'Loading...' : `${todayEntries.length} entries`}
          color="blue"
        />
        <StatCard
          icon="📸"
          label="Reports Sent"
          value={loading ? '...' : weekReports.length}
          subtitle="This week"
          color="orange"
        />
        <StatCard
          icon="📋"
          label="Active Projects"
          value={loading ? '...' : activeProjects.length}
          subtitle={loading ? 'Loading...' : `${onScheduleProjects.length} on schedule`}
          color="purple"
        />
      </div>

      <ActivityList />
    </div>
  );
}