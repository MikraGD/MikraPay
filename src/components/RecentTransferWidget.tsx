/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { History, Send, ArrowRight } from 'lucide-react';
import { Transaction, UserAccount } from '../types';

interface RecentTransferWidgetProps {
  session: UserAccount;
  transactions: Transaction[];
  onSelectRecipient: (stk: string, name: string) => void;
}

export const RecentTransferWidget: React.FC<RecentTransferWidgetProps> = ({
  session,
  transactions,
  onSelectRecipient,
}) => {
  // Extract unique recipients from recent transfers where current user was the sender
  const recentRecipients = useMemo(() => {
    const map = new Map<string, { stk: string; name: string; lastAmount: number; time: string }>();

    transactions
      .filter(t => t.senderStk === session.stk && t.type === 'transfer')
      .forEach(t => {
        if (!map.has(t.receiverStk)) {
          map.set(t.receiverStk, {
            stk: t.receiverStk,
            name: t.receiverName,
            lastAmount: t.amount,
            time: t.timestamp,
          });
        }
      });

    return Array.from(map.values()).slice(0, 6);
  }, [transactions, session]);

  if (recentRecipients.length === 0) {
    return null;
  }

  return (
    <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-slate-200/30 dark:border-white/10">
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-500" />
          <span>Recent Transfers (Quick Send)</span>
        </h3>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">Tap to transfer again</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {recentRecipients.map(r => (
          <button
            key={r.stk}
            onClick={() => onSelectRecipient(r.stk, r.name)}
            className="glass-card p-3 rounded-2xl border border-slate-200/40 dark:border-white/10 hover:border-cyan-500/50 hover:bg-cyan-500/5 flex flex-col items-center gap-2 text-center transition-all cursor-pointer group active:scale-95"
            title={`Quick re-transfer to ${r.name}`}
          >
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-transform">
              {r.name.charAt(0)}
            </div>
            <div className="w-full">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {r.name}
              </div>
              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {r.stk}
              </div>
            </div>
            <div className="text-[10px] text-cyan-600 dark:text-cyan-400 font-medium flex items-center gap-1 group-hover:underline">
              <span>Send</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
