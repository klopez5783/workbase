// src/pages/ReceiptList.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Camera, Calendar, DollarSign, Tag, RefreshCw } from 'lucide-react';
import { LoadingPage } from '../LoadingSpinner';
import { Toast } from '../Toast';
import { OfflineBanner } from '../OfflineBanner';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { getCachedReceipts, cacheReceipt, getUploadQueue } from '../../services/offlineStorage';
import { syncPendingReceipts } from '../../services/syncService';

export default function ReceiptList() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isOnline, wasOffline } = useNetworkStatus();
  
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [toast, setToast] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  // Load receipts (online or offline)
  useEffect(() => {
    if (isOnline) {
      // Online: Subscribe to Firestore
      const receiptsRef = collection(db, `projects/${projectId}/receipts`);
      const q = query(receiptsRef, orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(
        q,
        async (snapshot) => {
          try {
            const receiptData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            setReceipts(receiptData);
            
            // Cache receipts for offline use
            for (const receipt of receiptData) {
              await cacheReceipt(receipt);
            }
            
            const sum = receiptData.reduce((acc, receipt) => acc + (receipt.total || 0), 0);
            setTotal(sum);
            
            setLoading(false);
            setError(null);
          } catch (err) {
            console.error('Error processing receipts:', err);
            setError('Failed to process receipt data');
            setLoading(false);
          }
        },
        (err) => {
          console.error('Error fetching receipts:', err);
          setError('Failed to load receipts. Please check your connection and try again.');
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } else {
      // Offline: Load from cache
      loadCachedReceipts();
    }
  }, [projectId, isOnline]);

  // Load cached receipts when offline
  const loadCachedReceipts = async () => {
    try {
      const cached = await getCachedReceipts(projectId);
      setReceipts(cached);
      
      const sum = cached.reduce((acc, receipt) => acc + (receipt.total || 0), 0);
      setTotal(sum);
      
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('Error loading cached receipts:', err);
      setError('Failed to load cached receipts');
      setLoading(false);
    }
  };

  // Check pending uploads
  useEffect(() => {
    const checkPending = async () => {
      const queue = await getUploadQueue();
      setPendingCount(queue.length);
    };
    
    checkPending();
    
    // Check every 5 seconds
    const interval = setInterval(checkPending, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (wasOffline && isOnline && pendingCount > 0) {
      handleSync();
    }
  }, [wasOffline, isOnline, pendingCount]);

  // Manual sync
  const handleSync = async () => {
    if (syncing) return;
    
    setSyncing(true);
    
    try {
      const result = await syncPendingReceipts((current, total) => {
        console.log(`Syncing ${current}/${total}...`);
      });

      if (result.success) {
        if (result.synced > 0) {
          setToast({ 
            message: `Synced ${result.synced} receipt${result.synced !== 1 ? 's' : ''}!`, 
            type: 'success' 
          });
        }
        setPendingCount(0);
      } else {
        setToast({ message: 'Sync failed', type: 'error' });
      }
    } catch (err) {
      console.error('Sync error:', err);
      setToast({ message: 'Sync failed', type: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  // Show success message
  useEffect(() => {
    if (location.state?.message) {
      setToast({ 
        message: location.state.message, 
        type: location.state.type || 'success' 
      });
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  if (loading) {
    return <LoadingPage message="Loading receipts..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Error Loading Receipts
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Offline Banner */}
      <OfflineBanner syncCount={pendingCount} />

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Receipts</h1>
            <p className="text-gray-600 mt-1">
              {receipts.length} receipt{receipts.length !== 1 ? 's' : ''}
              {!isOnline && ' (cached)'}
            </p>
          </div>
          <button
            onClick={() => navigate(`/projects/${projectId}/receipts/scan`)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700 shadow-lg transition-colors"
          >
            <Camera className="w-5 h-5" />
            Scan Receipt
          </button>
        </div>

        {/* Pending Uploads Banner */}
        {pendingCount > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RefreshCw className={`w-5 h-5 text-blue-600 ${syncing ? 'animate-spin' : ''}`} />
                <div>
                  <p className="font-semibold text-blue-900">
                    {pendingCount} receipt{pendingCount !== 1 ? 's' : ''} pending upload
                  </p>
                  <p className="text-sm text-blue-700">
                    {isOnline ? 'Ready to sync' : 'Will sync when online'}
                  </p>
                </div>
              </div>
              {isOnline && !syncing && (
                <button
                  onClick={handleSync}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Sync Now
                </button>
              )}
            </div>
          </div>
        )}

        {/* Total Summary */}
        {receipts.length > 0 && (
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-6 mb-6 shadow-lg">
            <p className="text-blue-100 text-sm font-semibold mb-1">Total Expenses</p>
            <p className="text-4xl font-bold">${total.toFixed(2)}</p>
          </div>
        )}

        {/* Receipt List */}
        {receipts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">📄</div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">
              No receipts yet
            </h2>
            <p className="text-gray-500 mb-6">
              Scan your first receipt to get started tracking expenses!
            </p>
            <button
              onClick={() => navigate(`/projects/${projectId}/receipts/scan`)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Scan Receipt
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {receipts.map((receipt) => (
              <div
                key={receipt.id}
                onClick={() => navigate(`/projects/${projectId}/receipts/${receipt.id}`)}
                className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-all cursor-pointer"
              >
                <div className="flex gap-4">
                  {receipt.receiptImageUrl && (
                    <img
                      src={receipt.receiptImageUrl}
                      alt="Receipt"
                      className="w-20 h-20 object-cover rounded border border-gray-200"
                      loading="lazy"
                    />
                  )}

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">
                          {receipt.merchant || 'Unknown Merchant'}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {receipt.date || 'No date'}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            ${receipt.total?.toFixed(2) || '0.00'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">
                          ${receipt.total?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                    </div>

                    {receipt.tags && receipt.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {receipt.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium"
                          >
                            <Tag className="w-3 h-3" />
                            {tag}
                          </span>
                        ))}
                        {receipt.tags.length > 3 && (
                          <span className="text-xs text-gray-500 py-1">
                            +{receipt.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {receipt.notes && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-1">
                        {receipt.notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}