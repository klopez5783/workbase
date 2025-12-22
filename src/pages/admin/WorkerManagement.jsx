import { useState, useEffect } from 'react';
import { Plus, Users, Loader, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { firestoreService } from '../../services/firestoreService';
import { useAuth } from '../../contexts/AuthContext';
import { useEmployeeStore } from '../../features/employees/store/employeeStore';
import AddWorkerForm from '../../features/timeTracking/components/AddWorkerForm';
import WorkerCard from '../../features/timeTracking/components/WorkerCard';

export default function WorkerManagement() {
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
      
      console.log("=======Loading Workers=======");
      console.log("Current Employee:", currentEmployee);
      console.log("Company ID to query:", companyId);
      console.log("Company ID type:", typeof companyId);
      
      if (!companyId) {
        console.warn('No company ID found');
        setWorkers([]);
        return;
      }
      
      const result = await firestoreService.getAll('workers', {
        where: [['companyId', '==', companyId]]
      });
      
      console.log("Query result:", result);
      console.log("Number of workers returned:", result.data?.length);
      console.log("Workers data:", result.data);
      
      result.data?.forEach(worker => {
        console.log(`Worker ${worker.id}: companyId = ${worker.companyId} (type: ${typeof worker.companyId})`);
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
    if (!window.confirm(`Remove ${worker.name}? They will no longer be able to clock in.`)) {
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
      alert(`✅ ${worker.name} removed successfully`);
      
    } catch (error) {
      console.error('Error removing worker:', error);
      alert('Error removing worker: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-5 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4 text-blue-600" size={40} />
          <p className="text-gray-600">Loading workers...</p>
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
            title="Go back"
          >
            <ArrowLeft size={24} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Worker Management</h1>
            <p className="text-gray-600 text-sm mt-1">
              {workers.length} {workers.length === 1 ? 'worker' : 'workers'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg transition flex items-center gap-2"
          >
            <Plus size={20} />
            Add Worker
          </button>
        </div>
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
      {workers.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center">
          <Users size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Workers Yet</h3>
          <p className="text-gray-600 mb-6">
            Add your first worker to get started with time tracking
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition inline-flex items-center gap-2"
          >
            <Plus size={20} />
            Add First Worker
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