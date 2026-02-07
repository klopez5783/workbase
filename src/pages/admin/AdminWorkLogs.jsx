import { useState, useEffect } from 'react';
import { firestoreService } from '../../services/firestoreService';
import { Sparkles, TrendingUp, FileText, Loader, Search, CircleArrowLeft, Filter, Calendar, User, MapPin, Image as ImageIcon, X, ChevronDown, ChevronUp } from 'lucide-react';
import WorkSummaryGenerator from '../../components/WorkSummaryGenerator';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useEmployeeStore } from '../../features/employees/store/employeeStore';
import { useTranslation } from 'react-i18next';

export default function AdminWorkLogs() {
  const { t } = useTranslation();
  const [workLogs, setWorkLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSummaryGenerator, setShowSummaryGenerator] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectIdFromUrl = searchParams.get('projectId')
  const location = useLocation();
  const returnToProject = location.state?.returnToProject;
  const { currentEmployee } = useEmployeeStore();
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month
  const [showFilters, setShowFilters] = useState(false);
  
  // Image viewer
  const [selectedImage, setSelectedImage] = useState(null);
  const [expandedLogId, setExpandedLogId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [workLogs, searchTerm, selectedProject, selectedEmployee, dateFilter]);

  const handleBack = () => {
    navigate('/admin/tools')
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load projects first - filter by company
      const projectsResult = await firestoreService.getAll('projects');
      let companyProjects = [];
      if (projectsResult.success) {
        // Filter projects to show only those belonging to the current company
        companyProjects = projectsResult.data.filter(
          project => project.createdBy === currentEmployee?.companyId
        );
        setProjects(companyProjects);
      }

      // Get array of company project IDs for filtering work logs
      const companyProjectIds = companyProjects.map(p => p.id);

      // Load work logs - FILTER by company projects
      const logsResult = await firestoreService.getAll('workLogs');
    if (logsResult.success) {
        // Only include work logs from this company's projects
        const companyLogs = logsResult.data.filter(log => 
          companyProjectIds.includes(log.projectId)
        );
        
        // Sort by newest first
        const sortedLogs = companyLogs.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB - dateA;
        });
        setWorkLogs(sortedLogs);
      }

      // Load employees - filter by company
      const employeesResult = await firestoreService.getAll('users');
      if (employeesResult.success) {
        // Only show workers from the current company
        const companyWorkers = employeesResult.data.filter(
          user => user.role === 'worker' && user.companyId === currentEmployee?.companyId
        );
        setEmployees(companyWorkers);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load work logs');
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...workLogs];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.translatedDescription?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.projectName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Project filter
    if (selectedProject !== 'all') {
      filtered = filtered.filter(log => log.projectId === selectedProject);
    }

    // Employee filter
    if (selectedEmployee !== 'all') {
      filtered = filtered.filter(log => log.employeeId === selectedEmployee);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(log => {
        const logDate = log.createdAt?.toDate ? log.createdAt.toDate() : new Date(log.createdAt);
        
        switch (dateFilter) {
          case 'today':
            return logDate >= today;
          case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return logDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return logDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    setFilteredLogs(filtered);
  };

  const formatDate = (timestamp) => {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  };

  const toggleExpanded = (logId) => {
    setExpandedLogId(expandedLogId === logId ? null : logId);
  };

  const getSummaryContext = () => {
    const projectName = selectedProject !== 'all' 
        ? getProjectName(selectedProject) 
        : t('projects.title');
    
    let dateRange = 'All Time';
    if (dateFilter === 'today') dateRange = new Date().toLocaleDateString();
    else if (dateFilter === 'week') dateRange = 'Past Week';
    else if (dateFilter === 'month') dateRange = 'Past Month';

    return { projectName, date: dateRange };
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
    <div className="p-5 pb-24 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        {/* <div className="grid grid-cols-3 items-center">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 font-semibold mb-4 flex items-center gap-2"
          >
            <CircleArrowLeft size={25} /> {t('common.back')}
          </button>
          <div className="justify-self-center col-span-2 ">
              <h1 className="text-2xl font-bold text-gray-900">{t('reports.dailyReport')}</h1>
              <p className="text-gray-600 text-center text-sm mt-1">
                {t('reports.viewReports')}
              </p>
          </div>
        </div> */}

        <div className="grid grid-cols-5 items-center mb-4">
          {/* Left: Back Button */}
          <div>
            <button
              onClick={() => navigate(-1)}
              className="text-blue-600 font-semibold flex items-center gap-2"
            >
              <CircleArrowLeft size={25} /> {t('common.back')}
            </button>
          </div>
          
          {/* Center: Title & Subtitle */}
          <div className="text-center col-span-3">
            <h1 className="text-2xl font-bold text-gray-900">{t('reports.dailyReport')}</h1>
            <p className="text-gray-600 text-sm mt-1">
              {t('reports.viewReports')}
            </p>
          </div>
          
          {/* Right: Empty (for balance) */}
          <div></div>
        </div>
        
        {/* <button
          onClick={() => setShowSummaryGenerator(true)}
          disabled={filteredLogs.length === 0}
          className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-xl font-bold hover:from-blue-700 hover:to-cyan-700 transition flex items-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          <Sparkles size={20} />
          Generate AI Summary
        </button> */}
      </div>

      {/* Stats Card - Compact Horizontal Layout */}
<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
  <div className="divide-y divide-gray-100">
    {/* Row 1: Total & Today */}
    <div className="px-4 py-3 hover:bg-gray-50 transition-colors">
      <div className="grid grid-cols-4 gap-2 items-center">
        {/* Total */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 rounded-lg flex-shrink-0">
            <FileText className="text-blue-600" size={16} />
          </div>
          <span className="text-xs font-medium text-gray-900">
            Total
          </span>
        </div>
        <div className="text-right">
          <span className="text-xl font-bold text-gray-900">
            {workLogs.length}
          </span>
        </div>

        {/* Today */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-green-100 rounded-lg flex-shrink-0">
            <Calendar className="text-green-600" size={16} />
          </div>
          <span className="text-xs font-medium text-gray-900">
            {t('timeTracking.today')}
          </span>
        </div>
        <div className="text-right">
          <span className="text-xl font-bold text-green-600">
            {workLogs.filter(log => {
              const logDate = log.createdAt?.toDate ? log.createdAt.toDate() : new Date(log.createdAt);
              const today = new Date();
              return logDate.toDateString() === today.toDateString();
            }).length}
          </span>
        </div>
      </div>
    </div>

    {/* Row 2: This Week & Filtered */}
    <div className="px-4 py-3 hover:bg-gray-50 transition-colors">
      <div className="grid grid-cols-4 gap-2 items-center">
        {/* This Week */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-purple-100 rounded-lg flex-shrink-0">
            <TrendingUp className="text-purple-600" size={16} />
          </div>
          <span className="text-xs font-medium text-gray-900">
            {t('timeTracking.thisWeek')}
          </span>
        </div>
        <div className="text-right">
          <span className="text-xl font-bold text-purple-600">
            {workLogs.filter(log => {
              const logDate = log.createdAt?.toDate ? log.createdAt.toDate() : new Date(log.createdAt);
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              return logDate >= weekAgo;
            }).length}
          </span>
        </div>

          {/* Filtered */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-orange-100 rounded-lg flex-shrink-0">
              <Filter className="text-orange-600" size={16} />
            </div>
            <span className="text-xs font-medium text-gray-900">
              Filtered
            </span>
          </div>
          <div className="text-right">
            <span className="text-xl font-bold text-orange-600">
              {filteredLogs.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-6">
        {/* Search Bar */}
        <div className="flex items-center gap-3 mb-4">
          {/* <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder={t('common.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div> */}
          <button
            onClick={() => setShowSummaryGenerator(true)}
            disabled={filteredLogs.length === 0}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-1 rounded-xl font-bold hover:from-blue-700 hover:to-cyan-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            <Sparkles size={25} />
            Generate AI Summary
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-4 rounded-lg font-semibold transition flex items-center gap-2 ${
              showFilters ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter size={20} />
            {t('common.filter')}
            {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
            {/* Project Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('Hours.project')}
              </label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">{t('projects.title')}</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Employee Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('Hours.worker')}
              </label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">{t('workers.title')}</option>
                {employees.map(employee => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('Hours.date')}
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">{t('common.all')}</option>
                <option value="today">{t('timeTracking.today')}</option>
                <option value="week">{t('timeTracking.thisWeek')}</option>
                <option value="month">{t('timeTracking.thisMonth')}</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mb-6">
          <p className="text-red-900 font-medium">{error}</p>
        </div>
      )}

      {/* Work Logs List */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center">
          <FileText size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">{t('reports.noReports')}</h3>
          <p className="text-gray-600">
            {searchTerm || selectedProject !== 'all' || selectedEmployee !== 'all' || dateFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Work logs will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLogs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            const logDate = log.createdAt?.toDate ? log.createdAt.toDate() : new Date(log.createdAt);

            return (
              <div
                key={log.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
                {/* Log Header - Always Visible */}
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 transition"
                  onClick={() => toggleExpanded(log.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Project and Employee Info */}
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <MapPin size={16} className="text-blue-600" />
                          <span className="font-bold text-gray-900">
                            {getProjectName(log.projectId)}
                          </span>
                        </div>
                        <span className="text-gray-400">•</span>
                        <div className="flex items-center gap-2">
                          <User size={16} className="text-green-600" />
                          <span className="text-gray-700">{log.employeeName}</span>
                        </div>
                      </div>

                      {/* Description Preview */}
                      <p className="text-gray-700 mb-2 line-clamp-2">
                        {log.translatedDescription || log.description}
                      </p>

                      {/* Meta Info */}
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar size={14} />
                          {formatDate(log.createdAt)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <ImageIcon size={14} />
                          {log.images?.length || 0} {t('reports.photos')}
                        </div>
                        {log.wasTranslated && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                            🌐 Translated
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expand Button */}
                    <button className="ml-4 p-2 hover:bg-gray-200 rounded-lg transition">
                      {isExpanded ? (
                        <ChevronUp size={20} className="text-gray-600" />
                      ) : (
                        <ChevronDown size={20} className="text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50">
                    {/* Full Description */}
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-900 mb-2">{t('projects.description')}</h4>
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {log.translatedDescription || log.description}
                        </p>
                        {log.wasTranslated && log.description !== log.translatedDescription && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-sm text-gray-500 mb-1">Original:</p>
                            <p className="text-gray-600 italic">{log.description}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Images */}
                    {log.images && log.images.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">
                          {t('reports.photos')} ({log.images.length})
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {log.images.map((imageUrl, index) => (
                            <div
                              key={index}
                              className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:opacity-90 transition"
                              onClick={() => setSelectedImage(imageUrl)}
                            >
                              <img
                                src={imageUrl}
                                alt={`${t('reports.photos')} ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Image Viewer Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 bg-white rounded-full p-2 hover:bg-gray-200 transition"
            onClick={() => setSelectedImage(null)}
          >
            <X size={24} className="text-gray-900" />
          </button>
          <img
            src={selectedImage}
            alt={t('reports.photos')}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Summary Generator Modal */}
      {showSummaryGenerator && (
        <WorkSummaryGenerator
          workLogs={filteredLogs}
          projectName={getSummaryContext().projectName}
          date={getSummaryContext().date}
          onClose={() => setShowSummaryGenerator(false)}
        />
      )}
    </div>
  );
}