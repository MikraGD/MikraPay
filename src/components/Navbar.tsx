/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Wallet, LogOut, Sun, Moon, Copy, Check, ShieldCheck, AlertCircle, Settings } from 'lucide-react';
import { UserAccount } from '../types';

interface NavbarProps {
  session: UserAccount;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
  onOpenVerifyModal: () => void;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  session,
  isDarkMode,
  onToggleTheme,
  onLogout,
  onOpenVerifyModal,
  onOpenSettings,
}) => {
  const [copiedStk, setCopiedStk] = useState(false);

  const handleCopyStk = () => {
    navigator.clipboard.writeText(session.stk);
    setCopiedStk(true);
    setTimeout(() => setCopiedStk(false), 2000);
  };

  return (
    <header className="glass-panel sticky top-0 z-40 border-b border-slate-200/20 dark:border-white/10 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4 transition-colors">
      {/* Brand Zone */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/25">
          <Wallet className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-cyan-500 to-indigo-600 dark:from-cyan-400 dark:to-indigo-400 bg-clip-text text-transparent">
              MikraPay
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 font-semibold">
              K-Bank
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Virtual eWallet & Mini-Banking</p>
        </div>
      </div>

      {/* User Controls & Info */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="p-2.5 rounded-xl glass-panel text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer border border-slate-300/30 dark:border-white/10 shadow-sm flex items-center gap-1.5"
          title="Account & Security Settings"
          aria-label="Account Settings"
        >
          <Settings className="w-4 h-4 text-cyan-500" />
          <span className="hidden lg:inline text-xs font-semibold">Settings</span>
        </button>

        {/* Theme Mode Toggle (White / Black mode) */}
        <button
          onClick={onToggleTheme}
          className="p-2.5 rounded-xl glass-panel text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer border border-slate-300/30 dark:border-white/10 shadow-sm"
          title={isDarkMode ? 'Switch to White Mode' : 'Switch to Black Mode'}
          aria-label="Toggle Theme"
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
        </button>

        {/* User Card */}
        <div className="hidden sm:flex items-center gap-3 glass-card px-3.5 py-1.5 rounded-2xl border border-slate-200/40 dark:border-white/5">
          <span className="text-2xl" role="img" aria-label="avatar">{session.avatar}</span>
          <div className="text-left">
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span>{session.fullName}</span>
              {session.role === 'admin' && (
                <span className="bg-amber-500/20 text-amber-600 dark:text-amber-300 text-[10px] px-1.5 py-0.2 rounded font-bold border border-amber-500/30">
                  Admin
                </span>
              )}
              {session.emailVerified ? (
                <span title="Email Verified" className="inline-flex text-emerald-500">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </span>
              ) : (
                <button
                  onClick={onOpenVerifyModal}
                  className="text-[10px] bg-rose-500/10 text-rose-500 border border-rose-500/30 px-1.5 py-0.2 rounded font-medium hover:bg-rose-500/20"
                  title="Unverified Email - Click to Verify"
                >
                  Unverified
                </button>
              )}
            </div>
            <div className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
              <span>STK: {session.stk}</span>
              <button
                onClick={handleCopyStk}
                className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                title="Copy Account Number"
              >
                {copiedStk ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer"
          title="Sign out of eWallet"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden md:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};
