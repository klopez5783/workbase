import { User, LogOut, Settings, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useEmployeeStore } from '../../features/employees/store/employeeStore';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function TopBar({ title = 'WorkBase' }) {
  const { currentUser, signOut } = useAuth();
  const currentEmployee = useEmployeeStore((state) => state.currentEmployee);
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setShowMenu(false);
  };

  const isAdmin = currentEmployee?.role === 'admin';

  return (
    <div className="sticky top-0 z-50 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">W</span>
        </div>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      </div>

      {/* User Menu */}
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition"
        >
          <User size={20} className="text-gray-600" />
        </button>

        {/* Dropdown Menu */}
        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            ></div>
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-20">
              <div className="px-4 py-3 border-b border-gray-200">
                <p className="text-sm font-semibold text-gray-900">
                  {currentEmployee?.name || currentUser?.email}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {currentEmployee?.role || 'User'}
                </p>
              </div>

              {/* Admin Menu Items */}
              {isAdmin && (
                <div className="border-b border-gray-200 py-1">
                  <button
                    onClick={() => {
                      navigate('/admin/projects');
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition"
                  >
                    <Settings size={16} />
                    Manage Projects
                  </button>
                  <button
                    onClick={() => {
                      navigate('/admin/workers');
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition"
                  >
                    <Users size={16} />
                    Manage Workers
                  </button>
                </div>
              )}

              {/* Sign Out */}
              <div className="py-1">
                <button
                  onClick={handleSignOut}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}