import { useState } from 'react';
import { calculateDistance } from '../../../shared/utils/distance';

export const useLocationVerification = () => {
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);

  const verifyLocation = async (userLocation, projectLocation, allowedRadius = 100) => {
    setVerifying(true);
    setError(null);

    try {
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        projectLocation.latitude,
        projectLocation.longitude
      );

      const isWithinGeofence = distance <= allowedRadius;

      setVerifying(false);

      return {
        isValid: isWithinGeofence,
        distance: Math.round(distance),
        message: isWithinGeofence
          ? `You're at the correct location (${Math.round(distance)}m from site)`
          : `You're ${Math.round(distance)}m away from the job site. Required: within ${allowedRadius}m`,
      };
    } catch (err) {
      setError(err.message);
      setVerifying(false);
      return {
        isValid: false,
        distance: null,
        message: 'Failed to verify location',
      };
    }
  };

  return { verifyLocation, verifying, error };
};