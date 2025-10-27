import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Briefcase, 
  FileText, 
  FolderOpen, 
  MapPin, 
  Users,
  Settings,
  ChevronRight,
  Loader
} from 'lucide-react';
import { firestoreService } from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  
  const { currentUser } = useAuth();
  const navigate = useNavigate();

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
            <div className='bg-gray-500'>
                <button
                onClick={() => {
                    navigate('/admin/projects');
                }}
                className="flex items-center gap-2 text-gray-600"
                >
                <Settings size={16} />
                Manage Projects
            </button>
            </div>
          </div>
          
        </div>

        {/* Reports Section */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3 px-2">Reports</h2>
          <div className="space-y-3">
            <button
              onClick={() => navigate(`/reports/timecard?projectId=${selectedProject.id}`)}
              className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition border border-gray-200 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <FileText className="text-blue-600" size={24} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900">Timecard Report</p>
                  <p className="text-sm text-gray-600">View hours worked</p>
                </div>
              </div>
              <ChevronRight className="text-gray-400" size={20} />
            </button>

            <button
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

        {/* Documents Section */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3 px-2">Documents</h2>
          <div className="space-y-3">
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
              onClick={() => navigate(`/docs/dailylog?projectId=${selectedProject.id}`)}
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