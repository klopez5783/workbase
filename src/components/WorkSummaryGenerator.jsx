import { useState } from 'react';
import { aiService } from '../services/aiService';
import { Sparkles, Loader, X, Download, Copy, Check, Image as ImageIcon } from 'lucide-react';

export default function WorkSummaryGenerator({ workLogs, projectName, date, onClose }) {
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);

  // Get all available images from work logs
  const allImages = workLogs.reduce((acc, log) => {
    if (log.images && log.images.length > 0) {
      log.images.forEach(imageUrl => {
        acc.push({
          url: imageUrl,
          logId: log.id,
          employeeName: log.employeeName,
          description: log.translatedDescription || log.description
        });
      });
    }
    return acc;
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    setSummary('');

    try {
      const result = await aiService.generateWorkSummary(workLogs, {
        projectName,
        date
      });

      if (result.success) {
        setSummary(result.summary);
      } else {
        setError(result.error || 'Failed to generate summary');
      }
    } catch (err) {
      setError('An error occurred while generating the summary');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const toggleImageSelection = (imageUrl) => {
    setSelectedImages(prev => {
      if (prev.includes(imageUrl)) {
        return prev.filter(url => url !== imageUrl);
      } else {
        return [...prev, imageUrl];
      }
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = () => {
    const content = `${projectName ? `Project: ${projectName}\n` : ''}${date ? `Date: ${date}\n` : ''}\n${summary}\n\nSelected Photos: ${selectedImages.length}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `work-summary-${date || 'report'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Generate Work Summary</h2>
            <p className="text-sm text-gray-600 mt-1">
              AI-powered summary of {workLogs.length} work log{workLogs.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Project & Date Info */}
          {(projectName || date) && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              {projectName && (
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Project:</span> {projectName}
                </p>
              )}
              {date && (
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Date:</span> {date}
                </p>
              )}
            </div>
          )}

          {/* Generate Button */}
          {!summary && !generating && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-4 px-6 rounded-xl font-bold hover:from-blue-700 hover:to-cyan-700 transition flex items-center justify-center gap-3 mb-6"
            >
              <Sparkles size={24} />
              Generate AI Summary
            </button>
          )}

          {/* Loading State */}
          {generating && (
            <div className="bg-gray-50 rounded-xl p-12 text-center mb-6">
              <Loader className="animate-spin mx-auto mb-4 text-blue-600" size={48} />
              <p className="text-gray-700 font-semibold">Generating summary...</p>
              <p className="text-sm text-gray-600 mt-2">
                Analyzing {workLogs.length} work log{workLogs.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mb-6">
              <p className="text-red-900 font-medium">{error}</p>
            </div>
          )}

          {/* Summary Result */}
          {summary && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900">Generated Summary</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition flex items-center gap-2 text-sm font-semibold text-gray-700"
                  >
                    {copied ? (
                      <>
                        <Check size={16} className="text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        Copy
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition flex items-center gap-2 text-sm font-semibold text-gray-700"
                  >
                    <Download size={16} />
                    Download
                  </button>
                  <button
                    onClick={handleGenerate}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-2 text-sm font-semibold"
                  >
                    <Sparkles size={16} />
                    Regenerate
                  </button>
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{summary}</p>
              </div>
            </div>
          )}

          {/* Image Selection */}
          {allImages.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <ImageIcon size={20} />
                  Select Photos to Include
                </h3>
                <span className="text-sm text-gray-600">
                  {selectedImages.length} of {allImages.length} selected
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {allImages.map((image, index) => {
                  const isSelected = selectedImages.includes(image.url);
                  
                  return (
                    <div
                      key={index}
                      onClick={() => toggleImageSelection(image.url)}
                      className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer transition border-4 ${
                        isSelected
                          ? 'border-blue-600 shadow-lg scale-95'
                          : 'border-transparent hover:border-blue-300'
                      }`}
                    >
                      <img
                        src={image.url}
                        alt={`Work photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Selection Overlay */}
                      {isSelected && (
                        <div className="absolute inset-0 bg-blue-600 bg-opacity-30 flex items-center justify-center">
                          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                            <Check size={24} className="text-white" />
                          </div>
                        </div>
                      )}

                      {/* Employee Info */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                        <p className="text-white text-xs font-semibold truncate">
                          {image.employeeName}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedImages.length > 0 && (
                <div className="mt-4 bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-sm text-blue-900 font-semibold mb-2">
                    ✓ {selectedImages.length} photo{selectedImages.length !== 1 ? 's' : ''} selected for report
                  </p>
                  <button
                    onClick={() => setSelectedImages([])}
                    className="text-sm text-blue-700 hover:text-blue-900 font-semibold"
                  >
                    Clear Selection
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Powered by Google Gemini
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition"
              >
                Close
              </button>
              {summary && selectedImages.length > 0 && (
                <button
                  onClick={() => {
                    // Here you could save the summary and selected images
                    console.log('Summary:', summary);
                    console.log('Selected Images:', selectedImages);
                    alert(`Report ready!\nSummary generated\n${selectedImages.length} photos selected`);
                  }}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
                >
                  Create Report
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}