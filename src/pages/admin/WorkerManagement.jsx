import { useState, useEffect } from 'react';
import { Plus, Users, Loader, Trash2, Send, Copy, CheckCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { firestoreService } from '../../services/firestoreService';
import { useAuth } from '../../contexts/AuthContext';


export default function WorkerManagement() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadWorkers();
  }, []);

  const loadWorkers = async () => {
    try {
      setLoading(true);
      const result = await firestoreService.getAll('workers');
      
      if (result.success && result.data) {
        setWorkers(result.data);
      }
    } catch (error) {
      console.error('Error loading workers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWorker = async (workerData) => {
    await loadWorkers();
    setShowAddForm(false);
  };

  const handleDeleteWorker = async (worker) => {
    if (!window.confirm(`Remove ${worker.name}? They will no longer be able to clock in.`)) {
      return;
    }

    try {
      await firestoreService.delete('workers', worker.id);
      await loadWorkers();
      alert('Worker removed successfully');
    } catch (error) {
      alert('Error removing worker: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="p-5 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4 text-blue-600" size={40} />
          <p className="text-gray-600">Loading workers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            title="Go back"
          >
            <ArrowLeft size={24} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Worker Management</h1>
            <p className="text-gray-600 text-sm mt-1">
              {workers.length} {workers.length === 1 ? 'worker' : 'workers'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg transition flex items-center gap-2"
          >
            <Plus size={20} />
            Add Worker
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 mb-6">
        <p className="text-blue-900 font-medium text-sm">
          📱 Easy Worker Setup
        </p>
        <p className="text-blue-700 text-sm mt-1">
          Add workers with just their name and phone number. They'll receive a text message with a link to clock in—no password needed!
        </p>
      </div>

      {/* Workers List */}
      {workers.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center">
          <Users size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Workers Yet</h3>
          <p className="text-gray-600 mb-6">
            Add your first worker to get started with time tracking
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition inline-flex items-center gap-2"
          >
            <Plus size={20} />
            Add First Worker
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {workers.map((worker) => (
            <WorkerCard
              key={worker.id}
              worker={worker}
              onDelete={() => handleDeleteWorker(worker)}
            />
          ))}
        </div>
      )}

      {/* Add Worker Form Modal */}
      {showAddForm && (
        <AddWorkerForm
          onClose={() => setShowAddForm(false)}
          onSuccess={handleAddWorker}
        />
      )}
    </div>
  );
}

function WorkerCard({ worker, onDelete }) {
  const [copied, setCopied] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const baseLink = `https://workbase-8dfe2.firebaseapp.com/worker/${worker.accessKey}`;

  // 🔥 CHECK IF LINK IS EXPIRED OR ABOUT TO EXPIRE 🔥
  const isExpired = () => {
    if (!worker.accessKeyExpiresAt) return false;
    return new Date() > new Date(worker.accessKeyExpiresAt);
  };

  const getTimeRemaining = () => {
    if (!worker.accessKeyExpiresAt) return null;
    const now = new Date();
    const expires = new Date(worker.accessKeyExpiresAt);
    const diffMs = expires - now;
    
    if (diffMs <= 0) return "Expired";
    
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''}`;
    
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(baseLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResendSMS = async () => {
    setResending(true);
    setResendSuccess(false);

    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();
      
      const resendLink = httpsCallable(functions, 'resendWorkerLink');
      const result = await resendLink({ workerId: worker.id });

      if (result.data.success) {
        setResendSuccess(true);
        setTimeout(() => {
          setResendSuccess(false);
          // Reload the page to show new access key
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      console.error('Error resending SMS:', error);
      alert('Failed to send SMS: ' + error.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
      {/* Worker Info */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
            <Users className="text-blue-600" size={24} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{worker.name}</h3>
            <p className="text-sm text-gray-600">{worker.phone}</p>
            <p className="text-xs text-gray-500 mt-1">
              Added {new Date(worker.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <button
          onClick={onDelete}
          className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Expiration Warning */}
      {worker.accessKeyExpiresAt && (
        <div className={`border-l-4 rounded-lg p-3 mb-3 ${
          isExpired() 
            ? 'bg-red-50 border-red-500' 
            : 'bg-yellow-50 border-yellow-500'
        }`}>
          <div className="flex items-center gap-2">
            <AlertCircle className={isExpired() ? 'text-red-600' : 'text-yellow-600'} size={16} />
            <p className={`text-sm font-medium ${
              isExpired() ? 'text-red-900' : 'text-yellow-900'
            }`}>
              {isExpired() 
                ? '❌ Access link expired' 
                : `⏰ Link expires in ${getTimeRemaining()}`
              }
            </p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {resendSuccess && (
        <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="text-green-600" size={16} />
            <p className="text-sm text-green-800 font-medium">
              ✓ New link sent! Valid for 30 minutes.
            </p>
          </div>
        </div>
      )}

      {/* Access Link */}
      <div className="bg-gray-50 rounded-lg p-3 mb-3">
        <p className="text-xs font-semibold text-gray-700 mb-2">Worker Access Link:</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-white px-3 py-2 rounded border border-gray-200 truncate">
            {baseLink}
          </code>
          <button
            onClick={handleCopyLink}
            className="bg-gray-200 hover:bg-gray-300 p-2 rounded-lg transition flex-shrink-0"
            title="Copy link"
          >
            {copied ? (
              <CheckCircle className="text-green-600" size={18} />
            ) : (
              <Copy className="text-gray-600" size={18} />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          ⏰ Links expire 30 minutes after creation
        </p>
      </div>

      {/* Resend SMS Button */}
      <button
        onClick={handleResendSMS}
        disabled={resending}
        className="w-full bg-green-50 text-green-700 py-2 px-3 rounded-lg font-semibold hover:bg-green-100 transition text-sm flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {resending ? (
          <>
            <Loader className="animate-spin" size={16} />
            Sending New Link...
          </>
        ) : (
          <>
            <Send size={16} />
            {isExpired() ? 'Send New Link' : 'Resend Link (Generates New Key)'}
          </>
        )}
      </button>
    </div>
  );
}

function AddWorkerForm({ onClose, onSuccess }) {
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
    setError('Please enter worker name');
    return;
  }

  if (!phone.trim()) {
    setError('Please enter phone number');
    return;
  }

  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 10) {
    setError('Please enter a valid 10-digit phone number');
    return;
  }

  setLoading(true);
  setError('');

  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now

    const workerData = {
      name: String(name.trim()),
      phone: String(phone),
      phoneRaw: String(digits),
      accessKey: String(generateAccessKey()),
      accessKeyCreatedAt: now.toISOString(),
      accessKeyExpiresAt: expiresAt.toISOString(), // 🔥 Expires in 30 minutes
      status: 'active',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    console.log('Creating worker with data:', workerData);

    const result = await firestoreService.create('workers', workerData);
    
    if (result.success) {
      alert('Worker added successfully! Access link expires in 30 minutes.');
      onSuccess(workerData);
    } else {
      console.error('Failed to create worker:', result.error);
      setError(result.error || 'Failed to add worker');
    }
  } catch (err) {
    console.error('Error adding worker:', err);
    setError(err.message || 'An error occurred');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-5 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Add Worker</h2>
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
              <strong>No account needed!</strong> Workers will receive a link they can use to clock in/out instantly.
            </p>
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Worker Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Smith"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              autoFocus
            />
          </div>

          {/* Phone Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="(555) 123-4567"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-2">
              📱 We'll send a link to this number so they can clock in
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
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
                  Adding...
                </span>
              ) : (
                'Add Worker'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}