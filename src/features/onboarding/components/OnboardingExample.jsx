/**
 * OnboardingExample.jsx
 *
 * Example integration of AdminOnboardingWizard
 * This shows how to integrate the onboarding wizard into your auth flow
 *
 * USAGE:
 * Copy the relevant parts of this example into your actual auth/dashboard pages
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useEmployeeStore } from '../../employees/store/employeeStore';
import { firestoreService } from '../../../services/firestoreService';
import AdminOnboardingWizard from './AdminOnboardingWizard';

/**
 * Example 1: Integration in Dashboard/Main Page
 *
 * This approach shows the wizard when a user without a company
 * tries to access the dashboard
 */
export function DashboardWithOnboarding() {
  const { currentUser } = useAuth();
  const { currentEmployee } = useEmployeeStore();
  const navigate = useNavigate();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!currentUser) {
        navigate('/login');
        return;
      }

      try {
        // Fetch user profile from Firestore
        const userProfileResult = await firestoreService.getById('users', currentUser.uid);

        if (userProfileResult.success) {
          const userProfile = userProfileResult.data;

          // Check if user needs onboarding
          const needsOnboarding = (
            userProfile.role === 'admin' &&
            (!userProfile.companyId || !userProfile.onboardingCompleted)
          );

          setShowOnboarding(needsOnboarding);
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [currentUser, navigate]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    // Optionally reload the page or refresh user data
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return <AdminOnboardingWizard onComplete={handleOnboardingComplete} />;
  }

  return (
    <div>
      <h1>Dashboard</h1>
      {/* Your normal dashboard content */}
    </div>
  );
}

/**
 * Example 2: Integration After Signup
 *
 * This approach shows the wizard immediately after a new admin
 * completes the signup process
 */
export function SignupFlowWithOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const navigate = useNavigate();

  const handleSignupSuccess = async (user, role) => {
    setUserRole(role);

    // If admin, show onboarding wizard
    if (role === 'admin') {
      setShowOnboarding(true);
    } else {
      // For non-admin users, go to their respective page
      navigate('/worker-dashboard');
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    navigate('/dashboard');
  };

  return (
    <div>
      {/* Your signup form */}
      {/* ... */}

      {showOnboarding && (
        <AdminOnboardingWizard onComplete={handleOnboardingComplete} />
      )}
    </div>
  );
}

/**
 * Example 3: Conditional Rendering with useEffect
 *
 * This approach can be used in App.jsx or a protected route wrapper
 */
export function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  const { currentEmployee, setCurrentEmployee } = useEmployeeStore();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (!currentUser) {
        setIsReady(true);
        return;
      }

      // Load user profile
      const userResult = await firestoreService.getById('users', currentUser.uid);

      if (userResult.success) {
        const userProfile = userResult.data;

        // Set current employee
        setCurrentEmployee({
          ...currentUser,
          ...userProfile,
        });

        // Check if needs onboarding
        if (
          userProfile.role === 'admin' &&
          !userProfile.companyId &&
          !userProfile.onboardingCompleted
        ) {
          setShowOnboarding(true);
        }
      }

      setIsReady(true);
    };

    init();
  }, [currentUser, setCurrentEmployee]);

  if (!isReady) {
    return <div>Loading...</div>;
  }

  if (showOnboarding) {
    return (
      <AdminOnboardingWizard
        onComplete={() => {
          setShowOnboarding(false);
          window.location.reload();
        }}
      />
    );
  }

  return children;
}

/**
 * Example 4: Manual Trigger (Button to restart onboarding)
 *
 * Useful for testing or allowing users to re-run setup
 */
export function ManualOnboardingTrigger() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  return (
    <div>
      <button
        onClick={() => setShowOnboarding(true)}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg"
      >
        Start Onboarding Setup
      </button>

      {showOnboarding && (
        <AdminOnboardingWizard
          onComplete={() => setShowOnboarding(false)}
        />
      )}
    </div>
  );
}

/**
 * Helper function to check if user needs onboarding
 * Can be used anywhere in your app
 */
export async function shouldShowOnboarding(userId) {
  try {
    const userResult = await firestoreService.getById('users', userId);

    if (!userResult.success) {
      return false;
    }

    const user = userResult.data;

    return (
      user.role === 'admin' &&
      (!user.companyId || !user.onboardingCompleted)
    );
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return false;
  }
}

/**
 * Helper function to reset onboarding (useful for testing)
 * WARNING: Only use in development!
 */
export async function resetOnboarding(userId, companyId) {
  try {
    // Remove onboarding flags from user
    await firestoreService.update('users', userId, {
      companyId: null,
      onboardingCompleted: false,
      onboardingCompletedAt: null,
    });

    // Optionally delete the company and related data
    if (companyId) {
      await firestoreService.delete('companies', companyId);
    }

    console.log('Onboarding reset successfully');
    return true;
  } catch (error) {
    console.error('Error resetting onboarding:', error);
    return false;
  }
}
