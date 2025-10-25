import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useEmployeeStore = create(
  persist(
    (set, get) => ({
      employees: [],
      currentEmployee: {
        id: 'demo-user',
        name: 'Demo User',
        email: 'demo@workbase.com',
        role: 'admin',
        status: 'active',
      },
      
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