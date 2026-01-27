// src/components/expenses/ReceiptScanner.jsx
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useReceiptOCR } from '../../hooks/useReceiptOCR';
import { storageService } from '../../services/storageServices';
import ReceiptCamera from './ReceiptCamera';
import ReceiptReview from './ReceiptReview';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';

export default function ReceiptScanner() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { processReceipt } = useReceiptOCR();
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState('camera'); // camera, processing, review
  const [imageBlob, setImageBlob] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [ocrData, setOcrData] = useState(null);

const handleSave = async (expenseData) => {
  setSaving(true);
  
  try {
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      throw new Error('You must be logged in to save expenses');
    }

    // Save to Firestore
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
      submittedByName: currentUser.displayName || currentUser.email || 'Unknown',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Success!
    navigate(`/projects/${projectId}/receipts`, {
      state: { message: 'Receipt saved successfully!' }
    });

  } catch (err) {
    alert('Failed to save expense: ' + err.message);
  } finally {
    setSaving(false);
  }
}

  const handleCapture = async (blob, previewUrl) => {
    setImageBlob(blob);
    setImagePreview(previewUrl);
    setStep('processing');

    try {
      const uploadResult = await storageService.uploadReceipt(projectId, blob);
      
      if (!uploadResult.success) {
        throw new Error('Failed to upload image: ' + uploadResult.error);
      }

      const imageUrl = uploadResult.url;
      const result = await processReceipt(imageUrl, projectId);

      setOcrData({
        ...result,
        receiptImageUrl: imageUrl
      });

      setStep('review'); // Changed from 'complete' to 'review'

    } catch (err) {
      alert('Failed to process receipt: ' + err.message);
      setStep('camera');
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
            alt="Receipt" 
            className="max-w-sm max-h-96 rounded-lg shadow-2xl mb-8"
          />
          
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-white mx-auto mb-4"></div>
            <p className="text-white text-xl font-semibold">
              Processing receipt...
            </p>
            <p className="text-white/70 text-sm mt-2">
              Extracting merchant, date, and items
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