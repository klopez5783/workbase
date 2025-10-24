import { Home, Receipt, Clock, Camera, FileText } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/receipts', icon: Receipt, label: 'Receipts' },
    { path: '/time', icon: Clock, label: 'Time' },
    { path: '/reports', icon: Camera, label: 'Reports' },
    { path: '/documents', icon: FileText, label: 'Docs' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 pb-5 pt-2 shadow-lg">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all active:scale-95"
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-gray-100'
                }`}
              >
                <Icon size={24} />
              </div>
              <span
                className={`text-xs font-medium ${
                  isActive ? 'text-blue-600' : 'text-gray-500'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}