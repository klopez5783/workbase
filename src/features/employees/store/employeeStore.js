import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useEmployeeStore = create(
  persist(
    (set, get) => ({
      employees: [],
      currentEmployee: null,  // ← Remove hardcoded demo user
      
      setCurrentEmployee: (employee) => set({ currentEmployee: employee }),
      
      addEmployee: (employee) =>
        set((state) => ({
          employees: [...state.employees, employee],
        })),
      
      updateEmployee: (id, updates) =>
        set((state) => ({
          employees: state.employees.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        })),
    }),
    {
      name: 'workbase-employees',
    }
  )
);