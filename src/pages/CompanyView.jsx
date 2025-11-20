import { useState, useEffect } from 'react';
import { Building2, Users, LogOut, Loader, ArrowLeft, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { firestoreService } from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';
import { useEmployeeStore } from '../features/employees/store/employeeStore';

export default function CompanyView() {
  const [company, setCompany] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const { currentUser } = useAuth();
  const { currentEmployee } = useEmployeeStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadCompanyData();
  }, [currentEmployee]);

  const loadCompanyData = async () => {
    if (!currentEmployee?.companyId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Load company data
      const companyResult = await firestoreService.getById('companies', currentEmployee.companyId);
      if (companyResult.success) {
        setCompany({ id: currentEmployee.companyId, ...companyResult.data });

        // Load workers count
        const workersResult = await firestoreService.getAll('users');
        if (workersResult.success) {
          const companyWorkers = workersResult.data.filter(
            user => companyResult.data.workers?.includes(user.id)
          );
          setWorkers(companyWorkers);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading company data:', error);
      setLoading(false);
    }
  };

  const handleLeaveCompany = async () => {
    if (!company || !currentUser) return;

    try {
      // Update company to remove worker
      const updatedWorkers = (company.workers || []).filter(id => id !== currentUser.uid);
      await firestoreService.update('companies', company.id, {
        workers: updatedWorkers,
        updatedAt: new Date().toISOString(),
      });

      // Update worker's profile to remove companyId
      await firestoreService.update('users', currentUser.uid, {
        companyId: null,
        updatedAt: new Date().toISOString(),
      });

      // Update local state
      const userResult = await firestoreService.getById('users', currentUser.uid);
      if (userResult.success) {
        useEmployeeStore.getState().setCurrentEmployee(userResult.data);
      }

      setShowLeaveConfirm(false);
      navigate('/');
    } catch (error) {
      console.error('Error leaving company:', error);
      alert('Failed to leave company');
    }
  };

  if (loading) {
    return (
      <div className="p-5 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4 text-blue-600" size={40} />
          <p className="text-gray-600">Loading company data...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-5 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft size={24} className="text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Company Info</h1>
        </div>

        <div className="bg-white rounded-xl p-12 text-center">
          <Building2 size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Not Part of a Company</h3>
          <p className="text-gray-600">
            You haven't been added to any company yet. Contact your administrator to get added.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Info</h1>
          <p className="text-gray-600 text-sm mt-1">
            View your company details
          </p>
        </div>
      </div>

      {/* Company Info Card */}
      <div className="bg-white rounded-xl p-6 mb-4 border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
            <Building2 size={32} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{company.name}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {workers.length} {workers.length === 1 ? 'worker' : 'workers'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
          <div>
            <p className="text-xs text-gray-500 mb-1">Member Since</p>
            <p className="text-sm font-medium text-gray-900">
              {new Date(currentEmployee.createdAt || Date.now()).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Total Workers</p>
            <p className="text-sm font-medium text-gray-900">{workers.length}</p>
          </div>
        </div>
      </div>

      {/* Leave Company Card */}
      <div className="bg-white rounded-xl p-6 border border-red-200">
        <div className="flex items-start gap-3 mb-4">
          <AlertCircle size={24} className="text-red-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Leave Company</h3>
            <p className="text-sm text-gray-600">
              If you leave this company, you will lose access to all projects and time entries associated with it.
              You can be added back by an administrator.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowLeaveConfirm(true)}
          className="w-full bg-red-50 text-red-600 px-4 py-3 rounded-lg font-semibold hover:bg-red-100 transition inline-flex items-center justify-center gap-2"
        >
          <LogOut size={18} />
          Leave Company
        </button>
      </div>

      {/* Leave Confirmation Modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-5 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle size={24} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  Leave {company.name}?
                </h3>
                <p className="text-sm text-gray-600">
                  Are you sure you want to leave this company? This action will remove your access to all company projects.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleLeaveCompany}
                className="flex-1 bg-red-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-red-700 transition"
              >
                Leave Company
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
