import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Briefcase, 
  FileText, 
  FolderOpen, 
  Clock10,
  Send,
  ArrowLeft,
  ChevronRight,
  Loader,
  ToolCase 
} from 'lucide-react';
import { firestoreService } from '../../services/firestoreService';
import { useAuth } from '../../contexts/AuthContext';
import { useEmployeeStore } from '../../features/employees/store/employeeStore';

export default function AdminTools() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  
  const { currentUser } = useAuth();
  const currentEmployee = useEmployeeStore((state) => state.currentEmployee);
  const navigate = useNavigate();

  const isAdmin = currentEmployee?.role === 'admin';

  // Load projects
  useEffect(() => {
    const loadProjects = async () => {
      if (!currentUser || !currentEmployee) return;

      try {
        const result = await firestoreService.getAll('projects');

        if (result.success && result.data) {
          const projectObjects = result.data.map(doc => ({
            id: doc.id,
            name: doc.name || 'Unnamed Project',
            address: doc.address || '',
            clientName: doc.clientName || '',
            status: doc.status || 'active',
            assignedEmployees: doc.assignedEmployees || [],
            createdBy: doc.createdBy || null,
          }));

          // Filter projects to show only those belonging to the current company
          const companyProjects = projectObjects.filter(
            project => project.createdBy === currentEmployee.companyId
          );

          setProjects(companyProjects);
        }
      } catch (error) {
        console.error('Error loading projects:', error);
      }

      setLoading(false);
    };

    loadProjects();
  }, [currentUser, currentEmployee]);

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

    return (
      <div className="p-5 pb-24">
        {/* Back Button */}

        {/* Admin Tools */}
        <div>
          <div className="flex flex-row items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900 mb-3">Admin Tools </h2>
            <ToolCase  className="text-blue-600 mb-3" size={30} />
          </div>
          <div className="space-y-3">
            {/* Timecard Report */}
            <button
              onClick={() => navigate(`/reports/time-card`)}
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

            {/* Project Documents */}
            {/* <button
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
            </button> */}

            {/* Daily Logs */}
            <button
              onClick={() => navigate(`/admin/work-logs`)}
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

            {/* Work Log */}
            <button
              onClick={() => navigate('/daily-work-log')}
              className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition border border-gray-200 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Send className="text-green-600" size={24} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900">Submit Work Log</p>
                  <p className="text-sm text-gray-600">Log daily work activities</p>
                </div>
              </div>
              <ChevronRight className="text-gray-400" size={20} />
            </button>

                <button
        onClick={() => navigate('/reports/generator', {
            state: {
            selectedProject: selectedProject
            }
        })}
        className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition border border-gray-200 flex items-center justify-between"
        >
        <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <FileText className="text-purple-600" size={24} />
            </div>
            <div className="text-left">
            <p className="font-bold text-gray-900">Reports Generator</p>
            <p className="text-sm text-gray-600">Create custom reports</p>
            </div>
        </div>
        <ChevronRight className="text-gray-400" size={20} />
        </button>
          </div>
        </div>
      </div>
    );
}