import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { firestoreService } from '../services/firestoreService';
import {
  Clock,
  Calendar,
  ArrowLeft,
  Loader,
  Download,
  User,
  Briefcase,
  CheckSquare,
  Square,
  Check,
  X,
  Edit,
  Trash2
} from 'lucide-react';

export default function ProjectHoursPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [timeEntries, setTimeEntries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEntries, setSelectedEntries] = useState([]);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (projectId) {
      loadData();
    } else {
      navigate('/admin/projects');
    }
  }, [projectId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load project
      const projectResult = await firestoreService.getById('projects', projectId);
      if (projectResult.success) {
        setProject(projectResult.data);
      }

      // Load time entries
      const entriesResult = await firestoreService.getAll('timeEntries');
      if (entriesResult.success) {
        const projectEntries = entriesResult.data.filter(e => e.projectId === projectId);
        setTimeEntries(projectEntries);
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

  const calculateHours = (clockIn, clockOut) => {
    if (!clockOut) return 0;
    const start = clockIn?.toDate ? clockIn.toDate() : new Date(clockIn);
    const end = clockOut?.toDate ? clockOut.toDate() : new Date(clockOut);
    return (end - start) / (1000 * 60 * 60);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(e => e.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown';
  };

  // Filter entries
  const filteredEntries = timeEntries.filter(entry => {
    // Date filter
    if (startDate) {
      const entryDate = entry.clockIn?.toDate ? entry.clockIn.toDate() : new Date(entry.clockIn);
      if (entryDate < new Date(startDate)) return false;
    }
    if (endDate) {
      const entryDate = entry.clockIn?.toDate ? entry.clockIn.toDate() : new Date(entry.clockIn);
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59);
      if (entryDate > endDateTime) return false;
    }

    // Employee filter
    if (selectedEmployee !== 'all' && entry.employeeId !== selectedEmployee) {
      return false;
    }

    // Status filter
    if (statusFilter !== 'all' && entry.status !== statusFilter) {
      return false;
    }

    return true;
  });

  // Group by employee
  const entriesByEmployee = filteredEntries.reduce((acc, entry) => {
    const employeeId = entry.employeeId;
    if (!acc[employeeId]) {
      acc[employeeId] = [];
    }
    acc[employeeId].push(entry);
    return acc;
  }, {});

  // Calculate totals
  const totalHours = filteredEntries.reduce((sum, entry) => 
    sum + calculateHours(entry.clockIn, entry.clockOut), 0
  );

  const toggleSelectEntry = (entryId) => {
    setSelectedEntries(prev => 
      prev.includes(entryId)
        ? prev.filter(id => id !== entryId)
        : [...prev, entryId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedEntries.length === filteredEntries.length) {
      setSelectedEntries([]);
    } else {
      setSelectedEntries(filteredEntries.map(e => e.id));
    }
  };

  const handleBulkApprove = async () => {
    if (selectedEntries.length === 0) return;

    try {
      for (const entryId of selectedEntries) {
        await firestoreService.update('timeEntries', entryId, {
          status: 'approved',
          approvedAt: new Date().toISOString()
        });
      }
      await loadData();
      setSelectedEntries([]);
    } catch (error) {
      console.error('Error approving entries:', error);
    }
  };

  const handleApprove = async (entryId) => {
    try {
      await firestoreService.update('timeEntries', entryId, {
        status: 'approved',
        approvedAt: new Date().toISOString()
      });
      await loadData();
    } catch (error) {
      console.error('Error approving entry:', error);
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Employee', 'Clock In', 'Clock Out', 'Hours', 'Status'];
    const rows = filteredEntries.map(entry => [
      formatDate(entry.clockIn),
      getEmployeeName(entry.employeeId),
      formatTime(entry.clockIn),
      formatTime(entry.clockOut),
      calculateHours(entry.clockIn, entry.clockOut).toFixed(2),
      entry.status || 'pending'
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project?.name || 'project'}_hours_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="p-5 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4 text-blue-600" size={40} />
          <p className="text-gray-600">Loading project hours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-5 pb-24">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/project/${projectId}`)}
            className="text-blue-600 font-semibold mb-4 flex items-center gap-2 hover:text-blue-700 transition"
          >
            <ArrowLeft size={20} />
            Back to Project
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Project Hours</h1>
              <p className="text-gray-600 text-lg mt-1">{project?.name}</p>
            </div>

            <button
              onClick={exportToCSV}
              className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition flex items-center gap-2"
            >
              <Download size={20} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex flex-col items-center text-center">
              <div className="p-3 bg-blue-100 rounded-lg mb-2">
                <Clock className="text-blue-600" size={24} />
              </div>
              <p className="text-gray-600 text-xs mb-1">Total Hours</p>
              <p className="text-3xl font-bold text-gray-900">{totalHours.toFixed(1)}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex flex-col items-center text-center">
              <div className="p-3 bg-purple-100 rounded-lg mb-2">
                <User className="text-purple-600" size={24} />
              </div>
              <p className="text-gray-600 text-xs mb-1">Entries</p>
              <p className="text-3xl font-bold text-gray-900">{filteredEntries.length}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex flex-col items-center text-center">
              <div className="p-3 bg-green-100 rounded-lg mb-2">
                <Check className="text-green-600" size={24} />
              </div>
              <p className="text-gray-600 text-xs mb-1">Approved</p>
              <p className="text-3xl font-bold text-green-600">
                {filteredEntries.filter(e => e.status === 'approved').length}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex flex-col items-center text-center">
              <div className="p-3 bg-orange-100 rounded-lg mb-2">
                <Clock className="text-orange-600" size={24} />
              </div>
              <p className="text-gray-600 text-xs mb-1">Pending</p>
              <p className="text-3xl font-bold text-orange-600">
                {filteredEntries.filter(e => e.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
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
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Employee
              </label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
              >
                <option value="all">All Employees</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedEntries.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center justify-between">
            <p className="text-blue-900 font-semibold">
              {selectedEntries.length} {selectedEntries.length === 1 ? 'entry' : 'entries'} selected
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleBulkApprove}
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition flex items-center gap-2"
              >
                <Check size={18} />
                Approve Selected
              </button>
              <button
                onClick={() => setSelectedEntries([])}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700 transition"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* Time Entries */}
        {filteredEntries.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <Clock size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Time Entries Found</h3>
            <p className="text-gray-600">
              Try adjusting your filters or date range
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(entriesByEmployee).map(([employeeId, entries]) => {
              const employeeTotal = entries.reduce((sum, entry) => 
                sum + calculateHours(entry.clockIn, entry.clockOut), 0
              );

              return (
                <div key={employeeId} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  {/* Employee Header */}
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center font-bold text-lg">
                        {getEmployeeName(employeeId).split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{getEmployeeName(employeeId)}</h3>
                        <p className="text-blue-100 text-sm">
                          {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold">{employeeTotal.toFixed(1)}</p>
                      <p className="text-blue-100 text-sm">hours</p>
                    </div>
                  </div>

                  {/* Time Entries Table */}
<div className="overflow-x-auto">
  <table className="w-full">
    <thead className="bg-gray-50 border-b-2 border-gray-300">
      <tr>
        <th className="px-4 py-3 text-center">
          <input
            type="checkbox"
            checked={entries.every(e => selectedEntries.includes(e.id))}
            onChange={() => {
              const allSelected = entries.every(e => selectedEntries.includes(e.id));
              if (allSelected) {
                setSelectedEntries(prev => prev.filter(id => !entries.find(e => e.id === id)));
              } else {
                setSelectedEntries(prev => [...new Set([...prev, ...entries.map(e => e.id)])]);
              }
            }}
            className="w-5 h-5 cursor-pointer"
          />
        </th>
        <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 uppercase">Employee</th>
        <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 uppercase">Date</th>
        <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 uppercase">Clock In</th>
        <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 uppercase">Clock Out</th>
        <th className="px-4 py-3 text-right text-sm font-bold text-gray-900 uppercase">Hours</th>
        <th className="px-4 py-3 text-center text-sm font-bold text-gray-900 uppercase">Status</th>
        <th className="px-4 py-3 text-center text-sm font-bold text-gray-900 uppercase">Actions</th>
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
              isSelected ? 'bg-blue-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
            }`}
          >
            <td className="px-4 py-3 text-center">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelectEntry(entry.id)}
                className="w-5 h-5 cursor-pointer"
              />
            </td>
            <td className="px-4 py-3 text-gray-900 font-semibold">
              {getEmployeeName(entry.employeeId)}
            </td>
            <td className="px-4 py-3 text-gray-900">
              {formatDate(entry.clockIn)}
            </td>
            <td className="px-4 py-3 text-gray-900 font-mono">
              {formatTime(entry.clockIn)}
            </td>
            <td className="px-4 py-3 text-gray-900 font-mono">
              {formatTime(entry.clockOut)}
            </td>
            <td className="px-4 py-3 text-right font-bold text-gray-900">
              {hours.toFixed(2)}
            </td>
            <td className="px-4 py-3 text-center">
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
            <td className="px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-2">
                {entry.status !== 'approved' && (
                  <button
                    onClick={() => handleApprove(entry.id)}
                    className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition"
                    title="Approve"
                  >
                    <Check size={18} />
                  </button>
                )}
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
        )}
      </div>
    </div>
  );
}