import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { firestoreService } from '../services/firestoreService';
import { FileText, Loader, Plus, Calendar, ArrowLeft, CheckCircle, X  } from 'lucide-react';
import WorkLogForm from '../components/WorkLogForm';
import { useEmployeeStore } from '../features/employees/store/employeeStore';
import { useLocation, useNavigate } from 'react-router-dom'; // ← ADD useLocation, useNavigate

export default function DailyWorkLog() {
  const { currentUser } = useAuth();
  const currentEmployee = useEmployeeStore((state) => state.currentEmployee);
  
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [todayLogs, setTodayLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const location = useLocation(); 
  const navigate = useNavigate();
  const [showAlert, setShowAlert] = useState(false); // Add this
  const [alertMessage, setAlertMessage] = useState(''); // Add this

  useEffect(() => {
    loadData();
  }, [currentUser, currentEmployee]);

  useEffect(() => {
    if (location.state?.selectedProject) {
      const passedProject = location.state.selectedProject;
      setSelectedProject(passedProject);
      setShowForm(true); // Automatically show the form

      // Show alert
      setAlertMessage(`Project selected: ${passedProject.name}`);
      setShowAlert(true);
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        setShowAlert(false);
      }, 3000);
      
      // Clean up the state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const loadData = async () => {
    try {
      setLoading(true);

      if (!currentEmployee) {
        setError('Employee profile not found');
        setLoading(false);
        return;
      }

      // Get assigned projects
      const projectsResult = await firestoreService.getAll('projects');
      if (projectsResult.success) {
        // Filter projects assigned to this employee
        const assignedProjects = projectsResult.data.filter(project => 
          project.assignedEmployees?.includes(currentEmployee.id) || 
          !project.assignedEmployees || 
          project.assignedEmployees.length === 0
        );
        setProjects(assignedProjects);
      }

      // Get today's work logs
      await loadTodayLogs(currentEmployee.id);

      setLoading(false);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
      setLoading(false);
    }
  };

  const loadTodayLogs = async (employeeId) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const logsResult = await firestoreService.query('workLogs', [
        { field: 'employeeId', operator: '==', value: employeeId }
      ]);

      if (logsResult.success) {
        const todayOnly = logsResult.data.filter(log => {
          const logDate = log.createdAt?.toDate ? log.createdAt.toDate() : new Date(log.createdAt);
          return logDate >= today;
        });
        setTodayLogs(todayOnly);
      }
    } catch (err) {
      console.error('Error loading today logs:', err);
    }
  };

  const handleSelectProject = (project) => {
    setSelectedProject(project);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedProject(null);
    loadData(); // Reload to show new log
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setSelectedProject(null);
  };

  if (loading) {
    return (
      <div className="p-5 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4 text-blue-600" size={40} />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !currentEmployee) {
    return (
      <div className="p-5">
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
          <p className="text-red-900 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  // Show form when project selected
  if (showForm && selectedProject) {
    return (
      <>
        {/* Alert Toast */}
        {showAlert && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ease-out">
            <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
              <CheckCircle size={20} />
              <span className="font-semibold">{alertMessage}</span>
            </div>
          </div>
        )}

        <WorkLogForm
          projectId={selectedProject.id}
          projectName={selectedProject.name}
          employeeId={currentEmployee.id}
          employeeName={currentEmployee.name}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </>
    );
  }

  // Show project selection
  return (
    <div className="p-5 pb-24">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Daily Work Log</h1>
        <p className="text-gray-600 text-sm mt-1">
          Document your work with photos and description
        </p>
      </div>

      {/* Today's Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-500 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white">
            <Calendar size={24} />
          </div>
          <div>
            <p className="font-semibold text-blue-900">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
            <p className="text-sm text-blue-700">
              {todayLogs.length} work log{todayLogs.length !== 1 ? 's' : ''} submitted today
            </p>
          </div>
        </div>
      </div>

      {/* Instructions Card */}
      <div className="bg-white rounded-xl p-4 mb-6 border border-gray-200">
        <h3 className="font-bold text-gray-900 mb-3">How to Submit a Work Log:</h3>
        <ol className="space-y-2 text-sm text-gray-700">
          <li className="flex gap-2">
            <span className="font-bold text-blue-600">1.</span>
            <span>Select your current project below</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-blue-600">2.</span>
            <span>Describe your completed work (any language)</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-blue-600">3.</span>
            <span>Take photos of your work (at least 1 required)</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-blue-600">4.</span>
            <span>Submit - your work will be auto-translated!</span>
          </li>
        </ol>
      </div>

      {/* Project Selection */}
      {projects.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center">
          <FileText size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Projects Assigned</h3>
          <p className="text-gray-600">
            Contact your supervisor to be assigned to projects
          </p>
        </div>
      ) : (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Select Project</h2>
          <div className="space-y-3">
            {projects.map((project) => {
              const projectLogsToday = todayLogs.filter(log => log.projectId === project.id);
              
              return (
                <button
                  key={project.id}
                  onClick={() => handleSelectProject(project)}
                  className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition border border-gray-200 text-left"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">{project.name}</p>
                      <p className="text-sm text-gray-600 mt-1">{project.address}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {projectLogsToday.length > 0 ? (
                          <span className="text-green-600 font-medium">
                            ✓ {projectLogsToday.length} log{projectLogsToday.length !== 1 ? 's' : ''} today
                          </span>
                        ) : (
                          <span className="text-gray-500">
                            No logs yet today
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex-shrink-0 ml-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Plus className="text-blue-600" size={20} />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Today's Logs Summary */}
      {todayLogs.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Today's Work Logs</h2>
          <div className="space-y-3">
            {todayLogs.map((log) => {
              const logProject = projects.find(p => p.id === log.projectId);
              const logTime = log.createdAt?.toDate ? log.createdAt.toDate() : new Date(log.createdAt);
              
              return (
                <div key={log.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="text-green-600" size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{logProject?.name || 'Unknown Project'}</p>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {log.translatedDescription || log.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <p className="text-xs text-gray-500">
                          {logTime.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        <p className="text-xs text-gray-500">
                          📸 {log.images?.length || 0} photo{log.images?.length !== 1 ? 's' : ''}
                        </p>
                        {log.wasTranslated && (
                          <p className="text-xs text-purple-600 font-medium">
                            🌐 Translated
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}