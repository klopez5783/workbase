import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { firestoreService } from '../../../services/firestoreService';

export const useTimeTrackingStore = create(
  persist(
    (set, get) => ({
      timeEntries: [],
      activeShift: null,
      
      // Clock In (saves to BOTH localStorage AND Firestore)
      clockIn: async (entry) => {
        // Save to localStorage immediately
        set({ activeShift: entry });
        
        // Save to Firestore (background)
        const result = await firestoreService.create('timeEntries', entry);
        
        if (result.success) {
          // Update with Firestore ID
          set({ activeShift: { ...entry, firestoreId: result.id } });
        }
      },
      
      // Clock Out
      clockOut: async (clockOutData) => {
        const state = get();
        if (!state.activeShift) return;
        
        const completedEntry = {
          ...state.activeShift,
          clockOut: clockOutData.time,
          hours: clockOutData.hours,
          status: 'completed',
        };
        
        // Save locally
        set({
          timeEntries: [completedEntry, ...state.timeEntries],
          activeShift: null,
        });
        
        // Update in Firestore
        if (completedEntry.firestoreId) {
          await firestoreService.update(
            'timeEntries',
            completedEntry.firestoreId,
            completedEntry
          );
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