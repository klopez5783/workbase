import { useState, useRef } from 'react';
import { Camera, X, Loader, Upload } from 'lucide-react';
import { firestoreService } from '../services/firestoreService';
import { storageService } from '../services/storageServices';

export default function WorkLogForm({ 
  projectId, 
  projectName, 
  employeeId, 
  employeeName, 
  onSuccess, 
  onCancel 
}) {
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Add new images
    setImages(prev => [...prev, ...files]);

    // Create previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCameraCapture = (e) => {
    handleFileSelect(e);
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!description.trim()) {
      setError('Please provide a work description');
      return;
    }

    if (images.length === 0) {
      setError('Please add at least one photo');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      // Upload images to storage
      const imageUrls = [];
      for (const image of images) {
        const path = `workLogs/${projectId}/${Date.now()}_${image.name}`;
        const uploadResult = await storageService.upload(path, image);
        if (uploadResult.success) {
          imageUrls.push(uploadResult.url);
        }
      }

      // Detect language and translate if needed
      // For now, we'll assume English - you can add translation API here
      const wasTranslated = false;
      const translatedDescription = description;

      // Create work log document
      const workLog = {
        projectId,
        projectName,
        employeeId,
        employeeName,
        description,
        translatedDescription,
        wasTranslated,
        images: imageUrls,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = await firestoreService.create('workLogs', workLog);

      if (result.success) {
        onSuccess();
      } else {
        setError('Failed to submit work log');
      }
    } catch (err) {
      console.error('Error submitting work log:', err);
      setError('An error occurred while submitting');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-5 pb-24">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onCancel}
          className="text-blue-600 font-semibold mb-4 flex items-center gap-2"
        >
          ← Back to Projects
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Daily Work Log</h1>
        <p className="text-gray-600 text-sm mt-1">{projectName}</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mb-6">
          <p className="text-red-900 font-medium">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Description Field */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Work Description
          </label>
          <p className="text-xs text-gray-600 mb-3">
            Describe what you completed today in any language
          </p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Example: Installed drywall in master bedroom&#10;Ejemplo: Instalé paneles de yeso en dormitorio principal"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={5}
            disabled={submitting}
          />
        </div>

        {/* Camera Section */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Work Photos
          </label>
          <p className="text-xs text-gray-600 mb-4">
            Take photos of your completed work (at least 1 required)
          </p>

          {/* Camera Buttons */}
          <div className="flex gap-3 mb-4">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Camera size={20} />
              Take Photo
            </button>
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={submitting}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Upload size={20} />
              Upload Photo
            </button>
          </div>

          {/* Hidden File Inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCameraCapture}
            className="hidden"
            multiple
          />
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            multiple
          />

          {/* Image Previews */}
          {previews.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mt-4">
              {previews.map((preview, index) => (
                <div key={index} className="relative">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-40 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    disabled={submitting}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-lg transition disabled:opacity-50"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Photo Count */}
          {previews.length > 0 && (
            <p className="text-sm text-gray-600 mt-3 text-center">
              {previews.length} photo{previews.length !== 1 ? 's' : ''} added
            </p>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-4 px-6 rounded-xl font-bold transition disabled:opacity-50"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={submitting || !description.trim() || images.length === 0}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader className="animate-spin" size={20} />
                Submitting...
              </>
            ) : (
              'Submit Work Log'
            )}
          </button>
        </div>
      </form>

      {/* Language Support Info */}
      <div className="mt-6 bg-purple-50 border-l-4 border-purple-500 rounded-lg p-4">
        <p className="text-purple-900 font-medium text-sm mb-2">
          🌐 Multi-Language Support
        </p>
        <p className="text-purple-800 text-sm">
          You can write your description in any language! It will be automatically translated to English for reports.
        </p>
      </div>
    </div>
  );
}