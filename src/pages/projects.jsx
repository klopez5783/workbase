import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Briefcase, 
  FileText, 
  FolderOpen, 
  MapPin, 
  Users,
  ChevronRight,
  Loader,
  Settings,
  Clock10
} from 'lucide-react';
import { firestoreService } from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';
import { useEmployeeStore } from '../features/employees/store/employeeStore';
import ProjectForm from '../features/projects/components/ProjectForm';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  
  const { currentUser } = useAuth();
  const currentEmployee = useEmployeeStore((state) => state.currentEmployee);
  const navigate = useNavigate();

  const isAdmin = currentEmployee?.role === 'admin';

  // Load projects from Firestore
  useEffect(() => {
    const loadProjects = async () => {
      if (!currentUser) return;

      try {
        const result = await firestoreService.getAll('projects');
        
        if (result.success && result.data) {
          // Convert Firestore data to project objects
          const projectObjects = result.data.map(doc => ({
            id: doc.id,
            name: doc.name || 'Unnamed Project',
            address: doc.address || '',
            location: doc.location || null,
            clientName: doc.clientName || '',
            clientPhone: doc.clientPhone || '',
            status: doc.status || 'active',
            assignedEmployees: doc.assignedEmployees || [],
            geofenceRadius: doc.geofenceRadius || 100,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
          }));
          
          setProjects(projectObjects);
        }
      } catch (error) {
        console.error('Error loading projects:', error);
      }
      
      setLoading(false);
    };

    loadProjects();
  }, [currentUser]);

  const handleProjectSelect = (project) => {
    setSelectedProject(project);
  };

  const handleBack = () => {
    setSelectedProject(null);
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setShowEditForm(true);
  };

  const handleCloseForm = async () => {
    setShowEditForm(false);
    setEditingProject(null);
    // Reload projects after edit
    const result = await firestoreService.getAll('projects');
    if (result.success && result.data) {
      const projectObjects = result.data.map(doc => ({
        id: doc.id,
        name: doc.name || 'Unnamed Project',
        address: doc.address || '',
        location: doc.location || null,
        clientName: doc.clientName || '',
        clientPhone: doc.clientPhone || '',
        status: doc.status || 'active',
        assignedEmployees: doc.assignedEmployees || [],
        geofenceRadius: doc.geofenceRadius || 100,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      }));
      setProjects(projectObjects);
      
      // Update selected project if it was edited
      if (selectedProject) {
        const updatedProject = projectObjects.find(p => p.id === selectedProject.id);
        if (updatedProject) {
          setSelectedProject(updatedProject);
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="p-5 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4 text-blue-600" size={40} />
          <p className="text-gray-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  // Show project details view when a project is selected
  if (selectedProject) {
    return (
      <div className="p-5 pb-24">
        {/* Header with Back Button */}
        <div className="mb-6">
          <button
            onClick={handleBack}
            className="text-blue-600 font-semibold mb-4 flex items-center gap-2"
          >
            ← Back to Projects
          </button>
          
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {selectedProject.name}
                </h1>
                <div className="flex items-start gap-2 text-gray-600 mb-3">
                  <MapPin size={18} className="mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{selectedProject.address}</p>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Users size={18} />
                  <p className="text-sm">{selectedProject.clientName}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Reports Section */}
        {/* {isAdmin && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3 px-2">Reports</h2>
            <div className="space-y-3">

              {/* <button
                onClick={() => navigate(`/reports/production?projectId=${selectedProject.id}`)}
                className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition border border-gray-200 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <FileText className="text-green-600" size={24} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-900">Production Report</p>
                    <p className="text-sm text-gray-600">View productivity metrics</p>
                  </div>
                </div>
                <ChevronRight className="text-gray-400" size={20} />
              </button>

              <button
                onClick={() => navigate(`/reports/cost?projectId=${selectedProject.id}`)}
                className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition border border-gray-200 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <FileText className="text-purple-600" size={24} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-900">Cost Report</p>
                    <p className="text-sm text-gray-600">View project costs</p>
                  </div>
                </div>
                <ChevronRight className="text-gray-400" size={20} />
              </button> 
            </div>
          </div>
        )} */}
        {/* Worker Actions Section */}
        {!isAdmin && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3 px-2">My Work</h2>
            <div className="space-y-3">
              <button
                onClick={() => navigate(`/daily-work-log?projectId=${selectedProject.id}`)}
                className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition border border-gray-200 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <FileText className="text-blue-600" size={24} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-900">Work Log</p>
                    <p className="text-sm text-gray-600">Log daily work activities</p>
                  </div>
                </div>
                <ChevronRight className="text-gray-400" size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Documents Section (Admin Only) */}
        {isAdmin && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-3 px-2">Admin Tools</h2>
            <div className="space-y-3">

              <button
                onClick={() => navigate(`/reports/timecard?projectId=${selectedProject.id}`)}
                className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition border border-gray-200 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Clock10 className="text-blue-600" size={24} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-900">Timecard Report</p>
                    <p className="text-sm text-gray-600">View hours worked</p>
                  </div>
                </div>
                <ChevronRight className="text-gray-400" size={20} />
              </button>

              <button
                onClick={() => navigate(`/docs/project?projectId=${selectedProject.id}`)}
                className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition border border-gray-200 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <FolderOpen className="text-orange-600" size={24} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-900">Project Documents</p>
                    <p className="text-sm text-gray-600">Plans, permits, photos</p>
                  </div>
                </div>
                <ChevronRight className="text-gray-400" size={20} />
              </button>

                <button
                  onClick={() => navigate('/admin/work-logs')}
                  className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition border border-gray-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <FileText className="text-indigo-600" size={24} />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-gray-900">Daily Logs</p>
                      <p className="text-sm text-gray-600">View site activity logs</p>
                    </div>
                  </div>
                  <ChevronRight className="text-gray-400" size={20} />
                </button>
            </div>
          </div>
        )}

        {/* Footer - Admin Settings (Only for Admins) */}
        {isAdmin && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-area-bottom z-30">
            <div className="max-w-md mx-auto">
              <button
                onClick={() => navigate('/admin/projects')}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-xl font-semibold transition flex items-center justify-center gap-2"
              >
                <Settings size={20} />
                Manage Project Settings
              </button>
            </div>
          </div>
        )}

        {/* Edit Project Form Modal */}
        {isAdmin && showEditForm && (
          <ProjectForm
            onClose={handleCloseForm}
            existingProject={editingProject}
          />
        )}
      </div>
    );
  }

  // Show projects list view
  return (
    <div className="p-5 pb-24">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <p className="text-gray-600 text-sm mt-1">
          {projects.length} active job {projects.length === 1 ? 'site' : 'sites'}
        </p>
      </div>

      {/* Projects List */}
      {projects.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center">
          <Briefcase size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Projects Assigned</h3>
          <p className="text-gray-600">
            You haven't been assigned to any projects yet. Contact your administrator.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => handleProjectSelect(project)}
              className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition border border-gray-200 flex items-center justify-between"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Briefcase className="text-blue-600" size={24} />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">{project.name}</p>
                  <p className="text-sm text-gray-600 truncate">{project.address}</p>
                  <p className="text-xs text-gray-500 mt-1">{project.clientName}</p>
                </div>
              </div>
              <ChevronRight className="text-gray-400 flex-shrink-0" size={20} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}