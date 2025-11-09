import { NavLink } from 'react-router-dom';
import { Home, Clock, Briefcase, FolderOpen, FileText } from 'lucide-react';
import { useEmployeeStore } from '../../features/employees/store/employeeStore';

export default function BottomNav() {

  const currentEmployee = useEmployeeStore((state) => state.currentEmployee);
  const isAdmin = currentEmployee?.role === 'admin';
  const isWorker = currentEmployee?.role === 'worker';

  // Admin navigation items
  const adminNavItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/time', icon: Clock, label: 'Time' },
    { path: '/admin/tools', icon: Briefcase, label: 'Admin' },
  ];
  
  // Worker navigation items
  const workerNavItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/time', icon: Clock, label: 'Time' },
    { path: '/daily-work-log', icon: FileText, label: 'Log Work' },
  ];

  const navItems = isAdmin ? adminNavItems : workerNavItems;


  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom z-40">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 h-full transition ${
                isActive
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-xs mt-1 ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}