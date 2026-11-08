/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Wallet, Send, CreditCard, PiggyBank, Sparkles, Shield,
  History, Download, CheckCircle, XCircle, AlertCircle, ArrowUpRight, ArrowDownLeft,
  Settings
} from 'lucide-react';
import { UserAccount, Transaction, WalletRequest, SavingsVault } from './types';
import {
  getStoredUsers, saveStoredUsers,
  getStoredSession, saveStoredSession,
  getStoredTransactions, saveStoredTransactions,
  getStoredRequests, saveStoredRequests,
  getStoredSavings, saveStoredSavings
} from './utils/storage';
import { validateTransfer, executeTransfer, validateRequestSubmission, executeRequestApproval } from './utils/rules';

// Modular Components
import { Navbar } from './components/Navbar';
import { BalanceCard } from './components/BalanceCard';
import { RecentTransferWidget } from './components/RecentTransferWidget';
import { TransferForm } from './components/TransferForm';
import { RequestsManager } from './components/RequestsManager';
import { SavingsVaults } from './components/SavingsVaults';
import { AiAdvisor } from './components/AiAdvisor';
import { AdminPanel } from './components/AdminPanel';
import { AuthModal } from './components/AuthModal';
import { QrCodeModal } from './components/QrCodeModal';
import { QrScannerModal } from './components/QrScannerModal';
import { EmailVerificationModal } from './components/EmailVerificationModal';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  // Theme state: Black mode (dark) vs White mode (light)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('mikrapay_theme');
    if (saved !== null) return saved === 'dark';
    return true; // Default dark
  });

  useEffect(() => {
    localStorage.setItem('mikrapay_theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Core Persistent States
  const [users, setUsers] = useState<UserAccount[]>(getStoredUsers);
  const [session, setSession] = useState<UserAccount | null>(getStoredSession);
  const [transactions, setTransactions] = useState<Transaction[]>(getStoredTransactions);
  const [requests, setRequests] = useState<WalletRequest[]>(getStoredRequests);
  const [savings, setSavings] = useState<SavingsVault[]>(getStoredSavings);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transfer' | 'requests' | 'savings' | 'ai' | 'admin'>('dashboard');

  // Pre-filled recipient STK for Quick Re-Transfer or QR Scan
  const [prefilledTransferStk, setPrefilledTransferStk] = useState<string>('');

  // Modals
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [showQrScanner, setShowQrScanner] = useState<boolean>(false);
  const [showVerifyModal, setShowVerifyModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [pendingVerifyAction, setPendingVerifyAction] = useState<'transfer' | 'deposit' | 'withdraw' | null>(null);

  // Toast System
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Sync state changes to persistence
  useEffect(() => {
    saveStoredUsers(users);
  }, [users]);

  useEffect(() => {
    saveStoredSession(session);
  }, [session]);

  useEffect(() => {
    saveStoredTransactions(transactions);
  }, [transactions]);

  useEffect(() => {
    saveStoredRequests(requests);
  }, [requests]);

  useEffect(() => {
    saveStoredSavings(savings);
  }, [savings]);

  // Keep session up to date when user record changes in users list
  useEffect(() => {
    if (session) {
      const fresh = users.find(u => u.stk === session.stk);
      if (fresh && (fresh.balance !== session.balance || fresh.emailVerified !== session.emailVerified)) {
        setSession(fresh);
      }
    }
  }, [users]);

  // Handle Logins
  const handleLoginSuccess = (user: UserAccount) => {
    setSession(user);
    triggerToast(`Welcome back, ${user.fullName}!`, 'success');
  };

  const handleRegisterSuccess = (newUser: UserAccount) => {
    setUsers(prev => [...prev, newUser]);
    setSession(newUser);

    const bonusTx: Transaction = {
      id: 'tx-bonus-' + Date.now(),
      senderStk: '9999999999',
      senderName: 'MikraPay System Liquidity',
      receiverStk: newUser.stk,
      receiverName: newUser.fullName,
      amount: newUser.balance,
      type: 'reward',
      note: 'Account creation welcome reward bonus 🎁',
      timestamp: new Date().toISOString(),
    };
    setTransactions(prev => [bonusTx, ...prev]);
    triggerToast(`Account created! STK: ${newUser.stk}. Welcome bonus awarded.`, 'success');
  };

  const handleLogout = () => {
    setSession(null);
    setActiveTab('dashboard');
    triggerToast('Logged out securely.', 'info');
  };

  const handleUpdateSessionUser = (updatedUser: UserAccount) => {
    setUsers(prev => prev.map(u => (u.stk === updatedUser.stk ? updatedUser : u)));
    setSession(updatedUser);
  };

  // Quick Re-Transfer selection from widget
  const handleSelectRecentRecipient = (stk: string, name: string) => {
    setPrefilledTransferStk(stk);
    setActiveTab('transfer');
    triggerToast(`Ready to transfer to ${name} (${stk})`, 'info');
  };

  // QR Scan Success
  const handleQrScanSuccess = (scannedStk: string) => {
    setShowQrScanner(false);
    setPrefilledTransferStk(scannedStk);
    setActiveTab('transfer');
    const recipient = users.find(u => u.stk === scannedStk);
    triggerToast(`QR Scanned! Recipient: ${recipient?.fullName || scannedStk}`, 'success');
  };

  // Perform Transfer
  const handleExecuteTransfer = (receiverStk: string, amount: number, note: string) => {
    if (!session) return;

    const validation = validateTransfer(session, receiverStk, amount, users);
    if (!validation.valid || !validation.receiver) {
      triggerToast(validation.error || 'Transfer failed validation.', 'error');
      return;
    }

    const { updatedSender, updatedReceiver, transaction } = executeTransfer(
      session,
      validation.receiver,
      amount,
      note
    );

    setUsers(prev =>
      prev.map(u => {
        if (u.stk === updatedSender.stk) return updatedSender;
        if (u.stk === updatedReceiver.stk) return updatedReceiver;
        return u;
      })
    );
    setSession(updatedSender);
    setTransactions(prev => [transaction, ...prev]);
    triggerToast(`Transferred ${amount.toLocaleString()} VND to ${validation.receiver.fullName}!`, 'success');
    setPrefilledTransferStk('');
  };

  // Requests
  const handleCreateRequest = (type: 'deposit' | 'withdraw', amount: number) => {
    if (!session) return;
    const validation = validateRequestSubmission(session, type, amount);
    if (!validation.valid) {
      triggerToast(validation.error || 'Request invalid.', 'error');
      return;
    }

    const newReq: WalletRequest = {
      id: 'req-' + Date.now(),
      userStk: session.stk,
      userName: session.fullName,
      type,
      amount,
      status: 'pending',
      timestamp: new Date().toISOString(),
    };

    setRequests(prev => [newReq, ...prev]);
    triggerToast(`${type === 'deposit' ? 'Deposit' : 'Withdrawal'} request submitted to Admin.`, 'success');
  };

  // Admin Request Resolution
  const handleResolveRequest = (requestId: string, status: 'approved' | 'rejected') => {
    const req = requests.find(r => r.id === requestId);
    if (!req) return;

    if (status === 'approved') {
      const user = users.find(u => u.stk === req.userStk);
      if (!user) {
        triggerToast('Target user account not found.', 'error');
        return;
      }

      const res = executeRequestApproval(req, user);
      if (!res.success || !res.updatedUser || !res.transaction) {
        triggerToast(res.error || 'Failed to approve request.', 'error');
        return;
      }

      setUsers(prev => prev.map(u => (u.stk === user.stk ? res.updatedUser! : u)));
      setTransactions(prev => [res.transaction!, ...prev]);
    }

    setRequests(prev => prev.map(r => (r.id === requestId ? { ...r, status } : r)));
    triggerToast(`Request ${status} successfully.`, 'success');
  };

  // Admin User Balance Adjustment
  const handleAdjustUserBalance = (userStk: string, newBalance: number) => {
    setUsers(prev => prev.map(u => (u.stk === userStk ? { ...u, balance: newBalance } : u)));
    triggerToast(`Balance updated to ${newBalance.toLocaleString()} VND.`, 'success');
  };

  // Savings
  const handleCreateVault = (title: string, targetAmount: number, category: string) => {
    if (!session) return;
    const newVault: SavingsVault = {
      id: 'sav-' + Date.now(),
      userStk: session.stk,
      title,
      targetAmount,
      currentAmount: 0,
      category,
      createdAt: new Date().toISOString(),
    };
    setSavings(prev => [...prev, newVault]);
    triggerToast(`Savings vault "${title}" created!`, 'success');
  };

  const handleDepositToVault = (vaultId: string, amount: number) => {
    if (!session) return;
    if (session.balance < amount) {
      triggerToast('Insufficient wallet balance to deposit into vault.', 'error');
      return;
    }

    // Deduct from user wallet, add to vault
    setUsers(prev => prev.map(u => (u.stk === session.stk ? { ...u, balance: u.balance - amount } : u)));
    setSavings(prev =>
      prev.map(v => (v.id === vaultId ? { ...v, currentAmount: v.currentAmount + amount } : v))
    );
    triggerToast(`Deposited ${amount.toLocaleString()} VND into vault!`, 'success');
  };

  // Email Verification Handler
  const handleRequireEmailVerification = (actionType: 'transfer' | 'deposit' | 'withdraw') => {
    setPendingVerifyAction(actionType);
    setShowVerifyModal(true);
  };

  const handleEmailVerifySuccess = () => {
    if (!session) return;
    const verifiedUser: UserAccount = { ...session, emailVerified: true };
    setUsers(prev => prev.map(u => (u.stk === session.stk ? verifiedUser : u)));
    setSession(verifiedUser);
    setShowVerifyModal(false);
    triggerToast('Email verified successfully! Action unlocked.', 'success');
  };

  // Export CSV Statement
  const handleExportCsv = () => {
    if (!session) return;
    const userTxs = transactions.filter(t => t.senderStk === session.stk || t.receiverStk === session.stk);
    let csv = 'ID,Timestamp,Type,Sender STK,Sender Name,Receiver STK,Receiver Name,Amount (VND),Note\n';
    userTxs.forEach(t => {
      csv += `"${t.id}","${t.timestamp}","${t.type}","${t.senderStk}","${t.senderName}","${t.receiverStk}","${t.receiverName}",${t.amount},"${t.note}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mikrapay_statement_${session.stk}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    triggerToast('Statement downloaded as CSV.', 'success');
  };

  // ==================== AUTH GATEWAY (If not logged in) ====================
  if (!session) {
    return (
      <>
        {/* Toast Notification */}
        {toast && (
          <div
            className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl glass-panel shadow-2xl flex items-center gap-3 border animate-bounce ${
              toast.type === 'success'
                ? 'border-emerald-500/50 text-emerald-400'
                : toast.type === 'error'
                ? 'border-rose-500/50 text-rose-400'
                : 'border-cyan-500/50 text-cyan-400'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5 text-rose-400" />}
            {toast.type === 'info' && <AlertCircle className="w-5 h-5 text-cyan-400" />}
            <span className="text-sm font-semibold">{toast.message}</span>
          </div>
        )}

        <AuthModal
          allUsers={users}
          isDarkMode={isDarkMode}
          onToggleTheme={() => setIsDarkMode(!isDarkMode)}
          onLoginSuccess={handleLoginSuccess}
          onRegisterSuccess={handleRegisterSuccess}
          triggerToast={triggerToast}
        />
      </>
    );
  }

  // ==================== DASHBOARD APPLICATION ====================
  const userTransactions = transactions.filter(
    t => t.senderStk === session.stk || t.receiverStk === session.stk
  );

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col relative transition-colors duration-300">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl glass-panel shadow-2xl flex items-center gap-3 border animate-bounce ${
            toast.type === 'success'
              ? 'border-emerald-500/50 text-emerald-400'
              : toast.type === 'error'
              ? 'border-rose-500/50 text-rose-400'
              : 'border-cyan-500/50 text-cyan-400'
          }`}
        >
          {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400" />}
          {toast.type === 'error' && <XCircle className="w-5 h-5 text-rose-400" />}
          {toast.type === 'info' && <AlertCircle className="w-5 h-5 text-cyan-400" />}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Forced Email Verification Alert Banner */}
      {!session.emailVerified && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-6 py-2.5 flex items-center justify-between gap-4 text-xs z-30">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
            <span>
              Your email (<strong className="font-semibold">{session.email}</strong>) is currently unverified.
              Verification is required before you can transfer, deposit, or withdraw funds.
            </span>
          </div>
          <button
            onClick={() => handleRequireEmailVerification('transfer')}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition-all cursor-pointer shrink-0 shadow-sm"
          >
            Verify Email Now
          </button>
        </div>
      )}

      {/* Top Navigation */}
      <Navbar
        session={session}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        onLogout={handleLogout}
        onOpenVerifyModal={() => handleRequireEmailVerification('transfer')}
        onOpenSettings={() => setShowSettingsModal(true)}
      />

      {/* Main Layout */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto p-4 md:p-6 gap-6">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 glass-panel p-4 rounded-3xl flex flex-col gap-1.5 shrink-0 h-fit border border-slate-200/40 dark:border-white/10 shadow-lg">
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 py-1">
            Navigation
          </div>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-white/5'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('transfer')}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'transfer'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-white/5'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Quick Transfer</span>
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'requests'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-white/5'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Deposit / Withdraw</span>
          </button>

          <button
            onClick={() => setActiveTab('savings')}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'savings'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-white/5'
            }`}
          >
            <PiggyBank className="w-4 h-4" />
            <span>Savings Vaults</span>
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'ai'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-4 h-4 text-cyan-500" />
            <span>Mikra AI Advisor</span>
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold transition-all cursor-pointer text-slate-700 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-white/5"
          >
            <Settings className="w-4 h-4 text-cyan-500" />
            <span>Account & Security Settings</span>
          </button>

          {session.role === 'admin' && (
            <>
              <div className="my-2 border-t border-slate-200/40 dark:border-white/10"></div>
              <div className="text-[10px] font-bold text-amber-500 uppercase tracking-wider px-3 py-1">
                Admin Zone
              </div>
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                    : 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Admin Liquidity Panel</span>
              </button>
            </>
          )}
        </aside>

        {/* Content Body */}
        <main className="flex-1 flex flex-col gap-6">
          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Balance Card (Funds Hidden by default) */}
              <BalanceCard
                session={session}
                onNavigateTab={tab => setActiveTab(tab)}
                onOpenQrModal={() => setShowQrModal(true)}
                onOpenQrScanner={() => setShowQrScanner(true)}
                onRefresh={() => triggerToast('Ledger balance synchronized.', 'success')}
              />

              {/* Recent Transfers Quick Send Widget */}
              <RecentTransferWidget
                session={session}
                transactions={transactions}
                onSelectRecipient={handleSelectRecentRecipient}
              />

              {/* Transactions List */}
              <div className="glass-panel p-6 rounded-3xl border border-slate-200/30 dark:border-white/10 shadow-xl">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-cyan-500" />
                    <span>Transaction History</span>
                  </h3>
                  <button
                    onClick={handleExportCsv}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 border border-slate-200/50 dark:border-white/10 transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download CSV</span>
                  </button>
                </div>

                {userTransactions.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    No transactions yet. Send your first transfer or submit a deposit!
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {userTransactions.slice(0, 6).map(tx => {
                      const isSender = tx.senderStk === session.stk;
                      return (
                        <div
                          key={tx.id}
                          className="glass-card p-4 rounded-2xl flex items-center justify-between gap-4 border border-slate-200/40 dark:border-white/5"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                isSender
                                  ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                                  : 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                              }`}
                            >
                              {isSender ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                {isSender
                                  ? `To: ${tx.receiverName} (${tx.receiverStk})`
                                  : `From: ${tx.senderName} (${tx.senderStk})`}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {tx.note}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                {new Date(tx.timestamp).toLocaleString()}
                              </div>
                            </div>
                          </div>

                          <div
                            className={`text-sm font-bold font-mono tabular-nums ${
                              isSender ? 'text-rose-500' : 'text-emerald-500'
                            }`}
                          >
                            {isSender ? '-' : '+'}{tx.amount.toLocaleString()} VND
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TRANSFER TAB */}
          {activeTab === 'transfer' && (
            <TransferForm
              session={session}
              allUsers={users}
              initialStk={prefilledTransferStk}
              onExecuteTransfer={handleExecuteTransfer}
              onOpenQrScanner={() => setShowQrScanner(true)}
              onRequireEmailVerification={handleRequireEmailVerification}
            />
          )}

          {/* REQUESTS TAB */}
          {activeTab === 'requests' && (
            <RequestsManager
              session={session}
              requests={requests}
              onCreateRequest={handleCreateRequest}
              onRequireEmailVerification={handleRequireEmailVerification}
            />
          )}

          {/* SAVINGS TAB */}
          {activeTab === 'savings' && (
            <SavingsVaults
              session={session}
              vaults={savings}
              onCreateVault={handleCreateVault}
              onDepositToVault={handleDepositToVault}
            />
          )}

          {/* AI ADVISOR TAB */}
          {activeTab === 'ai' && (
            <AiAdvisor
              session={session}
              transactions={transactions}
              savings={savings}
            />
          )}

          {/* ADMIN TAB */}
          {activeTab === 'admin' && session.role === 'admin' && (
            <AdminPanel
              users={users}
              requests={requests}
              onResolveRequest={handleResolveRequest}
              onAdjustUserBalance={handleAdjustUserBalance}
            />
          )}
        </main>
      </div>

      {/* MODALS */}
      {showQrModal && (
        <QrCodeModal session={session} onClose={() => setShowQrModal(false)} />
      )}

      {showQrScanner && (
        <QrScannerModal
          allUsers={users}
          currentStk={session.stk}
          onScanSuccess={handleQrScanSuccess}
          onClose={() => setShowQrScanner(false)}
        />
      )}

      {showVerifyModal && (
        <EmailVerificationModal
          session={session}
          actionType={pendingVerifyAction || 'transaction'}
          onVerifySuccess={handleEmailVerifySuccess}
          onClose={() => setShowVerifyModal(false)}
        />
      )}

      {showSettingsModal && (
        <SettingsModal
          session={session}
          allUsers={users}
          onUpdateUser={handleUpdateSessionUser}
          onClose={() => setShowSettingsModal(false)}
          triggerToast={triggerToast}
          onOpenVerifyModal={() => {
            setShowSettingsModal(false);
            handleRequireEmailVerification('transfer');
          }}
        />
      )}
    </div>
  );
}
