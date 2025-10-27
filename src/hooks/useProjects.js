import { useState, useEffect } from 'react';
import { firestoreService } from '../services/firestoreService';

/**
 * Custom hook to fetch and manage projects as objects from Firebase
 * Returns projects in a structured object format
 */
export function useProjects(userId = null) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await firestoreService.getAll('projects');
        
        if (result.success && result.data) {
          // Transform Firestore documents into project objects
          const projectObjects = result.data.map(doc => ({
            id: doc.id,
            firestoreId: doc.id,
            name: doc.name || 'Unnamed Project',
            address: doc.address || '',
            location: doc.location ? {
              latitude: doc.location.latitude || 0,
              longitude: doc.location.longitude || 0,
              address: doc.location.address || doc.address || '',
            } : null,
            clientName: doc.clientName || '',
            clientPhone: doc.clientPhone || '',
            status: doc.status || 'active',
            assignedEmployees: Array.isArray(doc.assignedEmployees) 
              ? doc.assignedEmployees 
              : [],
            geofenceRadius: doc.geofenceRadius || 100,
            createdAt: doc.createdAt || new Date().toISOString(),
            updatedAt: doc.updatedAt || new Date().toISOString(),
            // Additional fields
            budget: doc.budget || null,
            startDate: doc.startDate || null,
            endDate: doc.endDate || null,
            description: doc.description || '',
          }));

          // Filter by user if userId is provided
          const filteredProjects = userId 
            ? projectObjects.filter(project => 
                project.assignedEmployees.includes(userId)
              )
            : projectObjects;

          setProjects(filteredProjects);
        } else {
          setProjects([]);
        }
      } catch (err) {
        console.error('Error fetching projects:', err);
        setError(err.message);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [userId]);

  const refreshProjects = async () => {
    setLoading(true);
    const result = await firestoreService.getAll('projects');
    
    if (result.success && result.data) {
      const projectObjects = result.data.map(doc => ({
        id: doc.id,
        firestoreId: doc.id,
        name: doc.name || 'Unnamed Project',
        address: doc.address || '',
        location: doc.location || null,
        clientName: doc.clientName || '',
        clientPhone: doc.clientPhone || '',
        status: doc.status || 'active',
        assignedEmployees: doc.assignedEmployees || [],
        geofenceRadius: doc.geofenceRadius || 100,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      }));

      const filteredProjects = userId 
        ? projectObjects.filter(project => 
            project.assignedEmployees.includes(userId)
          )
        : projectObjects;

      setProjects(filteredProjects);
    }
    
    setLoading(false);
  };

  return {
    projects,
    loading,
    error,
    refreshProjects,
  };
}

/**
 * Helper function to get a single project by ID
 */
export async function getProjectById(projectId) {
  try {
    const result = await firestoreService.getById('projects', projectId);
    
    if (result.success && result.data) {
      return {
        id: result.data.id,
        firestoreId: result.data.id,
        name: result.data.name || 'Unnamed Project',
        address: result.data.address || '',
        location: result.data.location || null,
        clientName: result.data.clientName || '',
        clientPhone: result.data.clientPhone || '',
        status: result.data.status || 'active',
        assignedEmployees: result.data.assignedEmployees || [],
        geofenceRadius: result.data.geofenceRadius || 100,
        createdAt: result.data.createdAt,
        updatedAt: result.data.updatedAt,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching project:', error);
    return null;
  }
}