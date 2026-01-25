// src/components/expenses/ReceiptCamera.jsx
import { useRef, useState, useEffect } from 'react';
import { X, Zap } from 'lucide-react';

export default function ReceiptCamera({ onCapture, onCancel }) {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STATE & REFS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  // videoRef: Direct reference to the <video> element (to control camera)
  const videoRef = useRef(null);
  
  // stream: Holds the active camera stream (so we can stop it later)
  const [stream, setStream] = useState(null);
  
  // hasFlash: Does this device have a flash/torch?
  const [hasFlash, setHasFlash] = useState(false);
  
  // flashOn: Is the flash currently on?
  const [flashOn, setFlashOn] = useState(false);
  
  // cameraError: Track if camera fails to start
  const [cameraError, setCameraError] = useState(null);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // START CAMERA WHEN COMPONENT LOADS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  useEffect(() => {
    startCamera();
    
    // Cleanup: Stop camera when component unmounts
    return () => {
      stopCamera();
    };
  }, []);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FUNCTION: Start Camera
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  const startCamera = async () => {
    try {
      console.log('📷 Requesting camera access...');
      
      // Ask browser for camera permission
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera (front camera = 'user')
          width: { ideal: 1920 },    // Request high resolution
          height: { ideal: 1080 }
        }
      });

      console.log('✅ Camera access granted');

      // Connect camera stream to <video> element
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
      }

      // Check if this device has a flash
      const track = mediaStream.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      
      if (capabilities.torch) {
        console.log('💡 Device has flash');
        setHasFlash(true);
      }

    } catch (error) {
      console.error('❌ Camera error:', error);
      setCameraError(error.message);
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FUNCTION: Stop Camera
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  const stopCamera = () => {
    if (stream) {
      console.log('🛑 Stopping camera...');
      stream.getTracks().forEach(track => track.stop());
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FUNCTION: Toggle Flash
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  const toggleFlash = async () => {
    if (!hasFlash || !stream) return;
    
    try {
      const track = stream.getVideoTracks()[0];
      await track.applyConstraints({
        advanced: [{ torch: !flashOn }]
      });
      setFlashOn(!flashOn);
      console.log(flashOn ? '💡 Flash OFF' : '💡 Flash ON');
    } catch (error) {
      console.error('Flash error:', error);
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FUNCTION: Capture Photo
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    console.log('📸 Capturing photo...');

    // Create an invisible canvas to capture the current video frame
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current video frame onto canvas
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    // Convert canvas to image blob
    canvas.toBlob((blob) => {
      console.log('✅ Photo captured');
      
      // Create a preview URL for immediate display
      const previewUrl = URL.createObjectURL(blob);
      
      // Stop camera (we're done)
      stopCamera();
      
      // Send blob and preview URL to parent component
      onCapture(blob, previewUrl);
    }, 'image/jpeg', 0.95); // 95% quality JPEG
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RENDER: Camera UI
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // If camera failed, show error
  if (cameraError) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">📷</div>
          <h2 className="text-white text-xl font-bold mb-2">
            Camera Access Denied
          </h2>
          <p className="text-gray-300 mb-6">
            Please enable camera permissions in your browser settings
          </p>
          <button
            onClick={onCancel}
            className="bg-white text-black px-6 py-3 rounded-lg font-semibold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* CAMERA PREVIEW (Full Screen) */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* OVERLAY CONTROLS */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="absolute inset-0 flex flex-col">
        
        {/* TOP BAR: Cancel + Flash */}
        <div className="flex justify-between items-center p-4 bg-gradient-to-b from-black/60 to-transparent">
          <button
            onClick={onCancel}
            className="text-white flex items-center gap-2 font-semibold"
          >
            <X className="w-6 h-6" />
            Cancel
          </button>
          
          {hasFlash && (
            <button
              onClick={toggleFlash}
              className={`p-3 rounded-full transition-colors ${
                flashOn 
                  ? 'bg-yellow-400 text-black' 
                  : 'bg-white/20 text-white'
              }`}
            >
              <Zap className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* CENTER: Receipt Frame Guide */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            {/* Visual guide for receipt placement */}
            <div className="w-[40vh] h-[60vh] border-4 border-white/60 border-dashed rounded-xl mb-2 flex items-center justify-center">
              <div className="text-white/60 text-sm">
                Position receipt here
              </div>
            </div>
            <div className="p-6 bg-gradient-to-t from-black/10 to-transparent">
          <button
            onClick={capturePhoto}
            className="w-full bg-white text-black py-4 rounded-full font-bold text-lg shadow-lg active:scale-95 transition-transform"
          >
            📷 Capture Receipt
          </button>
        </div>
          </div>
        </div>

        {/* BOTTOM: Capture Button */}
        
      </div>

      {/* Optional: Tap anywhere to capture */}
      <div 
        className="absolute inset-0 z-10"
        onClick={capturePhoto}
      />
    </div>
  );
}