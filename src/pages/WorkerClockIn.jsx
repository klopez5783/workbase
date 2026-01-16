import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock, MapPin, Loader, CheckCircle, AlertCircle, Globe } from 'lucide-react';
import { useWorkerClockIn } from '../features/employees/hooks/userWorkerClockIn';
import JoinCompanyModal from '../components/JoinCompanyModal';
import { useAuth } from '../contexts/AuthContext';
import { useRef } from 'react';

export default function WorkerClockIn() {
  const { t, i18n } = useTranslation();
  const { accessKey } = useParams();
  const [searchParams] = useSearchParams();
  const { ensureSMSWorkerAuth } = useAuth();
  const authAttempted = useRef(false);

  // Language toggle
  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'es' : 'en';
    i18n.changeLanguage(newLang);
  };

  // ✅ Authenticate SMS workers before loading data
  useEffect(() => {
    const setupAuth = async () => {
      if (authAttempted.current) {
        console.log("⏭️ Auth already attempted, skipping");
        return;
      }

      console.log("=== Setting up authentication ===");
      console.log("Access Key:", accessKey);
      
      authAttempted.current = true;
      const result = await ensureSMSWorkerAuth(accessKey);
      
      if (result.success) {
        console.log("✅ Authentication ready");
      } else {
        console.error("❌ Authentication failed:", result.error);
      }
    };

    setupAuth();
  }, [accessKey]);
  
  const {
    worker,
    projects: assignedProjects,
    selectedProject,
    setSelectedProject,
    activeShift,
    loading,
    actionLoading,
    error,
    success,
    clockIn,
    clockOut,
    isAuthenticatedUser
  } = useWorkerClockIn(accessKey);

  const [requestingSent, setRequestingSent] = useState(false);
  const [showJoinCompanyModal, setShowJoinCompanyModal] = useState(false);
  const [companyToJoin, setCompanyToJoin] = useState(null);

  const autoAction = searchParams.get('action');
  const autoProjectId = searchParams.get('project');

  // Auto clock-in/out if URL parameters present
  useEffect(() => {
    if (worker && !loading && autoAction && !actionLoading) {
      if (autoAction === 'in' && autoProjectId && !activeShift) {
        setSelectedProject(autoProjectId);
        clockIn();
      } else if (autoAction === 'out' && activeShift) {
        clockOut();
      }
    }
  }, [worker, loading, autoAction, autoProjectId, activeShift]);

  const handleRequestLink = async () => {
    try {
      setLoading(true);
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();
      
      const requestLink = httpsCallable(functions, 'requestWorkerLink');
      await requestLink({ accessKey });

      setRequestingSent(true);
      alert(t('workerClockIn.requestLinkSent'));
    } catch (err) {
      alert(t('workerClockIn.requestLinkError') + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-5">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4 text-blue-600" size={48} />
          <p className="text-gray-600 font-medium">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error && !worker) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-5">
        {/* Language Toggle - Fixed Position */}
        <button
          onClick={toggleLanguage}
          className="fixed top-4 right-4 bg-white text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition flex items-center gap-2 shadow-lg"
        >
          <Globe size={18} />
          {i18n.language === 'en' ? 'Español' : 'English'}
        </button>

        <div className="bg-white rounded-2xl p-8 text-center max-w-md shadow-xl">
          <AlertCircle className="mx-auto mb-4 text-red-600" size={64} />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('workerClockIn.invalidLink')}</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          
          <button
            onClick={handleRequestLink}
            disabled={requestingSent}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {requestingSent ? t('workerClockIn.requestSent') : t('workerClockIn.requestNewLink')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Join Company Modal - Only for authenticated users */}
      {showJoinCompanyModal && companyToJoin && isAuthenticatedUser && (
        <JoinCompanyModal
          company={companyToJoin}
          onAccept={() => {/* handle join */}}
          onDecline={() => setShowJoinCompanyModal(false)}
        />
      )}

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
        {/* Language Toggle - Fixed Position */}
        <button
          onClick={toggleLanguage}
          className="fixed top-4 right-4 bg-white text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition flex items-center gap-2 shadow-lg z-50"
        >
          <Globe size={18} />
          {i18n.language === 'en' ? 'Español' : 'English'}
        </button>

        <div className="max-w-md mx-auto p-5 pt-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
              <span className="text-white font-bold text-3xl">W</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t('workerClockIn.welcome', { name: worker?.name })}
            </h1>
            <p className="text-gray-600">{t('workerClockIn.subtitle')}</p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border-l-4 border-green-500 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="text-green-500" size={24} />
                <p className="text-green-900 font-medium">{success}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-red-500" size={24} />
                <p className="text-red-900 font-medium whitespace-pre-line">{error}</p>
              </div>
            </div>
          )}

          {/* Main Card */}
          <div className="bg-white rounded-2xl shadow-xl p-6 space-y-6">
            {activeShift ? (
              // Currently Clocked In
              <>
                <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle className="text-green-500" size={24} />
                    <div>
                      <p className="font-semibold text-green-900">
                        {t('workerClockIn.currentlyClockedIn')}
                      </p>
                      <p className="text-sm text-green-700">{activeShift.projectName}</p>
                    </div>
                  </div>
                  <p className="text-xs text-green-600">
                    {t('workerClockIn.since', {
                      time: new Date(activeShift.clockIn).toLocaleTimeString(
                        i18n.language === 'es' ? 'es-ES' : 'en-US',
                        {
                          hour: '2-digit',
                          minute: '2-digit',
                        }
                      )
                    })}
                  </p>
                </div>

                <button
                  onClick={clockOut}
                  disabled={actionLoading}
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-center gap-3">
                    <Clock size={24} />
                    {actionLoading ? t('workerClockIn.clockingOut') : t('timeTracking.clockOut')}
                  </div>
                </button>
              </>
            ) : (
              // Ready to Clock In
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('workerClockIn.selectJobSite')}
                  </label>
                  {assignedProjects.length === 0 ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                      <p className="text-yellow-800 text-sm font-medium">
                        {t('workerClockIn.noProjectsAssigned')}
                      </p>
                      <p className="text-yellow-700 text-xs mt-1">
                        {t('workerClockIn.contactSupervisor')}
                      </p>
                    </div>
                  ) : (
                    <select
                      value={selectedProject}
                      onChange={(e) => setSelectedProject(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-base"
                    >
                      <option value="">{t('workerClockIn.chooseProject')}</option>
                      {assignedProjects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name} - {project.address}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <button
                  onClick={clockIn}
                  disabled={actionLoading || !selectedProject || assignedProjects.length === 0}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-center gap-3">
                    <MapPin size={24} />
                    {actionLoading ? t('workerClockIn.clockingIn') : t('timeTracking.clockIn')}
                  </div>
                </button>

                <p className="text-center text-sm text-gray-500">
                  <MapPin size={14} className="inline mr-1" />
                  {t('workerClockIn.locationVerified')}
                </p>
              </>
            )}
          </div>

          {/* Help Text */}
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>{t('workerClockIn.needHelp')}</p>
          </div>
        </div>
      </div>
    </>
  );
}