/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Smartphone } from 'lucide-react';
import { initiateQuickLoginRequest, listenForQuickLoginApproval } from '../utils/storage';
import { generateQrDataUrl } from '../utils/qr';

interface QuickLoginRequestModalProps {
  onSuccess: (stk: string) => void;
  onClose: () => void;
  triggerToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const QuickLoginRequestModal: React.FC<QuickLoginRequestModalProps> = ({ onSuccess, onClose, triggerToast }) => {
  const [code, setCode] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: () => void;

    const init = async () => {
      try {
        const { code: generatedCode } = await initiateQuickLoginRequest();
        setCode(generatedCode);
        const url = await generateQrDataUrl(`mikrapay://quicklogin?code=${generatedCode}`);
        setQrUrl(url);
        setLoading(false);

        unsubscribe = listenForQuickLoginApproval(generatedCode, (stk) => {
          onSuccess(stk);
        });
      } catch (err) {
        triggerToast('Failed to initialize Quick Login.', 'error');
        onClose();
      }
    };

    init();
    return () => unsubscribe && unsubscribe();
  }, [onSuccess, onClose, triggerToast]);

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
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Quick Login Request</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Scan this QR or enter the code on your logged-in device.
          </p>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-400 text-sm">Generating code...</div>
        ) : (
          <div className="text-center space-y-4">
            <div className="text-4xl font-mono font-extrabold tracking-widest text-cyan-500">{code}</div>
            {qrUrl && (
              <div className="bg-white p-3 rounded-2xl inline-block shadow-lg border border-slate-200">
                <img src={qrUrl} alt="Quick Login QR" className="w-44 h-44 mx-auto rounded-lg" />
              </div>
            )}
            <p className="text-[11px] text-slate-500">Waiting for approval on your other device...</p>
          </div>
        )}
      </div>
    </div>
  );
};
