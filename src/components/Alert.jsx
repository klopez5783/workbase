// components/Alert.jsx
import { AlertCircle, CheckCircle, XCircle, Settings, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Alert({ 
  shadeType = 'yellow', 
  text, 
  subText, 
  actionButton = null, // Optional: { text: 'Setup', link: '/profile', icon: Settings }
  onClose = null // Add close handler
}) {
  // Color schemes based on shadeType
  const colorSchemes = {
    green: {
      bg: 'bg-green-50',
      border: 'border-green-500',
      icon: 'text-green-600',
      textPrimary: 'text-green-900',
      textSecondary: 'text-green-700',
      buttonBg: 'bg-green-100 hover:bg-green-200',
      buttonText: 'text-green-800',
      IconComponent: CheckCircle
    },
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-500',
      icon: 'text-yellow-600',
      textPrimary: 'text-yellow-900',
      textSecondary: 'text-yellow-700',
      buttonBg: 'bg-yellow-100 hover:bg-yellow-200',
      buttonText: 'text-yellow-800',
      IconComponent: AlertCircle
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-500',
      icon: 'text-red-600',
      textPrimary: 'text-red-900',
      textSecondary: 'text-red-700',
      buttonBg: 'bg-red-100 hover:bg-red-200',
      buttonText: 'text-red-800',
      IconComponent: XCircle
    }
  };

  const colors = colorSchemes[shadeType] || colorSchemes.yellow;
  const IconComponent = colors.IconComponent;

  return (
    <div className={`${colors.bg} border-l-4 ${colors.border} rounded-lg p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
            {onClose && (
            <button
              onClick={onClose}
              className={`${colors.buttonBg} ${colors.buttonText} p-1.5 rounded-lg transition flex items-center justify-center flex-shrink-0`}
              aria-label="Close alert"
            >
              
              <IconComponent className={`${colors.icon} mt-0.5`} size={15} />
            </button>
          )}
          
          <div>
            <p className={`font-semibold ${colors.textPrimary} text-sm`}>{text}</p>
            {subText && (
              <p className={`text-xs ${colors.textSecondary} mt-1`}>{subText}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {actionButton && (
            <Link
              to={actionButton.link}
              className={`${colors.buttonBg} ${colors.buttonText} px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 flex-shrink-0`}
            >
              {actionButton.icon && <actionButton.icon size={14} />}
              {actionButton.text}
            </Link>
          )}
          
          
        </div>
      </div>
    </div>
  );
}