import { useState, useEffect } from 'react';
import { Plus, Briefcase, Loader, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { firestoreService } from '../../services/firestoreService';
import { useAuth } from '../../contexts/AuthContext';
import { useEmployeeStore } from '../../features/employees/store/employeeStore';
import ProjectForm from '../../features/projects/components/ProjectForm';
import ProjectCard from '../../features/projects/components/AdminProjectCard';
import AssignWorkersModal from '../../features/projects/components/AssignWorkersModal';

export default function ProjectManagement() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [showAssignWorkers, setShowAssignWorkers] = useState(false);
  const [assigningProject, setAssigningProject] = useState(null);

  const { currentUser } = useAuth();
  const { currentEmployee } = useEmployeeStore();
  const navigate = useNavigate();

  // Load projects from Firestore
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    if (!currentEmployee?.companyId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result = await firestoreService.getAll('projects');

      if (result.success && result.data) {
        // Convert Firestore data to project objects
        const projectObjects = result.data.map(doc => ({
          id: doc.id,
          firestoreId: doc.id,
          name: doc.name || 'Unnamed Project',
          address: doc.address || '',
          location: doc.location || null,
          clientName: doc.clientName || '',
          clientPhone: doc.clientPhone || '',
          status: doc.status || 'active',
          assignedWorkers: doc.assignedWorkers || [],
          assignedEmployees: doc.assignedEmployees || [],
          geofenceRadius: doc.geofenceRadius || 100,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
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
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setShowForm(true);
  };

  const handleAssignWorkers = (project) => {
    setAssigningProject(project);
    setShowAssignWorkers(true);
  };

  const handleCloseAssignWorkers = async () => {
    setShowAssignWorkers(false);
    setAssigningProject(null);
    // Reload projects to show updated assignments
    await loadProjects();
  };

  const handleDelete = async (project) => {
    if (!window.confirm(`Delete "${project.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      if (project.firestoreId) {
        await firestoreService.delete('projects', project.firestoreId);
      }
      
      // Refresh the list
      await loadProjects();
      alert('Project deleted successfully');
    } catch (error) {
      alert('Error deleting project: ' + error.message);
    }
  };

  const handleCloseForm = async () => {
    setShowForm(false);
    setEditingProject(null);
    // Refresh projects after form closes
    await loadProjects();
  };

  const handleViewDetails = (project) => {
    alert(`View details for: ${project.name}\n\nThis could navigate to a detailed project view page.`);
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
            <h1 className="text-2xl font-bold text-gray-900">Project Management</h1>
            <p className="text-gray-600 text-sm mt-1">
              {projects.length} total {projects.length === 1 ? 'project' : 'projects'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg transition flex items-center gap-2"
        >
          <Plus size={20} />
          New Project
        </button>
      </div>

      {/* Admin Notice */}
      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 mb-6">
        <p className="text-blue-900 font-medium text-sm">
          🔒 Admin Access
        </p>
        <p className="text-blue-700 text-sm mt-1">
          You can create, edit, and delete your own projects. Only projects you create will be visible to you.
        </p>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center">
          <Briefcase size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Projects Yet</h3>
          <p className="text-gray-600 mb-6">
            Create your first job site to start tracking time and managing workers
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition inline-flex items-center gap-2"
          >
            <Plus size={20} />
            Create First Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={() => handleEdit(project)}
              onDelete={() => handleDelete(project)}
              onViewDetails={() => handleViewDetails(project)}
              onAssignWorkers={() => handleAssignWorkers(project)}
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <ProjectForm
          onClose={handleCloseForm}
          existingProject={editingProject}
        />
      )}

      {/* Assign Workers Modal */}
      {showAssignWorkers && assigningProject && (
        <AssignWorkersModal
          project={assigningProject}
          onClose={handleCloseAssignWorkers}
          onSuccess={handleCloseAssignWorkers}
        />
      )}
    </div>
  );
}