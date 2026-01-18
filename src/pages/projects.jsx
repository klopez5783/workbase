import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { firestoreService } from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';
import { useEmployeeStore } from '../features/employees/store/employeeStore';
import {
  Briefcase,
  MapPin,
  Users,
  Clock,
  Calendar,
  DollarSign,
  TrendingUp,
  Plus,
  Edit,
  Trash2,
  Eye,
  Loader,
  Search,
  Filter,
  ArrowLeft,
  AlertCircle,
  Building2
} from 'lucide-react';
import Alert from '../components/Alert';
import ProjectFormSelector from '../features/projects/components/ProjectFormSelector';
import { useTranslation } from 'react-i18next';

export default function ProjectsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { currentEmployee } = useEmployeeStore();

  // Data states
  const [projects, setProjects] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [showCompanyAlert, setShowCompanyAlert] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load projects and filter by current company
      const projectsResult = await firestoreService.getAll('projects');
      if (projectsResult.success) {
        // Filter projects to show only those belonging to the current company
        const companyProjects = projectsResult.data.filter(
          project => project.createdBy === currentEmployee?.companyId
        );
        setProjects(companyProjects);
      }

      // Load time entries for statistics
      const entriesResult = await firestoreService.getAll('timeEntries');
      if (entriesResult.success) {
        setTimeEntries(entriesResult.data);
      }

      // Load employees
      const employeesResult = await firestoreService.getAll('users');
      if (employeesResult.success) {
        setEmployees(employeesResult.data.filter(u => u.role === 'worker'));
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const handleCloseForm = async () => {
    setShowForm(false);
    setEditingProject(null);
    await loadData();
  };

  // Calculate project statistics
  const getProjectStats = (projectId) => {
    const projectEntries = timeEntries.filter(e => e.projectId === projectId);
    
    const totalHours = projectEntries.reduce((sum, entry) => {
      if (!entry.clockOut) return sum;
      const start = entry.clockIn?.toDate ? entry.clockIn.toDate() : new Date(entry.clockIn);
      const end = entry.clockOut?.toDate ? entry.clockOut.toDate() : new Date(entry.clockOut);
      const hours = (end - start) / (1000 * 60 * 60);
      return sum + hours;
    }, 0);

    const uniqueWorkers = [...new Set(projectEntries.map(e => e.employeeId))].length;
    const pendingApprovals = projectEntries.filter(e => e.status === 'pending').length;
    const lastActivity = projectEntries.length > 0
      ? projectEntries.sort((a, b) => {
          const dateA = a.clockIn?.toDate ? a.clockIn.toDate() : new Date(a.clockIn);
          const dateB = b.clockIn?.toDate ? b.clockIn.toDate() : new Date(b.clockIn);
          return dateB - dateA;
        })[0]
      : null;

    return {
      totalHours: Math.round(totalHours * 10) / 10,
      uniqueWorkers,
      pendingApprovals,
      lastActivity,
      totalEntries: projectEntries.length
    };
  };

  // Filter projects
  const filteredProjects = projects.filter(project => {
    // Status filter
    if (statusFilter === 'active' && project.status !== 'active') return false;
    if (statusFilter === 'completed' && project.status !== 'completed') return false;

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        project.name?.toLowerCase().includes(searchLower) ||
        project.address?.toLowerCase().includes(searchLower) ||
        project.clientName?.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  // Sort by last activity (most recent first)
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    const statsA = getProjectStats(a.id);
    const statsB = getProjectStats(b.id);
    
    if (!statsA.lastActivity) return 1;
    if (!statsB.lastActivity) return -1;
    
    const dateA = statsA.lastActivity.clockIn?.toDate 
      ? statsA.lastActivity.clockIn.toDate() 
      : new Date(statsA.lastActivity.clockIn);
    const dateB = statsB.lastActivity.clockIn?.toDate 
      ? statsB.lastActivity.clockIn.toDate() 
      : new Date(statsB.lastActivity.clockIn);
    
    return dateB - dateA;
  });

  const handleViewProject = (projectId) => {
    navigate(`/project/${projectId}`);
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setShowForm(true);
  };

  const handleViewTimecard = (projectId) => {
    navigate(`/reports/time-card?projectId=${projectId}`);
  };

  const handleDeleteProject = (project) => {
    setProjectToDelete(project);
    setShowDeleteConfirm(true);
  };

  const handleCompanyCheck = () => {
    if(currentEmployee?.companyId) 
      {setShowForm(true)} 
    else 
      {
        setShowCompanyAlert(true)
      }
  }

  const confirmDelete = async () => {
    if (!projectToDelete) return;

    try {
      const result = await firestoreService.delete('projects', projectToDelete.id);
      
      if (result.success) {
        await loadData();
        setShowDeleteConfirm(false);
        setProjectToDelete(null);
      }
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return t('common.never') || 'Never';
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getRelativeTime = (timestamp) => {
    if (!timestamp) return t('common.never') || 'Never';
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return t('timeTracking.today');
    if (diffDays === 1) return t('common.yesterday') || 'Yesterday';
    if (diffDays < 7) return `${diffDays} ${t('common.daysAgo') || 'days ago'}`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} ${t('common.weeksAgo')}`;
    return formatDate(timestamp);
  };

  if (loading) {
    return (
      <div className="p-5 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4 text-blue-600" size={40} />
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-5 pb-24">
      <div className="max-w-7xl mx-auto">

      {/* show Alert if no company */}
      {showCompanyAlert && (
        <div className="mb-6">
          <Alert
            shadeType="red"
            text={t('alerts.createCompanyRequired') || 'Create Company Required'}
            subText={t('alerts.createCompanySubtext') || 'You must create a company profile before adding projects.'}
            actionButton={{
              text: t('alerts.createCompany') || 'Create Company',
              link: '/admin/company',
              icon: Building2
            }}
            onClose={() => setShowCompanyAlert(false)}
          />
        </div>
      )}

        {/* Header */}
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('projects.title')}</h1>
              <p className="text-gray-600 text-sm mt-1">
                {sortedProjects.length} {statusFilter === 'all' ? '' : statusFilter} {sortedProjects.length === 1 ? t('projects.title') || 'project' : t('projects.title') || 'projects'}
              </p>
            </div>

            <button
              onClick={handleCompanyCheck}
              className="bg-blue-600 text-white px-2 py-2 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Plus size={24} />
              {t('projects.createNew')}
            </button>
          </div>
        </div>

        {/* Projects Grid */}
        {sortedProjects.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <Briefcase size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {projects.length === 0 ? t('projects.noProjectsYet') || 'No Projects Yet' : t('projects.noProjectsFound') || 'No Projects Found'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm
                ? t('projects.adjustSearch') || 'Try adjusting your search terms'
                : projects.length === 0
                ? t('projects.getStarted') || 'Get started by creating your first project'
                : statusFilter === 'completed'
                ? t('projects.noCompleted') || 'No completed projects yet. Active projects will appear here once marked as completed.'
                : statusFilter === 'active'
                ? t('projects.noActive') || 'No active projects. Check the "All" or "Completed" filter to see other projects.'
                : t('projects.noMatch') || 'No projects match your current filters'}
            </p>
            {!searchTerm && projects.length === 0 && (
              <button
                onClick={handleCompanyCheck}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition inline-flex items-center gap-2"
              >
                <Plus size={20} />
                {t('projects.createNew')}
              </button>
            )}
            {projects.length > 0 && (
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setSearchTerm('');
                }}
                className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition inline-flex items-center gap-2"
              >
                <Filter size={20} />
                {t('common.clearFilters') || 'Clear Filters'}
              </button>
            )}
          </div>
        ) : (

          <>
            {/* Search and Filters */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-4">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder={t('projects.searchPlaceholder') || 'Search projects, clients, addresses...'}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg text-md"
                  />
                </div>

                {/* Status Filter */}
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setStatusFilter('active')}
                    className={`px-3 py-2 rounded-lg font-semibold transition text-sm ${
                      statusFilter === 'active'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {t('projects.active')}
                  </button>
                  <button
                    onClick={() => setStatusFilter('completed')}
                    className={`px-3 py-2 rounded-lg font-semibold transition text-sm ${
                      statusFilter === 'completed'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {t('projects.completed')}
                  </button>
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-2 rounded-lg font-semibold transition text-sm ${
                      statusFilter === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {t('common.all') || 'All'}
                  </button>
                </div>
              </div>
            </div>
          
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {sortedProjects.map((project) => {
                const stats = getProjectStats(project.id);
                
                return (
                  <div
                    key={project.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Project Header */}
                    <div className={`p-4 ${
                      project.status === 'active' 
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
                        : 'bg-gradient-to-r from-gray-500 to-gray-600'
                    } text-white`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold mb-1 line-clamp-2">{project.name}</h3>
                          {project.clientName && (
                            <p className="text-blue-100 text-sm truncate">{t('projectCard.Client')} {project.clientName}</p>
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ml-2 flex-shrink-0 ${
                          project.status === 'active'
                            ? 'bg-green-400 text-green-900'
                            : 'bg-gray-400 text-gray-900'
                        }`}>
                          {project.status === 'active' ? t('projects.active') : t('projects.completed')}
                        </span>
                      </div>
                      
                      {project.address && (
                        <div className="flex items-start gap-2 text-blue-100 text-xs">
                          <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{project.address}</span>
                        </div>
                      )}
                    </div>

                    {/* Project Stats */}
                    <div className="p-4">
                      {/* Main Stats Row */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-gray-600 text-xs mb-1">
                            <Clock size={14} />
                            <span>{t('projectCard.Total Hours')}</span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900">{stats.totalHours}</p>
                        </div>
                        
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-gray-600 text-xs mb-1">
                            <Users size={14} />
                            <span>{t('projectCard.Workers')}</span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900">{stats.uniqueWorkers}</p>
                        </div>
                      </div>

                      {/* Secondary Stats Row */}
                      <div className="grid grid-cols-2 gap-3 mb-3 text-center">
                        <div>
                          <p className="text-gray-600 text-xs mb-1">{t('projectCard.Time Entries')}</p>
                          <p className="text-lg font-bold text-gray-900">{stats.totalEntries}</p>
                        </div>
                        
                        <div>
                          <p className="text-gray-600 text-xs mb-1">{t('projectCard.Pending')}</p>
                          <p className="text-lg font-bold text-orange-600">{stats.pendingApprovals}</p>
                        </div>
                      </div>

                      {/* Last Activity */}
                      {stats.lastActivity && (
                        <div className="bg-gray-50 rounded-lg p-2 mb-3 text-center">
                          <p className="text-gray-600 text-xs mb-1">{t('common.lastActivity') || 'Last Activity'}</p>
                          <p className="text-xs font-semibold text-gray-900">
                            {getRelativeTime(stats.lastActivity.clockIn)}
                          </p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleViewProject(project.id)}
                          className="bg-blue-600 text-white px-2 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-1"
                        >
                          <Eye size={16} />
                          {t('projectCard.View')}
                        </button>
                        <button
                          onClick={() => handleViewTimecard(project.id)}
                          className="bg-green-600 text-white px-2 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition flex items-center justify-center gap-1"
                        >
                          <Clock size={16} />
                          {t('projectCard.Hours')}
                        </button>
                        <button
                          onClick={() => handleEdit(project)}
                          className="bg-gray-200 text-gray-700 px-2 py-2 rounded-lg text-sm font-semibold hover:bg-gray-300 transition flex items-center justify-center gap-1"
                        >
                          <Edit size={16} />
                          {t('projectCard.Edit')}
                        </button>
                        <button
                          onClick={() => handleDeleteProject(project)}
                          className="bg-red-100 text-red-600 px-2 py-2 rounded-lg text-sm font-semibold hover:bg-red-200 transition flex items-center justify-center gap-1"
                        >
                          <Trash2 size={16} />
                          {t('projectCard.Delete')}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </>
          
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="text-red-600" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {t('projects.deleteProject')}?
              </h2>
              <p className="text-gray-600 mb-2">
                {t('projects.confirmDeleteMessage') || 'Are you sure you want to delete'} <strong>{projectToDelete?.name}</strong>?
              </p>
              <p className="text-red-600 text-sm">
                {t('projects.deleteWarning') || 'This action cannot be undone. All time entries for this project will remain but won\'t be linked.'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setProjectToDelete(null);
                }}
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition text-lg"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition text-lg"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <ProjectFormSelector onClose={handleCloseForm} existingProject={editingProject} />
      )}
    </div>
  );
}