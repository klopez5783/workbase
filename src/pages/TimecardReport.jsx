import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { firestoreService } from '../services/firestoreService';
import { 
  Calendar, 
  Download, 
  Printer, 
  ArrowLeft, 
  Loader,
  Clock,
  User,
  Briefcase,
  Edit,
  Trash2,
  X,
  Save,
  Check,
  AlertCircle,
  Square,
  CheckSquare,
  Filter,
  XCircle
} from 'lucide-react';

export default function TimecardReport() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectIdFromUrl = searchParams.get('projectId');

  // Data states
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [approvalStatus, setApprovalStatus] = useState('all');

  // Display states
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  // Selection states
  const [selectedEntries, setSelectedEntries] = useState([]);

  // Edit states
  const [editingEntry, setEditingEntry] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [editForm, setEditForm] = useState({
    clockInDate: '',
    clockInTime: '',
    clockOutDate: '',
    clockOutTime: '',
    status: 'pending',
    employeeId: '',
    projectId: ''
  });
  const [bulkEditForm, setBulkEditForm] = useState({
    status: '',
    projectId: '',
    applyStatus: false,
    applyProject: false
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (projectIdFromUrl && projects.length > 0) {
      setSelectedProject(projectIdFromUrl);
    }
  }, [projectIdFromUrl, projects]);

  useEffect(() => {
    applyFilters();
  }, [timeEntries, startDate, endDate, selectedProject, selectedEmployee, approvalStatus]);

  const loadData = async () => {
    try {
      setLoading(true);

      const projectsResult = await firestoreService.getAll('projects');
      if (projectsResult.success) {
        setProjects(projectsResult.data);
      }

      const employeesResult = await firestoreService.getAll('users');
      if (employeesResult.success) {
        setEmployees(employeesResult.data.filter(u => u.role === 'worker'));
      }

      const entriesResult = await firestoreService.getAll('timeEntries');
      if (entriesResult.success) {
        setTimeEntries(entriesResult.data);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...timeEntries];

    if (startDate) {
      filtered = filtered.filter(entry => {
        const entryDate = entry.clockIn?.toDate ? entry.clockIn.toDate() : new Date(entry.clockIn);
        return entryDate >= new Date(startDate);
      });
    }

    if (endDate) {
      filtered = filtered.filter(entry => {
        const entryDate = entry.clockIn?.toDate ? entry.clockIn.toDate() : new Date(entry.clockIn);
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59);
        return entryDate <= endDateTime;
      });
    }

    if (selectedProject !== 'all') {
      filtered = filtered.filter(entry => entry.projectId === selectedProject);
    }

    if (selectedEmployee !== 'all') {
      filtered = filtered.filter(entry => entry.employeeId === selectedEmployee);
    }

    if (approvalStatus !== 'all') {
      filtered = filtered.filter(entry => entry.status === approvalStatus);
    }

    setFilteredEntries(filtered);
  };

  // Clear filters function
  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedProject('all');
    setSelectedEmployee('all');
    setApprovalStatus('all');
  };

  const hasActiveFilters = () => {
    return startDate || endDate || selectedProject !== 'all' || selectedEmployee !== 'all' || approvalStatus !== 'all';
  };

  // Selection functions
  const toggleSelectEntry = (entryId) => {
    if (selectedEntries.includes(entryId)) {
      setSelectedEntries(selectedEntries.filter(id => id !== entryId));
    } else {
      setSelectedEntries([...selectedEntries, entryId]);
    }
  };

  const selectAll = () => {
    if (selectedEntries.length === filteredEntries.length) {
      setSelectedEntries([]);
    } else {
      setSelectedEntries(filteredEntries.map(e => e.id));
    }
  };

  // NEW: Select by employee
  const selectAllByEmployee = (employeeName, projects) => {
    const employeeEntries = Object.values(projects).flat().map(e => e.id);
    const allSelected = employeeEntries.every(id => selectedEntries.includes(id));
    
    if (allSelected) {
      setSelectedEntries(selectedEntries.filter(id => !employeeEntries.includes(id)));
    } else {
      setSelectedEntries([...new Set([...selectedEntries, ...employeeEntries])]);
    }
  };

  // NEW: Select by project
  const selectAllByProject = (entries) => {
    const projectEntryIds = entries.map(e => e.id);
    const allSelected = projectEntryIds.every(id => selectedEntries.includes(id));
    
    if (allSelected) {
      setSelectedEntries(selectedEntries.filter(id => !projectEntryIds.includes(id)));
    } else {
      setSelectedEntries([...new Set([...selectedEntries, ...projectEntryIds])]);
    }
  };

  // NEW: Select by status
  const selectAllByStatus = (status) => {
    const statusEntries = filteredEntries
      .filter(e => e.status === status)
      .map(e => e.id);
    
    const allSelected = statusEntries.every(id => selectedEntries.includes(id));
    
    if (allSelected) {
      setSelectedEntries(selectedEntries.filter(id => !statusEntries.includes(id)));
    } else {
      setSelectedEntries([...new Set([...selectedEntries, ...statusEntries])]);
    }
  };

  // Bulk operations
  const handleBulkEdit = () => {
    setBulkEditForm({
      status: '',
      projectId: '',
      applyStatus: false,
      applyProject: false
    });
    setShowBulkEditModal(true);
    setError('');
  };

  const handleBulkSave = async () => {
    try {
      setSaving(true);
      setError('');

      if (!bulkEditForm.applyStatus && !bulkEditForm.applyProject) {
        setError('Please select at least one field to update');
        setSaving(false);
        return;
      }

      if (bulkEditForm.applyStatus && !bulkEditForm.status) {
        setError('Please select a status');
        setSaving(false);
        return;
      }

      if (bulkEditForm.applyProject && !bulkEditForm.projectId) {
        setError('Please select a project');
        setSaving(false);
        return;
      }

      // Update each selected entry
      const updatePromises = selectedEntries.map(entryId => {
        const updateData = {};
        
        if (bulkEditForm.applyStatus) {
          updateData.status = bulkEditForm.status;
        }
        
        if (bulkEditForm.applyProject) {
          updateData.projectId = bulkEditForm.projectId;
        }

        return firestoreService.update('timeEntries', entryId, updateData);
      });

      await Promise.all(updatePromises);
      
      await loadData();
      setShowBulkEditModal(false);
      setSelectedEntries([]);
      setSaving(false);
    } catch (err) {
      console.error('Error bulk updating:', err);
      setError('Failed to update entries');
      setSaving(false);
    }
  };

  const handleBulkDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    try {
      setSaving(true);

      const deletePromises = selectedEntries.map(entryId => 
        firestoreService.delete('timeEntries', entryId)
      );

      await Promise.all(deletePromises);
      
      await loadData();
      setShowDeleteConfirm(false);
      setSelectedEntries([]);
      setSaving(false);
    } catch (err) {
      console.error('Error bulk deleting:', err);
      setError('Failed to delete entries');
      setSaving(false);
    }
  };

  const handleBulkApprove = async () => {
    try {
      setSaving(true);

      const updatePromises = selectedEntries.map(entryId => 
        firestoreService.update('timeEntries', entryId, { status: 'approved' })
      );

      await Promise.all(updatePromises);
      
      await loadData();
      setSelectedEntries([]);
      setSaving(false);
    } catch (err) {
      console.error('Error bulk approving:', err);
      setSaving(false);
    }
  };

  // NEW: Bulk reject
  const handleBulkReject = async () => {
    try {
      setSaving(true);

      const updatePromises = selectedEntries.map(entryId => 
        firestoreService.update('timeEntries', entryId, { status: 'rejected' })
      );

      await Promise.all(updatePromises);
      
      await loadData();
      setSelectedEntries([]);
      setSaving(false);
    } catch (err) {
      console.error('Error bulk rejecting:', err);
      setSaving(false);
    }
  };

  const calculateHours = (clockIn, clockOut) => {
    if (!clockOut) return 0;
    
    const start = clockIn?.toDate ? clockIn.toDate() : new Date(clockIn);
    const end = clockOut?.toDate ? clockOut.toDate() : new Date(clockOut);
    
    const hours = (end - start) / (1000 * 60 * 60);
    return Math.round(hours * 4) / 4;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '--';
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '--';
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown';
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(e => e.id === employeeId);
    return employee?.name || 'Unknown';
  };

  // Single entry CRUD operations
  const handleEdit = (entry) => {
    const clockInDate = entry.clockIn?.toDate ? entry.clockIn.toDate() : new Date(entry.clockIn);
    const clockOutDate = entry.clockOut?.toDate ? entry.clockOut.toDate() : new Date(entry.clockOut);

    setEditingEntry(entry);
    setEditForm({
      clockInDate: clockInDate.toISOString().split('T')[0],
      clockInTime: clockInDate.toTimeString().split(' ')[0].substring(0, 5),
      clockOutDate: clockOutDate.toISOString().split('T')[0],
      clockOutTime: clockOutDate.toTimeString().split(' ')[0].substring(0, 5),
      status: entry.status || 'pending',
      employeeId: entry.employeeId,
      projectId: entry.projectId
    });
    setShowEditModal(true);
    setError('');
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      const clockIn = new Date(`${editForm.clockInDate}T${editForm.clockInTime}`);
      const clockOut = new Date(`${editForm.clockOutDate}T${editForm.clockOutTime}`);

      if (clockOut <= clockIn) {
        setError('Clock Out must be after Clock In');
        setSaving(false);
        return;
      }

      const updateData = {
        clockIn: clockIn.toISOString(),
        clockOut: clockOut.toISOString(),
        status: editForm.status,
        employeeId: editForm.employeeId,
        projectId: editForm.projectId
      };

      const result = await firestoreService.update('timeEntries', editingEntry.id, updateData);

      if (result.success) {
        await loadData();
        setShowEditModal(false);
        setEditingEntry(null);
      } else {
        setError(result.error || 'Failed to update entry');
      }

      setSaving(false);
    } catch (err) {
      console.error('Error saving entry:', err);
      setError('Failed to save changes');
      setSaving(false);
    }
  };

  const handleDelete = (entry) => {
    setEntryToDelete(entry);
    setSelectedEntries([entry.id]);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (entryToDelete) {
      // Single delete
      try {
        setSaving(true);
        const result = await firestoreService.delete('timeEntries', entryToDelete.id);

        if (result.success) {
          await loadData();
          setShowDeleteConfirm(false);
          setEntryToDelete(null);
        } else {
          setError(result.error || 'Failed to delete entry');
        }

        setSaving(false);
      } catch (err) {
        console.error('Error deleting entry:', err);
        setError('Failed to delete entry');
        setSaving(false);
      }
    } else {
      // Bulk delete
      await confirmBulkDelete();
    }
  };

  const handleApprove = async (entry) => {
    try {
      const result = await firestoreService.update('timeEntries', entry.id, {
        status: 'approved'
      });

      if (result.success) {
        await loadData();
      }
    } catch (err) {
      console.error('Error approving entry:', err);
    }
  };

  const groupedEntries = filteredEntries.reduce((acc, entry) => {
    const empName = getEmployeeName(entry.employeeId);
    const projName = getProjectName(entry.projectId);
    
    if (!acc[empName]) acc[empName] = {};
    if (!acc[empName][projName]) acc[empName][projName] = [];
    
    acc[empName][projName].push(entry);
    return acc;
  }, {});

  const totalHours = filteredEntries.reduce((sum, entry) => {
    return sum + calculateHours(entry.clockIn, entry.clockOut);
  }, 0);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCSV = () => {
    let csv = 'Employee Name,Date Worked,Project Name,Time In,Time Out,Total Hours,Status\n';
    
    filteredEntries.forEach(entry => {
      const empName = getEmployeeName(entry.employeeId);
      const projName = getProjectName(entry.projectId);
      const dateWorked = formatDate(entry.clockIn);
      const timeIn = formatTime(entry.clockIn);
      const timeOut = formatTime(entry.clockOut);
      const hours = calculateHours(entry.clockIn, entry.clockOut);
      const status = entry.status || 'Pending';
      
      csv += `"${empName}","${dateWorked}","${projName}","${timeIn}","${timeOut}","${hours}","${status}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timecard-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="p-5 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4 text-blue-600" size={40} />
          <p className="text-gray-600">Loading timecard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-5 pb-24">
      <div className="max-w-7xl mx-auto">
        {/* Header - No Print */}
        <div className="mb-6 print:hidden">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 font-semibold mb-4 flex items-center gap-2 hover:text-blue-700 transition"
          >
            <ArrowLeft size={20} />
            Back
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Timecard Report</h1>
              <p className="text-gray-600 text-sm mt-1">Employee work hours summary</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleDownloadCSV}
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition flex items-center gap-2"
              >
                <Download size={20} />
                Download CSV
              </button>
              <button
                onClick={handlePrint}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2"
              >
                <Printer size={20} />
                Print
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedEntries.length > 0 && (
          <div className="bg-purple-600 text-white rounded-xl p-4 mb-6 print:hidden shadow-lg">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <CheckSquare size={24} />
                <span className="font-bold text-lg">
                  {selectedEntries.length} {selectedEntries.length === 1 ? 'Entry' : 'Entries'} Selected
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleBulkApprove}
                  disabled={saving}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg font-semibold transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check size={20} />
                  Approve
                </button>
                <button
                  onClick={handleBulkReject}
                  disabled={saving}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg font-semibold transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <XCircle size={20} />
                  Reject
                </button>
                <button
                  onClick={handleBulkEdit}
                  disabled={saving}
                  className="px-4 py-2 bg-white text-purple-600 hover:bg-gray-100 rounded-lg font-semibold transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Edit size={20} />
                  Edit
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={saving}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg font-semibold transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 size={20} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Select Options */}
        {filteredEntries.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-6 print:hidden">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Quick Select:</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={selectAll}
                className="px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg font-semibold transition text-sm flex items-center gap-1"
              >
                {selectedEntries.length === filteredEntries.length ? <XCircle size={16} /> : <CheckSquare size={16} />}
                {selectedEntries.length === filteredEntries.length ? 'Deselect All' : `All (${filteredEntries.length})`}
              </button>
              
              <button
                onClick={() => selectAllByStatus('pending')}
                className="px-3 py-1.5 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded-lg font-semibold transition text-sm"
              >
                Pending ({filteredEntries.filter(e => e.status === 'pending').length})
              </button>
              
              <button
                onClick={() => selectAllByStatus('approved')}
                className="px-3 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg font-semibold transition text-sm"
              >
                Approved ({filteredEntries.filter(e => e.status === 'approved').length})
              </button>
              
              <button
                onClick={() => selectAllByStatus('rejected')}
                className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg font-semibold transition text-sm"
              >
                Rejected ({filteredEntries.filter(e => e.status === 'rejected').length})
              </button>
            </div>
          </div>
        )}

        {/* Filters - No Print */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6 print:hidden">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-left"
            >
              <Filter size={20} className="text-gray-600" />
              <h2 className="text-xl font-bold text-gray-900">Filters</h2>
              {hasActiveFilters() && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                  Active
                </span>
              )}
            </button>
            <div className="flex items-center gap-2">
              {hasActiveFilters() && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg font-semibold transition text-sm flex items-center gap-1"
                >
                  <XCircle size={16} />
                  Clear Filters
                </button>
              )}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="text-blue-600 font-semibold hover:text-blue-700 transition"
              >
                {showFilters ? '▼ Hide' : '▶ Show'}
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Project
                </label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-lg"
                >
                  <option value="all">All Projects</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Employee
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-lg"
                >
                  <option value="all">All Employees</option>
                  {employees.map(employee => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={approvalStatus}
                  onChange={(e) => setApprovalStatus(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-lg"
                >
                  <option value="all">All Status</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Print Header */}
        <div className="hidden print:block mb-8 border-b-4 border-gray-800 pb-4">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">TIMECARD REPORT</h1>
          <div className="text-lg text-gray-700">
            {startDate && <p><strong>From:</strong> {new Date(startDate).toLocaleDateString()}</p>}
            {endDate && <p><strong>To:</strong> {new Date(endDate).toLocaleDateString()}</p>}
            <p><strong>Generated:</strong> {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl p-6 mb-6 print:bg-gray-100 print:text-gray-900 print:border-4 print:border-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-blue-100 text-sm font-semibold mb-1 print:text-gray-600">
                Total Employees
              </p>
              <p className="text-4xl font-bold">
                {Object.keys(groupedEntries).length}
              </p>
            </div>
            <div>
              <p className="text-blue-100 text-sm font-semibold mb-1 print:text-gray-600">
                Total Entries
              </p>
              <p className="text-4xl font-bold">
                {filteredEntries.length}
              </p>
            </div>
            <div>
              <p className="text-blue-100 text-sm font-semibold mb-1 print:text-gray-600">
                Total Hours
              </p>
              <p className="text-4xl font-bold">
                {totalHours.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Timecard Entries */}
        {Object.keys(groupedEntries).length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <Clock size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Time Entries Found</h3>
            <p className="text-gray-600">
              Try adjusting your filters to see timecard data
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedEntries).map(([employeeName, projects]) => {
              const employeeTotal = Object.values(projects)
                .flat()
                .reduce((sum, entry) => sum + calculateHours(entry.clockIn, entry.clockOut), 0);
              
              const allEmployeeEntries = Object.values(projects).flat();
              const employeeSelected = allEmployeeEntries.every(e => selectedEntries.includes(e.id));

              return (
                <div key={employeeName} className="bg-white rounded-xl shadow-sm border-2 border-gray-300 overflow-hidden print:break-inside-avoid print:mb-8">
                  {/* Employee Header */}
                  <div className="bg-gray-800 text-white p-4 print:bg-gray-900">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => selectAllByEmployee(employeeName, projects)}
                          className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition print:hidden"
                          title={employeeSelected ? "Deselect all for this employee" : "Select all for this employee"}
                        >
                          {employeeSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                        </button>
                        <User size={24} />
                        <div>
                          <h2 className="text-2xl font-bold">{employeeName}</h2>
                          <p className="text-gray-300 text-sm">
                            Employee
                            <span className="ml-2">
                              ({allEmployeeEntries.filter(e => selectedEntries.includes(e.id)).length}/{allEmployeeEntries.length} selected)
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-300">Total Hours</p>
                        <p className="text-3xl font-bold">{employeeTotal.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Projects */}
                  {Object.entries(projects).map(([projectName, entries]) => {
                    const projectTotal = entries.reduce(
                      (sum, entry) => sum + calculateHours(entry.clockIn, entry.clockOut),
                      0
                    );
                    const allProjectSelected = entries.every(e => selectedEntries.includes(e.id));

                    return (
                      <div key={projectName} className="border-b-2 border-gray-200 last:border-b-0">
                        {/* Project Header */}
                        <div className="bg-gray-100 p-3 flex items-center justify-between print:bg-gray-200">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => selectAllByProject(entries)}
                              className="p-1.5 bg-gray-200 hover:bg-gray-300 rounded-lg transition print:hidden"
                              title={allProjectSelected ? "Deselect all for this project" : "Select all for this project"}
                            >
                              {allProjectSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                            </button>
                            <Briefcase size={20} className="text-gray-600" />
                            <span className="font-bold text-lg text-gray-900">
                              {projectName}
                              <span className="ml-2 text-sm text-gray-600">
                                ({entries.filter(e => selectedEntries.includes(e.id)).length}/{entries.length})
                              </span>
                            </span>
                          </div>
                          <span className="font-bold text-lg text-gray-900">
                            {projectTotal.toFixed(2)} hrs
                          </span>
                        </div>

                        {/* Time Entries Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-gray-50 border-b-2 border-gray-300">
                                <th className="px-4 py-3 text-center print:hidden" style={{width: '60px'}}>
                                  <span className="text-xs font-normal text-gray-600">Select</span>
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 uppercase">
                                  Date
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 uppercase">
                                  Time In
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 uppercase">
                                  Time Out
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-bold text-gray-900 uppercase">
                                  Hours
                                </th>
                                <th className="px-4 py-3 text-center text-sm font-bold text-gray-900 uppercase print:hidden">
                                  Status
                                </th>
                                <th className="px-4 py-3 text-center text-sm font-bold text-gray-900 uppercase print:hidden">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {entries.map((entry, idx) => {
                                const hours = calculateHours(entry.clockIn, entry.clockOut);
                                const isSelected = selectedEntries.includes(entry.id);
                                
                                return (
                                  <tr 
                                    key={entry.id} 
                                    className={`border-b border-gray-200 ${
                                      isSelected 
                                        ? 'bg-purple-50' 
                                        : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                    }`}
                                  >
                                    <td className="px-4 py-3 text-center print:hidden">
                                      <input
                                        type="checkbox"
                                        className="w-5 h-5 cursor-pointer"
                                        checked={isSelected}
                                        onChange={() => toggleSelectEntry(entry.id)}
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-lg text-gray-900">
                                      {formatDate(entry.clockIn)}
                                    </td>
                                    <td className="px-4 py-3 text-lg text-gray-900 font-mono">
                                      {formatTime(entry.clockIn)}
                                    </td>
                                    <td className="px-4 py-3 text-lg text-gray-900 font-mono">
                                      {formatTime(entry.clockOut)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-lg font-bold text-gray-900">
                                      {hours.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-center print:hidden">
                                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                        entry.status === 'approved' 
                                          ? 'bg-green-100 text-green-800'
                                          : entry.status === 'rejected'
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {entry.status || 'Pending'}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-center print:hidden">
                                      <div className="flex items-center justify-center gap-2">
                                        {entry.status !== 'approved' && (
                                          <button
                                            onClick={() => handleApprove(entry)}
                                            className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition"
                                            title="Approve"
                                          >
                                            <Check size={18} />
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleEdit(entry)}
                                          className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                                          title="Edit"
                                        >
                                          <Edit size={18} />
                                        </button>
                                        <button
                                          onClick={() => handleDelete(entry)}
                                          className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                                          title="Delete"
                                        >
                                          <Trash2 size={18} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* Grand Total */}
        {Object.keys(groupedEntries).length > 0 && (
          <div className="mt-8 bg-gray-900 text-white rounded-xl p-6 print:bg-gray-900 print:border-4 print:border-gray-900">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">GRAND TOTAL</h2>
              <div className="text-right">
                <p className="text-gray-300 text-sm">All Employees & Projects</p>
                <p className="text-4xl font-bold">{totalHours.toFixed(2)} Hours</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Single Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">Edit Time Entry</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setError('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            <div className="p-6">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mb-6 flex items-start gap-3">
                  <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                  <p className="text-red-900 font-medium">{error}</p>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Employee
                  </label>
                  <select
                    value={editForm.employeeId}
                    onChange={(e) => setEditForm({ ...editForm, employeeId: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg"
                  >
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Project
                  </label>
                  <select
                    value={editForm.projectId}
                    onChange={(e) => setEditForm({ ...editForm, projectId: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg"
                  >
                    {projects.map(proj => (
                      <option key={proj.id} value={proj.id}>
                        {proj.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Clock In Date
                    </label>
                    <input
                      type="date"
                      value={editForm.clockInDate}
                      onChange={(e) => setEditForm({ ...editForm, clockInDate: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Clock In Time
                    </label>
                    <input
                      type="time"
                      value={editForm.clockInTime}
                      onChange={(e) => setEditForm({ ...editForm, clockInTime: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Clock Out Date
                    </label>
                    <input
                      type="date"
                      value={editForm.clockOutDate}
                      onChange={(e) => setEditForm({ ...editForm, clockOutDate: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Clock Out Time
                    </label>
                    <input
                      type="time"
                      value={editForm.clockOutTime}
                      onChange={(e) => setEditForm({ ...editForm, clockOutTime: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Approval Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setError('');
                }}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition text-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition flex items-center gap-2 text-lg disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader className="animate-spin" size={20} />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Edit Modal */}
      {showBulkEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                Edit {selectedEntries.length} {selectedEntries.length === 1 ? 'Entry' : 'Entries'}
              </h2>
              <button
                onClick={() => {
                  setShowBulkEditModal(false);
                  setError('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            <div className="p-6">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mb-6 flex items-start gap-3">
                  <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                  <p className="text-red-900 font-medium">{error}</p>
                </div>
              )}

              <p className="text-gray-600 mb-6">
                Select which fields you want to update for all selected entries:
              </p>

              <div className="space-y-6">
                {/* Status Update */}
                <div className="border-2 border-gray-200 rounded-xl p-4">
                  <label className="flex items-center gap-3 mb-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bulkEditForm.applyStatus}
                      onChange={(e) => setBulkEditForm({ ...bulkEditForm, applyStatus: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <span className="text-lg font-bold text-gray-900">Update Status</span>
                  </label>
                  {bulkEditForm.applyStatus && (
                    <select
                      value={bulkEditForm.status}
                      onChange={(e) => setBulkEditForm({ ...bulkEditForm, status: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg"
                    >
                      <option value="">-- Select Status --</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  )}
                </div>

                {/* Project Update */}
                <div className="border-2 border-gray-200 rounded-xl p-4">
                  <label className="flex items-center gap-3 mb-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bulkEditForm.applyProject}
                      onChange={(e) => setBulkEditForm({ ...bulkEditForm, applyProject: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <span className="text-lg font-bold text-gray-900">Move to Different Project</span>
                  </label>
                  {bulkEditForm.applyProject && (
                    <select
                      value={bulkEditForm.projectId}
                      onChange={(e) => setBulkEditForm({ ...bulkEditForm, projectId: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg"
                    >
                      <option value="">-- Select Project --</option>
                      {projects.map(proj => (
                        <option key={proj.id} value={proj.id}>
                          {proj.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowBulkEditModal(false);
                  setError('');
                }}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition text-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkSave}
                disabled={saving}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition flex items-center gap-2 text-lg disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader className="animate-spin" size={20} />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    Update All
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="text-red-600" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Delete {entryToDelete ? '1 Entry' : `${selectedEntries.length} Entries`}?
              </h2>
              <p className="text-gray-600">
                This action cannot be undone. {entryToDelete ? 'The time entry' : 'These time entries'} will be permanently deleted.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setEntryToDelete(null);
                }}
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition text-lg"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={saving}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition text-lg disabled:opacity-50"
              >
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}