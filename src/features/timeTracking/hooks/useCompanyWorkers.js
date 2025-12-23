import { useState, useEffect, useCallback, useRef } from 'react';
import { firestoreService } from '../../../services/firestoreService';
import { useEmployeeStore } from '../../employees/store/employeeStore';

export const useCompanyWorkers = (options = {}) => {
  const { autoLoad = true, filters = [] } = options;
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // ✅ Only subscribe to companyId, not the entire currentEmployee object
  const companyId = useEmployeeStore(state => state.currentEmployee?.companyId);
  
  // ✅ Track if we've already loaded to prevent duplicate initial loads
  const hasLoadedRef = useRef(false);

  const loadWorkers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      
      if (!companyId) {
        console.warn('No company ID found for current employee');
        setWorkers([]);
        setLoading(false);
        return { success: false, error: 'No company ID' };
      }
      
      // Build where clauses: always filter by companyId + any additional filters
      const whereclauses = [
        ['companyId', '==', companyId],
        ...filters
      ];
      
      console.log("Where clauses:", whereclauses);
      
      const result = await firestoreService.getAll('workers', {
        where: whereclauses
      });
      
      
      if (result.success && result.data) {
        console.log(`Loaded ${result.data.length} workers`);
        setWorkers(result.data);
        return { success: true, data: result.data };
      } else {
        setError(result.error);
        return result;
      }
    } catch (err) {
      console.error('Error loading workers:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [companyId]); // ✅ Only depend on companyId, not filters or currentEmployee

  // Auto-load on mount if enabled
  useEffect(() => {
    if (autoLoad && companyId && !hasLoadedRef.current) {
      console.log("Auto-loading workers...");
      hasLoadedRef.current = true;
      loadWorkers();
    }
  }, [autoLoad, companyId, loadWorkers]);

  return {
    workers,
    loading,
    error,
    loadWorkers,
    refetch: loadWorkers
  };
};