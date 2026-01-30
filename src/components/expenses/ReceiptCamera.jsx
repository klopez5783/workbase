// src/components/expenses/ReceiptCamera.jsx
import { Camera, Upload, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function ReceiptCamera({ onCapture, onCancel }) {
  const { t } = useTranslation();
  
  const handleTakePhoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const previewUrl = URL.createObjectURL(file);
        onCapture(file, previewUrl);
      }
    };
    
    input.click();
  };

  const handleChooseFromGallery = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const previewUrl = URL.createObjectURL(file);
        onCapture(file, previewUrl);
      }
    };
    
    input.click();
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900 to-blue-700 z-50">
      <div className="h-full flex flex-col items-center justify-center p-6">
        
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center">
          <button
            onClick={onCancel}
            className="text-white flex items-center gap-2 font-semibold"
          >
            <X className="w-6 h-6" />
            {t('common.cancel')}
          </button>
        </div>

        {/* Main Content */}
        <div className="text-center space-y-8 max-w-md w-full">
          {/* Icon */}
          <div className="w-32 h-32 mx-auto bg-white/10 rounded-full flex items-center justify-center">
            <Camera className="w-16 h-16 text-white" />
          </div>
          
          {/* Title */}
          <div>
            <h1 className="text-white text-3xl font-bold mb-2">
              {t('receipts.scan.captureReceipt')}
            </h1>
            <p className="text-blue-100">
              {t('receipts.scan.takeOrChoose')}
            </p>
          </div>

          {/* Buttons */}
          <div className="space-y-4">
            {/* Take Photo Button */}
            <button
              onClick={handleTakePhoto}
              className="w-full bg-white text-blue-900 py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-3"
            >
              <Camera className="w-6 h-6" />
              {t('receipts.scan.takePhoto')}
            </button>

            {/* Choose from Gallery */}
            <button
              onClick={handleChooseFromGallery}
              className="w-full bg-white/10 backdrop-blur text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-3 border-2 border-white/20 active:scale-95 transition-transform"
            >
              <Upload className="w-5 h-5" />
              {t('receipts.scan.chooseFromPhotos')}
            </button>
          </div>

          {/* Info Text */}
          <p className="text-blue-200 text-sm">
            📱 {t('receipts.scan.worksBest')}
          </p>
        </div>
      </div>
    </div>
  );
}