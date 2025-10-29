import { useState } from 'react';
import { useGeolocation } from '../../../hooks/useGeolocation';
import { useLocationVerification } from './useLocationVerification';
import { useEmployeeStore } from '../../employees/store/employeeStore';
import { useTimeTrackingStore } from '../store/timeTrackingStore';
import { useProjectStore } from '../../projects/store/projectStore';

export const useClockIn = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { getCurrentLocation } = useGeolocation();
  const { verifyLocation } = useLocationVerification();
  const currentEmployee = useEmployeeStore((state) => state.currentEmployee);
  const projects = useProjectStore((state) => state.projects);
  const { clockIn, clockOut, activeShift } = useTimeTrackingStore();

  const handleClockIn = async (selectedProjectId) => {
    setLoading(true);
    setError(null);

    try {
      const userLocation = await getCurrentLocation();

      const project = projects.find((p) => p.id === selectedProjectId);
      if (!project) {
        throw new Error('Project not found');
      }

      const isAssigned = (project.assignedEmployees || []).includes(currentEmployee?.id);
      if (!isAssigned) {
        throw new Error('You are not assigned to this project');
      }

      const verification = await verifyLocation(
        userLocation,
        project.location,
        project.geofenceRadius
      );

      if (!verification.isValid) {
        setError(verification.message);
        setLoading(false);
        
        return {
          success: false,
          message: verification.message,
          distance: verification.distance,
          allowOverride: true,
        };
      }

      const entry = {
        id: Date.now().toString(),
        employeeId: currentEmployee.id,
        employeeName: currentEmployee.name,
        projectId: project.id,
        projectName: project.name,
        clockIn: new Date().toISOString(),
        clockInLocation: {
            ...userLocation,
            address: project.location.address,
        },
        distanceFromSite: verification.distance,
        verified: true,
        status: 'active',
      };

      await clockIn(entry);

      setLoading(false);
            return {
            success: true,
            message: verification.message,
            distance: verification.distance,
        };
    } catch (err) {
      setError(err.message);
      setLoading(false);
      return {
        success: false,
        message: err.message,
      };
    }
  };

  const handleClockOut = async () => {
    if (!activeShift) {
      return { success: false, message: 'No active shift' };
    }

    setLoading(true);
    setError(null);

    try {
      const userLocation = await getCurrentLocation();
      const now = new Date();
      const start = new Date(activeShift.clockIn);
      const hours = (now - start) / (1000 * 60 * 60);

      const clockOutData = {
        time: now.toISOString(),
        location: userLocation,
        hours: Number(hours.toFixed(2)),
      };

      await clockOut(clockOutData);

      setLoading(false);
      return { success: true };
    } catch (err) {
      setError(err.message);
      setLoading(false);
      return { success: false, message: err.message };
    }
  };

  const forceClockIn = async (projectId) => {
    setLoading(true);
    
    try {
      const userLocation = await getCurrentLocation();
      const project = projects.find((p) => p.id === projectId);
      
      const entry = {
        id: Date.now().toString(),
        employeeId: currentEmployee.id,
        employeeName: currentEmployee.name,
        projectId: project.id,
        projectName: project.name,
        clockIn: new Date().toISOString(),
        clockInLocation: userLocation,
        distanceFromSite: 999,
        verified: false,
        status: 'flagged',
        notes: 'Location override by user',
      };

      clockIn(entry);
      setLoading(false);
      
      return { success: true, message: 'Clocked in (location override)' };
    } catch (err) {
      setError(err.message);
      setLoading(false);
      return { success: false, message: err.message };
    }
  };

  return {
    handleClockIn,
    handleClockOut,
    forceClockIn,
    loading,
    error,
    activeShift,
  };
};