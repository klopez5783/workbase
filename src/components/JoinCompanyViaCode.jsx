import { useState } from 'react';
import { X, Loader, Building2, CheckCircle, AlertCircle } from 'lucide-react';
import { findCompanyByCode, normalizeCode, isValidCodeFormat } from '../utils/companyCode';
import { firestoreService } from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function JoinCompanyViaCode({ onClose, onSuccess }) {
  const { currentUser } = useAuth();
  const [companyCode, setCompanyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [attempts, setAttempts] = useState(0);
  const MAX_ATTEMPTS = 5;

  const handleCodeChange = (e) => {
    const value = e.target.value.toUpperCase();
    // Allow only letters, numbers, and hyphen
    const sanitized = value.replace(/[^A-Z0-9-]/g, '');
    setCompanyCode(sanitized);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Rate limiting check
    if (attempts >= MAX_ATTEMPTS) {
      setError('Too many attempts. Please try again later.');
      return;
    }

    const normalizedCode = normalizeCode(companyCode);

    // Validate format
    if (!isValidCodeFormat(normalizedCode)) {
      setError('Invalid code format. Code should be in format: ABC-1234');
      setAttempts(prev => prev + 1);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Find company by code
      const company = await findCompanyByCode(normalizedCode);

      if (!company) {
        setError('Invalid company code. Please check and try again.');
        setAttempts(prev => prev + 1);
        setLoading(false);
        return;
      }

      // Check if user is already in a company
      const userDoc = await firestoreService.getById('users', currentUser.uid);
      if (userDoc && userDoc.companyId) {
        setError('You are already part of a company. Leave your current company first.');
        setLoading(false);
        return;
      }

      // Join the company
      await joinCompany(company.id, company.data.name);

    } catch (err) {
      console.error('Error joining company:', err);
      setError(err.message || 'Failed to join company. Please try again.');
      setAttempts(prev => prev + 1);
    }

    setLoading(false);
  };

  const joinCompany = async (companyId, companyName) => {
    try {
      // Update user profile with companyId and join tracking
      await firestoreService.update('users', currentUser.uid, {
        companyId: companyId,
        joinedAt: new Date().toISOString(),
        joinMethod: 'code',
        updatedAt: new Date().toISOString(),
      });

      // Add user to company's workers array
      const companyRef = doc(db, 'companies', companyId);
      await updateDoc(companyRef, {
        workers: arrayUnion(currentUser.uid),
        updatedAt: new Date().toISOString(),
      });

      // Log successful join
      console.log(`User ${currentUser.uid} successfully joined company ${companyId} via code`);

      setCompanyName(companyName);
      setSuccess(true);

      // Call onSuccess callback after a short delay
      setTimeout(() => {
        if (onSuccess) {
          onSuccess({ companyId, companyName });
        }
        onClose(true);
      }, 2000);

    } catch (error) {
      console.error('Error in joinCompany:', error);
      throw error;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-5 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Building2 size={24} className="text-white" />
            <h2 className="text-xl font-bold text-white">
              Join a Company
            </h2>
          </div>
          <button
            onClick={() => onClose(false)}
            className="text-white hover:text-gray-200 transition"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            // Success State
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <CheckCircle size={64} className="text-green-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                Welcome aboard!
              </h3>
              <p className="text-gray-600">
                You've successfully joined <span className="font-semibold">{companyName}</span>
              </p>
              <p className="text-sm text-gray-500 mt-4">
                Redirecting you now...
              </p>
            </div>
          ) : (
            // Form State
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
                <p className="text-blue-900 font-medium text-sm mb-1">
                  Enter Company Code
                </p>
                <p className="text-blue-700 text-sm">
                  Ask your administrator for your company's unique join code.
                </p>
              </div>

              {/* Company Code Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Company Code *
                </label>
                <input
                  type="text"
                  value={companyCode}
                  onChange={handleCodeChange}
                  placeholder="ABC-1234"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono tracking-wider"
                  required
                  autoFocus
                  maxLength={8}
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Format: 3 letters - 4 numbers (e.g., ABC-1234)
                </p>
              </div>

              {/* Rate Limiting Warning */}
              {attempts > 0 && attempts < MAX_ATTEMPTS && (
                <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-3">
                  <p className="text-yellow-700 text-xs">
                    Attempts: {attempts}/{MAX_ATTEMPTS}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => onClose(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-200 transition"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || attempts >= MAX_ATTEMPTS}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader className="animate-spin" size={20} />
                      Joining...
                    </span>
                  ) : (
                    'Join Company'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
