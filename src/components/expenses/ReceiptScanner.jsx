// src/components/expenses/ReceiptScanner.jsx
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useReceiptOCR } from '../../hooks/useReceiptOCR';
import { storageService } from '../../services/storageService';
import ReceiptCamera from './ReceiptCamera';

export default function ReceiptScanner() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { processReceipt, processing } = useReceiptOCR();

  const [step, setStep] = useState('camera');
  const [imageBlob, setImageBlob] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [ocrData, setOcrData] = useState(null);

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

      setStep('complete');

    } catch (err) {
      alert('Failed to process receipt: ' + err.message);
      setStep('camera');
    }
  };

  const handleCancel = () => {
    navigate(`/projects/${projectId}/expenses`);
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

      {step === 'complete' && ocrData && (
        <div className="min-h-screen bg-gray-50 p-4">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-t-lg p-4 flex items-center justify-between">
              <h1 className="text-xl font-bold">Receipt Processed</h1>
              <button
                onClick={handleRetake}
                className="text-blue-600 font-semibold"
              >
                Retake
              </button>
            </div>

            <div className="bg-white border-t p-4">
              <img 
                src={imagePreview} 
                alt="Receipt" 
                className="w-full max-h-64 object-contain rounded-lg"
              />
            </div>

            <div className="bg-white border-t rounded-b-lg p-6 space-y-4">
              {ocrData._isMockData && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-orange-700">
                    ⚠️ Using mock data (emulator mode)
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Merchant
                  </label>
                  <p className="text-lg font-bold text-gray-900">
                    {ocrData.merchant || 'Not detected'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Date
                  </label>
                  <p className="text-lg font-bold text-gray-900">
                    {ocrData.date || 'Not detected'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Total
                </label>
                <p className="text-3xl font-bold text-green-600">
                  ${ocrData.total?.toFixed(2) || '0.00'}
                </p>
              </div>

              {ocrData.items && ocrData.items.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Items ({ocrData.items.length})
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {ocrData.items.map((item, idx) => (
                      <div 
                        key={idx} 
                        className="flex justify-between p-2 bg-gray-50 rounded"
                      >
                        <span className="text-gray-700">{item.description}</span>
                        <span className="font-semibold text-gray-900">
                          ${item.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Confidence Score
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{ width: `${(ocrData.confidence * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">
                    {(ocrData.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => navigate(`/projects/${projectId}/expenses`)}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Continue
                </button>
                
                <button
                  onClick={handleRetake}
                  className="px-6 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Retake
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}