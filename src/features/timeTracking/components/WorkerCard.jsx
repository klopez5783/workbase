import { useState } from 'react';
import { Users, Trash2, Send, Copy, CheckCircle, AlertCircle, Loader } from 'lucide-react';

export default function WorkerCard({ worker, onDelete }) {
  const [copied, setCopied] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const baseLink = `https://workbase-8dfe2.firebaseapp.com/worker/${worker.accessKey}`;

  // Check if link is expired or about to expire
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

      // IMPORTANT: specify correct region
      const functions = getFunctions(undefined, "us-east1");

      const resendLink = httpsCallable(functions, "resendWorkerLink");
      const result = await resendLink({ workerId: worker.id });

      if (result.data.success) {
        setResendSuccess(true);

        setTimeout(() => {
          setResendSuccess(false);
          window.location.reload();
        }, 2000);
      }

    } catch (error) {
      console.error("Error resending SMS:", error);
      alert("Failed to send SMS: " + error.message);
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