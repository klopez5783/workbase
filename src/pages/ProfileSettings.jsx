import { useState, useEffect } from 'react';
import { User, Mail, Phone, Save, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { firestoreService } from '../services/firestoreService';

export default function ProfileSettings() {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [originalData, setOriginalData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [workerStatus, setWorkerStatus] = useState(null);

  useEffect(() => {
    loadUserProfile();
  }, [currentUser]);

  useEffect(() => {
    if (formData.phone) {
      checkWorkerLink();
    }
  }, [formData.phone]);

  const loadUserProfile = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const result = await firestoreService.query('users', [
        { field: 'uid', operator: '==', value: currentUser.uid }
      ]);

      if (result.success && result.data.length > 0) {
        const userData = result.data[0];
        const data = {
          name: userData.name || '',
          email: userData.email || currentUser.email,
          phone: userData.phone || '',
        };
        setFormData(data);
        setOriginalData(data);
      } else {
        // User document doesn't exist, create with email
        setFormData({
          name: currentUser.displayName || '',
          email: currentUser.email,
          phone: '',
        });
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const checkWorkerLink = async () => {
    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      setWorkerStatus(null);
      return;
    }

    try {
      const result = await firestoreService.query('workers', [
        { field: 'phoneRaw', operator: '==', value: phoneDigits }
      ]);

      if (result.success && result.data.length > 0) {
        setWorkerStatus({
          linked: true,
          workerName: result.data[0].name,
        });
      } else {
        setWorkerStatus({ linked: false });
      }
    } catch (err) {
      console.error('Error checking worker link:', err);
    }
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
    setFormData({ ...formData, phone: formatted });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const phoneDigits = formData.phone.replace(/\D/g, '');
      
      if (formData.phone && phoneDigits.length !== 10) {
        throw new Error('Please enter a valid 10-digit phone number');
      }

      const updateData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone,
        phoneRaw: phoneDigits,
        updatedAt: new Date().toISOString(),
      };

      // Try to update existing user document
      const userQuery = await firestoreService.query('users', [
        { field: 'uid', operator: '==', value: currentUser.uid }
      ]);

      if (userQuery.success && userQuery.data.length > 0) {
        // Update existing document
        await firestoreService.update('users', userQuery.data[0].id, updateData);
      } else {
        // Create new document
        await firestoreService.create('users', {
          uid: currentUser.uid,
          ...updateData,
          role: 'employee',
          status: 'active',
          createdAt: new Date().toISOString(),
        });
      }

      setOriginalData(formData);
      setSuccess('Profile updated successfully!');
      
      // Recheck worker link
      await checkWorkerLink();
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    return (
      formData.name !== originalData.name ||
      formData.phone !== originalData.phone
    );
  };

  if (loading) {
    return (
      <div className="p-5 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4 text-blue-600" size={40} />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 pb-24 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-gray-600 text-sm mt-1">
          Manage your account information
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="text-green-500" size={24} />
            <p className="text-green-900 font-medium">{success}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-red-500" size={24} />
            <p className="text-red-900 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Full Name
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="John Smith"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        {/* Email (Read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="email"
              value={formData.email}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-600 cursor-not-allowed"
              disabled
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Email cannot be changed
          </p>
        </div>

        {/* Phone Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handlePhoneChange}
              placeholder="(555) 123-4567"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Worker Link Status */}
          {workerStatus && (
            <div className={`mt-2 p-3 rounded-lg ${
              workerStatus.linked 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-gray-50 border border-gray-200'
            }`}>
              {workerStatus.linked ? (
                <div className="flex items-center gap-2">
                  <CheckCircle className="text-green-600" size={16} />
                  <p className="text-sm text-green-800">
                    ✅ Linked to worker: <strong>{workerStatus.workerName}</strong>
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  ℹ️ Not linked to any worker account
                </p>
              )}
            </div>
          )}
          
          <p className="text-xs text-gray-500 mt-2">
            📱 If your phone matches a worker, you'll be able to clock in via the app
          </p>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={saving || !hasChanges()}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-xl font-bold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <Loader className="animate-spin" size={20} />
              Saving...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Save size={20} />
              Save Changes
            </span>
          )}
        </button>

        {!hasChanges() && (
          <p className="text-center text-sm text-gray-500">
            No changes to save
          </p>
        )}
      </form>

      {/* Info Card */}
      <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">🔗 Worker Account Linking</h3>
        <p className="text-sm text-blue-800">
          When your phone number matches a worker account, you'll see a floating clock-in button in the app. 
          This allows you to clock in/out without using the separate worker link.
        </p>
      </div>
    </div>
  );
}