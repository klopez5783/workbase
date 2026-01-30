// src/components/expenses/ReceiptReview.jsx
import { useState } from 'react';
import {
  Pencil,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  Trash2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function ReceiptReview({
  imageUrl,
  ocrData,
  onSave,
  onRetake,
  saving,
  isEditMode = false
}) {
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    merchant: ocrData.merchant || '',
    date: ocrData.date || '',
    total: ocrData.total ? String(ocrData.total) : '',
    items: ocrData.items || [],
    tags: [],
    notes: ''
  });

  const [showItems, setShowItems] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [showRawText, setShowRawText] = useState(false);
  
  // NEW: State for adding manual items
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItem, setNewItem] = useState({ description: '', amount: '' });

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
      total: parseFloat(formData.total) || 0,
      receiptImageUrl: ocrData.receiptImageUrl,
      ocrRawText: ocrData.rawText,
      ocrConfidence: ocrData.confidence
    });
  };

  const handleAddTag = (tag) => {
    const normalized = tag.toLowerCase().trim();
    if (normalized && !formData.tags.includes(normalized)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, normalized]
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag(tagInput);
    }
  };

  // NEW: Add manual line item
  const handleAddItem = () => {
    if (newItem.description.trim() && newItem.amount) {
      const item = {
        description: newItem.description.trim(),
        amount: parseFloat(newItem.amount)
      };
      
      setFormData({
        ...formData,
        items: [...formData.items, item]
      });
      
      setNewItem({ description: '', amount: '' });
      setIsAddingItem(false);
    }
  };

  // NEW: Remove line item
  const handleRemoveItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="p-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">
            {t('receipts.review.title')}
          </h1>
          <button
            onClick={onRetake}
            disabled={saving}
            className="..."
          >
            {isEditMode ? "" : t('common.cancel')}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Mock Data Warning */}
        {ocrData._isMockData && (
          <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded">
            <p className="text-sm text-orange-700 font-semibold">
              ⚠️ {t('receipts.review.mockDataWarning')}
            </p>
            <p className="text-xs text-orange-600 mt-1">
              {t('receipts.review.mockDataDescription')}
            </p>
          </div>
        )}

        {/* Offline Warning */}
        {ocrData._isOffline && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
            <p className="text-sm text-blue-700 font-semibold">
              📶 {t('receipts.review.offlineWarning')}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              {t('receipts.review.offlineDescription')}
            </p>
          </div>
        )}

        {/* Receipt Image */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            {t('receipts.review.receiptImage')}
          </h3>
          <img
            src={imageUrl}
            alt={t('receipts.review.receiptImage')}
            className="w-full max-h-48 object-contain rounded border"
          />
        </div>

        {/* Receipt Details */}
        <div className="bg-white rounded-lg p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">
              {t('receipts.review.receiptDetails')}
            </h3>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-1 text-blue-600 text-sm font-semibold"
            >
              <Pencil className="w-4 h-4" />
              {isEditing ? t('common.done') : t('common.edit')}
            </button>
          </div>

          {/* Merchant */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {t('receipts.review.merchantRequired')}
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.merchant}
                onChange={(e) =>
                  setFormData({ ...formData, merchant: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder={t('receipts.review.merchantPlaceholder')}
              />
            ) : (
              <p className="text-lg font-bold">
                {formData.merchant || t('receipts.review.notSpecified')}
              </p>
            )}
          </div>

          {/* Date & Total */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {t('receipts.review.dateRequired')}
              </label>
              {isEditing ? (
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-lg font-bold">
                  {formData.date || t('receipts.review.notSpecified')}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {t('receipts.review.totalRequired')}
              </label>
              {isEditing ? (
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formData.total}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (/^\d*\.?\d{0,2}$/.test(v)) {
                        setFormData({ ...formData, total: v });
                      }
                    }}
                    className="w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
              ) : (
                <p className="text-lg font-bold text-green-600">
                  ${Number(formData.total || 0).toFixed(2)}
                </p>
              )}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t('receipts.review.tags')}
            </label>

            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                  >
                    {t(`receipts.tags.${tag}`, tag)}
                    <button onClick={() => handleRemoveTag(tag)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2 mb-3">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder={t('receipts.review.tagPlaceholder')}
              />
              <button
                onClick={() => handleAddTag(tagInput)}
                disabled={!tagInput.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold disabled:bg-gray-300 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                {t('common.add')}
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-2">
              {t('receipts.review.quickAdd')}
            </p>

            <div className="flex flex-wrap gap-2">
              {commonTags
                .filter(tag => !formData.tags.includes(tag))
                .map(tag => (
                  <button
                    key={tag}
                    onClick={() => handleAddTag(tag)}
                    className="px-3 py-1 bg-gray-100 rounded-full text-sm hover:bg-gray-200"
                  >
                    + {t(`receipts.tags.${tag}`, tag)}
                  </button>
                ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {t('receipts.review.notes')}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder={t('receipts.review.notesPlaceholder')}
            />
          </div>

          {/* Line Items Section */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-700">
                {t('receipts.review.lineItems', { count: formData.items.length })}
              </h3>
              {!isAddingItem && (
                <button
                  onClick={() => setIsAddingItem(true)}
                  className="flex items-center gap-1 text-blue-600 text-sm font-semibold hover:text-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              )}
            </div>

            {/* Add New Item Form */}
            {isAddingItem && (
              <div className="bg-blue-50 p-3 rounded-lg mb-3 space-y-2">
                <input
                  type="text"
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Item description..."
                />
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={newItem.amount}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (/^\d*\.?\d{0,2}$/.test(v)) {
                          setNewItem({ ...newItem, amount: v });
                        }
                      }}
                      className="w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  <button
                    onClick={handleAddItem}
                    disabled={!newItem.description.trim() || !newItem.amount}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold disabled:bg-gray-300"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingItem(false);
                      setNewItem({ description: '', amount: '' });
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Display Items */}
            {formData.items.length > 0 ? (
              <div className="space-y-2">
                {formData.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group"
                  >
                    <span className="flex-1 text-sm">{item.description}</span>
                    <span className="font-semibold text-sm mr-2">
                      ${item.amount.toFixed(2)}
                    </span>
                    <button
                      onClick={() => handleRemoveItem(idx)}
                      className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-700 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                No line items. Click "Add Item" to add manually.
              </p>
            )}
          </div>

          {/* OCR Confidence */}
          {ocrData.confidence > 0 && (
            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-700 mb-2">
                {t('receipts.review.ocrConfidence')}
              </h3>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 h-2 rounded-full">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${ocrData.confidence * 100}%` }}
                  />
                </div>
                <span className="text-sm font-semibold">
                  {(ocrData.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          )}

          {/* Debug: Show raw OCR text */}
          {ocrData.rawText && (
            <div className="border-t pt-4">
              <button
                onClick={() => setShowRawText(!showRawText)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                {showRawText ? 'Hide' : 'Show'} Raw OCR Text (Debug)
              </button>
              {showRawText && (
                <pre className="text-xs bg-gray-50 p-2 rounded mt-2 overflow-auto max-h-48">
                  {ocrData.rawText}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fixed Save Button */}
      <div className="bg-white border-t p-4 shadow-lg">
        <button
        onClick={handleSubmit}
        disabled={saving}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold disabled:bg-gray-300 flex items-center justify-center"
        >
          {saving 
            ? (isEditMode ? t('common.updating') : t('common.saving'))
            : (isEditMode ? t('common.update') : t('common.save'))
          }
        </button>
      </div>
    </div>
  );
}