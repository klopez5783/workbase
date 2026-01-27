// src/components/expenses/ReceiptScanner.jsx
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { useReceiptOCR } from '../../hooks/useReceiptOCR';
import { storageService } from '../../services/storageServices';
import { addToUploadQueue } from '../../services/offlineStorage';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useTranslation } from 'react-i18next';
import ReceiptCamera from './ReceiptCamera';
import ReceiptReview from './ReceiptReview';

export default function ReceiptScanner() {
  const { t } = useTranslation();
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { processReceipt } = useReceiptOCR();
  const { isOnline } = useNetworkStatus();

  const [step, setStep] = useState('camera');
  const [imageBlob, setImageBlob] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [ocrData, setOcrData] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleCapture = async (blob, previewUrl) => {
    setImageBlob(blob);
    setImagePreview(previewUrl);
    
    // If offline, skip OCR and go straight to review
    if (!isOnline) {
      setOcrData({
        merchant: '',
        date: '',
        total: 0,
        items: [],
        confidence: 0,
        _isOffline: true
      });
      setStep('review');
      return;
    }

    setStep('processing');

    try {
      const uploadResult = await storageService.uploadReceipt(projectId, blob);
      
      if (!uploadResult.success) {
        throw new Error(t('receipts.scan.uploadFailed') + uploadResult.error);
      }

      const imageUrl = uploadResult.url;
      const result = await processReceipt(imageUrl, projectId);

      setOcrData({
        ...result,
        receiptImageUrl: imageUrl
      });

      setStep('review');

    } catch (err) {
      console.error('Error processing receipt:', err);
      
      // If error, allow manual entry
      setOcrData({
        merchant: '',
        date: '',
        total: 0,
        items: [],
        confidence: 0,
        _hasError: true
      });
      setStep('review');
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  const handleRetake = () => {
    setStep('camera');
    setImageBlob(null);
    setImagePreview(null);
    setOcrData(null);
  };

  const handleSave = async (expenseData) => {
    setSaving(true);

    try {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error(t('receipts.scan.loginRequired'));
      }

      // If offline, save to queue
      if (!isOnline) {
        await addToUploadQueue({
          ...expenseData,
          imageBlob: imageBlob,
          projectId: projectId,
          submittedBy: currentUser.uid,
          submittedByName: currentUser.displayName || currentUser.email || t('receipts.detail.unknown')
        });

        navigate(`/projects/${projectId}/receipts`, {
          state: { 
            message: t('receipts.offline.savedOffline'),
            type: 'warning'
          }
        });
        return;
      }

      // Online - save directly to Firestore
      await addDoc(collection(db, `projects/${projectId}/receipts`), {
        merchant: expenseData.merchant,
        date: expenseData.date,
        total: expenseData.total,
        tags: expenseData.tags || [],
        notes: expenseData.notes || '',
        items: expenseData.items || [],
        receiptImageUrl: expenseData.receiptImageUrl,
        ocrRawText: expenseData.ocrRawText || '',
        ocrConfidence: expenseData.ocrConfidence || 0,
        projectId: projectId,
        submittedBy: currentUser.uid,
        submittedByName: currentUser.displayName || currentUser.email || t('receipts.detail.unknown'),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      navigate(`/projects/${projectId}/receipts`, {
        state: { message: t('receipts.scan.saveSuccess') }
      });

    } catch (err) {
      console.error('Error saving receipt:', err);
      alert(t('receipts.scan.saveFailed') + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {step === 'camera' && (
        <ReceiptCamera
          onCapture={handleCapture}
          onCancel={handleCancel}
        />
      )}

      {step === 'processing' && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-6">
          <img 
            src={imagePreview} 
            alt={t('receipts.title')}
            className="max-w-sm max-h-96 rounded-lg shadow-2xl mb-8"
          />
          
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-white mx-auto mb-4"></div>
            <p className="text-white text-xl font-semibold">
              {t('receipts.scan.processing')}
            </p>
            <p className="text-white/70 text-sm mt-2">
              {t('receipts.scan.extracting')}
            </p>
          </div>
        </div>
      )}

      {step === 'review' && ocrData && (
        <ReceiptReview
          imageUrl={imagePreview}
          ocrData={ocrData}
          onSave={handleSave}
          onRetake={handleRetake}
          saving={saving}
        />
      )}
    </>
  );
}