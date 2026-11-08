/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Mail, ShieldCheck, RefreshCw, AlertCircle, Check } from 'lucide-react';
import { generateOtp, verifyOtpCode } from '../utils/rules';
import { UserAccount } from '../types';

interface EmailVerificationModalProps {
  session: UserAccount;
  actionType?: string;
  onVerifySuccess: () => void;
  onClose: () => void;
}

export const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({
  session,
  actionType = 'banking transaction',
  onVerifySuccess,
  onClose,
}) => {
  const [code, setCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [secondsLeft, setSecondsLeft] = useState<number>(120);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Send initial code on mount
  useEffect(() => {
    sendNewCode();
  }, []);

  // Timer countdown
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  const sendNewCode = () => {
    const newOtp = generateOtp();
    const expiry = Date.now() + 120000; // 2 minutes
    setGeneratedCode(newOtp);
    setExpiresAt(expiry);
    setSecondsLeft(120);
    setErrorMsg(null);
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = verifyOtpCode(code, generatedCode, expiresAt);
    if (result.valid) {
      onVerifySuccess();
    } else {
      setErrorMsg(result.error || 'Invalid code.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel p-6 sm:p-8 rounded-3xl max-w-sm w-full text-center space-y-5 border border-slate-200/30 dark:border-white/10 relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-200/50 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          aria-label="Close Verification"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 rounded-2xl bg-cyan-500/15 text-cyan-500 flex items-center justify-center mx-auto border border-cyan-500/30">
          <Mail className="w-8 h-8" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Email Verification Required</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            To proceed with your <strong className="text-cyan-600 dark:text-cyan-400 uppercase">{actionType}</strong>, please verify your email address (
            <span className="font-semibold text-slate-700 dark:text-slate-200">{session.email}</span>).
          </p>
        </div>

        {/* Real-time simulated Inbox notification message so user immediately sees the OTP */}
        <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-left space-y-1">
          <div className="flex items-center justify-between text-[11px] text-cyan-600 dark:text-cyan-400 font-semibold">
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              Incoming Verification Email
            </span>
            <span>Just now</span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-200">
            Your MikraPay security code is: <strong className="text-sm font-mono tracking-widest text-cyan-500">{generatedCode}</strong>
          </p>
        </div>

        <form onSubmit={handleVerifySubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Enter 6-Digit Code
            </label>
            <input
              type="text"
              required
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="••••••"
              className="w-full px-4 py-3 rounded-xl glass-input text-center text-xl font-mono tracking-widest text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
            />
            {errorMsg && (
              <p className="text-xs text-rose-500 mt-1.5 flex items-center justify-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errorMsg}</span>
              </p>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Expires in {secondsLeft}s</span>
            <button
              type="button"
              onClick={sendNewCode}
              disabled={secondsLeft > 90}
              className="text-cyan-600 dark:text-cyan-400 hover:underline disabled:opacity-50 cursor-pointer"
            >
              Resend Code
            </button>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
          >
            Verify & Unlock {actionType}
          </button>
        </form>
      </div>
    </div>
  );
};
