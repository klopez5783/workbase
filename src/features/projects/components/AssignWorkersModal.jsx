import { useState, useEffect } from 'react';
import { X, UserPlus, Users, Loader, CheckCircle, Shield, Smartphone } from 'lucide-react';
import { firestoreService } from '../../../services/firestoreService';
import { useEmployeeStore } from '../../employees/store/employeeStore';
import { getUserType, categorizeAssignments } from '../../../utils/workerUserLink';

export default function AssignWorkersModal({ project, onClose, onSuccess }) {
  const [people, setPeople] = useState([]); // Combined users and workers
  const [assignedPeopleIds, setAssignedPeopleIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { currentEmployee } = useEmployeeStore();

  useEffect(() => {
    loadWorkers();
  }, []);

  const loadWorkers = async () => {
    try {
      setLoading(true);

      // Load authenticated Users (workers with accounts)
      const usersResult = await firestoreService.getAll('users');
      const companyUsers = usersResult.success && usersResult.data
        ? usersResult.data.filter(
            user => user.role === 'worker' && user.companyId === currentEmployee?.companyId
          ).map(user => ({
            ...user,
            type: 'user',
            displayId: user.uid || user.id,
            icon: 'shield'
          }))
        : [];

      // Load SMS-only Workers (no user account)
      const workersResult = await firestoreService.getAll('workers');
      const companyWorkers = workersResult.success && workersResult.data
      ? workersResult.data.filter(worker => {
          // Log the data for debugging
          console.log("Current Employee Company ID:", currentEmployee?.companyId);
          console.log("Worker Company ID:", worker.companyId);
          console.log("Worker Data:", worker);

          // Return the actual comparison
          return worker.companyId === currentEmployee?.companyId;
        })
      : []; // Added a fallback (like an empty array) if the condition is false

      // Filter out workers that have linked user accounts (avoid duplicates)
      const userPhones = new Set(
        companyUsers.map(user => (user.phoneRaw || user.phone || '').replace(/\D/g, ''))
      );

      const smsOnlyWorkers = companyWorkers
        // .filter(worker => {
        //   const workerPhone = (worker.phoneRaw || worker.phone || '').replace(/\D/g, '');
        //   return !userPhones.has(workerPhone);
        // })
        .map(worker => ({
          ...worker,
          type: 'worker',
          displayId: worker.id,
          icon: 'smartphone'
        }));

      // Combine both lists
      const allPeople = [...companyUsers, ...smsOnlyWorkers];
      setPeople(allPeople);

      // Set initially assigned people (merge both arrays)
      const assignedEmployees = project.assignedEmployees || [];
      const assignedWorkers = project.assignedWorkers || [];
      const combined = [...assignedEmployees, ...assignedWorkers];
      setAssignedPeopleIds(combined);

    } catch (error) {
      console.error('Error loading workers:', error);
      setError('Failed to load workers');
    } finally {
      setLoading(false);
    }
  };

  const togglePerson = (personId) => {
    if (assignedPeopleIds.includes(personId)) {
      // Remove person
      setAssignedPeopleIds(assignedPeopleIds.filter(id => id !== personId));
    } else {
      // Add person
      setAssignedPeopleIds([...assignedPeopleIds, personId]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      // Get the selected people objects
      const selectedPeople = people.filter(person =>
        assignedPeopleIds.includes(person.displayId)
      );

      // Categorize into authenticated Users and SMS Workers
      const assignedEmployees = [];
      const assignedWorkers = [];

      selectedPeople.forEach(person => {
        if (person.type === 'user' && person.uid) {
          // Authenticated user - add their UID to assignedEmployees
          assignedEmployees.push(person.uid);
        } else if (person.type === 'worker' && person.id) {
          // SMS-only worker - add their ID to assignedWorkers
          assignedWorkers.push(person.id);
        }
      });

      // Update project with both arrays
      await firestoreService.update('projects', project.id, {
        assignedEmployees: assignedEmployees,
        assignedWorkers: assignedWorkers,
        updatedAt: new Date().toISOString(),
      });

      console.log('✅ Assignment saved:', {
        assignedEmployees: assignedEmployees.length,
        assignedWorkers: assignedWorkers.length
      });

      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-5 z-50">
        <div className="bg-white rounded-2xl p-8 text-center">
          <Loader className="animate-spin mx-auto mb-4 text-blue-600" size={40} />
          <p className="text-gray-600">Loading workers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-5 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Assign Workers</h2>
            <p className="text-sm text-gray-600 mt-1">{project.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X size={28} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mb-6">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Summary */}
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <Users className="text-blue-600" size={20} />
              <p className="text-blue-900 font-semibold text-sm">
                {assignedPeopleIds.length} worker{assignedPeopleIds.length !== 1 ? 's' : ''} assigned
              </p>
            </div>
          </div>

          {/* Workers List */}
          {people.length === 0 ? (
            <div className="text-center py-12">
              <Users size={64} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Workers in Company</h3>
              <p className="text-gray-600">
                Add workers to your company first before assigning them to projects.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {people.map((person) => {
                const isAssigned = assignedPeopleIds.includes(person.displayId);
                const Icon = person.icon === 'shield' ? Shield : Smartphone;
                const typeLabel = person.type === 'user' ? 'User' : 'SMS Worker';
                const typeColor = person.type === 'user' ? 'text-green-600' : 'text-orange-600';

                return (
                  <button
                    key={person.displayId}
                    onClick={() => togglePerson(person.displayId)}
                    className={`w-full rounded-xl p-4 border-2 transition-all ${
                      isAssigned
                        ? 'bg-blue-50 border-blue-500'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          isAssigned ? 'bg-blue-500' : 'bg-gray-100'
                        }`}>
                          {isAssigned ? (
                            <CheckCircle className="text-white" size={24} />
                          ) : (
                            <Icon className="text-gray-600" size={24} />
                          )}
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <p className={`font-bold ${
                              isAssigned ? 'text-blue-900' : 'text-gray-900'
                            }`}>
                              {person.name}
                            </p>
                            <span className={`text-xs ${typeColor} flex items-center gap-1`}>
                              <Icon size={12} />
                              {typeLabel}
                            </span>
                          </div>
                          <p className={`text-sm ${
                            isAssigned ? 'text-blue-700' : 'text-gray-600'
                          }`}>
                            {person.email || person.phone || 'No contact info'}
                          </p>
                        </div>
                      </div>

                      {isAssigned && (
                        <div className="bg-blue-500 text-white px-3 py-1 rounded-lg text-xs font-semibold">
                          Assigned
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-200 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <Loader className="animate-spin" size={20} />
                Saving...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <UserPlus size={20} />
                Save Assignments
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}