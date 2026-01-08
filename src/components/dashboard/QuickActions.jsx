import { Clock, Camera, Send, FileText, Building2, Users, House } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTimeTrackingStore } from '../../features/timeTracking/store/timeTrackingStore';
import { useEmployeeStore } from '../../features/employees/store/employeeStore';

export default function QuickActions() {
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
      label: activeShift ? 'Clock Out' : 'Clock In',
      onClick: handleClockAction,
      gradient: activeShift
        ? 'from-red-500 to-red-600'
        : 'from-blue-500 to-blue-600',
    },
    {
      icon: Send,
      label: 'Submit Report',
      onClick: () => navigate('/reports/submit'),
      gradient: 'from-green-500 to-green-600',
    }
  ];

  // Admin-only actions (matching TopBar navigation)
  const adminActions = [
    {
      icon: Users,
      label: 'Manage Workers',
      onClick: () => navigate('/admin/workers'),
      gradient: 'from-pink-500 to-pink-600',
    },
    {
      icon: House,
      label: 'Manage Projects',
      onClick: () => navigate('/admin/projects'),
      gradient: 'from-cyan-500 to-cyan-600',
    },
    {icon: FileText,
      label: 'View Work Logs',
      onClick: () => navigate('/admin/work-logs'),
      gradient: 'from-yellow-500 to-yellow-600',
    },
    {icon: Camera,
      label: 'Upload Receipt',
      onClick: () => navigate('/receipts/upload'),
      gradient: 'from-emerald-500 to-emerald-600',
    },
     {
      icon: Building2,
      label: 'Manage Company',
      onClick: () => navigate('/admin/company'),
      gradient: 'from-indigo-500 to-indigo-600',
    },
    {
      icon: Send,
      label: "Send Client Report",
      onClick: () => navigate('/reports/submit'),
      gradient: 'from-green-500 to-green-600',
    }
  ];

  // Combine actions based on role
  const actions = isAdmin ? adminActions : baseActions;

  return (
    <div className="px-5 mt-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-3">
        {actions.map(({ icon: Icon, label, onClick, gradient }) => (
          <button
            key={label}
            onClick={onClick}
            className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all active:scale-95 flex flex-col items-center gap-3"
          >
            <div
              className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg`}
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