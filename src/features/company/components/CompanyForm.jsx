import { useState } from 'react';
import { X, Loader, Building2 } from 'lucide-react';
import { firestoreService } from '../../../services/firestoreService';
import { useAuth } from '../../../contexts/AuthContext';

export default function CompanyForm({ onClose, existingCompany = null }) {
  const { currentUser } = useAuth();
  const [companyName, setCompanyName] = useState(existingCompany?.name || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!companyName.trim()) {
      setError('Please enter a company name');
      return;
    }

    setLoading(true);
    setError('');

    const companyData = {
      name: companyName.trim(),
      createdBy: existingCompany?.createdBy || currentUser?.uid,
      admins: existingCompany?.admins || [currentUser?.uid],
      workers: existingCompany?.workers || [],
      createdAt: existingCompany?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (existingCompany) {
        // Update existing company
        await firestoreService.update('companies', existingCompany.id, companyData);
      } else {
        // Create new company
        const result = await firestoreService.create('companies', companyData);

        if (result.success) {
          // Update user profile to include companyId
          await firestoreService.update('users', currentUser.uid, {
            companyId: result.id,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      onClose(true); // Pass true to indicate success
    } catch (err) {
      console.error('Error saving company:', err);
      setError(err.message || 'Failed to save company');
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-5 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Building2 size={24} className="text-white" />
            <h2 className="text-xl font-bold text-white">
              {existingCompany ? 'Edit Company' : 'Create Your Company'}
            </h2>
          </div>
          <button
            onClick={() => onClose(false)}
            className="text-white hover:text-gray-200 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {!existingCompany && (
            <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
              <p className="text-blue-900 font-medium text-sm mb-1">
                Welcome!
              </p>
              <p className="text-blue-700 text-sm">
                Create your company to start managing projects and workers.
              </p>
            </div>
          )}

          {/* Company Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Company Name *
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acme Construction Co."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              autoFocus
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => onClose(false)}
              className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader className="animate-spin" size={20} />
                  Saving...
                </span>
              ) : (
                existingCompany ? 'Update Company' : 'Create Company'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
