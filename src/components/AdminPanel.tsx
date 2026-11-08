/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Shield, CheckCircle, XCircle, Users, CreditCard, DollarSign } from 'lucide-react';
import { UserAccount, WalletRequest } from '../types';

interface AdminPanelProps {
  users: UserAccount[];
  requests: WalletRequest[];
  onResolveRequest: (requestId: string, status: 'approved' | 'rejected') => void;
  onAdjustUserBalance: (userStk: string, newBalance: number) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  users,
  requests,
  onResolveRequest,
  onAdjustUserBalance,
}) => {
  const totalLiquidity = users.reduce((acc, u) => acc + u.balance, 0);
  const pendingRequests = requests.filter(r => r.status === 'pending');

  const handlePromptAdjust = (stk: string, currentBalance: number, name: string) => {
    const val = prompt(`Enter new balance for ${name} (STK: ${stk}):`, currentBalance.toString());
    if (!val) return;
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      onAdjustUserBalance(stk, num);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-6 rounded-3xl border border-amber-500/30 bg-amber-500/5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-500">System Total Liquidity</span>
            <DollarSign className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white mt-2 tabular-nums">
            {totalLiquidity.toLocaleString()} VND
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-cyan-500/30 bg-cyan-500/5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-cyan-500">Registered Accounts</span>
            <Users className="w-5 h-5 text-cyan-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white mt-2">
            {users.length}
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-purple-500/30 bg-purple-500/5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-500">Pending Liquidity Requests</span>
            <CreditCard className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white mt-2">
            {pendingRequests.length}
          </div>
        </div>
      </div>

      {/* Pending Approvals */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200/30 dark:border-white/10 shadow-xl">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-500" />
          <span>Pending Liquidity Requests (Requires Approval)</span>
        </h3>

        {pendingRequests.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            All requests have been reviewed and resolved.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map(req => (
              <div
                key={req.id}
                className="glass-card p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-200/40 dark:border-white/5"
              >
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <span className="text-slate-500">{req.userName}</span>
                    <span className="font-mono text-cyan-500">({req.userStk})</span>
                    <span>requested</span>
                    <span className={`uppercase font-bold ${req.type === 'deposit' ? 'text-emerald-500' : 'text-indigo-400'}`}>
                      {req.type}
                    </span>
                    <span className="font-mono text-slate-900 dark:text-white font-bold">
                      {req.amount.toLocaleString()} VND
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Submitted: {new Date(req.timestamp).toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => onResolveRequest(req.id, 'approved')}
                    className="px-3.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-600 dark:text-emerald-300 rounded-xl text-xs font-semibold border border-emerald-500/30 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={() => onResolveRequest(req.id, 'rejected')}
                    className="px-3.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-600 dark:text-rose-300 rounded-xl text-xs font-semibold border border-rose-500/30 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Accounts Overview */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200/30 dark:border-white/10 shadow-xl">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-cyan-500" />
          <span>User Accounts & Liquidity Balances</span>
        </h3>

        <div className="space-y-3">
          {users.map(u => (
            <div
              key={u.id}
              className="glass-card p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-200/40 dark:border-white/5"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{u.avatar}</span>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <span>{u.fullName}</span>
                    <span className="text-slate-500">(@{u.username})</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                        u.role === 'admin'
                          ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300'
                          : 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300'
                      }`}
                    >
                      {u.role}
                    </span>
                    {u.emailVerified ? (
                      <span className="text-[10px] text-emerald-500 font-medium">Verified</span>
                    ) : (
                      <span className="text-[10px] text-rose-500 font-medium">Unverified</span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400 mt-0.5">
                    STK: {u.stk} · {u.email} · Born: {u.birthday || 'N/A'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <span className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {u.balance.toLocaleString()} VND
                </span>
                <button
                  onClick={() => handlePromptAdjust(u.stk, u.balance, u.fullName)}
                  className="px-2.5 py-1 text-[11px] bg-slate-200 dark:bg-white/10 hover:bg-cyan-500/20 text-slate-700 dark:text-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Adjust
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
