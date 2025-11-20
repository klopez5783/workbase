import { useState, useEffect } from 'react';
import { Building2, Users, Plus, Trash2, Loader, Edit, ArrowLeft, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { firestoreService } from '../../services/firestoreService';
import { useAuth } from '../../contexts/AuthContext';
import { useEmployeeStore } from '../../features/employees/store/employeeStore';
import CompanyForm from '../../features/company/components/CompanyForm';

export default function CompanyManagement() {
  const [company, setCompany] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [allWorkers, setAllWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [showAddWorker, setShowAddWorker] = useState(false);

  const { currentUser } = useAuth();
  const { currentEmployee } = useEmployeeStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadCompanyData();
  }, [currentEmployee]);

  const loadCompanyData = async () => {
    if (!currentEmployee) return;

    try {
      setLoading(true);

      // Check if user has a company
      if (currentEmployee.companyId) {
        // Load company data
        const companyResult = await firestoreService.getById('companies', currentEmployee.companyId);
        if (companyResult.success) {
          setCompany({ id: currentEmployee.companyId, ...companyResult.data });

          // Load workers that belong to this company
          const workersResult = await firestoreService.getAll('users');
          if (workersResult.success) {
            const companyWorkers = workersResult.data.filter(
              user => companyResult.data.workers?.includes(user.id)
            );
            setWorkers(companyWorkers);
          }
        }
      }

      // Load all workers for adding to company
      const allWorkersResult = await firestoreService.getAll('users');
      if (allWorkersResult.success) {
        // Filter to only workers not in any company or not in current company
        const availableWorkers = allWorkersResult.data.filter(
          user => user.role === 'worker' && (!user.companyId || user.companyId === currentEmployee.companyId)
        );
        setAllWorkers(availableWorkers);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading company data:', error);
      setLoading(false);
    }
  };

  const handleCompanyFormClose = async (success) => {
    setShowCompanyForm(false);
    if (success) {
      // Reload current employee to get updated companyId
      const userResult = await firestoreService.getById('users', currentUser.uid);
      if (userResult.success) {
        useEmployeeStore.getState().setCurrentEmployee(userResult.data);
      }
      await loadCompanyData();
    }
  };

  const handleAddWorker = async (workerId) => {
    if (!company) return;

    try {
      // Update company to add worker
      const updatedWorkers = [...(company.workers || []), workerId];
      await firestoreService.update('companies', company.id, {
        workers: updatedWorkers,
        updatedAt: new Date().toISOString(),
      });

      // Update worker's profile to set companyId
      await firestoreService.update('users', workerId, {
        companyId: company.id,
        updatedAt: new Date().toISOString(),
      });

      await loadCompanyData();
      setShowAddWorker(false);
    } catch (error) {
      console.error('Error adding worker:', error);
      alert('Failed to add worker to company');
    }
  };

  const handleRemoveWorker = async (workerId) => {
    if (!company) return;

    if (!window.confirm('Remove this worker from your company?')) {
      return;
    }

    try {
      // Update company to remove worker
      const updatedWorkers = (company.workers || []).filter(id => id !== workerId);
      await firestoreService.update('companies', company.id, {
        workers: updatedWorkers,
        updatedAt: new Date().toISOString(),
      });

      // Update worker's profile to remove companyId
      await firestoreService.update('users', workerId, {
        companyId: null,
        updatedAt: new Date().toISOString(),
      });

      await loadCompanyData();
    } catch (error) {
      console.error('Error removing worker:', error);
      alert('Failed to remove worker from company');
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

  // Show create company form if no company exists
  if (!company && !showCompanyForm) {
    return (
      <div className="p-5 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft size={24} className="text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Company Management</h1>
        </div>

        <div className="bg-white rounded-xl p-12 text-center">
          <Building2 size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Company Yet</h3>
          <p className="text-gray-600 mb-6">
            Create your company to start managing projects and workers
          </p>
          <button
            onClick={() => setShowCompanyForm(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition inline-flex items-center gap-2"
          >
            <Plus size={20} />
            Create Company
          </button>
        </div>

        {showCompanyForm && (
          <CompanyForm onClose={handleCompanyFormClose} />
        )}
      </div>
    );
  }

  return (
    <div className="p-5 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft size={24} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Company Management</h1>
            <p className="text-gray-600 text-sm mt-1">
              Manage your company and workers
            </p>
          </div>
        </div>
      </div>

      {/* Company Info Card */}
      <div className="bg-white rounded-xl p-6 mb-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Building2 size={24} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{company?.name}</h2>
              <p className="text-sm text-gray-500">
                {workers.length} {workers.length === 1 ? 'worker' : 'workers'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCompanyForm(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            title="Edit company"
          >
            <Edit size={20} className="text-gray-600" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
          <div>
            <p className="text-xs text-gray-500 mb-1">Created</p>
            <p className="text-sm font-medium text-gray-900">
              {new Date(company?.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Last Updated</p>
            <p className="text-sm font-medium text-gray-900">
              {new Date(company?.updatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Workers Section */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-gray-600" />
            <h3 className="text-lg font-bold text-gray-900">Company Workers</h3>
          </div>
          <button
            onClick={() => setShowAddWorker(!showAddWorker)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition inline-flex items-center gap-2 text-sm"
          >
            <UserPlus size={16} />
            Add Worker
          </button>
        </div>

        {/* Add Worker Section */}
        {showAddWorker && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm font-semibold text-gray-700 mb-3">Select a worker to add:</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {allWorkers.filter(w => !company.workers?.includes(w.id)).length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No available workers to add
                </p>
              ) : (
                allWorkers
                  .filter(w => !company.workers?.includes(w.id))
                  .map(worker => (
                    <button
                      key={worker.id}
                      onClick={() => handleAddWorker(worker.id)}
                      className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition"
                    >
                      <p className="font-medium text-gray-900">{worker.name}</p>
                      <p className="text-sm text-gray-500">{worker.email}</p>
                    </button>
                  ))
              )}
            </div>
          </div>
        )}

        {/* Workers List */}
        {workers.length === 0 ? (
          <div className="text-center py-8">
            <Users size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-600">No workers in your company yet</p>
            <p className="text-sm text-gray-500 mt-1">Add workers to assign them to projects</p>
          </div>
        ) : (
          <div className="space-y-3">
            {workers.map(worker => (
              <div
                key={worker.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div>
                  <p className="font-medium text-gray-900">{worker.name}</p>
                  <p className="text-sm text-gray-500">{worker.email}</p>
                  {worker.phone && (
                    <p className="text-sm text-gray-500">{worker.phone}</p>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveWorker(worker.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Remove worker"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Company Form Modal */}
      {showCompanyForm && (
        <CompanyForm
          onClose={handleCompanyFormClose}
          existingCompany={company}
        />
      )}
    </div>
  );
}
