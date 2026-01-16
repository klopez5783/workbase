import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Users, Loader, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { firestoreService } from '../../services/firestoreService';
import { useAuth } from '../../contexts/AuthContext';
import { useEmployeeStore } from '../../features/employees/store/employeeStore';
import AddWorkerForm from '../../features/timeTracking/components/AddWorkerForm';
import WorkerCard from '../../features/timeTracking/components/WorkerCard';

export default function WorkerManagement() {
  const { t } = useTranslation();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const { currentUser } = useAuth();
  const { currentEmployee } = useEmployeeStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadWorkers();
  }, []);

  const loadWorkers = async () => {
    try {
      setLoading(true);
      
      const companyId = currentEmployee?.companyId;
      
      if (!companyId) {
        console.warn('No company ID found');
        setWorkers([]);
        return;
      }
      
      const result = await firestoreService.getAll('workers', {
        where: [['companyId', '==', companyId]]
      });
      
      if (result.success && result.data) {
        setWorkers(result.data);
      }
    } catch (error) {
      console.error('Error loading workers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWorker = async (workerData) => {
    await loadWorkers();
    setShowAddForm(false);
  };

  const handleDeleteWorker = async (worker) => {
    if (!window.confirm(t('workerManagement.deleteConfirm', { name: worker.name }))) {
      return;
    }

    try {
      setLoading(true);

      console.log('=== DELETING WORKER ===');
      console.log('Worker object:', worker);
      console.log('Worker ID:', worker.id);
      console.log('Worker access key:', worker.accessKey);

      const projectsResult = await firestoreService.getAll('projects');
      console.log('All projects:', projectsResult.data);

      if (projectsResult.success) {
        const projectsWithWorker = projectsResult.data.filter(project => {
          console.log(`Project: ${project.name}`);
          console.log('  createdBy:', project.createdBy);
          console.log('  assignedWorkers:', project.assignedWorkers);
          console.log('  includes worker.id?', project.assignedWorkers?.includes(worker.id));

          return project.createdBy === currentEmployee?.companyId &&
                 project.assignedWorkers?.includes(worker.id);
        });

        console.log(`Found ${projectsWithWorker.length} projects with this worker`);

        for (const project of projectsWithWorker) {
          console.log(`Updating project: ${project.name}`);
          console.log('  Before:', project.assignedWorkers);
          
          const updatedWorkers = project.assignedWorkers.filter(id => id !== worker.id);
          
          console.log('  After:', updatedWorkers);
          
          await firestoreService.update('projects', project.id, {
            assignedWorkers: updatedWorkers,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      await firestoreService.delete('workers', worker.id);
      
      await loadWorkers();
      alert(t('workerManagement.deleteSuccess', { name: worker.name }));
      
    } catch (error) {
      console.error('Error removing worker:', error);
      alert(t('workerManagement.deleteError') + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-5 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4 text-blue-600" size={40} />
          <p className="text-gray-600">{t('workerManagement.loadingWorkers')}</p>
        </div>
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
            title={t('common.back')}
          >
            <ArrowLeft size={24} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('workers.title')}</h1>
            <p className="text-gray-600 text-sm mt-1">
              {t('workerManagement.workerCount', { count: workers.length })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg transition flex items-center gap-2"
          >
            <Plus size={20} />
            {t('workers.addWorker')}
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 mb-6">
        <p className="text-blue-900 font-medium text-sm">
          {t('workerManagement.infoBox.title')}
        </p>
        <p className="text-blue-700 text-sm mt-1">
          {t('workerManagement.infoBox.description')}
        </p>
      </div>

      {/* Workers List */}
      {workers.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center">
          <Users size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {t('workerManagement.noWorkers.title')}
          </h3>
          <p className="text-gray-600 mb-6">
            {t('workerManagement.noWorkers.description')}
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition inline-flex items-center gap-2"
          >
            <Plus size={20} />
            {t('workerManagement.noWorkers.addButton')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {workers.map((worker) => (
            <WorkerCard
              key={worker.id}
              worker={worker}
              onDelete={() => handleDeleteWorker(worker)}
            />
          ))}
        </div>
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