import { Clock, Camera, Send, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { useGeolocation } from '../../hooks/useGeolocation';

export default function QuickActions() {
  const navigate = useNavigate();
  const { currentClockIn, clockIn, clockOut } = useStore();
  const { getCurrentLocation } = useGeolocation();

  const handleClockIn = async () => {
    try {
      const location = await getCurrentLocation();
      const entry = {
        id: Date.now().toString(),
        workerId: 'current-user',
        workerName: 'Current User',
        clockIn: new Date().toISOString(),
        location: location || { latitude: 0, longitude: 0 },
        projectId: 'current-project',
        verified: true,
      };
      clockIn(entry);
    } catch (error) {
      console.error('Clock in error:', error);
      alert('Please enable location permissions to clock in');
    }
  };

  const handleClockOut = () => {
    if (!currentClockIn) return;
    const now = new Date();
    const start = new Date(currentClockIn.clockIn);
    const hours = (now - start) / (1000 * 60 * 60);
    clockOut(Number(hours.toFixed(2)));
  };

  const actions = [
    {
      icon: Clock,
      label: currentClockIn ? 'Clock Out' : 'Clock In',
      onClick: currentClockIn ? handleClockOut : handleClockIn,
      gradient: currentClockIn
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