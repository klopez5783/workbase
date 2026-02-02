import { useState, useEffect } from 'react';
import { FileText, Loader, Calendar, CircleArrowLeft, CheckCircle } from 'lucide-react';
import WorkLogForm from '../components/WorkLogForm';
import { useEmployeeStore } from '../features/employees/store/employeeStore';
import { useLocation, useNavigate } from 'react-router-dom';
import ProjectSelectionCard from '../features/projects/components/ProjectSelectionCard';
import WorkLogSummaryCard from '../components/WorkLogSummaryCard';
import { useDailyWorkLog } from '../hooks/useDailyWorkLog';
import { useTranslation } from 'react-i18next';

export default function DailyWorkLog() {
  const { t } = useTranslation();
  const currentEmployee = useEmployeeStore((state) => state.currentEmployee);
  const isAdmin = currentEmployee?.role === 'admin';
  const location = useLocation();
  const navigate = useNavigate();

  // Use the hook for data loading
  const { projects, todayLogs, loading, error, refetchData } = useDailyWorkLog(
    currentEmployee,
    isAdmin
  );

  // UI state (not data state)
  const [selectedProject, setSelectedProject] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // Handle project passed from navigation
  useEffect(() => {
    if (location.state?.selectedProject) {
      const passedProject = location.state.selectedProject;
      setSelectedProject(passedProject);
      setShowForm(true);

      setAlertMessage(`${t('projects.selectProject')}: ${passedProject.name}`);
      setShowAlert(true);

      setTimeout(() => {
        setShowAlert(false);
      }, 3000);

      window.history.replaceState({}, document.title);
    }
  }, [location, t]);

  const handleSelectProject = (project) => {
    setSelectedProject(project);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedProject(null);
    refetchData();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setSelectedProject(null);
  };

  const handleBack = () => {
    navigate('/admin/tools');
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

  if (error) {
    return (
      <div className="p-5">
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
          <p className="text-red-900 font-medium">{error}</p>
          {!isAdmin && !currentEmployee?.companyId && (
            <p className="text-red-700 text-sm mt-2">
              Ask your supervisor to add you to a company and assign you to projects.
            </p>
          )}
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
    <div className="p-2 pb-24">
      {isAdmin && (
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 font-semibold mb-4 flex items-center gap-2"
        >
          <CircleArrowLeft size={25} /> {t('common.back')}
        </button>
      )}

      <div className="space-y-4 grid grid-cols-3 justify-between mb-2 gap-1">
        {/* Header */}
        <div className="col-span-1 self-center">
          <h1 className="text-xl font-bold text-gray-900">
            {t('reports.dailyReport')}
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            {t('reports.workCompleted')}
          </p>
        </div>

        {/* Today's Summary */}
        <div className="bg-gradient-to-r from-blue-50 col-span-2 to-blue-100 border-l-4 border-blue-500 rounded-xl p-3">
          <div className="grid grid-flow-col justify-items-center gap-3">
            <div className="self-center w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white">
              <Calendar size={24} />
            </div>

            <div>
              <p className="font-semibold text-blue-900">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>

              <p className="text-sm text-blue-700">
                {todayLogs.length} {t('reports.dailyReport')}
                {todayLogs.length !== 1 ? 's' : ''}{' '}
                {t('reports.reportSubmitted')}
              </p>
            </div>
          </div>
        </div>
      </div>




      {/* Instructions Card */}
      <div className="bg-white rounded-xl p-4 mb-6 border border-gray-200">
        <h3 className="font-bold text-gray-900 mb-3">How to Submit:</h3>
        <ol className="space-y-2 text-sm text-gray-700">
          <li className="flex gap-2">
            <span className="font-bold text-blue-600">1.</span>
            <span>{t('projects.selectProject')}</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-blue-600">2.</span>
            <span>{t('reports.workCompleted')}</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-blue-600">3.</span>
            <span>{t('reports.addPhoto')}</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-blue-600">4.</span>
            <span>{t('common.submit')}</span>
          </li>
        </ol>
      </div>

      {/* Project Selection */}
      {projects.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center">
          <FileText size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {!isAdmin && !currentEmployee?.companyId
              ? 'Not Assigned'
              : t('projects.noProjects')}
          </h3>
          <p className="text-gray-600">
            Contact your supervisor
          </p>
        </div>
      ) : (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">{t('projects.selectProject')}</h2>
          <div className="space-y-3">
            {projects.map((project) => {
              const projectLogsToday = todayLogs.filter(log => log.projectId === project.id);

              return (
                <ProjectSelectionCard
                  key={project.id}
                  project={project}
                  onSelect={handleSelectProject}
                  todayLogsCount={projectLogsToday.length}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Today's Logs Summary */}
      {todayLogs.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">{t('timeTracking.today')} {t('reports.title')}</h2>
          <div className="space-y-3">
            {todayLogs.map((log) => {
              const logProject = projects.find(p => p.id === log.projectId);
              return (
                <WorkLogSummaryCard
                  key={log.id}
                  log={log}
                  project={logProject}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}