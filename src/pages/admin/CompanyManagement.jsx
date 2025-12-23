import { useState, useEffect } from 'react';
import { Building2, Users, Plus, Loader, Edit, ArrowLeft, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { firestoreService } from '../../services/firestoreService';
import { useAuth } from '../../contexts/AuthContext';
import { useEmployeeStore } from '../../features/employees/store/employeeStore';
import CompanyForm from '../../features/company/components/CompanyForm';
import CompanyCodeDisplay from '../../components/CompanyCodeDisplay';
import { useCompanyWorkers } from '../../features/timeTracking/hooks/useCompanyWorkers';
import AddWorkerForm from '../../features/timeTracking/components/AddWorkerForm';
import WorkerCard from '../../features/timeTracking/components/WorkerCard';

export default function CompanyManagement() {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const { currentUser } = useAuth();
  const { currentEmployee } = useEmployeeStore();
  const navigate = useNavigate();
  
  // Load workers using the hook
  const { 
    workers: allWorkers, 
    loading: loadingWorkers, 
    loadWorkers 
  } = useCompanyWorkers({ 
    autoLoad: true 
  });

  useEffect(() => {
    loadCompanyData();
  }, [currentEmployee]);

  const loadCompanyData = async () => {
    if (!currentEmployee) return;

    try {
      setLoading(true);

      if (currentEmployee.companyId) {
        const companyResult = await firestoreService.getById('companies', currentEmployee.companyId);
        if (companyResult.success) {
          setCompany({ id: currentEmployee.companyId, ...companyResult.data });
        }
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
      const userResult = await firestoreService.getById('users', currentUser.uid);
      if (userResult.success) {
        useEmployeeStore.getState().setCurrentEmployee(userResult.data);
      }
      await loadCompanyData();
    }
  };

  const handleAddWorkerClick = async () => {
    setShowAddForm(true);
    await loadWorkers();
  };

  const handleAddWorker = async (workerData) => {
    await loadWorkers();
    setShowAddForm(false);
  };

  const handleDeleteWorker = async (worker) => {
    if (!window.confirm(`Remove ${worker.name}? They will no longer be able to clock in.`)) {
      return;
    }

    try {
      setLoading(true);

      console.log('=== DELETING WORKER ===');
      console.log('Worker object:', worker);
      console.log('Worker ID:', worker.id);

      const projectsResult = await firestoreService.getAll('projects');
      console.log('All projects:', projectsResult.data);

      if (projectsResult.success) {
        const projectsWithWorker = projectsResult.data.filter(project => {
          return project.createdBy === currentEmployee?.companyId &&
                 project.assignedWorkers?.includes(worker.id);
        });

        console.log(`Found ${projectsWithWorker.length} projects with this worker`);

        for (const project of projectsWithWorker) {
          console.log(`Updating project: ${project.name}`);
          const updatedWorkers = project.assignedWorkers.filter(id => id !== worker.id);
          
          await firestoreService.update('projects', project.id, {
            assignedWorkers: updatedWorkers,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      await firestoreService.delete('workers', worker.id);
      
      await loadWorkers();
      alert(`✅ ${worker.name} removed successfully`);
      
    } catch (error) {
      console.error('Error removing worker:', error);
      alert('Error removing worker: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeRegenerated = (newCode) => {
    setCompany(prev => ({
      ...prev,
      joinCode: newCode
    }));
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
                {allWorkers.length} {allWorkers.length === 1 ? 'worker' : 'workers'}
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

      {/* Company Join Code Section */}
      <div className="mb-6">
        <CompanyCodeDisplay
          company={company}
          onCodeRegenerated={handleCodeRegenerated}
        />
      </div>

      {/* Workers Section */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-gray-600" />
            <h3 className="text-lg font-bold text-gray-900">Company Workers</h3>
          </div>
          <button
            onClick={handleAddWorkerClick}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition inline-flex items-center gap-2 text-sm"
          >
            <UserPlus size={16} />
            Add Worker
          </button>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 mb-6">
          <p className="text-blue-900 font-medium text-sm">
            📱 Easy Worker Setup
          </p>
          <p className="text-blue-700 text-sm mt-1">
            Add workers with just their name and phone number. They'll receive a text message with a link to clock in—no password needed!
          </p>
        </div>

        {/* Workers List */}
        {loadingWorkers ? (
          <div className="text-center py-8">
            <Loader className="animate-spin mx-auto mb-4 text-blue-600" size={40} />
            <p className="text-gray-600">Loading workers...</p>
          </div>
        ) : allWorkers.length === 0 ? (
          <div className="text-center py-8">
            <Users size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-600">No workers in your company yet</p>
            <p className="text-sm text-gray-500 mt-1">Add workers to assign them to projects</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allWorkers.map(worker => (
              <WorkerCard
                key={worker.id}
                worker={worker}
                onDelete={() => handleDeleteWorker(worker)}
              />
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

      {/* Add Worker Form Modal */}
      {showAddForm && (
        <AddWorkerForm
          onClose={() => setShowAddForm(false)}
          onSuccess={handleAddWorker}
          companyId={currentEmployee?.companyId}
        />
      )}
    </div>
  );
}