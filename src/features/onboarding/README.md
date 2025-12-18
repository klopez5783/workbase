# Admin Onboarding Wizard

A TurboTax-style step-by-step wizard that guides new admin users through initial setup.

## Overview

The `AdminOnboardingWizard` component walks new administrators through:

1. **Company Setup** - Create company profile with name, phone, and industry
2. **First Project** - Set up initial project with location and address
3. **First Worker** - Add first team member (optional/skippable)
4. **Success Screen** - Celebration and summary of what was created

## Features

- ✅ Multi-step wizard with progress indicator
- ✅ Step validation before proceeding
- ✅ Conversational UI with helpful tips
- ✅ Map-based location picker for projects
- ✅ Skip option for worker creation
- ✅ Auto-saves progress through steps
- ✅ Matches existing ProjectWizard styling
- ✅ Mobile-responsive design
- ✅ Loading states and error handling

## Integration

### Basic Usage

```jsx
import AdminOnboardingWizard from '../features/onboarding/components/AdminOnboardingWizard';

function YourComponent() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  return (
    <>
      {showOnboarding && (
        <AdminOnboardingWizard
          onComplete={() => {
            setShowOnboarding(false);
            navigate('/dashboard');
          }}
        />
      )}
    </>
  );
}
```

### Integration with Authentication Flow

The wizard should be triggered after successful signup for admin users who don't have a company set up yet.

#### Example: In your Login/Signup component

```jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useEmployeeStore } from '../features/employees/store/employeeStore';
import { firestoreService } from '../services/firestoreService';
import AdminOnboardingWizard from '../features/onboarding/components/AdminOnboardingWizard';
import { useNavigate } from 'react-router-dom';

function AuthPage() {
  const { currentUser } = useAuth();
  const { currentEmployee } = useEmployeeStore();
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!currentUser) return;

      // Fetch user profile
      const userProfile = await firestoreService.getById('users', currentUser.uid);

      if (userProfile.success) {
        const user = userProfile.data;

        // Show wizard if:
        // 1. User is an admin
        // 2. User doesn't have a companyId
        // 3. Onboarding hasn't been completed
        if (
          user.role === 'admin' &&
          !user.companyId &&
          !user.onboardingCompleted
        ) {
          setShowOnboardingWizard(true);
        } else {
          // Navigate to appropriate page
          navigate('/dashboard');
        }
      }
    };

    checkOnboardingStatus();
  }, [currentUser]);

  const handleOnboardingComplete = () => {
    setShowOnboardingWizard(false);
    navigate('/dashboard');
  };

  return (
    <div>
      {/* Your auth UI here */}

      {showOnboardingWizard && (
        <AdminOnboardingWizard onComplete={handleOnboardingComplete} />
      )}
    </div>
  );
}
```

#### Alternative: Check in Protected Route

```jsx
// In your dashboard or main admin page
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { firestoreService } from '../services/firestoreService';
import AdminOnboardingWizard from '../features/onboarding/components/AdminOnboardingWizard';

function Dashboard() {
  const { currentUser } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkOnboarding = async () => {
      const userProfile = await firestoreService.getById('users', currentUser.uid);

      if (userProfile.success) {
        const needsOnboarding =
          !userProfile.data.companyId ||
          !userProfile.data.onboardingCompleted;

        setShowOnboarding(needsOnboarding);
      }
      setLoading(false);
    };

    if (currentUser) {
      checkOnboarding();
    }
  }, [currentUser]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (showOnboarding) {
    return (
      <AdminOnboardingWizard
        onComplete={() => {
          setShowOnboarding(false);
          // Refresh page or reload user data
          window.location.reload();
        }}
      />
    );
  }

  return (
    <div>
      {/* Your dashboard content */}
    </div>
  );
}
```

## Data Models

### Company Document (created in Step 1)
```javascript
{
  name: string,              // e.g., "Smith Construction LLC"
  phone: string,             // e.g., "(555) 123-4567"
  industry: string,          // e.g., "Construction"
  createdBy: userId,         // Firebase auth UID
  workers: [],               // Array of worker IDs
  createdAt: ISO timestamp,
  updatedAt: ISO timestamp
}
```

### User Profile Update (after Step 1)
```javascript
{
  companyId: string,              // Reference to company document
  onboardingCompleted: boolean,   // Set to true after wizard completion
  onboardingCompletedAt: ISO timestamp
}
```

### Project Document (created in Step 2)
```javascript
{
  name: string,
  address: string,
  location: { latitude: number, longitude: number },
  geofenceRadius: number,
  clientName: string,
  clientPhone: string,
  status: 'active',
  assignedEmployees: [],
  assignedWorkers: [],
  createdBy: companyId,
  createdAt: ISO timestamp,
  updatedAt: ISO timestamp
}
```

### Worker Document (created in Step 3, optional)
```javascript
{
  name: string,
  phone: string,                  // Formatted: "(555) 123-4567"
  phoneRaw: string,               // Raw digits: "5551234567"
  accessKey: string,              // UUID for worker access
  accessKeyCreatedAt: ISO timestamp,
  accessKeyExpiresAt: ISO timestamp,  // 30 minutes from creation
  status: 'active',
  companyId: string,
  createdAt: ISO timestamp,
  updatedAt: ISO timestamp
}
```

## Wizard Flow

```
┌─────────────────────────────────────┐
│   User Signs Up (Admin Role)       │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│  Step 1: Company Setup              │
│  - Company Name                     │
│  - Phone (optional)                 │
│  - Industry                         │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│  Step 2: First Project              │
│  - Project Name                     │
│  - Address (street, city, state)    │
│  - Location on Map                  │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│  Step 3: First Worker (Optional)    │
│  - Worker Name                      │
│  - Worker Phone                     │
│  - Option to skip                   │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│  Step 4: Success Screen             │
│  - Summary of created items         │
│  - "Go to Dashboard" button         │
└─────────────────────────────────────┘
```

## Validation Rules

### Step 1 (Company)
- ✅ Company name is required
- ✅ Phone is optional
- ✅ Industry defaults to "Construction"

### Step 2 (Project)
- ✅ Project name is required
- ✅ Street address is required
- ✅ City is required
- ✅ State is required
- ✅ ZIP code must be exactly 5 digits
- ✅ Location on map is required

### Step 3 (Worker)
- ✅ Can skip this step entirely
- ✅ If not skipped:
  - Worker name is required
  - Worker phone must be valid 10-digit number
  - Auto-formatted as: (555) 123-4567

## Styling

The wizard follows the exact styling patterns from `ProjectWizard.jsx`:

- **Colors**: Blue (company), Green (project), Orange (worker)
- **Border radius**: `rounded-xl`, `rounded-2xl`
- **Progress bar**: Green for completed, Blue for current, Gray for pending
- **Buttons**: Primary blue gradient, hover effects
- **Icons**: Lucide icons at 32px for step headers
- **Modal**: Fixed overlay with max-width 2xl
- **Animations**: `animate-fadeIn` for step transitions

## Error Handling

The wizard includes comprehensive error handling:

- ✅ Form validation errors display in red alert boxes
- ✅ Firebase errors are caught and displayed to user
- ✅ Loading states prevent duplicate submissions
- ✅ Exit confirmation prevents accidental data loss
- ✅ All errors are logged to console for debugging

## Dependencies

- React (hooks: useState)
- Lucide React (icons)
- Firebase Firestore (via firestoreService)
- Auth context (useAuth)
- Employee store (useEmployeeStore)
- Project store (useProjectStore)
- LocationPicker component (for map selection)

## Testing Checklist

- [ ] New admin user sees wizard after signup
- [ ] Step 1 creates company in Firestore
- [ ] Step 1 updates user profile with companyId
- [ ] Step 2 creates project with correct location
- [ ] Step 3 creates worker and assigns to project
- [ ] Step 3 can be skipped successfully
- [ ] Success screen shows correct summary
- [ ] "Go to Dashboard" redirects properly
- [ ] Exit button shows confirmation dialog
- [ ] Form validation prevents invalid data
- [ ] Loading states work correctly
- [ ] Error messages display properly
- [ ] Mobile responsive on small screens

## Future Enhancements

Potential improvements for future iterations:

- 🔮 Save progress to localStorage (resume if interrupted)
- 🔮 Confetti animation on completion
- 🔮 Email confirmation after setup
- 🔮 Video tutorial embeds in each step
- 🔮 Ability to edit previous steps
- 🔮 Import workers from CSV
- 🔮 Template projects for different industries
- 🔮 Multi-language support
- 🔮 Analytics tracking for completion rates

## Support

For issues or questions, refer to the main WorkBase documentation or contact the development team.
