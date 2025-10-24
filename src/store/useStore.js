import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useStore = create(
  persist(
    (set, get) => ({
      // Receipts
      receipts: [],
      addReceipt: (receipt) =>
        set((state) => ({ receipts: [receipt, ...state.receipts] })),
      updateReceipt: (id, updates) =>
        set((state) => ({
          receipts: state.receipts.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        })),
      deleteReceipt: (id) =>
        set((state) => ({
          receipts: state.receipts.filter((r) => r.id !== id),
        })),

      // Time Tracking
      timeEntries: [],
      currentClockIn: null,
      clockIn: (entry) => set({ currentClockIn: entry }),
      clockOut: (hours) =>
        set((state) => ({
          timeEntries: [
            {
              ...state.currentClockIn,
              clockOut: new Date().toISOString(),
              hours,
            },
            ...state.timeEntries,
          ],
          currentClockIn: null,
        })),

      // Daily Reports
      reports: [],
      addReport: (report) =>
        set((state) => ({ reports: [report, ...state.reports] })),
      updateReport: (id, updates) =>
        set((state) => ({
          reports: state.reports.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        })),

      // Documents
      documents: [],
      addDocument: (doc) =>
        set((state) => ({ documents: [doc, ...state.documents] })),
      deleteDocument: (id) =>
        set((state) => ({
          documents: state.documents.filter((d) => d.id !== id),
        })),

      // Projects
      projects: [
        {
          id: '1',
          name: 'Oak St Renovation',
          address: '123 Oak St',
          clientName: 'John Doe',
          clientPhone: '+1234567890',
          status: 'active',
        },
      ],
      currentProject: null,
      setCurrentProject: (project) => set({ currentProject: project }),
    }),
    {
      name: 'WorkBase-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);