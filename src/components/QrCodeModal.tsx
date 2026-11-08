/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, QrCode, Copy, Check, Download } from 'lucide-react';
import { UserAccount } from '../types';
import { generateQrDataUrl } from '../utils/qr';

interface QrCodeModalProps {
  session: UserAccount;
  onClose: () => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({ session, onClose }) => {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Generate actual standard MikraPay transfer URI
    const payload = `mikrapay://transfer?stk=${session.stk}&name=${encodeURIComponent(session.fullName)}`;
    generateQrDataUrl(payload)
      .then(url => setQrUrl(url))
      .catch(e => console.error(e));
  }, [session]);

  const handleCopy = () => {
    navigator.clipboard.writeText(session.stk);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!qrUrl) return;
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `mikrapay_qr_${session.stk}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel p-6 sm:p-8 rounded-3xl max-w-sm w-full text-center space-y-5 border border-slate-200/30 dark:border-white/10 relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-200/50 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          aria-label="Close QR Modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <div className="text-4xl mb-2" role="img" aria-label="avatar">{session.avatar}</div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{session.fullName}</h3>
          <p className="text-xs text-cyan-600 dark:text-cyan-400 font-mono mt-0.5">STK: {session.stk}</p>
        </div>

        {/* Real Generated QR Image */}
        <div className="bg-white p-4 rounded-2xl inline-block shadow-xl border border-slate-200">
          {qrUrl ? (
            <img src={qrUrl} alt={`QR Code for ${session.stk}`} className="w-52 h-52 mx-auto rounded-lg" />
          ) : (
            <div className="w-52 h-52 flex items-center justify-center text-slate-400 text-xs">
              Generating QR Code...
            </div>
          )}
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Point any MikraPay scanner or mobile camera at this QR to initiate an instant transfer.
        </p>

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleCopy}
            className="flex-1 py-2.5 px-3 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-800 dark:text-white font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            <span>Copy STK</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 py-2.5 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Save Image</span>
          </button>
        </div>
      </div>
    </div>
  );
};
