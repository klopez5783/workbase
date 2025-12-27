import { useState, useEffect } from 'react';
import { firestoreService } from '../services/firestoreService';

export const useDailyWorkLog = (currentEmployee, isAdmin) => {
  const [projects, setProjects] = useState([]);
  const [todayLogs, setTodayLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTodayLogs = async (employeeId) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const logsResult = await firestoreService.query('workLogs', [
        { field: 'employeeId', operator: '==', value: employeeId }
      ]);

      if (logsResult.success) {
        const todayOnly = logsResult.data.filter(log => {
          const logDate = log.createdAt?.toDate ? log.createdAt.toDate() : new Date(log.createdAt);
          return logDate >= today;
        });
        setTodayLogs(todayOnly);
      }
    } catch (err) {
      console.error('Error loading today logs:', err);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);

      if (!currentEmployee) {
        setError('Employee profile not found');
        setLoading(false);
        return;
      }

      // Check if worker has a company
      if (!isAdmin && !currentEmployee.companyId) {
        setError('You must be assigned to a company to view projects. Please contact your administrator.');
        setProjects([]);
        setLoading(false);
        return;
      }

      // Get all projects
      const projectsResult = await firestoreService.getAll('projects');
      if (projectsResult.success) {
        let filteredProjects = [];

        if (isAdmin) {
          filteredProjects = projectsResult.data.filter(project =>
            project.createdBy === currentEmployee.companyId
          );
        } else {
            console.log("User is worker, filtering assigned projects");
          filteredProjects = projectsResult.data.filter(project => {
            const isSameCompany = project.createdBy === currentEmployee.companyId;
            const isAssigned = project.assignedEmployees?.includes(currentEmployee.id);
            return isSameCompany && isAssigned;
          });
        }

        console.log(`Filtered ${filteredProjects.length} projects for ${isAdmin ? 'admin' : 'worker'}`);
        setProjects(filteredProjects);
        setError('');
      }

      await loadTodayLogs(currentEmployee.id);
      setLoading(false);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentEmployee) {
      loadData();
    }
  }, [currentEmployee]);

  return {
    projects,
    todayLogs,
    loading,
    error,
    refetchData: loadData
  };
};