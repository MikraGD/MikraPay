/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Eye, EyeOff, QrCode, Camera, Send, ArrowDownLeft, PiggyBank, Sparkles, RefreshCw } from 'lucide-react';
import { UserAccount } from '../types';

interface BalanceCardProps {
  session: UserAccount;
  onNavigateTab: (tab: 'transfer' | 'requests' | 'savings' | 'ai') => void;
  onOpenQrModal: () => void;
  onOpenQrScanner: () => void;
  onRefresh: () => void;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  session,
  onNavigateTab,
  onOpenQrModal,
  onOpenQrScanner,
  onRefresh,
}) => {
  // Hides funds by default as requested!
  const [hideFunds, setHideFunds] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200/30 dark:border-white/10 relative overflow-hidden bg-gradient-to-br from-slate-900/95 via-slate-900/80 to-cyan-950/60 text-white shadow-2xl">
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 relative z-10">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Available Virtual Balance
          </span>
          <div className="flex items-center gap-3 mt-1.5">
            <h2 className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-white tabular-nums">
              {hideFunds ? '••••••••' : `${session.balance.toLocaleString()} VND`}
            </h2>
            <button
              onClick={() => setHideFunds(!hideFunds)}
              className="p-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-white/10"
              title={hideFunds ? 'Show Balance' : 'Hide Balance'}
              aria-label="Toggle Balance Visibility"
            >
              {hideFunds ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* QR Scanner & QR Code Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenQrScanner}
            className="px-3.5 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-semibold text-xs flex items-center gap-2 border border-cyan-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Scan friend's QR code via camera or image"
          >
            <Camera className="w-4 h-4 text-cyan-400" />
            <span>QR Scanner</span>
          </button>

          <button
            onClick={onOpenQrModal}
            className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center gap-2 border border-white/10 transition-all cursor-pointer active:scale-95"
            title="View my account QR code"
          >
            <QrCode className="w-4 h-4 text-cyan-400" />
            <span>My QR Code</span>
          </button>

          <button
            onClick={handleRefreshClick}
            className={`p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer active:scale-95 ${
              isRefreshing ? 'animate-spin text-cyan-400' : ''
            }`}
            title="Refresh Ledger Balance"
            aria-label="Refresh Balance"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4 Quick Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10 relative z-10">
        <button
          onClick={() => onNavigateTab('transfer')}
          className="p-3.5 rounded-2xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 font-semibold text-xs flex flex-col items-center gap-2 transition-all cursor-pointer hover:-translate-y-0.5"
        >
          <Send className="w-5 h-5" />
          <span>Quick Transfer</span>
        </button>
        <button
          onClick={() => onNavigateTab('requests')}
          className="p-3.5 rounded-2xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 font-semibold text-xs flex flex-col items-center gap-2 transition-all cursor-pointer hover:-translate-y-0.5"
        >
          <ArrowDownLeft className="w-5 h-5" />
          <span>Top-up / Deposit</span>
        </button>
        <button
          onClick={() => onNavigateTab('savings')}
          className="p-3.5 rounded-2xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 font-semibold text-xs flex flex-col items-center gap-2 transition-all cursor-pointer hover:-translate-y-0.5"
        >
          <PiggyBank className="w-5 h-5" />
          <span>Savings Vaults</span>
        </button>
        <button
          onClick={() => onNavigateTab('ai')}
          className="p-3.5 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 font-semibold text-xs flex flex-col items-center gap-2 transition-all cursor-pointer hover:-translate-y-0.5"
        >
          <Sparkles className="w-5 h-5" />
          <span>Mikra AI Advisor</span>
        </button>
      </div>
    </div>
  );
};
