import { useState } from 'react';
import { Loader } from 'lucide-react';
import { firestoreService } from '../../../services/firestoreService';
import { useTranslation } from 'react-i18next';

export default function AddWorkerForm({ onClose, onSuccess, companyId }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateAccessKey = () => {
    return crypto.randomUUID();
  };

  const formatPhoneNumber = (value) => {
    const phoneNumber = value.replace(/\D/g, '');
    
    if (phoneNumber.length <= 3) {
      return phoneNumber;
    } else if (phoneNumber.length <= 6) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    } else {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      setError(t('addWorker.errors.nameRequired'));
      return;
    }

    if (!phone.trim()) {
      setError(t('addWorker.errors.phoneRequired'));
      return;
    }

    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) {
      setError(t('addWorker.errors.invalidPhone'));
      return;
    }

    if (!companyId) {
      setError(t('addWorker.errors.companyRequired'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);

      const workerData = {
        name: String(name.trim()),
        phone: String(phone),
        phoneRaw: String(digits),
        accessKey: String(generateAccessKey()),
        accessKeyCreatedAt: now.toISOString(),
        accessKeyExpiresAt: expiresAt.toISOString(),
        status: 'active',
        companyId: companyId,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }; 
      
      console.log("========Creating Worker========");
      console.log('Creating worker with data:', workerData);

      const result = await firestoreService.create('workers', workerData);
      
      if (result.success) {
        alert(t('addWorker.success'));
        onSuccess(workerData);
      } else {
        console.error('Failed to create worker:', result.error);
        setError(result.error || t('addWorker.errors.failed'));
      }
    } catch (err) {
      console.error('Error adding worker:', err);
      setError(err.message || t('addWorker.errors.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-5 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">{t('addWorker.title')}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-3">
            <p className="text-blue-900 text-sm">
              <strong>{t('addWorker.noAccountNeeded')}</strong> {t('addWorker.infoMessage')}
            </p>
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t('addWorker.workerName')} {t('addWorker.required')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('addWorker.namePlaceholder')}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              autoFocus
            />
          </div>

          {/* Phone Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t('addWorker.phoneNumber')} {t('addWorker.required')}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder={t('addWorker.phonePlaceholder')}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-2">
              {t('addWorker.phoneHelper')}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-200 transition"
            >
              {t('addWorker.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader className="animate-spin" size={20} />
                  {t('addWorker.adding')}
                </span>
              ) : (
                t('addWorker.addButton')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}