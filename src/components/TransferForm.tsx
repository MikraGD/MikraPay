/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Send, Camera, Check, AlertCircle, ArrowRight } from 'lucide-react';
import { UserAccount } from '../types';

interface TransferFormProps {
  session: UserAccount;
  allUsers: UserAccount[];
  initialStk?: string;
  onExecuteTransfer: (receiverStk: string, amount: number, note: string) => void;
  onOpenQrScanner: () => void;
  onRequireEmailVerification: (actionType: 'transfer') => void;
}

export const TransferForm: React.FC<TransferFormProps> = ({
  session,
  allUsers,
  initialStk = '',
  onExecuteTransfer,
  onOpenQrScanner,
  onRequireEmailVerification,
}) => {
  const [targetStk, setTargetStk] = useState(initialStk);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (initialStk) {
      setTargetStk(initialStk);
    }
  }, [initialStk]);

  const verifiedRecipient = allUsers.find(u => u.stk === targetStk.trim());
  const isSelf = verifiedRecipient?.stk === session.stk;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session.emailVerified) {
      onRequireEmailVerification('transfer');
      return;
    }

    const amt = parseFloat(amount);
    onExecuteTransfer(targetStk.trim(), amt, note);
  };

  const setPresetAmount = (preset: number) => {
    setAmount(preset.toString());
  };

  return (
    <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200/30 dark:border-white/10 max-w-xl mx-auto w-full shadow-xl">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Send className="w-5 h-5 text-cyan-500" />
          <span>Quick Peer Transfer</span>
        </h3>
        <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400">0% Transaction Fee</span>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
        Send funds instantly to any friend in the MikraPay network using their 10-digit Account Number (STK) or QR scan.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Recipient STK */}
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Recipient Account Number (STK)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              required
              value={targetStk}
              onChange={e => setTargetStk(e.target.value)}
              placeholder="e.g. 1002003002"
              className="flex-1 px-4 py-3 rounded-xl glass-input text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none font-mono"
            />
            <button
              type="button"
              onClick={onOpenQrScanner}
              className="px-4 py-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              title="Scan QR Code"
            >
              <Camera className="w-4 h-4" />
              <span>Scan QR</span>
            </button>
          </div>

          {/* Validation Feedback */}
          {targetStk.trim().length > 0 && (
            <div className="mt-2 text-xs">
              {isSelf ? (
                <div className="text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Cannot transfer money to your own STK.</span>
                </div>
              ) : verifiedRecipient ? (
                <div className="text-emerald-500 dark:text-emerald-400 flex items-center gap-1.5 font-semibold">
                  <Check className="w-3.5 h-3.5" />
                  <span>Verified Recipient: {verifiedRecipient.fullName} ({verifiedRecipient.avatar})</span>
                </div>
              ) : (
                <div className="text-amber-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>STK not found in MikraPay directory.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Amount */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Amount (VND)
            </label>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Available: {session.balance.toLocaleString()} VND
            </span>
          </div>
          <input
            type="number"
            required
            min="1000"
            step="1000"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="e.g. 50000"
            className="w-full px-4 py-3 rounded-xl glass-input text-base text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none font-mono"
          />

          {/* Quick preset amount chips */}
          <div className="flex gap-2 mt-2">
            {[50000, 100000, 200000, 500000].map(val => (
              <button
                key={val}
                type="button"
                onClick={() => setPresetAmount(val)}
                className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-cyan-500/10 text-slate-700 dark:text-slate-300 border border-slate-300/30 dark:border-white/10 transition-all font-mono"
              >
                +{val.toLocaleString()}đ
              </button>
            ))}
          </div>
        </div>

        {/* Transfer Memo */}
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Message / Memo
          </label>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. Dinner bill split, Movie tickets, Coffee"
            className="w-full px-4 py-3 rounded-xl glass-input text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />
        </div>

        {/* Summary Card */}
        <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200/40 dark:border-white/5 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex justify-between">
            <span>Sender:</span>
            <span className="font-semibold text-slate-800 dark:text-white">{session.fullName}</span>
          </div>
          <div className="flex justify-between">
            <span>Transfer Fee:</span>
            <span className="text-emerald-500 font-semibold">0 VND (Free)</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-slate-200/50 dark:border-white/5 font-semibold">
            <span>Total Deducted:</span>
            <span className="font-mono text-cyan-600 dark:text-cyan-400">
              {amount ? `${parseFloat(amount).toLocaleString()} VND` : '0 VND'}
            </span>
          </div>
        </div>

        {/* Email verification warning if not verified */}
        {!session.emailVerified && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Email verification required before sending. Click below to verify your email.</span>
          </div>
        )}

        <button
          type="submit"
          className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-cyan-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
        >
          <span>Send Transfer Now</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
