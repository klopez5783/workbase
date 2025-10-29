import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, CheckCircle, AlertCircle, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { firestoreService } from '../services/firestoreService';

export default function WorkerLinkStatus() {
  const { currentUser } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

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
        setStatus({
          type: 'linked',
          message: `Linked to worker: ${workerResult.data[0].name}`,
          workerName: workerResult.data[0].name,
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
  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <AlertCircle className="text-yellow-600 mt-0.5" size={20} />
          <div>
            <p className="font-semibold text-yellow-900 text-sm">Clock-In Setup Required</p>
            <p className="text-xs text-yellow-700 mt-1">{status.message}</p>
          </div>
        </div>
        <Link
          to="/profile"
          className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 flex-shrink-0"
        >
          <Settings size={14} />
          Setup
        </Link>
      </div>
    </div>
  );
}