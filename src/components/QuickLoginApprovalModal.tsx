/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Smartphone } from 'lucide-react';

interface QuickLoginApprovalModalProps {
  onApprove: (code: string) => Promise<boolean>;
  onClose: () => void;
  triggerToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const QuickLoginApprovalModal: React.FC<QuickLoginApprovalModalProps> = ({ onApprove, onClose, triggerToast }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel p-6 sm:p-8 rounded-3xl max-w-sm w-full border border-slate-200/30 dark:border-white/10 relative shadow-2xl space-y-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-200/50 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center mx-auto text-cyan-500">
            <Smartphone className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Approve Quick Login</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Enter the 6-digit code from the new device you want to log in.
          </p>
        </div>

        <form onSubmit={async (e) => {
          e.preventDefault();
          if (code.length === 6) {
            setLoading(true);
            const success = await onApprove(code);
            setLoading(false);
            if (success) {
              triggerToast('Quick Login approved successfully!', 'success');
              onClose();
            } else {
              triggerToast('Invalid or expired Quick Login code.', 'error');
            }
          }
        }} className="space-y-4">
          <input
            type="text"
            maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="••••••"
            className="w-full px-4 py-4 rounded-xl glass-input text-center text-2xl font-mono font-bold tracking-widest text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
          >
            {loading ? 'Approving...' : 'Approve Login'}
          </button>
        </form>
      </div>
    </div>
  );
};
