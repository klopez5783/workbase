// src/pages/TestCamera.jsx
import { useState } from 'react';
import ReceiptCamera from '../components/expenses/ReceiptCamera';

export default function TestCamera() {
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);

  const handleCapture = (blob, previewUrl) => {
    console.log('📸 Photo captured!', blob);
    setCapturedImage(previewUrl);
    setShowCamera(false);
  };

  const handleCancel = () => {
    console.log('❌ Camera cancelled');
    setShowCamera(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Test Receipt Camera</h1>

        {!capturedImage ? (
          <button
            onClick={() => setShowCamera(true)}
            className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold text-lg"
          >
            📷 Open Camera
          </button>
        ) : (
          <div className="space-y-4">
            <h2 className="font-semibold text-lg">Captured Image:</h2>
            <img 
              src={capturedImage} 
              alt="Captured receipt" 
              className="w-full rounded-lg border-2 border-gray-200"
            />
            <button
              onClick={() => {
                setCapturedImage(null);
                setShowCamera(true);
              }}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold"
            >
              Take Another Photo
            </button>
          </div>
        )}
      </div>

      {showCamera && (
        <ReceiptCamera
          onCapture={handleCapture}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}