import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="bg-amber-600 text-white text-xs sm:text-sm py-2 px-4 flex items-center justify-center gap-2 font-medium sticky top-0 z-50 shadow-md">
      <WifiOff className="w-4 h-4 animate-pulse" />
      <span>You are currently offline. MediBridge will automatically reconnect when your internet returns.</span>
    </div>
  );
}
