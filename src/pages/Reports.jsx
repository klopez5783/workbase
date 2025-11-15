import { useNavigate } from 'react-router-dom';
import { FileText, Camera, Calendar } from 'lucide-react';
import { useEmployeeStore } from '../features/employees/store/employeeStore';

export default function Reports() {
  const navigate = useNavigate();
  const currentEmployee = useEmployeeStore((state) => state.currentEmployee);
  const isAdmin = currentEmployee?.role === 'admin';

  return (
    <div className="p-5 space-y-4">
      {/* Daily Work Log - For Workers */}
      <button
        onClick={() => navigate('/daily-work-log')}
        className="w-full bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition border border-gray-200 text-left"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Camera className="text-blue-600" size={28} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">Submit Daily Work Log</h3>
            <p className="text-sm text-gray-600 mt-1">
              Document your work with photos and descriptions
            </p>
          </div>
        </div>
      </button>

      {/* View Reports - For Everyone */}
      <button
        onClick={() => navigate('/daily-reports')}
        className="w-full bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition border border-gray-200 text-left"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <FileText className="text-green-600" size={28} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">View Daily Reports</h3>
            <p className="text-sm text-gray-600 mt-1">
              {isAdmin ? 'Review work logs and generate reports' : 'View daily work reports'}
            </p>
          </div>
        </div>
      </button>

      {/* Coming Soon */}
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Calendar className="text-purple-600" size={28} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">Weekly/Monthly Reports</h3>
            <p className="text-sm text-gray-600 mt-1">Coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
}