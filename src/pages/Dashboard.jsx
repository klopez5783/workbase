import { useState, useEffect } from 'react';
import { useTimeTrackingStore } from '../features/timeTracking/store/timeTrackingStore';
import { useProjectStore } from '../features/projects/store/projectstore';
import { useEmployeeStore } from '../features/employees/store/employeeStore';
import { firestoreService } from '../services/firestoreService';
import StatCard from '../components/dashboard/StatCard';
import QuickActions from '../components/dashboard/QuickActions';
import ActivityList from '../components/dashboard/ActivityList';
import WorkerLinkStatus from '../components/WorkerLinkStatus';
import { useAuth } from '../contexts/AuthContext';
import AdminOnboardingWizard from '../features/onboarding/components/AdminOnboardingWizard';
import LanguageSwitcher from '../components/dashboard/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { Briefcase, Clock, Users, AlertCircle } from 'lucide-react'; // ADDED: Missing imports

export default function Dashboard() {
  const { t } = useTranslation();
  const { activeShift } = useTimeTrackingStore();
  const { currentEmployee } = useEmployeeStore();
  const { projects } = useProjectStore();
  
  // State for Firebase data
  const [employees, setEmployees] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [reports, setReports] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]); // ADDED: Local state for timeEntries
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Fetch all data from Firebase
  useEffect(() => {
    const fetchData = async () => {
      if (!currentEmployee?.companyId) return;

      setLoading(true);
      try {
        // Fetch employees
        const employeesResult = await firestoreService.getAll('users');
        if (employeesResult.success) {
          setEmployees(employeesResult.data.filter(u => u.role === 'worker'));
        }

        // Load time entries for statistics
        const entriesResult = await firestoreService.getAll('timeEntries');
        if (entriesResult.success) {
          setTimeEntries(entriesResult.data);
        }

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

  // Calculate today's time entries - SAFE: timeEntries is now initialized as []
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
  
  // Calculate on-schedule projects
  const onScheduleProjects = activeProjects.filter(p => {
    return true; // Placeholder
  });

  return (
    <div className="pb-6">
      <WorkerLinkStatus /> 
      
      {/* Summary Stats */}
      <div className="px-5 mt-6">
  <h2 className="text-lg font-bold text-gray-900 mb-3">{t('projectStats.Title')}</h2>
  
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    {/* Table Header */}
    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
      <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
        <span>{t('common.Metric')}</span>
        <span className="text-right">{t('common.Value')}</span>
      </div>
    </div>

    {/* Table Rows */}
    <div className="divide-y divide-gray-100">
      {/* Active Projects Row */}
      <div className="px-4 py-3 hover:bg-gray-50 transition-colors">
        <div className="grid grid-cols-2 gap-4 items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Briefcase className="text-blue-600" size={18} />
            </div>
            <span className="text-sm font-medium text-gray-900">
              {t('dashboard.activeProjects')}
            </span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-gray-900">
              {projects.filter(p => p.status === 'active').length}
            </span>
          </div>
        </div>
      </div>

      {/* Total Hours Row */}
      <div className="px-4 py-3 hover:bg-gray-50 transition-colors">
        <div className="grid grid-cols-2 gap-4 items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Clock className="text-green-600" size={18} />
            </div>
            <span className="text-sm font-medium text-gray-900">
              {t('projectStats.Total Hours')}
            </span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-gray-900">
              {timeEntries.reduce((sum, entry) => {
                if (!entry.clockOut) return sum;
                const start = entry.clockIn?.toDate ? entry.clockIn.toDate() : new Date(entry.clockIn);
                const end = entry.clockOut?.toDate ? entry.clockOut.toDate() : new Date(entry.clockOut);
                const hours = (end - start) / (1000 * 60 * 60);
                return sum + hours;
              }, 0).toFixed(0)}
            </span>
          </div>
        </div>
      </div>

      {/* Active Workers Row */}
      <div className="px-4 py-3 hover:bg-gray-50 transition-colors">
        <div className="grid grid-cols-2 gap-4 items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="text-purple-600" size={18} />
            </div>
            <span className="text-sm font-medium text-gray-900">
              {t('projectStats.Active Workers')}
            </span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-gray-900">
              {employees.length}
            </span>
          </div>
        </div>
      </div>

      {/* Pending Approvals Row */}
      <div className="px-4 py-3 hover:bg-gray-50 transition-colors">
        <div className="grid grid-cols-2 gap-4 items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertCircle className="text-orange-600" size={18} />
            </div>
            <span className="text-sm font-medium text-gray-900">
              {t('projectStats.Pending Approvals')}
            </span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-gray-900">
              {timeEntries.filter(e => e.status === 'pending').length}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

      {/* Clock In Banner */}
      {activeShift && (
        <div className="mx-5 mt-4 bg-gradient-to-r from-green-50 to-green-100 border-l-4 border-green-500 rounded-xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center text-white flex-shrink-0">
            <span className="text-2xl">⏱</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-green-900 text-sm">
              {t('timeTracking.currentlyWorking')}
            </div>
            <div className="text-xs text-green-700 mt-0.5">
              {activeShift.projectName} • {t('common.since')}{' '}
              {new Date(activeShift.clockIn).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        </div>
      )}

      <LanguageSwitcher />

      <QuickActions />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 px-5 mt-4">
        <StatCard
          icon="💰"
          label={t('dashboard.todayExpenses')}
          value={loading ? '...' : `$${todayExpenses.toFixed(0)}`}
          subtitle={loading ? t('common.loading') : `${todayReceipts.length} ${t('receipts.title').toLowerCase()}`}
          color="green"
        />
        <StatCard
          icon="⏰"
          label={t('dashboard.hoursToday')}
          value={loading ? '...' : todayHours.toFixed(1)}
          subtitle={loading ? t('common.loading') : `${todayEntries.length} ${t('dashboard.entries')}`}
          color="blue"
        />
        <StatCard
          icon="📸"
          label={t('dashboard.reportsSent')}
          value={loading ? '...' : weekReports.length}
          subtitle={t('dashboard.thisWeek')}
          color="orange"
        />
        <StatCard
          icon="📋"
          label={t('dashboard.activeProjects')}
          value={loading ? '...' : activeProjects.length}
          subtitle={loading ? t('common.loading') : `${onScheduleProjects.length} ${t('dashboard.onSchedule')}`}
          color="purple"
        />
      </div>

      <ActivityList />
    </div>
  );
}