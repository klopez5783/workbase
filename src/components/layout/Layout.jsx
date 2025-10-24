import { Outlet, useLocation } from 'react-router-dom';
import TopBar from './TopBar';
import BottomNav from './BottomNav';

export default function Layout() {
  const location = useLocation();

  const getTitleFromPath = (path) => {
    const titles = {
      '/': 'Dashboard',
      '/receipts': 'Receipts',
      '/time': 'Time Tracking',
      '/reports': 'Daily Reports',
      '/documents': 'Documents',
    };
    return titles[path] || 'FieldConnect Pro';
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <TopBar title={getTitleFromPath(location.pathname)} />
      <main className="max-w-md mx-auto">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}