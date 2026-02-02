import { Clock, Camera, Send, FileText, Building2, Users, House } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTimeTrackingStore } from '../../features/timeTracking/store/timeTrackingStore';
import { useEmployeeStore } from '../../features/employees/store/employeeStore';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/dashboard/LanguageSwitcher';

export default function QuickActions() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const activeShift = useTimeTrackingStore((state) => state.activeShift);
  const currentEmployee = useEmployeeStore((state) => state.currentEmployee);
  
  const isAdmin = currentEmployee?.role === 'admin';

  // Navigate to Time page for clock in/out (where proper verification happens)
  const handleClockAction = () => {
    navigate('/time');
  };

  // Base actions for all users
  const baseActions = [
    {
      icon: Clock,
      label: activeShift ? t('timeTracking.clockOut') : t('timeTracking.clockIn'),
      onClick: handleClockAction,
      gradient: activeShift
        ? 'from-red-500 to-red-600'
        : 'from-blue-500 to-blue-600',
    },
    {
      icon: Send,
      label: t('reports.submitReport'),
      onClick: () => navigate('/daily-work-log'),
      gradient: 'from-green-500 to-green-600',
    }
  ];

  // Admin-only actions (matching TopBar navigation)
const adminActions = [
    {
      icon: Users,
      label: t('workers.title'),  // "Workers" / "Trabajadores"
      onClick: () => navigate('/admin/workers'),
      gradient: 'from-pink-500 to-pink-600',
    },
    {
      icon: House,
      label: t('projects.title'),  // "Projects" / "Proyectos"
      onClick: () => navigate('/admin/projects'),
      gradient: 'from-cyan-500 to-cyan-600',
    },
    {
      icon: FileText,
      label: t('reports.viewReports'),  // "View Reports" / "Ver Reportes"
      onClick: () => navigate('/admin/work-logs'),
      gradient: 'from-yellow-500 to-yellow-600',
    },
    {
      icon: Camera,
      label: t('receipts.addReceipt'),  // "Add Receipt" / "Agregar Recibo"
      onClick: () => navigate('/receipts'),
      gradient: 'from-emerald-500 to-emerald-600',
    },
    {
      icon: Building2,
      label: t('settings.company'),  // "Account" / "Cuenta"
      onClick: () => navigate('/admin/company'),
      gradient: 'from-indigo-500 to-indigo-600',
    },
    {
      icon: Send,
      label: t('reports.submitReport'),  // "Submit Report" / "Enviar Reporte"
      onClick: () => navigate('/reports/submit'),
      gradient: 'from-green-500 to-green-600',
    }
  ];

  // Combine actions based on role
  const actions = isAdmin ? adminActions : baseActions;

   return (
    <div className="px-5 mt-3">
      <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900 mb-4">{t('quickActions.title')}</h2>
            <LanguageSwitcher />
          </div>
      <div className="grid grid-cols-2 gap-3">
        {actions.map(({ icon: Icon, label, onClick, gradient }) => (
          <button
            key={label}
            onClick={onClick}
            className="bg-white rounded-xl p-2 shadow-sm hover:shadow-md transition-all active:scale-95 flex flex-col items-center gap-2"
          >
            <div
              className={`w-14 h-14 mt-3 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg`}
            >
              <Icon size={28} />
            </div>
            <span className="text-sm font-semibold text-gray-900">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}