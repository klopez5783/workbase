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
    }),
    {
      name: 'WorkBase-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);