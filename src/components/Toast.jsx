// src/components/common/Toast.jsx
import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react';

export function Toast({ message, type = 'success', onClose, duration = 3000 }) {
  useEffect(() => {
    if (duration) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const config = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: CheckCircle,
      iconColor: 'text-green-600'
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: XCircle,
      iconColor: 'text-red-600'
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: AlertCircle,
      iconColor: 'text-yellow-600'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: Info,
      iconColor: 'text-blue-600'
    }
  };

  const style = config[type] || config.success;
  const Icon = style.icon;

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in max-w-sm">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${style.bg} ${style.border}`}>
        <Icon className={`w-5 h-5 shrink-0 ${style.iconColor}`} />
        <p className={`font-semibold text-sm flex-1 ${style.text}`}>{message}</p>
        <button
          onClick={onClose}
          className={`hover:opacity-70 transition ${style.text}`}
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Hook for easy usage
export function useToast() {
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success', duration = 3000) => {
    setToast({ message, type, duration });
  };

  const hideToast = () => {
    setToast(null);
  };

  return { 
    toast, 
    showToast, 
    hideToast,
    ToastComponent: toast ? (
      <Toast 
        message={toast.message} 
        type={toast.type} 
        duration={toast.duration}
        onClose={hideToast} 
      />
    ) : null
  };
}