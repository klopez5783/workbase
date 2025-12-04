import { firestoreService } from '../services/firestoreService';

/**
 * Determines if a worker has a linked User account by matching phone numbers
 *
 * @param {Object} worker - Worker object from workers collection
 * @returns {Promise<Object|null>} User object if linked, null otherwise
 */
export async function findLinkedUser(worker) {
  if (!worker || !worker.phone) {
    return null;
  }

  try {
    // Extract phone digits from worker
    const phoneDigits = worker.phone.replace(/\D/g, '');

    if (!phoneDigits || phoneDigits.length < 10) {
      return null;
    }

    // Query users collection for matching phone number
    const userResult = await firestoreService.query('users', [
      { field: 'phoneRaw', operator: '==', value: phoneDigits }
    ]);

    if (userResult.success && userResult.data.length > 0) {
      // Return the first matching user (should only be one)
      return userResult.data[0];
    }

    // Also try matching against formatted phone field
    const userByPhoneResult = await firestoreService.query('users', [
      { field: 'phone', operator: '==', value: worker.phone }
    ]);

    if (userByPhoneResult.success && userByPhoneResult.data.length > 0) {
      return userByPhoneResult.data[0];
    }

    return null;
  } catch (error) {
    console.error('Error finding linked user:', error);
    return null;
  }
}

/**
 * Checks if a user ID represents an authenticated User (has uid field)
 *
 * @param {string} userId - User/Worker ID to check
 * @returns {Promise<Object>} Object with isUser flag and user/worker data
 */
export async function getUserType(userId) {
  try {
    // First check users collection
    const userResult = await firestoreService.getById('users', userId);

    if (userResult && userResult.uid) {
      return {
        isUser: true,
        isWorker: false,
        type: 'user',
        data: userResult,
        uid: userResult.uid,
        id: userResult.id
      };
    }

    // If not found in users, check workers collection
    const workerResult = await firestoreService.getById('workers', userId);

    if (workerResult) {
      // Check if this worker has a linked user
      const linkedUser = await findLinkedUser(workerResult);

      return {
        isUser: !!linkedUser,
        isWorker: true,
        type: linkedUser ? 'worker-with-user-account' : 'worker-sms-only',
        data: workerResult,
        linkedUser: linkedUser,
        uid: linkedUser?.uid,
        id: workerResult.id
      };
    }

    return {
      isUser: false,
      isWorker: false,
      type: 'unknown',
      data: null,
      uid: null,
      id: userId
    };
  } catch (error) {
    console.error('Error getting user type:', error);
    return {
      isUser: false,
      isWorker: false,
      type: 'error',
      data: null,
      uid: null,
      id: userId,
      error: error.message
    };
  }
}

/**
 * Processes a list of people and separates them into authenticated Users and SMS-only Workers
 *
 * @param {Array<Object>} people - Array of user/worker objects
 * @returns {Promise<Object>} Object with assignedEmployees (UIDs) and assignedWorkers (IDs)
 */
export async function categorizeAssignments(people) {
  const assignedEmployees = []; // UIDs of authenticated users
  const assignedWorkers = [];   // IDs of SMS-only workers

  for (const person of people) {
    // If person has a uid field, they're an authenticated User
    if (person.uid) {
      assignedEmployees.push(person.uid);
      continue;
    }

    // If person has an id but no uid, they might be a Worker or User entry
    if (person.id) {
      const typeInfo = await getUserType(person.id);

      if (typeInfo.isUser && typeInfo.uid) {
        // Authenticated user
        assignedEmployees.push(typeInfo.uid);
      } else if (typeInfo.type === 'worker-with-user-account' && typeInfo.linkedUser) {
        // Worker with linked user account - use the linked user's UID
        assignedEmployees.push(typeInfo.linkedUser.uid);
      } else if (typeInfo.isWorker) {
        // SMS-only worker with no linked user
        assignedWorkers.push(person.id);
      }
    }
  }

  return {
    assignedEmployees: [...new Set(assignedEmployees)], // Remove duplicates
    assignedWorkers: [...new Set(assignedWorkers)]       // Remove duplicates
  };
}

/**
 * Normalizes phone numbers to 10-digit format for comparison
 *
 * @param {string} phone - Phone number in any format
 * @returns {string} 10-digit phone number
 */
export function normalizePhone(phone) {
  if (!phone) return '';
  return phone.replace(/\D/g, '').slice(-10);
}

/**
 * Checks if a worker is assigned to a project (checks both arrays)
 *
 * @param {Object} project - Project object
 * @param {string} workerId - Worker ID (could be uid or worker id)
 * @param {string} uid - Optional Firebase Auth UID
 * @returns {boolean} True if assigned to project
 */
export function isAssignedToProject(project, workerId, uid = null) {
  if (!project) return false;

  const assignedEmployees = project.assignedEmployees || [];
  const assignedWorkers = project.assignedWorkers || [];

  // Check if uid is in assignedEmployees (for authenticated users)
  if (uid && assignedEmployees.includes(uid)) {
    return true;
  }

  // Check if workerId is in assignedWorkers (for SMS workers)
  if (workerId && assignedWorkers.includes(workerId)) {
    return true;
  }

  // Fallback: check legacy assignedWorkers field
  const legacyAssignedWorkers = project.assignedWorkers || [];
  if (workerId && legacyAssignedWorkers.includes(workerId)) {
    return true;
  }
  if (uid && legacyAssignedWorkers.includes(uid)) {
    return true;
  }

  return false;
}
