import { Clock, Camera, Send, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTimeTrackingStore } from '../../features/timeTracking/store/timeTrackingStore';

export default function QuickActions() {
  const navigate = useNavigate();
  const activeShift = useTimeTrackingStore((state) => state.activeShift);

  // Navigate to Time page for clock in/out (where proper verification happens)
  const handleClockAction = () => {
    navigate('/time');
  };

  const actions = [
    {
      icon: Clock,
      label: activeShift ? 'Clock Out' : 'Clock In',
      onClick: handleClockAction,  // ← Now navigates to Time page
      gradient: activeShift
        ? 'from-red-500 to-red-600'
        : 'from-blue-500 to-blue-600',
    },
    {
      icon: Camera,
      label: 'Scan Receipt',
      onClick: () => navigate('/receipts'),
      gradient: 'from-green-500 to-green-600',
    },
    {
      icon: Send,
      label: 'Send Report',
      onClick: () => navigate('/reports'),
      gradient: 'from-orange-500 to-orange-600',
    },
    {
      icon: FileText,
      label: 'View Docs',
      onClick: () => navigate('/documents'),
      gradient: 'from-purple-500 to-purple-600',
    },
  ];

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