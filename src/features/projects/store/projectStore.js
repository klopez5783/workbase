import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useProjectStore = create(
  persist(
    (set, get) => ({
      projects: [
        // {
        //   id: '1',
        //   name: 'Test Project',
        //   address: '7952 Overmont Ridge Rd, Blacklick OH',
        //   location: { 
        //     latitude: 39.98909678149767,
        //     longitude: --82.79037150444844,
        //     address: '7952 Overmont Ridge Rd, Blacklick OH',
        //   },
        //   geofenceRadius: 100,
        //   status: 'active',
        //   clientName: 'John Doe',
        //   clientPhone: '+1234567890',
        //   assignedEmployees: ['demo-user'],
        // },
        {
          id: '1',
          name: 'Maple Ave Addition',
          address: '456 Maple Ave, Columbus, OH',
          location: {
            latitude: 39.9830,
            longitude: -83.0150,
            address: '456 Maple Ave, Columbus, OH',
          },
          geofenceRadius: 20,
          status: 'active',
          clientName: 'Jane Smith',
          clientPhone: '+1234567891',
          assignedEmployees: ['demo-user'],
        },
      ],
      
      addProject: (project) =>
        set((state) => ({
          projects: [...state.projects, {
            ...project,
            geofenceRadius: project.geofenceRadius || 100,
            assignedEmployees: project.assignedEmployees || [],
          }],
        })),
      
      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),
      
      getEmployeeProjects: (employeeId) => {
        const state = get();
        return state.projects.filter((p) =>
          (p.assignedEmployees || []).includes(employeeId)
        );
      },
    }),
    {
      name: 'workbase-projects',
    }
  )
);