// src/pages/TestCamera.jsx
import { useState } from 'react';
import ReceiptCamera from '../components/expenses/ReceiptCamera';
import { storageService } from '../services/storageServices';

export default function TestCamera() {
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const [error, setError] = useState(null);

  const testProjectId = 'test-project-123';

  const handleCapture = async (blob, previewUrl) => {
    setCapturedImage(previewUrl);
    setShowCamera(false);
    setError(null);
    
    setUploading(true);
    try {
      const result = await storageService.uploadReceipt(testProjectId, blob);
      
      if (result.success) {
        setUploadedUrl(result.url);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setShowCamera(false);
  };

  const handleReset = () => {
    setCapturedImage(null);
    setUploadedUrl(null);
    setError(null);
    setShowCamera(true);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Test Receipt Camera + Upload</h1>

        {!capturedImage ? (
          <button
            onClick={() => setShowCamera(true)}
            className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-blue-700 transition-colors"
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

            {uploading && (
              <div className="flex items-center justify-center gap-2 text-blue-600 py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-blue-600"></div>
                <span className="font-medium">Uploading to Firebase...</span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-semibold mb-1">Upload Failed</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {uploadedUrl && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-semibold mb-2">
                  ✅ Uploaded to Firebase Storage!
                </p>
                <a 
                  href={uploadedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 text-sm break-all hover:underline"
                >
                  View in Storage →
                </a>
              </div>
            )}

            <button
              onClick={handleReset}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
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