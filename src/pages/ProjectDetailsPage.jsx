import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { firestoreService } from '../services/firestoreService';
import ProjectDocuments from '../components/ProjectDocuments';
import {
  Briefcase,
  MapPin,
  Users,
  Clock,
  Calendar,
  Edit,
  Trash2,
  Loader,
  AlertCircle,
  CheckCircle,
  XCircle,
  TrendingUp,
  FileText,
  UserCheck,
  Activity,
  CircleArrowLeft,
  Camera,
  List
} from 'lucide-react';
import AssignWorkersModal from '../features/projects/components/AssignWorkersModal';
import ProjectForm from '../features/projects/components/ProjectForm';
import { useAuth } from '../contexts/AuthContext';
import { useEmployeeStore } from '../features/employees/store/employeeStore';
import { useTranslation } from 'react-i18next';


export default function ProjectDetailsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { currentUser } = useAuth();

  const currentEmployee = useEmployeeStore((state) => state.currentEmployee);
  const isAdmin = currentEmployee?.role ===  "admin";

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [timeEntries, setTimeEntries] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [error, setError] = useState('');
  const [showAssignWorkers, setShowAssignWorkers] = useState(false);
  const [assigningProject, setAssigningProject] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const handleAssignWorkers = () => {
    setAssigningProject(project);
    setShowAssignWorkers(true);
  };

  const handleCloseAssignWorkers = async () => {
    setShowAssignWorkers(false);
    setAssigningProject(null);
    // Reload projects to show updated assignments
    await loadProjectDetails();
  };

  useEffect(() => {
    loadProjectDetails();
  }, [projectId]);

  const handleEdit = () => {
    setEditingProject(project);
    setShowForm(true);
  };

   const handleCloseForm = async () => {
    setShowForm(false);
    setEditingProject(null);
  };

  const loadProjectDetails = async () => {
    try {
      setLoading(true);

      // Load project
      const projectResult = await firestoreService.getById('projects', projectId);
      if (projectResult.success) {
        console.log('Loaded project:', projectResult.data);
      setProject(projectResult.data);
      } else {
        setError('Project not found');
        setLoading(false);
        return;
      }

      // Load time entries for this project
      const entriesResult = await firestoreService.getAll('timeEntries');
      if (entriesResult.success) {
        const projectEntries = entriesResult.data.filter(e => e.projectId === projectId);
        setTimeEntries(projectEntries);

        console.log("=== Loaded Time Entries ===");
        console.log('\n\nProject time entries:', projectEntries);

        const projectWorkers = [...projectResult.data.assignedWorkers , ...projectResult.data.assignedEmployees];
        console.log("========== Project Workers ==========");
        console.log('\n\nProject workers:', projectWorkers);
        setWorkers(projectWorkers);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading project details:', err);
      setError('Failed to load project details');
      setLoading(false);
    }
  };

  const calculateHours = (clockIn, clockOut) => {
    if (!clockOut) return 0;
    const start = clockIn?.toDate ? clockIn.toDate() : new Date(clockIn);
    const end = clockOut?.toDate ? clockOut.toDate() : new Date(clockOut);
    return (end - start) / (1000 * 60 * 60);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getWorkerName = (workerId) => {
    const worker = workers.find(w => w === workerId);
    return worker ? `${worker}` : 'Unknown Worker';
  };

  // Calculate statistics
  const totalHours = timeEntries.reduce((sum, entry) => 
    sum + calculateHours(entry.clockIn, entry.clockOut), 0
  );

  const pendingCount = timeEntries.filter(e => e.status === 'pending').length;
  const approvedCount = timeEntries.filter(e => e.status === 'approved').length;
  const rejectedCount = timeEntries.filter(e => e.status === 'rejected').length;

  // Recent activity (last 5 entries)
  const recentEntries = [...timeEntries]
    .sort((a, b) => {
      const dateA = a.clockIn?.toDate ? a.clockIn.toDate() : new Date(a.clockIn);
      const dateB = b.clockIn?.toDate ? b.clockIn.toDate() : new Date(b.clockIn);
      return dateB - dateA;
    })
    .slice(0, 5);

  // Worker statistics
const workerStats = workers.map(worker => {  // worker is a string ID
  const workerEntries = timeEntries.filter(e => {
    return e.userId === worker || e.workerId === worker;
  }).map(entry => ({
    ...entry,
    type: entry.userId === worker ? 'user' : 'worker'
  }));
  
  const workerHours = workerEntries.reduce((sum, entry) => 
    sum + calculateHours(entry.clockIn, entry.clockOut), 0
  );

  const workerName = workerEntries.length > 0 
    ? (workerEntries[0].userName || workerEntries[0].workerName || 'Unknown')
    : 'Unknown';

  return {
    id: worker,
    name: workerName,
    totalHours: workerHours,
    entryCount: workerEntries.length,
    type: workerEntries[0]?.type  // ✅ Include type from first entry
  };
}).sort((a, b) => b.totalHours - a.totalHours);

  console.log("=== Worker Stats ===");
  console.log('\n\n', workerStats);

  if (loading) {
    return (
      <div className="p-5 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4 text-blue-600" size={40} />
          <p className="text-gray-600">Loading project details...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-5 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 text-red-600" size={64} />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Project Not Found</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/admin/projects')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            <CircleArrowLeft size={25} /> 
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-5 pb-24">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <button
            onClick={() => navigate('/admin/projects')}
            className="text-blue-600 font-semibold mb-4 flex items-center gap-2 hover:text-blue-700 transition"
          >
            <CircleArrowLeft size={25} /> 
            {t('projects.backToProjects')}
          </button>

          {/* Project Title Section */}
          <div className="bg-gradient-to-r mb-4 from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Briefcase size={32} />
                  <h1 className="text-3xl font-bold">{project.name}</h1>
                </div>
                {project.clientName && (
                  <p className="text-blue-100 text-lg mb-2">Client: {project.clientName}</p>
                )}
                {project.address && (
                  <div className="flex items-start gap-2 text-blue-100">
                    <MapPin size={18} className="mt-1 flex-shrink-0" />
                    <span>{project.address}</span>
                  </div>
                )}
              </div>
              <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                project.status === 'active'
                  ? 'bg-green-400 text-green-900'
                  : 'bg-gray-400 text-gray-900'
              }`}>
                {project.status || t('project.active')}
              </span>
            </div>
            
            {/* Quick Actions */}
            <div className="flex gap-3 mt-4">
            <button
              onClick={() => navigate(`/reports/time-card?projectId=${projectId}`)}
              className="flex-1 bg-white text-blue-600 px-4 py-3 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Clock size={18} />
              {t('Hours.ViewHours')}
            </button>
            <button
              onClick={handleEdit}
              className="px-4 py-3 rounded-lg font-semibold border-2 border-white text-white hover:bg-white hover:text-blue-600 transition-all flex items-center gap-2"
            >
              <Edit size={18} />
              {t('projects.editProject')}
            </button>
          </div>

            
            
        </div>
            
          {/* Statistics Grid */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {/* Total Hours */}
            <div className="bg-white rounded-xl p-2 shadow-sm border border-gray-200">
              <div className="flex flex-col items-center text-center">
                <div className="p-2 bg-blue-100 rounded-lg mb-2">
                  <Clock className="text-blue-600" size={20} />
                </div>
                <p className="text-xs font-medium text-gray-600 mb-1">
                  {t('Hours.totalHours')}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {totalHours.toFixed(1)}
                </p>
              </div>
            </div>

            {/* Workers */}
            <div className="bg-white rounded-xl p-2 shadow-sm border border-gray-200">
              <button 
                onClick={() => handleAssignWorkers()} 
                className="w-full h-full flex flex-col items-center text-center hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="p-2 bg-purple-100 rounded-lg mb-2">
                  <Users className="text-purple-600" size={20} />
                </div>
                <p className="text-xs font-medium text-gray-600 mb-1">
                  {t('workers.title')}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {workers.length}
                </p>
              </button>
            </div>

            {/* Approved
            <div className="bg-white rounded-xl p-2 shadow-sm border border-gray-200">
              <div className="flex flex-col items-center text-center">
                <div className="p-2 bg-green-100 rounded-lg mb-2">
                  <CheckCircle className="text-green-600" size={20} />
                </div>
                <p className="text-xs font-medium text-gray-600 mb-1">
                  {t('Hours.approved')}
                </p>
                <p className="text-xl font-bold text-green-600">
                  {approvedCount}
                </p>
              </div>
            </div> */}

            {/* Pending */}
            <div className="bg-white rounded-xl p-2 shadow-sm border border-gray-200">
              <div className="flex flex-col items-center text-center">
                <div className="p-2 bg-orange-100 rounded-lg mb-2">
                  <AlertCircle className="text-orange-600" size={20} />
                </div>
                <p className="text-xs font-medium text-gray-600 mb-1">
                  {t('Hours.pending')}
                </p>
                <p className="text-xl font-bold text-orange-600">
                  {pendingCount}
                </p>
              </div>
            </div>
          </div>


        {/* Receipt Actions - Clear Hierarchy */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => navigate(`/projects/${projectId}/receipts/scan`)}
            className="bg-blue-600 text-white px-3 py-4 rounded-xl font-semibold hover:bg-blue-700 hover:shadow-lg transition-all flex items-center justify-center gap-3"
          >
            <Camera size={35} />
            <div className="text-left">
              <div className="font-bold">Scan Receipt</div>
              <div className="text-xs text-blue-100">Upload a new receipt</div>
            </div>
          </button>

          <button
            onClick={() => navigate(`/projects/${projectId}/receipts`)}
            className="bg-white text-blue-600 border-2 border-blue-600 px- py-4 rounded-xl font-semibold hover:bg-blue-50 transition-all flex items-center justify-center gap-3"
          >
            <List size={35} />
            <div className="text-left">
              <div className="font-bold">Receipt List</div>
              <div className="text-xs text-blue-500">View all receipts</div>
            </div>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Workers and Activity */}
          <div className="lg:col-span-2 space-y-6">
            {/* Workers Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="text-blue-600" size={24} />
                <h2 className="text-xl font-bold text-gray-900">{t('projects.project workers')}</h2>
              </div>

              {workerStats.length === 0 ? (
                <div className="text-center py-8">
                  <Users size={48} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-600">No workers assigned yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {workerStats.map((worker) => (
                    <div
                      key={worker.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {worker.name?.[0]}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">
                            {worker.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {worker.entryCount} {worker.entryCount === 1 ? 'entry' : 'entries'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600">
                          {worker.totalHours.toFixed(1)}
                        </p>
                        <p className="text-xs text-gray-600">{t('Hours.title')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="text-green-600" size={24} />
                <h2 className="text-xl font-bold text-gray-900">{t("common.RecentActivity")}</h2>
              </div>

              {recentEntries.length === 0 ? (
                <div className="text-center py-8">
                  <Clock size={48} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-600">No activity yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-gray-900">
                            {entry.workerName}
                          </p>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            entry.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : entry.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {entry.status || t('Hours.pending')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {formatDate(entry.clockIn)} • {formatTime(entry.clockIn)} - {formatTime(entry.clockOut)}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-xl font-bold text-gray-900">
                          {calculateHours(entry.clockIn, entry.clockOut).toFixed(1)}
                        </p>
                        <p className="text-xs text-gray-600">{t('Hours.title')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {timeEntries.length > 5 && (
                <button
                  onClick={() => navigate(`/timecard-report?projectId=${projectId}`)}
                  className="w-full mt-4 bg-blue-50 text-blue-600 py-2 rounded-lg font-semibold hover:bg-blue-100 transition"
                >
                  View All Time Entries
                </button>
              )}
            </div>
          </div>

          {/* Right Column - Project Info & Documents */}
          <div className="space-y-6">

            {/* Project Documents */}
            <ProjectDocuments 
              projectId={project.id}        // or however you access the current project ID
              projectName={project.name}    // or however you access the project name
              readOnly={false}  // true for workers, false for admins
            />
          </div>
        </div>
      </div>

      {/* Assign Workers Modal */}
      {showAssignWorkers && assigningProject && (
        <AssignWorkersModal
          project={assigningProject}
          onClose={handleCloseAssignWorkers}
          onSuccess={handleCloseAssignWorkers}
        />
      )}

      {/* Form Modal */}
        {showForm && (
          <ProjectForm
            onClose={handleCloseForm}
            existingProject={editingProject}
          />
        )}

    </div>

  </div>
  );
}