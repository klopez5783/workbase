// src/pages/ReceiptList.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Camera, Calendar, DollarSign, Tag } from 'lucide-react';

export default function ReceiptList() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Fetch receipts from Firestore
  useEffect(() => {
    const receiptsRef = collection(db, `projects/${projectId}/receipts`);
    const q = query(receiptsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const receiptData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setReceipts(receiptData);
      
      // Calculate total
      const sum = receiptData.reduce((acc, receipt) => acc + (receipt.total || 0), 0);
      setTotal(sum);
      
      setLoading(false);
    }, (error) => {
      console.error('Error fetching receipts:', error);
      setLoading(false);
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [projectId]);

  // Show success message if navigated here after saving
  useEffect(() => {
    if (location.state?.message) {
      const timer = setTimeout(() => {
        window.history.replaceState({}, document.title);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [location]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading receipts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-4xl mx-auto p-4">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Receipts</h1>
            <p className="text-gray-600 mt-1">
              {receipts.length} receipt{receipts.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => navigate(`/projects/${projectId}/receipts/scan`)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700 shadow-lg"
          >
            <Camera className="w-5 h-5" />
            Scan Receipt
          </button>
        </div>

        {/* Success Message */}
        {location.state?.message && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-semibold">
              ✅ {location.state.message}
            </p>
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
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
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
                className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="flex gap-4">
                  {/* Receipt Image Thumbnail */}
                  {receipt.receiptImageUrl && (
                    <img
                      src={receipt.receiptImageUrl}
                      alt="Receipt"
                      className="w-20 h-20 object-cover rounded border border-gray-200"
                    />
                  )}

                  {/* Receipt Details */}
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
                      
                      {/* Total (Large on Right) */}
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">
                          ${receipt.total?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                    </div>

                    {/* Tags */}
                    {receipt.tags && receipt.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {receipt.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium"
                          >
                            <Tag className="w-3 h-3" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Notes Preview */}
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