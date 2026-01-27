// src/components/expenses/ReceiptReview.jsx
import { useState } from 'react';
import { Pencil, ChevronDown, ChevronUp, X, Plus } from 'lucide-react';

export default function ReceiptReview({ imageUrl, ocrData, onSave, onRetake,saving  }) {
  const [formData, setFormData] = useState({
    merchant: ocrData.merchant || '',
    date: ocrData.date || '',
    total: ocrData.total || 0,
    items: ocrData.items || [],
    tags: [], // Changed from category to tags
    notes: ''
  });

  const [showItems, setShowItems] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tagInput, setTagInput] = useState('');

  // Predefined common tags (can be customized)
  const commonTags = [
    'materials',
    'tools',
    'equipment',
    'labor',
    'permits',
    'urgent',
    'reimbursable',
    'tax-deductible',
    'lumber',
    'paint',
    'hardware',
    'electrical',
    'plumbing',
    'drywall'
  ];

  const handleSubmit = () => {
    onSave({
      ...formData,
      receiptImageUrl: ocrData.receiptImageUrl,
      ocrRawText: ocrData.rawText,
      ocrConfidence: ocrData.confidence
    });
  };

  // Add tag from input
  const handleAddTag = (tag) => {
    const normalizedTag = tag.toLowerCase().trim();
    
    if (normalizedTag && !formData.tags.includes(normalizedTag)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, normalizedTag]
      });
      setTagInput('');
    }
  };

  // Remove tag
  const handleRemoveTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  // Handle Enter key in tag input
  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag(tagInput);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="p-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Review Receipt</h1>
          <button
            onClick={onRetake}
            className="text-blue-600 font-semibold"
          >
            Retake
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Mock Data Warning */}
        {ocrData._isMockData && (
          <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded">
            <p className="text-sm text-orange-700 font-semibold">
              ⚠️ Using mock data (emulator mode)
            </p>
            <p className="text-xs text-orange-600 mt-1">
              In production, this will show real extracted data from your receipt.
            </p>
          </div>
        )}

        {/* Receipt Image Thumbnail */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Receipt Image</h3>
          <img 
            src={imageUrl} 
            alt="Receipt" 
            className="w-full max-h-48 object-contain rounded border border-gray-200"
          />
        </div>

        {/* Editable Fields */}
        <div className="bg-white rounded-lg p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Receipt Details</h3>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-1 text-blue-600 text-sm font-semibold"
            >
              <Pencil className="w-4 h-4" />
              {isEditing ? 'Done' : 'Edit'}
            </button>
          </div>

          {/* Merchant */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Merchant *
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.merchant}
                onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g. Home Depot"
              />
            ) : (
              <p className="text-lg font-bold text-gray-900">
                {formData.merchant || 'Not specified'}
              </p>
            )}
          </div>

          {/* Date and Total */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Date *
              </label>
              {isEditing ? (
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <p className="text-lg font-bold text-gray-900">
                  {formData.date || 'Not specified'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Total *
              </label>
              {isEditing ? (
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.total}
                    onChange={(e) => setFormData({ ...formData, total: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              ) : (
                <p className="text-lg font-bold text-green-600">
                  ${formData.total.toFixed(2)}
                </p>
              )}
            </div>
          </div>

          {/* Tags Section */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tags
            </label>
            
            {/* Selected Tags */}
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:bg-blue-200 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Tag Input */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Type a tag and press Enter..."
              />
              <button
                onClick={() => handleAddTag(tagInput)}
                disabled={!tagInput.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold disabled:bg-gray-300 hover:bg-blue-700 transition-colors flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            {/* Common Tags (Quick Add) */}
            <div>
              <p className="text-xs text-gray-500 mb-2">Quick add:</p>
              <div className="flex flex-wrap gap-2">
                {commonTags
                  .filter(tag => !formData.tags.includes(tag))
                  .map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleAddTag(tag)}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
                    >
                      + {tag}
                    </button>
                  ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="3"
              placeholder="Add any additional notes about this expense..."
            />
          </div>

          {/* Line Items (Expandable) */}
          {formData.items.length > 0 && (
            <div className="border-t pt-4">
              <button
                onClick={() => setShowItems(!showItems)}
                className="w-full flex items-center justify-between py-2 text-left"
              >
                <span className="font-semibold text-gray-700">
                  Line Items ({formData.items.length})
                </span>
                {showItems ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </button>

              {showItems && (
                <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                  {formData.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-700">{item.description}</span>
                      <span className="text-sm font-semibold text-gray-900">
                        ${item.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* OCR Confidence */}
          {ocrData.confidence && (
            <div className="border-t pt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                OCR Confidence
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
              <p className="text-xs text-gray-500 mt-1">
                {ocrData.confidence > 0.7 
                  ? 'High confidence - data likely accurate' 
                  : 'Low confidence - please verify data'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Fixed Bottom Button */}
      <div className="bg-white border-t p-4 shadow-lg">
        <button
          onClick={handleSubmit}
          disabled={!formData.merchant || !formData.date || !formData.total || saving}
          className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold text-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
              Saving...
            </>
          ) : (
            `Save Expense - $${formData.total.toFixed(2)}`
          )}
        </button>
      </div>
    </div>
  );
}