import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, CheckCircle, AlertCircle, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { firestoreService } from '../services/firestoreService';
import Alert from './Alert';
import { useEmployeeStore } from '../features/employees/store/employeeStore';

export default function WorkerLinkStatus() {
  const { currentUser } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const currentEmployee = useEmployeeStore((state) => state.currentEmployee);
  const isAdmin = currentEmployee?.role === 'admin';

  useEffect(() => {
    checkWorkerLink();
  }, [currentUser]);

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
        
        // ✅ Update worker with userId if not already set or if it's different
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
    return null; // Don't show anything while loading
  }

  // Don't show if already linked (no action needed)
  if (status.type === 'linked') {
    return (
      <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
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
        </div>
      </div>
    );
  }

  // Show alert for setup needed
  {if(!isAdmin){
    return (
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
    );
  }}
}