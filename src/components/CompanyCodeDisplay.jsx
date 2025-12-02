import { useState } from 'react';
import { Copy, RefreshCw, CheckCircle, Share2, Send } from 'lucide-react';
import { firestoreService } from '../services/firestoreService';
import { generateUniqueCompanyCode } from '../utils/companyCode';

export default function CompanyCodeDisplay({ company, onCodeRegenerated }) {
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const handleCopyCode = async () => {
    if (company?.joinCode) {
      try {
        await navigator.clipboard.writeText(company.joinCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
        alert('Failed to copy code. Please copy manually.');
      }
    }
  };

  const handleRegenerateCode = async () => {
    if (!window.confirm('Are you sure you want to regenerate the join code? The old code will no longer work.')) {
      return;
    }

    setRegenerating(true);

    try {
      // Generate new unique code
      const newCode = await generateUniqueCompanyCode();

      // Update company with new code
      await firestoreService.update('companies', company.id, {
        joinCode: newCode,
        joinCodeUpdatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Notify parent component
      if (onCodeRegenerated) {
        onCodeRegenerated(newCode);
      }

      alert('Join code regenerated successfully!');
    } catch (err) {
      console.error('Error regenerating code:', err);
      alert('Failed to regenerate code: ' + err.message);
    } finally {
      setRegenerating(false);
    }
  };

  if (!company?.joinCode) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-4">
        <p className="text-yellow-800 text-sm font-medium">
          No join code available. This company was created before the join code feature was implemented.
        </p>
        <button
          onClick={handleRegenerateCode}
          disabled={regenerating}
          className="mt-3 bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition text-sm disabled:opacity-50"
        >
          {regenerating ? 'Generating...' : 'Generate Join Code'}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Company Join Code</h3>
          <p className="text-sm text-gray-600 mt-1">
            Share this code with workers to let them join your company
          </p>
        </div>
        <Share2 size={24} className="text-blue-600" />
      </div>

      {/* Join Code Display */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 mb-4">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">Join Code</p>
          <div className="bg-white rounded-lg px-6 py-4 inline-block shadow-sm">
            <p className="text-3xl font-bold text-blue-600 tracking-wider font-mono">
              {company.joinCode}
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Copy Code Button */}
        <button
          onClick={handleCopyCode}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          {copied ? (
            <>
              <CheckCircle size={18} />
              Copied!
            </>
          ) : (
            <>
              <Copy size={18} />
              Copy Code
            </>
          )}
        </button>

        {/* Send Invitation Button */}
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center justify-center gap-2 bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition"
        >
          <Send size={18} />
          Send Invite
        </button>

        {/* Regenerate Code Button */}
        <button
          onClick={handleRegenerateCode}
          disabled={regenerating}
          className="flex items-center justify-center gap-2 bg-gray-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-gray-700 transition disabled:opacity-50"
        >
          {regenerating ? (
            <>
              <RefreshCw size={18} className="animate-spin" />
              Regenerating...
            </>
          ) : (
            <>
              <RefreshCw size={18} />
              Regenerate
            </>
          )}
        </button>
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">How to share:</h4>
        <ul className="text-sm text-gray-700 space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">1.</span>
            <span>Click "Copy Code" to copy the join code to your clipboard</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">2.</span>
            <span>Share the code with workers via text, email, or messaging app</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">3.</span>
            <span>Or use "Send Invite" to send an SMS with a direct join link</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">4.</span>
            <span>Workers can enter the code when prompted to join your company</span>
          </li>
        </ul>
      </div>

      {/* SMS Invitation Modal */}
      {showInviteModal && (
        <SendInviteModal
          company={company}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  );
}

// SMS Invitation Modal Component
function SendInviteModal({ company, onClose }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const formatPhoneNumber = (value) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');

    // Format as (XXX) XXX-XXXX
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
    setError('');
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();

    // Validate phone number
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setSending(true);
    setError('');

    try {
      // Call cloud function to send SMS
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();
      const sendInvite = httpsCallable(functions, 'sendCompanyInvite');

      await sendInvite({
        phoneNumber: digits,
        companyId: company.id,
        companyName: company.name,
        joinCode: company.joinCode,
      });

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Error sending invite:', err);
      setError(err.message || 'Failed to send invitation. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-5 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Send size={24} className="text-white" />
            <h2 className="text-xl font-bold text-white">Send SMS Invitation</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition text-2xl"
            disabled={sending}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="text-center py-8">
              <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Invitation Sent!</h3>
              <p className="text-gray-600">
                The worker will receive an SMS with instructions to join your company.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSendInvite} className="space-y-6">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
                <p className="text-blue-900 font-medium text-sm mb-1">
                  Company: {company.name}
                </p>
                <p className="text-blue-700 text-sm">
                  Join Code: <span className="font-mono font-bold">{company.joinCode}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Worker Phone Number *
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  placeholder="(555) 123-4567"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                  autoFocus
                  disabled={sending}
                />
                <p className="text-xs text-gray-500 mt-2">
                  The worker will receive an SMS with the join code and a direct link to join your company.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-200 transition"
                  disabled={sending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-4 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50"
                >
                  {sending ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
