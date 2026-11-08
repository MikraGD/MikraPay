/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CreditCard, ArrowDownLeft, ArrowUpRight, Clock, AlertCircle } from 'lucide-react';
import { UserAccount, WalletRequest } from '../types';

interface RequestsManagerProps {
  session: UserAccount;
  requests: WalletRequest[];
  onCreateRequest: (type: 'deposit' | 'withdraw', amount: number) => void;
  onRequireEmailVerification: (actionType: 'deposit' | 'withdraw') => void;
}

export const RequestsManager: React.FC<RequestsManagerProps> = ({
  session,
  requests,
  onCreateRequest,
  onRequireEmailVerification,
}) => {
  const [type, setType] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');

  const userRequests = requests.filter(r => r.userStk === session.stk);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session.emailVerified) {
      onRequireEmailVerification(type);
      return;
    }

    const amt = parseFloat(amount);
    onCreateRequest(type, amt);
    setAmount('');
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto w-full">
      {/* Request Form */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200/30 dark:border-white/10 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-cyan-500" />
          <span>Deposit & Withdrawal Liquidity Request</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          Submit a top-up or cash-out request to the System Admin. Approved requests instantly adjust your balance.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-3 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200/50 dark:border-white/5">
            <button
              type="button"
              onClick={() => setType('deposit')}
              className={`py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                type === 'deposit'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Deposit Funds</span>
            </button>
            <button
              type="button"
              onClick={() => setType('withdraw')}
              className={`py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                type === 'withdraw'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Withdraw Funds</span>
            </button>
          </div>

          {/* Amount Input */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Amount (VND)
              </label>
              {type === 'withdraw' && (
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Max: {session.balance.toLocaleString()} VND
                </span>
              )}
            </div>
            <input
              type="number"
              required
              min="10000"
              step="10000"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="e.g. 200000"
              className="w-full px-4 py-3 rounded-xl glass-input text-base text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none font-mono"
            />

            {/* Presets */}
            <div className="flex gap-2 mt-2">
              {[50000, 100000, 500000, 1000000].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(val.toString())}
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-cyan-500/10 text-slate-700 dark:text-slate-300 border border-slate-300/30 dark:border-white/10 transition-all font-mono"
                >
                  {val.toLocaleString()}đ
                </button>
              ))}
            </div>
          </div>

          {!session.emailVerified && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Email verification required before submitting requests.</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
          >
            Submit {type === 'deposit' ? 'Deposit' : 'Withdrawal'} Request
          </button>
        </form>
      </div>

      {/* History */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200/30 dark:border-white/10 shadow-lg">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-500" />
          <span>My Liquidity Requests History</span>
        </h4>

        {userRequests.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No pending or completed liquidity requests.
          </div>
        ) : (
          <div className="space-y-3">
            {userRequests.map(r => (
              <div
                key={r.id}
                className="glass-card p-4 rounded-2xl flex items-center justify-between gap-4 border border-slate-200/40 dark:border-white/5"
              >
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase flex items-center gap-2">
                    <span className={r.type === 'deposit' ? 'text-emerald-500' : 'text-indigo-400'}>
                      {r.type}
                    </span>
                    <span className="font-mono">{r.amount.toLocaleString()} VND</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {new Date(r.timestamp).toLocaleString()}
                  </div>
                </div>

                <div>
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-semibold border ${
                      r.status === 'approved'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        : r.status === 'rejected'
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {r.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
