import { Menu, User } from 'lucide-react';

export default function TopBar({ title = 'WorkBase' }) {
  return (
    <div className="sticky top-0 z-50 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">F</span>
        </div>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      </div>
      <button className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
        <User size={25} className="text-gray-600" />
      </button>
    </div>
  );
}