/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PiggyBank, Plus, CheckCircle, TrendingUp, Sparkles } from 'lucide-react';
import { UserAccount, SavingsVault } from '../types';
import { calculateSavingsProgress } from '../utils/rules';

interface SavingsVaultsProps {
  session: UserAccount;
  vaults: SavingsVault[];
  onCreateVault: (title: string, targetAmount: number, category: string) => void;
  onDepositToVault: (vaultId: string, amount: number) => void;
}

export const SavingsVaults: React.FC<SavingsVaultsProps> = ({
  session,
  vaults,
  onCreateVault,
  onDepositToVault,
}) => {
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [category, setCategory] = useState('Travel');
  const [depositModalVault, setDepositModalVault] = useState<SavingsVault | null>(null);
  const [depositAmount, setDepositAmount] = useState('');

  const userVaults = vaults.filter(v => v.userStk === session.stk);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tgt = parseFloat(target);
    if (!title.trim() || isNaN(tgt) || tgt <= 0) return;
    onCreateVault(title.trim(), tgt, category);
    setTitle('');
    setTarget('');
  };

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositModalVault) return;
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) return;
    onDepositToVault(depositModalVault.id, amt);
    setDepositModalVault(null);
    setDepositAmount('');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full">
      {/* Create Vault Form */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200/30 dark:border-white/10 shadow-xl max-w-xl mx-auto">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
          <PiggyBank className="w-5 h-5 text-cyan-500" />
          <span>Create New Savings Goal Vault</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          Lock away funds for upcoming trips, gadgets, or emergency savings.
        </p>

        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Goal Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Da Nang Beach Holiday 🏖️"
              className="w-full px-4 py-3 rounded-xl glass-input text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Target Amount (VND)
            </label>
            <input
              type="number"
              required
              min="50000"
              step="50000"
              value={target}
              onChange={e => setTarget(e.target.value)}
              placeholder="e.g. 2000000"
              className="w-full px-4 py-3 rounded-xl glass-input text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-xl glass-input text-sm text-slate-900 dark:text-slate-100 focus:outline-none"
            >
              <option value="Travel">✈️ Travel & Vacation</option>
              <option value="Gadgets">💻 Tech & Gaming</option>
              <option value="Dining">🍕 Dining & Parties</option>
              <option value="Emergency">🛡️ Emergency Buffer</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-cyan-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Savings Vault</span>
          </button>
        </form>
      </div>

      {/* User's Vaults List */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200/30 dark:border-white/10 shadow-lg">
        <h4 className="text-base font-bold text-slate-900 dark:text-white mb-6 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-500" />
            My Active Savings Goals
          </span>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            {userVaults.length} Vaults
          </span>
        </h4>

        {userVaults.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No savings vaults created yet. Start setting aside funds for your future goals!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userVaults.map(v => {
              const progress = calculateSavingsProgress(v.currentAmount, v.targetAmount);
              return (
                <div
                  key={v.id}
                  className="glass-card p-5 rounded-2xl border border-slate-200/40 dark:border-white/10 space-y-4 hover:border-cyan-500/40 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border border-cyan-500/20">
                      {v.category}
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-500">
                      {progress}% Reached
                    </span>
                  </div>

                  <div>
                    <h5 className="text-base font-bold text-slate-900 dark:text-white">{v.title}</h5>
                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-mono">
                      <span>Saved: {v.currentAmount.toLocaleString()} VND</span>
                      <span>Target: {v.targetAmount.toLocaleString()} VND</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 dark:bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-300/30 dark:border-white/10">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>

                  <button
                    onClick={() => setDepositModalVault(v)}
                    className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-cyan-500/15 text-slate-800 dark:text-white font-semibold text-xs border border-slate-300/40 dark:border-white/10 transition-all cursor-pointer"
                  >
                    + Deposit Funds into Goal
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Deposit to Vault Modal */}
      {depositModalVault && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl max-w-sm w-full border border-slate-200/30 dark:border-white/10 relative">
            <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Deposit to {depositModalVault.title}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 font-mono">
              Wallet Balance: {session.balance.toLocaleString()} VND
            </p>

            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Amount to transfer to vault (VND)
                </label>
                <input
                  type="number"
                  required
                  min="10000"
                  step="10000"
                  max={session.balance}
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                  placeholder="e.g. 50000"
                  className="w-full px-4 py-3 rounded-xl glass-input text-base text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none font-mono"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDepositModalVault(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-md shadow-cyan-500/20"
                >
                  Confirm Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
