import React, { useState } from 'react';
import { AlertTriangle, Settings, CheckCircle2 } from 'lucide-react';
import { SetupGuideModal } from '../setup/SetupGuideModal';
import { useAuth } from '../../context/AuthContext';

export function SetupBanner() {
  const { isConfigured } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (isConfigured) return null;

  return (
    <>
      <div className="bg-amber-950/80 border-b border-amber-800/60 px-4 py-2.5 flex items-center justify-between text-xs text-amber-200">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Appwrite Configuration Required:</strong> Set your project ID and database collections in{' '}
            <code className="bg-amber-900/60 px-1 py-0.5 rounded text-amber-100 font-mono">.env</code> to connect persistent storage.
          </span>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-900/60 hover:bg-amber-800/60 border border-amber-700/60 rounded text-amber-100 font-medium transition-colors cursor-pointer shrink-0"
        >
          <Settings className="w-3.5 h-3.5" /> Setup Guide
        </button>
      </div>

      <SetupGuideModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
