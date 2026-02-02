import { useState, useRef } from 'react';
import { Camera, X, Loader, Upload, CircleArrowLeft, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showLanguageInfo, setShowLanguageInfo] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [isTextareaExpanded, setIsTextareaExpanded] = useState(false);


  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setImages(prev => [...prev, ...files]);

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
      setError(t('workLog.errors.descriptionRequired'));
      return;
    }

    if (images.length === 0) {
      setError(t('workLog.errors.photoRequired'));
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const imageUrls = [];
      for (const image of images) {
        const path = `workLogs/${projectId}/${Date.now()}_${image.name}`;
        const uploadResult = await storageService.upload(path, image);
        if (uploadResult.success) {
          imageUrls.push(uploadResult.url);
        }
      }

      const wasTranslated = false;
      const translatedDescription = description;

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
        setError(t('workLog.errors.submitFailed'));
      }
    } catch (err) {
      console.error('Error submitting work log:', err);
      setError(t('workLog.errors.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="grid grid-cols-4 items-center p-2">
        {/* Left */}
        <div className="flex justify-start">
          <button
            onClick={onCancel}
            className="text-blue-600 font-semibold flex items-center gap-2 text-lg"
          >
            <CircleArrowLeft size={24} />
            {t('common.back')}
          </button>
        </div>

        {/* Center */}
        <div className="text-center col-span-2">
          <h1 className="text-xl font-bold text-gray-900 w-max mx-auto">
            {t('workLog.title')}
          </h1>
          <p className="text-gray-600 text-sm mt-1 w-max mx-auto">
            {projectName}
          </p>
        </div>

        {/* Right spacer */}
        <div />
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-5 mt-4 bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
          <p className="text-red-900 font-medium">{error}</p>
        </div>
      )}

      {/* Form - Scrollable */}
      <form onSubmit={handleSubmit} className="px-3 space-y-2">
        
        {/* Description Field */}
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-300">
  {/* Label with Info Button */}
  <div className="flex items-center justify-between mb-1">
    <label className="block text-lg font-bold text-gray-900">
      {t('workLog.description.label')}
    </label>
    
    <div className="flex gap-2">
      {/* Expand/Collapse Button */}
      <button
        type="button"
        onClick={() => setIsTextareaExpanded(!isTextareaExpanded)}
        className="text-blue-600 hover:text-blue-700 transition p-1 font-semibold"
      >
        {isTextareaExpanded ? '− Collapse' : '+ Expand Text Area'}
      </button>
    </div>
  </div>

  {/* Language Info Popup */}
  {showLanguageInfo && (
    <div className="mb-3 bg-purple-50 border-l-4 border-purple-500 rounded-lg p-3">
      <p className="text-purple-900 font-medium text-sm mb-1">
        🌐 {t('workLog.languageSupport.title')}
      </p>
      <p className="text-purple-800 text-xs">
        {t('workLog.languageSupport.description')}
      </p>
    </div>
  )}

  <p className="text-sm text-gray-600 mb-3">
    {t('workLog.description.hint')}
    <button
      type="button"
      onClick={() => setShowLanguageInfo(!showLanguageInfo)}
      className="text-purple-600 hover:text-purple-700 self-start transition p-1 inline-flex items-center ml-1"
    >
      <Info size={16} />
    </button>
  </p>
  
  <textarea
    value={description}
    onChange={(e) => setDescription(e.target.value)}
    placeholder={t('workLog.description.placeholder')}
    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-300 ${
      isTextareaExpanded ? 'h-[30vh]' : 'h-[5vh]'
    }`}
    disabled={submitting}
  />
</div>

        {/* Camera Section */}
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-200">
          <label className="block text-lg font-bold text-gray-900 mb-1">
            {t('workLog.photos.label')}
          </label>
          <p className="text-sm text-gray-600 mb-2">
            {t('workLog.photos.hint')}
          </p>

          {/* Camera Buttons */}
          <div className="flex gap-3 mb-2">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Camera size={20} />
              {t('workLog.photos.takePhoto')}
            </button>
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={submitting}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Upload size={20} />
              {t('workLog.photos.uploadPhoto')}
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
            <>
              <div className="grid grid-cols-2 gap-3 mt-4">
                {previews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img
                      src={preview}
                      alt={t('workLog.photos.previewAlt', { number: index + 1 })}
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

              {/* Photo Count */}
              <p className="text-sm text-gray-600 mt-3 text-center">
                {t('workLog.photos.count', { count: previews.length })}
              </p>
            </>
          )}
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-3 pt-2 pb-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-3 px-6 rounded-xl 
                      font-bold transition disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          
          <button
            type="submit"
            disabled={submitting || !description.trim() || images.length === 0}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl 
                    font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader className="animate-spin" size={20} />
                {t('workLog.submitting')}
              </>
            ) : (
              t('workLog.submit')
            )}
          </button>
        </div>
      </form>
    </div>
  );
}