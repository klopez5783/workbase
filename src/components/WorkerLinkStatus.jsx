import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, CheckCircle, AlertCircle, Settings, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { firestoreService } from '../services/firestoreService';
import Alert from './Alert';
import { useEmployeeStore } from '../features/employees/store/employeeStore';

export default function WorkerLinkStatus() {
  const { currentUser } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLinkedMessage, setShowLinkedMessage] = useState(true);
  const currentEmployee = useEmployeeStore((state) => state.currentEmployee);
  const isAdmin = currentEmployee?.role === 'admin';

  // ✅ Check if user has already dismissed this message
  useEffect(() => {
    if (currentUser) {
      const dismissedKey = `workerLinkDismissed_${currentUser.uid}`;
      const wasDismissed = localStorage.getItem(dismissedKey);
      if (wasDismissed === 'true') {
        setShowLinkedMessage(false);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    checkWorkerLink();
  }, [currentUser]);

  // ✅ Auto-dismiss linked message after 4 seconds
  useEffect(() => {
    if (status?.type === 'linked' && showLinkedMessage) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [status, showLinkedMessage]);

  // ✅ Handle dismissal and save to localStorage
  const handleDismiss = () => {
    setShowLinkedMessage(false);
    if (currentUser) {
      const dismissedKey = `workerLinkDismissed_${currentUser.uid}`;
      sessionStorage.setItem(dismissedKey, 'true');  // ← sessionStorage
    }
  };

  const checkWorkerLink = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);

      // Get user's phone number
      const userResult = await firestoreService.query('users', [
        { field: 'uid', operator: '==', value: currentUser.uid }
      ]);

      if (!userResult.success || userResult.data.length === 0) {
        setStatus({ type: 'no-profile', message: 'Complete your profile to enable clock-in' });
        setLoading(false);
        return;
      }

      const userData = userResult.data[0];
      const userPhone = userData.phone || userData.phoneNumber;

      if (!userPhone) {
        setStatus({ type: 'no-phone', message: 'Add phone number to enable clock-in' });
        setLoading(false);
        return;
      }

      // Check if phone matches a worker
      const phoneDigits = userPhone.replace(/\D/g, '');
      const workerResult = await firestoreService.query('workers', [
        { field: 'phoneRaw', operator: '==', value: phoneDigits }
      ]);

      if (workerResult.success && workerResult.data.length > 0) {
        const workerData = workerResult.data[0];
        
        // Update worker with userId if not already set
        if (!workerData.userId || workerData.userId !== currentUser.uid) {
          console.log('🔗 Linking worker to user account...');
          await firestoreService.update('workers', workerData.id, {
            userId: currentUser.uid,
            updatedAt: new Date().toISOString(),
          });
          console.log('✅ Worker linked successfully');
        }

        setStatus({
          type: 'linked',
          message: `Linked to worker: ${workerData.name}`,
          workerName: workerData.name,
        });
      } else {
        setStatus({
          type: 'not-linked',
          message: 'Not linked to worker account',
        });
      }

      setLoading(false);
    } catch (err) {
      console.error('Error checking worker link:', err);
      setLoading(false);
    }
  };

  if (loading || !status) {
    return null;
  }

  // Don't show if linked message is dismissed
  if (status.type === 'linked' && !showLinkedMessage) {
    return null;
  }

  // Show linked message with manual dismiss option
  if (status.type === 'linked') {
    return (
      <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4 mx-5 mb-4 transition-opacity duration-300">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <CheckCircle className="text-green-600 mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-green-900 text-sm">Worker Account Linked</p>
              <p className="text-xs text-green-700 mt-1">{status.message}</p>
              <p className="text-xs text-green-600 mt-1">
                ✓ You can clock in using the blue floating button
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-green-600 hover:text-green-800 transition flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    );
  }

  // Show alert for setup needed
  if (!isAdmin) {
    return (
      <div className="mx-5 mb-4">
        <Alert
          shadeType="yellow"
          text="Clock-In Setup Required"
          subText={status.message}
          actionButton={{
            text: 'Setup',
            link: '/profile',
            icon: Settings
          }}
        />
      </div>
    );
  }
  
  return null;
}