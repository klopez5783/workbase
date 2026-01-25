// src/components/expenses/ReceiptReview.jsx
import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

export default function ReceiptReview({ imageUrl, ocrData, onSave, onRetake }) {
  const [formData, setFormData] = useState({
    merchant: ocrData.merchant || '',
    date: ocrData.date || '',
    total: ocrData.total || 0,
    items: ocrData.items || [],
    notes: '',
    category: 'materials'
  });

  const [showItems, setShowItems] = useState(false);

  const handleSubmit = () => {
    onSave({
      ...formData,
      receiptImageUrl: ocrData.receiptImageUrl,
      ocrRawText: ocrData.rawText,
      ocrConfidence: ocrData.confidence
    });
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
        {/* Receipt Image Thumbnail */}
        <div className="bg-white rounded-lg p-4">
          <img 
            src={imageUrl} 
            alt="Receipt" 
            className="w-full max-h-48 object-contain rounded"
          />
        </div>

        {/* Editable Fields */}
        <div className="bg-white rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Merchant
            </label>
            <input
              type="text"
              value={formData.merchant}
              onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="e.g. Home Depot"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Date
              </label>
              <input
                type="text"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="MM/DD/YYYY"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Total
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.total}
                onChange={(e) => setFormData({ ...formData, total: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="materials">Materials</option>
              <option value="tools">Tools</option>
              <option value="equipment">Equipment</option>
              <option value="misc">Miscellaneous</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              rows="2"
              placeholder="Add any notes about this expense..."
            />
          </div>

          {/* Items (Expandable) */}
          {formData.items.length > 0 && (
            <div>
              <button
                onClick={() => setShowItems(!showItems)}
                className="w-full flex items-center justify-between py-2 text-left"
              >
                <span className="font-semibold text-gray-700">
                  Items ({formData.items.length})
                </span>
                <span className="text-blue-600">
                  {showItems ? '▼' : '▶'}
                </span>
              </button>

              {showItems && (
                <div className="mt-2 space-y-2">
                  {formData.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                      <span>{item.description}</span>
                      <span className="font-semibold">${item.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Confidence Indicator */}
        {ocrData._isMockData && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <p className="text-sm text-orange-700">
              ⚠️ Using mock data (emulator mode)
            </p>
          </div>
        )}
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <button
          onClick={handleSubmit}
          className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold text-lg"
        >
          Save Receipt - ${formData.total.toFixed(2)}
        </button>
      </div>
    </div>
  );
}