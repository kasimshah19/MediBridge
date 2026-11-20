import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function ServerWakingBanner() {
  const [waking, setWaking] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleWaking = (e) => {
      setWaking(true);
      setMessage(e.detail?.message || 'Server is starting up (cloud sleep recovery)...');
    };

    const handleReady = () => {
      setWaking(false);
    };

    window.addEventListener('server-waking', handleWaking);
    window.addEventListener('server-ready', handleReady);

    return () => {
      window.removeEventListener('server-waking', handleWaking);
      window.removeEventListener('server-ready', handleReady);
    };
  }, []);

  if (!waking) return null;

  return (
    <div className="bg-sky-600 text-white text-xs sm:text-sm py-2 px-4 flex items-center justify-center gap-2 font-medium sticky top-0 z-50 shadow-md animate-fadeIn">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span>{message}</span>
    </div>
  );
}
