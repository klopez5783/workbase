import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Download, 
  Calendar, 
  Loader, 
  ChevronLeft,
  Image as ImageIcon,
  Languages,
  Clock,
  Users
} from 'lucide-react';
import { firestoreService } from '../services/firestoreService';
import { reportGenerationService } from '../services/reportGenerationService';
import { useEmployeeStore } from '../features/employees/store/employeeStore';

export default function DailyReportsViewer() {
  const navigate = useNavigate();
  const currentEmployee = useEmployeeStore((state) => state.currentEmployee);
  
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState(null);
  const [workLogs, setWorkLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = currentEmployee?.role === 'admin';

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject && selectedDate) {
      loadReportData();
    }
  }, [selectedProject, selectedDate]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const result = await firestoreService.getAll('projects');

      if (result.success && result.data) {
        // Filter projects by company
        const companyProjects = result.data.filter(
          project => project.createdBy === currentEmployee?.companyId
        );
        setProjects(companyProjects);
        if (companyProjects.length > 0) {
          setSelectedProject(companyProjects[0]);
        }
      }
    } catch (err) {
      console.error('Error loading projects:', err);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const loadReportData = async () => {
    try {
      setGenerating(true);
      setError('');

      // Load work logs for the selected date and project
      const dateObj = new Date(selectedDate);
      const startOfDay = new Date(dateObj);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(dateObj);
      endOfDay.setHours(23, 59, 59, 999);

      const logsResult = await firestoreService.query('workLogs', [
        { field: 'projectId', operator: '==', value: selectedProject.id }
      ]);

      if (logsResult.success) {
        const filtered = logsResult.data.filter(log => {
          const logDate = new Date(log.createdAt);
          return logDate >= startOfDay && logDate <= endOfDay;
        });
        setWorkLogs(filtered);
      }

      // Generate report
      const reportResult = await reportGenerationService.generateDailyReport(
        selectedProject.id,
        dateObj
      );

      if (reportResult.success) {
        setReport(reportResult.report);
      } else {
        setError('Failed to generate report: ' + reportResult.error);
      }
    } catch (err) {
      console.error('Error loading report data:', err);
      setError('Failed to load report data');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadReport = () => {
    if (!report) return;

    const textReport = reportGenerationService.formatReportAsText(report);
    const blob = new Blob([textReport], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Daily_Report_${selectedProject.name}_${selectedDate}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  return (
    <div className="p-5 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ChevronLeft size={24} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Reports</h1>
          <p className="text-gray-600 text-sm mt-1">View work logs and generate reports</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="space-y-4">
          {/* Project Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Project
            </label>
            <select
              value={selectedProject?.id || ''}
              onChange={(e) => {
                const project = projects.find(p => p.id === e.target.value);
                setSelectedProject(project);
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mb-6">
          <p className="text-red-900 font-medium">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {generating && (
        <div className="text-center py-12">
          <Loader className="animate-spin mx-auto mb-4 text-blue-600" size={40} />
          <p className="text-gray-600">Generating report...</p>
        </div>
      )}

      {/* Report Summary */}
      {!generating && report && (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="text-blue-600" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{report.stats.totalWorkers}</p>
                  <p className="text-xs text-gray-600">Workers</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Clock className="text-green-600" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{report.stats.totalHours}</p>
                  <p className="text-xs text-gray-600">Hours</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FileText className="text-purple-600" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{report.stats.totalWorkLogs}</p>
                  <p className="text-xs text-gray-600">Work Logs</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <ImageIcon className="text-orange-600" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{report.stats.totalPhotos}</p>
                  <p className="text-xs text-gray-600">Photos</p>
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">Daily Summary</h3>
            <p className="text-sm text-blue-800">{report.summary}</p>
          </div>

          {/* Download Button */}
          <button
            onClick={handleDownloadReport}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-4 rounded-xl font-semibold hover:shadow-lg transition flex items-center justify-center gap-2 mb-6"
          >
            <Download size={20} />
            Download Full Report
          </button>

          {/* Work Logs Detail */}
          {workLogs.length > 0 ? (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Work Logs Detail</h2>
              <div className="space-y-4">
                {workLogs.map((log) => (
                  <WorkLogCard key={log.id} log={log} />
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-12 text-center">
              <FileText size={64} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Work Logs</h3>
              <p className="text-gray-600">
                No work was logged for this project on the selected date
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Work Log Card Component
function WorkLogCard({ log }) {
  const [showImages, setShowImages] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-bold text-gray-900">{log.workerName}</p>
            <p className="text-sm text-gray-600">
              {new Date(log.createdAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          {log.wasTranslated && (
            <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
              <Languages size={14} />
              Translated
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="p-4">
        <p className="text-gray-800">{log.translatedDescription}</p>
        
        {log.wasTranslated && log.originalDescription !== log.translatedDescription && (
          <details className="mt-3">
            <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
              View original ({log.detectedLanguage})
            </summary>
            <p className="text-sm text-gray-600 mt-2 italic bg-gray-50 p-3 rounded-lg">
              {log.originalDescription}
            </p>
          </details>
        )}
      </div>

      {/* Images */}
      {log.images && log.images.length > 0 && (
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => setShowImages(!showImages)}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-2"
          >
            <ImageIcon size={16} />
            {showImages ? 'Hide' : 'Show'} {log.images.length} Photo{log.images.length !== 1 ? 's' : ''}
          </button>
          
          {showImages && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              {log.images.map((image, index) => (
                <img
                  key={index}
                  src={image.data}
                  alt={`Work photo ${index + 1}`}
                  className="w-full h-40 object-cover rounded-lg border border-gray-200"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}