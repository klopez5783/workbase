import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useTimeTrackingStore = create(
  persist(
    (set, get) => ({
      timeEntries: [],
      activeShift: null,
      
      clockIn: (entry) => {
        set({ activeShift: entry });
      },
      
      clockOut: (clockOutData) => {
        const state = get();
        if (!state.activeShift) return;
        
        const completedEntry = {
          ...state.activeShift,
          clockOut: clockOutData.time,
          clockOutLocation: clockOutData.location,
          hours: clockOutData.hours,
          status: 'completed',
        };
        
        set({
          timeEntries: [completedEntry, ...state.timeEntries],
          activeShift: null,
        });
      },
      
      getTodayEntries: (employeeId) => {
        const state = get();
        const today = new Date().toDateString();
        return state.timeEntries.filter(
          (e) =>
            e.employeeId === employeeId &&
            new Date(e.clockIn).toDateString() === today
        );
      },
    }),
    {
      name: 'workbase-time-tracking',
    }
  )
);