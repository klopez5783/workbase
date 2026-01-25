// src/components/expenses/ReceiptScanner.jsx
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useReceiptOCR } from '@/hooks/useReceiptOCR';
import { uploadReceiptImage } from '@/services/storageService';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import ReceiptCamera from './ReceiptCamera';
import ReceiptReview from './ReceiptReview';

export default function ReceiptScanner() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { processReceipt, processing } = useReceiptOCR();

  const [step, setStep] = useState('camera'); // camera, processing, review
  const [imageBlob, setImageBlob] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [ocrData, setOcrData] = useState(null);

  const handleCapture = async (blob, previewUrl) => {
    setImageBlob(blob);
    setImagePreview(previewUrl);
    setStep('processing');

    try {
      // Upload to Firebase Storage
      const imageUrl = await uploadReceiptImage(projectId, blob);
      
      // Process with OCR
      const result = await processReceipt(imageUrl, projectId);
      
      setOcrData({
        ...result,
        receiptImageUrl: imageUrl
      });
      
      setStep('review');
      
    } catch (error) {
      console.error('Error processing receipt:', error);
      alert('Failed to process receipt. Please try again.');
      setStep('camera');
    }
  };

  const handleSave = async (expenseData) => {
    try {
      // Save to Firestore
      await addDoc(collection(db, `projects/${projectId}/expenses`), {
        ...expenseData,
        projectId,
        submittedBy: auth.currentUser.uid,
        submittedByName: auth.currentUser.displayName || 'Unknown',
        createdAt: serverTimestamp()
      });

      // Navigate back to expense list
      navigate(`/projects/${projectId}/expenses`, {
        state: { message: 'Receipt saved successfully!' }
      });
      
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Failed to save receipt. Please try again.');
    }
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
          onCancel={() => navigate(`/projects/${projectId}/expenses`)}
        />
      )}

      {step === 'processing' && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
          <img 
            src={imagePreview} 
            alt="Receipt" 
            className="max-w-sm max-h-96 rounded-lg shadow-lg mb-8"
          />
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-white"></div>
          <p className="text-white text-xl font-semibold mt-4">
            Processing receipt...
          </p>
        </div>
      )}

      {step === 'review' && ocrData && (
        <ReceiptReview
          imageUrl={imagePreview}
          ocrData={ocrData}
          onSave={handleSave}
          onRetake={handleRetake}
        />
      )}
    </>
  );
}