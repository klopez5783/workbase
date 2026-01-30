// src/pages/ReceiptDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { storageService } from '../../services/storageServices';
import {
  CircleArrowLeft,
  Calendar,
  Tag,
  Trash2,
  Image as ImageIcon,
  Edit as EditIcon
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ReceiptReview from '../../components/expenses/ReceiptReview';

export default function ReceiptDetail() {
  const { t } = useTranslation();
  const { projectId, receiptId } = useParams();
  const navigate = useNavigate();

  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false); // Add edit mode state
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchReceipt();
  }, [projectId, receiptId]);

  const fetchReceipt = async () => {
    try {
      const receiptDoc = await getDoc(
        doc(db, `projects/${projectId}/receipts/${receiptId}`)
      );

      if (receiptDoc.exists()) {
        const receiptData = receiptDoc.data();
        
        setReceipt({ 
          id: receiptDoc.id,
          merchant: receiptData.merchant || '',
          date: receiptData.date || '',
          total: receiptData.total || 0,
          tags: Array.isArray(receiptData.tags) ? receiptData.tags : [],
          notes: receiptData.notes || '',
          items: Array.isArray(receiptData.items) ? receiptData.items : [],
          receiptImageUrl: receiptData.receiptImageUrl || '',
          ocrRawText: receiptData.ocrRawText || '',
          ocrConfidence: receiptData.ocrConfidence || 0,
          projectId: receiptData.projectId || projectId,
          submittedBy: receiptData.submittedBy || '',
          submittedByName: receiptData.submittedByName || '',
          createdAt: receiptData.createdAt,
          updatedAt: receiptData.updatedAt
        });
      } else {
        alert(t('receipts.detail.notFound'));
        navigate(`/projects/${projectId}/receipts`);
      }
    } catch (error) {
      console.error('Error fetching receipt:', error);
      alert(t('receipts.detail.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (expenseData) => {
    setSaving(true);

    try {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error(t('receipts.scan.loginRequired'));
      }

      const receiptRef = doc(db, `projects/${projectId}/receipts`, receiptId);
      
      await updateDoc(receiptRef, {
        merchant: expenseData.merchant,
        date: expenseData.date,
        total: expenseData.total,
        tags: expenseData.tags || [],
        notes: expenseData.notes || '',
        items: expenseData.items || [],
        ocrRawText: expenseData.ocrRawText || '',
        ocrConfidence: expenseData.ocrConfidence || 0,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid,
        updatedByName: currentUser.displayName || currentUser.email || t('receipts.detail.unknown')
      });

      // Refresh the receipt data
      await fetchReceipt();
      
      // Exit edit mode
      setIsEditMode(false);

      alert(t('receipts.edit.updateSuccess') || 'Receipt updated successfully');

    } catch (err) {
      console.error('Error updating receipt:', err);
      alert(t('receipts.edit.updateFailed') || 'Failed to update receipt: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('receipts.detail.deleteConfirm'))) return;

    setDeleting(true);
    try {
      if (receipt.receiptImageUrl) {
        await storageService.deleteReceipt(receipt.receiptImageUrl);
      }

      await deleteDoc(
        doc(db, `projects/${projectId}/receipts/${receiptId}`)
      );

      navigate(`/projects/${projectId}/receipts`, {
        state: { message: t('receipts.detail.deleteSuccess') }
      });
    } catch (error) {
      console.error('Error deleting receipt:', error);
      alert(t('receipts.detail.deleteFailed') + error.message);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!receipt) return null;

  // If in edit mode, show ReceiptReview component
  if (isEditMode) {
    const ocrData = {
      merchant: receipt.merchant,
      date: receipt.date,
      total: receipt.total,
      items: receipt.items,
      tags: receipt.tags,
      notes: receipt.notes,
      receiptImageUrl: receipt.receiptImageUrl,
      ocrRawText: receipt.ocrRawText,
      ocrConfidence: receipt.ocrConfidence,
      confidence: receipt.ocrConfidence
    };

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <button
              onClick={() => setIsEditMode(false)}
              className="text-blue-600 font-semibold flex items-center gap-2 hover:text-blue-700 transition"
            >
              <CircleArrowLeft size={25} />
              {t('common.cancel')}
            </button>

            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              <Trash2 className="w-5 h-5" />
              {deleting ? t('receipts.detail.deleting') : t('receipts.detail.delete')}
            </button>
          </div>
        </div>

        <ReceiptReview
          imageUrl={receipt.receiptImageUrl}
          ocrData={ocrData}
          onSave={handleSave}
          onRetake={() => setIsEditMode(false)}
          saving={saving}
          isEditMode={true}
        />
      </div>
    );
  }

  // Normal view mode
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(`/projects/${projectId}/receipts`)}
            className="text-blue-600 font-semibold flex items-center gap-2 hover:text-blue-700 transition"
          >
            <CircleArrowLeft size={25} />
            {t('receipts.detail.back')}
          </button>

          <div className="flex items-center gap-3">
            {/* Edit Button */}
            <button
              onClick={() => setIsEditMode(true)}
              className="flex items-center gap-2 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <EditIcon className="w-5 h-5" />
              {t('common.edit') || 'Edit'}
            </button>

            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              <Trash2 className="w-5 h-5" />
              {deleting ? t('receipts.detail.deleting') : t('receipts.detail.delete')}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Receipt Image */}
        {receipt.receiptImageUrl && (
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              {t('receipts.detail.receiptImage')}
            </h3>

            <img
              src={receipt.receiptImageUrl}
              alt={t('receipts.detail.receiptImage')}
              onClick={() => setShowFullImage(true)}
              className="w-full max-h-96 object-contain rounded border cursor-pointer hover:opacity-90 transition"
            />

            <p className="text-xs text-gray-500 text-center mt-2">
              {t('receipts.detail.clickToEnlarge')}
            </p>
          </div>
        )}

        {/* Receipt Details */}
        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {/* Merchant & Total */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {receipt.merchant || t('receipts.review.notSpecified')}
            </h1>
            <p className="text-4xl font-bold text-green-600">
              ${receipt.total?.toFixed(2) || '0.00'}
            </p>
          </div>

          {/* Date */}
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-5 h-5" />
            <span className="font-semibold">
              {t('receipts.review.date')}:
            </span>
            <span>
              {receipt.date || t('receipts.review.notSpecified')}
            </span>
          </div>

          {/* Tags */}
          {receipt.tags?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-gray-700 mb-2">
                <Tag className="w-5 h-5" />
                <span className="font-semibold">
                  {t('receipts.review.tags')}:
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {receipt.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                  >
                    {t(`receipts.tags.${tag}`, tag)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {receipt.notes && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">
                {t('receipts.detail.notes')}:
              </h3>
              <p className="text-gray-600 bg-gray-50 p-4 rounded-lg">
                {receipt.notes}
              </p>
            </div>
          )}

          {/* Line Items */}
          {receipt.items?.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">
                {t('receipts.review.lineItems', {
                  count: receipt.items.length
                })}
              </h3>

              <div className="space-y-2">
                {receipt.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="text-gray-700">
                      {item.description}
                    </span>
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
                {t('receipts.review.ocrConfidence')}
              </h3>

              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${receipt.ocrConfidence * 100}%`
                    }}
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
            <p>
              {t('receipts.detail.submittedBy', {
                name: receipt.submittedByName || t('receipts.detail.unknown')
              })}
            </p>

            {receipt.createdAt && (
              <p>
                {t('receipts.detail.created', {
                  date: new Date(
                    receipt.createdAt.seconds * 1000
                  ).toLocaleString()
                })}
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
            alt={t('receipts.detail.fullSize')}
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