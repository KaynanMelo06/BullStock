import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:bottom-6 z-50 flex items-center gap-2.5 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xl backdrop-blur border border-amber-400/40"
    >
      <WifiOff className="w-4 h-4 shrink-0 animate-pulse text-amber-200" />
      <span>Modo Offline — Alterações serão sincronizadas ao reconectar.</span>
    </div>
  );
};
