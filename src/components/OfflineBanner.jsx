import { Wifi, WifiOff } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export function OfflineBanner({ syncCount = 0 }) {
  const { isOnline, wasOffline } = useNetworkStatus();

  // Show "Back Online" message temporarily
  if (wasOffline && isOnline) {
    return (
      <div className="bg-green-50 border-b border-green-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-2 text-green-800">
          <Wifi className="w-5 h-5" />
          <span className="font-semibold">Back online!</span>
          {syncCount > 0 && (
            <span className="text-sm">
              Syncing {syncCount} receipt{syncCount !== 1 ? 's' : ''}...
            </span>
          )}
        </div>
      </div>
    );
  }

  // Show offline banner
  if (!isOnline) {
    return (
      <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-2 text-yellow-800">
          <WifiOff className="w-5 h-5" />
          <span className="font-semibold">You're offline</span>
          <span className="text-sm">Changes will sync when online</span>
        </div>
      </div>
    );
  }

  return null;
}