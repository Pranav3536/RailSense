import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { WAKE_UP_NOTICE_MESSAGE } from '../../config/constants';

/**
 * WakeUpNotice Component
 * Displays a neutral notice if any API request has been pending for more than 4 seconds
 * (Render free tier spin-down recovery). Clears immediately on request completion.
 */
export function WakeUpNotice() {
  const [isWakingUp, setIsWakingUp] = useState(false);

  useEffect(() => {
    const handleWakeUp = (e) => {
      setIsWakingUp(Boolean(e.detail?.isWakingUp));
    };

    window.addEventListener('railsense:wakeup', handleWakeUp);
    return () => {
      window.removeEventListener('railsense:wakeup', handleWakeUp);
    };
  }, []);

  if (!isWakingUp) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-sm flex items-center gap-3 shadow-xs animate-in fade-in"
    >
      <Clock size={18} className="text-amber-600 flex-shrink-0 animate-spin" aria-hidden="true" />
      <span className="font-medium">{WAKE_UP_NOTICE_MESSAGE}</span>
    </div>
  );
}
