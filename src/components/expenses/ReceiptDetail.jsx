// src/pages/ReceiptDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { storageService } from '../../services/storageServices';
import { ArrowLeft, Calendar, DollarSign, Tag, Trash2, Image as ImageIcon } from 'lucide-react';

export default function ReceiptDetail() {
  const { projectId, receiptId } = useParams();
  const navigate = useNavigate();
  
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);

  useEffect(() => {
    fetchReceipt();
  }, [projectId, receiptId]);

  const fetchReceipt = async () => {
    try {
      const receiptDoc = await getDoc(doc(db, `projects/${projectId}/receipts/${receiptId}`));
      
      if (receiptDoc.exists()) {
        setReceipt({ id: receiptDoc.id, ...receiptDoc.data() });
      } else {
        alert('Receipt not found');
        navigate(`/projects/${projectId}/receipts`);
      }
    } catch (error) {
      console.error('Error fetching receipt:', error);
      alert('Failed to load receipt');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this receipt? This cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      // Delete receipt image from Storage
      if (receipt.receiptImageUrl) {
        await storageService.deleteReceipt(receipt.receiptImageUrl);
      }

      // Delete receipt from Firestore
      await deleteDoc(doc(db, `projects/${projectId}/receipts/${receiptId}`));

      navigate(`/projects/${projectId}/receipts`, {
        state: { message: 'Receipt deleted successfully' }
      });
    } catch (error) {
      console.error('Error deleting receipt:', error);
      alert('Failed to delete receipt: ' + error.message);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading receipt...</p>
        </div>
      </div>
    );
  }

  if (!receipt) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(`/projects/${projectId}/receipts`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 text-red-600 hover:text-red-700 disabled:opacity-50"
          >
            <Trash2 className="w-5 h-5" />
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Receipt Image */}
        {receipt.receiptImageUrl && (
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Receipt Image
            </h3>
            <img
              src={receipt.receiptImageUrl}
              alt="Receipt"
              onClick={() => setShowFullImage(true)}
              className="w-full max-h-96 object-contain rounded border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
            />
            <p className="text-xs text-gray-500 text-center mt-2">
              Click to view full size
            </p>
          </div>
        )}

        {/* Receipt Details */}
        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {/* Merchant & Total */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {receipt.merchant || 'Unknown Merchant'}
            </h1>
            <p className="text-4xl font-bold text-green-600">
              ${receipt.total?.toFixed(2) || '0.00'}
            </p>
          </div>

          {/* Date */}
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-5 h-5" />
            <span className="font-semibold">Date:</span>
            <span>{receipt.date || 'No date'}</span>
          </div>

          {/* Tags */}
          {receipt.tags && receipt.tags.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-gray-700 mb-2">
                <Tag className="w-5 h-5" />
                <span className="font-semibold">Tags:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {receipt.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {receipt.notes && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Notes:</h3>
              <p className="text-gray-600 bg-gray-50 p-4 rounded-lg">
                {receipt.notes}
              </p>
            </div>
          )}

          {/* Line Items */}
          {receipt.items && receipt.items.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">
                Line Items ({receipt.items.length})
              </h3>
              <div className="space-y-2">
                {receipt.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="text-gray-700">{item.description}</span>
                    <span className="font-semibold text-gray-900">
                      ${item.amount?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* OCR Confidence */}
          {receipt.ocrConfidence && (
            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-700 mb-2">
                OCR Confidence Score
              </h3>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{ width: `${(receipt.ocrConfidence * 100)}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-700">
                  {(receipt.ocrConfidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="border-t pt-4 text-sm text-gray-500">
            <p>Submitted by: {receipt.submittedByName || 'Unknown'}</p>
            {receipt.createdAt && (
              <p>
                Created: {new Date(receipt.createdAt.seconds * 1000).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Full Image Modal */}
      {showFullImage && receipt.receiptImageUrl && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setShowFullImage(false)}
        >
          <img
            src={receipt.receiptImageUrl}
            alt="Receipt Full Size"
            className="max-w-full max-h-full object-contain"
          />
          <button
            onClick={() => setShowFullImage(false)}
            className="absolute top-4 right-4 text-white text-xl bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-70"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}