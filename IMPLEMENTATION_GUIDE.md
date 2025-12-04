# User & Worker Separation Implementation Guide

## Overview

This implementation separates **authenticated Users** from **passwordless SMS Workers** in your WorkBase project management system. Projects now track two separate arrays:

- **`assignedEmployees[]`** - UIDs of authenticated Users who have email/password accounts
- **`assignedWorkers[]`** - IDs of SMS-only Workers who use time-limited access links

## Key Components

### 1. Helper Utilities (`src/utils/workerUserLink.js`)

Core functions for determining user types and checking assignments:

#### `findLinkedUser(worker)`
Finds if a Worker has a linked User account by matching phone numbers.

```javascript
const linkedUser = await findLinkedUser(workerObject);
if (linkedUser) {
  console.log('This worker has a user account:', linkedUser.uid);
}
```

#### `getUserType(userId)`
Determines if an ID represents a User or Worker.

```javascript
const typeInfo = await getUserType(someId);
// Returns: { isUser, isWorker, type, data, uid, id }
```

**Types returned:**
- `'user'` - Authenticated user with account
- `'worker-with-user-account'` - Worker linked to a User
- `'worker-sms-only'` - SMS-only worker with no account
- `'unknown'` - Not found in either collection

#### `isAssignedToProject(project, workerId, uid)`
Checks if someone is assigned to a project (checks both arrays + legacy fallback).

```javascript
const assigned = isAssignedToProject(
  project,
  worker.id,
  user?.uid
);
```

#### `categorizeAssignments(people)`
Processes a list of people and separates them into the correct arrays.

```javascript
const { assignedEmployees, assignedWorkers } = await categorizeAssignments(selectedPeople);
```

---

### 2. Updated Assignment Modal (`src/features/projects/components/AssignWorkersModal.jsx`)

**What Changed:**

1. **Loads Both Collections**: Fetches from both `users` and `workers` collections
2. **Deduplicates**: Filters out Workers who have linked User accounts (to avoid showing duplicates)
3. **Visual Indicators**: Shows shield icon (🛡️) for Users and smartphone icon (📱) for SMS Workers
4. **Smart Saving**: Categorizes selected people and saves to appropriate arrays

**How It Works:**

```javascript
// Load authenticated users
const companyUsers = users.filter(user =>
  user.role === 'worker' && user.companyId === currentEmployee?.companyId
);

// Load SMS workers (excluding those with linked user accounts)
const smsOnlyWorkers = workers.filter(worker => {
  const workerPhone = worker.phone.replace(/\D/g, '');
  return !userPhones.has(workerPhone); // Deduplicate
});

// On save, categorize into correct arrays
selectedPeople.forEach(person => {
  if (person.type === 'user' && person.uid) {
    assignedEmployees.push(person.uid);
  } else if (person.type === 'worker') {
    assignedWorkers.push(person.id);
  }
});
```

---

### 3. Updated Clock-In Hooks

#### `useClockIn.js` (Authenticated Users)

**What Changed:**
- Now uses `isAssignedToProject()` helper to check `assignedEmployees[]` array
- Supports legacy array fallback for backwards compatibility

```javascript
const assigned = isAssignedToProject(
  project,
  currentEmployee?.id,
  currentEmployee?.uid || currentEmployee?.id
);

if (!assigned) {
  throw new Error('You are not assigned to this project');
}
```

#### `useWorkerClockIn.js` (SMS Workers)

**What Changed:**
- Uses `isAssignedToProject()` to check both arrays
- Supports Workers with linked User accounts (checks `assignedEmployees` if they have a UID)

```javascript
const assignedProjects = projects.filter(project => {
  return isAssignedToProject(
    project,
    worker.id,
    currentUser?.uid
  );
});
```

---

### 4. Migration Tools

#### `migrateProjects.js`

Utility to convert existing projects from the old structure to the new dual-array structure.

**Functions:**

##### `migrateProject(project)`
Migrates a single project:
1. Reads the legacy `assignedWorkers` array
2. Checks each ID to determine if it's a User or Worker
3. Populates `assignedEmployees[]` and `assignedWorkers[]` accordingly
4. Adds `migratedAt` timestamp

##### `migrateAllProjects()`
Migrates all projects in the database and returns a summary:

```javascript
const result = await migrateAllProjects();
// Returns: { total, migrated, skipped, failed, details }
```

##### `validateProjectMigration()`
Validates that all projects have correct structure:

```javascript
const validation = await validateProjectMigration();
// Returns: { total, issuesFound, issues[] }
```

#### `MigrationButton.jsx`

Admin UI component for running migrations:
- **Validate Projects** - Checks for migration issues
- **Run Migration** - Executes the migration
- Shows detailed results and progress

**To Add to Admin Dashboard:**

```jsx
import MigrationButton from '../components/MigrationButton';

// In your admin page:
<MigrationButton />
```

---

## Data Flow

### Assignment Flow

```
1. Admin opens AssignWorkersModal
   ↓
2. Modal loads Users (from users collection) and Workers (from workers collection)
   ↓
3. System deduplicates by phone number to avoid showing same person twice
   ↓
4. Admin selects people to assign
   ↓
5. On Save:
   - Authenticated Users → assignedEmployees[] (by UID)
   - SMS Workers → assignedWorkers[] (by Worker ID)
   ↓
6. Project document updated with both arrays
```

### Clock-In Flow (Authenticated User)

```
1. User selects project and clicks Clock In
   ↓
2. useClockIn hook validates:
   - Is user.uid in project.assignedEmployees[]? ✓
   ↓
3. Geofence check
   ↓
4. Create time entry with userId = user.uid
```

### Clock-In Flow (SMS Worker)

```
1. Worker receives SMS link with accessKey
   ↓
2. Opens link, system loads worker data by accessKey
   ↓
3. Worker selects project and clicks Clock In
   ↓
4. useWorkerClockIn hook validates:
   - Is worker.id in project.assignedWorkers[]? ✓
   - OR is linkedUser.uid in project.assignedEmployees[]? ✓
   ↓
5. Geofence check
   ↓
6. Create time entry with workerId + userId (if linked)
```

---

## Company Join Code Integration

### How It Works Now

When someone uses a Company Join Code:

1. **If Not Authenticated:**
   - Redirected to login/signup
   - After authentication, join flow continues

2. **If Authenticated (User):**
   - User's profile updated: `companyId = company.id`
   - User's UID added to company's `workers[]` array
   - User becomes an **authenticated User**
   - When assigned to projects → goes in `assignedEmployees[]` ✅

3. **SMS Workers:**
   - Created via admin panel or cloud functions
   - No authentication required
   - When assigned to projects → goes in `assignedWorkers[]` ✅

### Join Code Logic (`JoinCompany.jsx`)

Already correctly implemented! No changes needed.

```javascript
// User joins via code
await firestoreService.update('users', currentUser.uid, {
  companyId: companyId,
  joinedAt: new Date().toISOString(),
  joinMethod: 'link',
});

// Add to company's workers array
await updateDoc(companyRef, {
  workers: arrayUnion(currentUser.uid),
});
```

**Result:** User is now an authenticated User and will be added to `assignedEmployees[]` when assigned to projects.

---

## Firestore Structure Changes

### Before (Legacy)

```javascript
projects/{projectId} = {
  assignedWorkers: ["id1", "id2", "id3"], // Mixed UIDs and Worker IDs
}
```

### After (New Structure)

```javascript
projects/{projectId} = {
  assignedEmployees: ["userUid1", "userUid2"], // Authenticated User UIDs
  assignedWorkers: ["workerId1", "workerId2"], // SMS-only Worker IDs
  migratedAt: "2025-12-04T10:30:00Z", // Migration timestamp
}
```

---

## Security Rules Considerations

Your current Firestore rules already support this structure:

```javascript
// projects - Public read (for geofencing)
match /projects/{projectId} {
  allow read: if true;
  allow create, update, delete: if isAdmin();
}

// users - Authenticated read
match /users/{userId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && request.auth.uid == userId;
}

// workers - Public read (for SMS access)
match /workers/{workerId} {
  allow read: if true;
  allow create, update, delete: if isAdmin();
}
```

**No changes needed** - The rules already allow:
- Public project reads (for clock-in geofencing)
- Authenticated users to read other user profiles
- Public worker reads (for SMS access key validation)

---

## Migration Steps

### Step 1: Run Migration

```javascript
import { migrateAllProjects } from './utils/migrateProjects';

// Option A: Use the MigrationButton component in admin dashboard
<MigrationButton />

// Option B: Run manually in console
const result = await migrateAllProjects();
console.log(result);
```

### Step 2: Validate

```javascript
import { validateProjectMigration } from './utils/migrateProjects';

const validation = await validateProjectMigration();
if (validation.issuesFound > 0) {
  console.log('Issues found:', validation.issues);
}
```

### Step 3: Test Clock-In

1. **As Authenticated User:**
   - Assign yourself to a project
   - Verify you're in `assignedEmployees[]` (check Firestore console)
   - Clock in and verify it works

2. **As SMS Worker:**
   - Create a test SMS worker (or use existing)
   - Assign to a project
   - Verify they're in `assignedWorkers[]`
   - Use SMS link to clock in and verify it works

---

## Troubleshooting

### Issue: User Can't Clock In

**Check:**
1. Is their UID in `project.assignedEmployees[]`?
2. Do they have a valid `companyId`?
3. Is the project active?

**Fix:**
```javascript
// Manually add to assignedEmployees
await firestoreService.update('projects', projectId, {
  assignedEmployees: firebase.firestore.FieldValue.arrayUnion(userUid)
});
```

### Issue: SMS Worker Can't Clock In

**Check:**
1. Is their Worker ID in `project.assignedWorkers[]`?
2. Is their access key still valid (expires after 30 min)?
3. Do they have a `companyId`?

**Fix:**
```javascript
// Manually add to assignedWorkers
await firestoreService.update('projects', projectId, {
  assignedWorkers: firebase.firestore.FieldValue.arrayUnion(workerId)
});
```

### Issue: Person Shows Up Twice in Assignment Modal

**Cause:** Worker and User have the same phone number but weren't deduplicated

**Fix:** The new code already handles this! If issue persists:
1. Check that both `user.phoneRaw` and `worker.phoneRaw` are formatted correctly (10 digits)
2. Update phone normalization in `workerUserLink.js`

### Issue: Migration Shows Errors

**Common Causes:**
1. Invalid user/worker IDs in legacy array
2. Phone number mismatch between users and workers
3. Missing `companyId` on workers/users

**Fix:**
```javascript
// Validate data first
const validation = await validateProjectMigration();
console.log(validation.issues);

// Manually fix problematic entries in Firestore
```

---

## Best Practices

### 1. Consistent Phone Formatting

Always store phone numbers in two formats:
- `phone`: Formatted for display `"(555) 123-4567"`
- `phoneRaw`: 10 digits only `"5551234567"`

### 2. Always Check Both Arrays

When checking assignments, use the helper:
```javascript
const assigned = isAssignedToProject(project, workerId, uid);
```

Don't manually check arrays - the helper handles edge cases and legacy data.

### 3. User Creation Flow

When creating users via signup or join code:
```javascript
{
  uid: firebaseAuthUid,      // Required for authenticated users
  phoneRaw: "5551234567",    // Required for linking
  phone: "(555) 123-4567",   // For display
  companyId: "abc123",       // Required before clock-in
  role: "worker",            // Or "admin"
}
```

### 4. Worker Creation Flow

When creating SMS workers:
```javascript
{
  id: firestoreDocId,        // Auto-generated
  phoneRaw: "5551234567",    // Required
  phone: "(555) 123-4567",   // For display
  companyId: "abc123",       // Required
  accessKey: uuid(),         // For SMS link
  accessKeyExpiresAt: Date,  // 30 min from creation
}
```

---

## Testing Checklist

- [ ] Authenticated User can be assigned to project (goes in assignedEmployees)
- [ ] SMS Worker can be assigned to project (goes in assignedWorkers)
- [ ] Authenticated User can clock in successfully
- [ ] SMS Worker can clock in successfully
- [ ] Worker with linked User account can clock in via SMS link
- [ ] Assignment modal shows both Users and Workers without duplicates
- [ ] Assignment modal displays correct icons (shield vs smartphone)
- [ ] Migration tool successfully converts legacy projects
- [ ] Validation tool detects issues correctly
- [ ] Join code adds user to correct array when assigned to project
- [ ] Clock-in fails appropriately for unassigned workers

---

## File Reference

| File | Purpose |
|------|---------|
| `src/utils/workerUserLink.js` | Core helper utilities for user/worker detection and linking |
| `src/utils/migrateProjects.js` | Migration and validation utilities |
| `src/components/MigrationButton.jsx` | Admin UI for running migrations |
| `src/features/projects/components/AssignWorkersModal.jsx` | Assignment interface (updated) |
| `src/features/timeTracking/hooks/useClockIn.js` | Clock-in hook for authenticated Users (updated) |
| `src/features/employees/hooks/userWorkerClockIn.js` | Clock-in hook for SMS Workers (updated) |
| `src/pages/JoinCompany.jsx` | Company join code handler (no changes needed) |

---

## Summary

This implementation provides:

✅ **Clear Separation**: Users and Workers are tracked in separate arrays
✅ **Smart Linking**: Workers with user accounts are properly handled
✅ **Backwards Compatible**: Legacy data is supported via helper functions
✅ **Easy Migration**: One-click migration tool with validation
✅ **Visual Clarity**: UI shows user type with icons
✅ **Consistent Clock-In**: Both user types validated correctly
✅ **Join Code Integration**: Works seamlessly with existing join code system

The system now properly distinguishes between authenticated Users (email/password) and passwordless Workers (SMS links), while maintaining backwards compatibility with existing data.
