import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { firestoreService } from '../../../services/firestoreService';

export const useTimeTrackingStore = create(
  persist(
    (set, get) => ({
      timeEntries: [],
      activeShift: null,

      loadActiveShift: async (workerId) => {
        try {
          // Query Firestore for active shift
          const result = await firestoreService.query('timeEntries', [
            { field: 'workerId', operator: '==', value: workerId },
            { field: 'status', operator: '==', value: 'active' }
          ]);
          
          if (result.success && result.data.length > 0) {
            // Found active shift - update store
            const activeShift = result.data[0];
            set({ activeShift });
            return activeShift;
          } else {
            // No active shift found - clear store
            set({ activeShift: null });
            return null;
          }
        } catch (error) {
          console.error('Error loading active shift:', error);
          set({ activeShift: null });
          return null;
        }
      },
      
      // Clock In (saves to BOTH localStorage AND Firestore)
      clockIn: async (entry) => {
        // ✅ Add status if not present
        const entryWithStatus = {
          ...entry,
          status: entry.status || 'active'
        };
        
        // Save to localStorage immediately
        set({ activeShift: entryWithStatus });
        
        // Save to Firestore (background)
        const result = await firestoreService.create('timeEntries', entryWithStatus);
        
        if (result.success) {
          // Update with Firestore ID
          set({ 
            activeShift: { 
              ...entryWithStatus, 
              id: result.id, // ✅ Store as 'id'
              firestoreId: result.id 
            } 
          });
        }
        
        return result;
      },
      
      // Clock Out
      clockOut: async (clockOutData) => {
        const state = get();
        if (!state.activeShift) {
          throw new Error('No active shift');
        }
        
        const completedEntry = {
          ...state.activeShift,
          clockOut: clockOutData.time,
          clockOutLocation: clockOutData.location, // ✅ Add location
          hours: clockOutData.hours,
          status: 'completed',
        };
        
        // Save locally
        set({
          timeEntries: [completedEntry, ...state.timeEntries],
          activeShift: null,
        });
        
        // Update in Firestore - use id or firestoreId
        const docId = completedEntry.id || completedEntry.firestoreId;
        if (docId) {
          await firestoreService.update('timeEntries', docId, {
            clockOut: clockOutData.time,
            clockOutLocation: clockOutData.location,
            hours: clockOutData.hours,
            status: 'completed'
          });
        }
      },
      
      // Load from Firestore on app start
      loadFromFirestore: async (userId) => {
        const result = await firestoreService.query('timeEntries', [
          { field: 'employeeId', operator: '==', value: userId }
        ]);
        
        if (result.success) {
          set({ timeEntries: result.data });
        }
      },
    }),
    {
      name: 'workbase-time-tracking',
    }
  )
);