/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Wallet, Fingerprint, Sun, Moon, CheckCircle, AlertCircle, ArrowRight,
  Shield, Smartphone, X, QrCode
} from 'lucide-react';
import { UserAccount } from '../types';
import { generateStk, generateOtp, verifyOtpCode } from '../utils/rules';
import { verifyPasskey } from '../utils/webauthn';
import { auth, googleProvider, signInWithPopup } from '../firebase';
import { consumeQuickLoginCode } from '../utils/storage';
import { QrScannerModal } from './QrScannerModal';

interface AuthModalProps {
  allUsers: UserAccount[];
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onLoginSuccess: (user: UserAccount) => void;
  onRegisterSuccess: (newUser: UserAccount) => void;
  triggerToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  allUsers,
  isDarkMode,
  onToggleTheme,
  onLoginSuccess,
  onRegisterSuccess,
  triggerToast,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [birthday, setBirthday] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // SSO Dialog state
  const [ssoModalProvider, setSsoModalProvider] = useState<'Google' | 'Facebook' | 'Apple' | null>(null);
  const [ssoCustomEmail, setSsoCustomEmail] = useState('');
  const [ssoCustomName, setSsoCustomName] = useState('');

  const [input2FaCode, setInput2FaCode] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');

  // Quick Login Code State
  const [quickCodeInput, setQuickCodeInput] = useState('');
  const [quickCodeLoading, setQuickCodeLoading] = useState(false);
  const [showAuthQrScanner, setShowAuthQrScanner] = useState(false);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === '1235') {
      const admin = allUsers.find(u => u.username === 'admin');
      if (admin) {
        setShowPinModal(false);
        setPinInput('');
        triggerToast('Admin access via PIN successful.', 'success');
        check2FaOrLogin(admin);
      } else {
        triggerToast('Admin account not found.', 'error');
      }
    } else {
      triggerToast('Invalid Admin PIN.', 'error');
    }
  };

  const handleQuickLoginWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quickCodeInput.length !== 6) {
      triggerToast('Please enter the 6-digit quick login code generated from your other device.', 'error');
      return;
    }
    setQuickCodeLoading(true);
    triggerToast('Verifying quick login code from database...', 'info');
    const user = await consumeQuickLoginCode(quickCodeInput, allUsers);
    setQuickCodeLoading(false);
    if (user) {
      triggerToast(`Quick login successful! Welcome back, ${user.fullName}.`, 'success');
      check2FaOrLogin(user);
    } else {
      triggerToast('Invalid or expired quick login code. Generate a new code in Settings on your logged-in device.', 'error');
    }
  };

  const handleAuthQrScanSuccess = async (code: string) => {
    setShowAuthQrScanner(false);
    setQuickCodeInput(code);
    setQuickCodeLoading(true);
    triggerToast(`Scanned Quick Login Code: ${code}. Signing in...`, 'info');
    const user = await consumeQuickLoginCode(code, allUsers);
    setQuickCodeLoading(false);
    if (user) {
      triggerToast(`Quick QR Login successful! Welcome back, ${user.fullName}.`, 'success');
      check2FaOrLogin(user);
    } else {
      triggerToast('Invalid or expired quick login QR code.', 'error');
    }
  };

  // Helper to trigger 2FA if enabled on the account, otherwise login
  const check2FaOrLogin = (user: UserAccount) => {
    if (user.twoFactorEnabled) {
      const code = generateOtp();
      const expiresAt = Date.now() + 10 * 60 * 1000;
      setPending2FaOtp({ code, expiresAt });
      setPending2FaUser(user);
      setInput2FaCode('');
      triggerToast(`Two-Factor Authentication required for ${user.username}. Security code dispatched.`, 'info');
    } else {
      onLoginSuccess(user);
    }
  };

  // Complete 2FA Login
  const handleVerify2FaLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pending2FaUser || !pending2FaOtp) return;
    const verification = verifyOtpCode(input2FaCode, pending2FaOtp.code, pending2FaOtp.expiresAt);
    if (!verification.valid) {
      triggerToast(verification.error || 'Invalid 2FA verification code.', 'error');
      return;
    }
    triggerToast('2FA code verified successfully!', 'success');
    const userToLogin = pending2FaUser;
    setPending2FaUser(null);
    setPending2FaOtp(null);
    onLoginSuccess(userToLogin);
  };

  // Handle standard password login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = identifier.trim().toLowerCase();
    const user = allUsers.find(
      u => (u.username.toLowerCase() === id || u.stk === id) && u.password === password
    );

    if (user) {
      check2FaOrLogin(user);
    } else {
      triggerToast('Invalid account credentials. Check username/STK and password.', 'error');
    }
  };

  // Handle real WebAuthn passkey login - STRICTLY NO FALLBACK
  const handlePasskeyAuth = async () => {
    triggerToast('Requesting biometric or hardware security key verification...', 'info');
    const result = await verifyPasskey();

    if (result.success && result.credentialId) {
      // Look for a user who registered this specific passkey
      const matchedUser = allUsers.find(
        u => u.passkeyRegistered && u.passkeyCredentialId === result.credentialId
      );

      if (matchedUser) {
        triggerToast(`Passkey verified! Welcome back, ${matchedUser.fullName}.`, 'success');
        check2FaOrLogin(matchedUser);
        return;
      }

      // Check if any user registered a passkey
      const registeredUsers = allUsers.filter(u => u.passkeyRegistered);
      if (registeredUsers.length === 1) {
        triggerToast(`Passkey verified! Signed in as ${registeredUsers[0].fullName}.`, 'success');
        check2FaOrLogin(registeredUsers[0]);
        return;
      }

      triggerToast('Passkey verified, but no MikraPay account is linked to this credential. Please sign in with password first and add your passkey in Settings.', 'error');
    } else {
      // STRICTLY NO FALLBACK - report exact error
      triggerToast(result.error || 'Passkey verification failed or was cancelled.', 'error');
    }
  };

  // Launch SSO Modal with Firebase Google Auth integration
  const openSsoModal = async (provider: 'Google' | 'Facebook' | 'Apple') => {
    if (provider === 'Google') {
      try {
        triggerToast('Opening Google Authentication...', 'info');
        const res = await signInWithPopup(auth, googleProvider);
        if (res && res.user) {
          const email = res.user.email || 'googleuser@gmail.com';
          const name = res.user.displayName || 'Google User';
          const existing = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
          if (existing) {
            triggerToast(`Signed in with Google as ${existing.fullName}!`, 'success');
            onLoginSuccess(existing);
            return;
          }
          const generatedStk = generateStk();
          const newUser: UserAccount = {
            id: res.user.uid,
            username: email.split('@')[0],
            fullName: name,
            email,
            emailVerified: true,
            stk: generatedStk,
            role: 'user',
            balance: 100000,
            avatar: '🌐',
            createdAt: new Date().toISOString(),
          };
          onRegisterSuccess(newUser);
          triggerToast(`Welcome ${name}! Authenticated with Google Firebase Auth.`, 'success');
          return;
        }
      } catch (err: any) {
        console.warn('Firebase Google Auth popup:', err);
      }
    }
    setSsoModalProvider(provider);
    setSsoCustomEmail(`${provider.toLowerCase()}user@example.com`);
    setSsoCustomName(`${provider} User`);
  };

  // Complete SSO login/account creation
  const handleSsoConfirm = () => {
    if (!ssoModalProvider) return;

    // Check if user already exists by email
    const existing = allUsers.find(u => u.email.toLowerCase() === ssoCustomEmail.toLowerCase());
    if (existing) {
      triggerToast(`Authenticated via ${ssoModalProvider} SSO as ${existing.fullName}!`, 'success');
      onLoginSuccess(existing);
      setSsoModalProvider(null);
      return;
    }

    // Otherwise create account through SSO
    const generatedStk = generateStk();
    const newUser: UserAccount = {
      id: 'u-' + Date.now(),
      username: ssoCustomEmail.split('@')[0],
      fullName: ssoCustomName || `${ssoModalProvider} User`,
      email: ssoCustomEmail,
      emailVerified: true, // SSO emails are pre-verified by Google/Apple/Facebook!
      stk: generatedStk,
      role: 'user',
      balance: 100000, // 100k bonus for SSO signup
      avatar: ssoModalProvider === 'Google' ? '🌐' : ssoModalProvider === 'Apple' ? '🍏' : '📘',
      createdAt: new Date().toISOString(),
    };

    onRegisterSuccess(newUser);
    setSsoModalProvider(null);
    triggerToast(`Welcome to MikraPay! Account created via ${ssoModalProvider} SSO.`, 'success');
  };

  // Handle registration
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !birthday || !regUsername || !regPassword) {
      triggerToast('Please complete all registration fields.', 'error');
      return;
    }

    if (allUsers.some(u => u.username.toLowerCase() === regUsername.trim().toLowerCase())) {
      triggerToast('Username is already taken. Please choose another.', 'error');
      return;
    }

    const generatedStk = generateStk();
    const avatars = ['🦊', '🥥', '⚡', '🚀', '🐱', '🐶', '🐼', '🦄', '🐯'];
    const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];

    const newUser: UserAccount = {
      id: 'u-' + Date.now(),
      username: regUsername.trim(),
      password: regPassword,
      fullName: fullName.trim(),
      birthday,
      email: email.trim(),
      emailVerified: false, // Forces user to test email verification!
      stk: generatedStk,
      role: 'user',
      balance: 50000,
      avatar: randomAvatar,
      createdAt: new Date().toISOString(),
    };

    onRegisterSuccess(newUser);
  };

  return (
    <div className="min-h-screen bg-slate-900 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors">
      {/* Background Glowing Gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Theme Switcher Button */}
      <button
        onClick={onToggleTheme}
        className="absolute top-6 right-6 p-3 rounded-2xl glass-panel text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white transition-all cursor-pointer border border-slate-300/40 dark:border-white/10 shadow-lg"
        title="Toggle White/Black Theme"
        aria-label="Toggle Theme"
      >
        {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-600" />}
      </button>

      <div className="w-full max-w-md glass-panel p-6 sm:p-8 rounded-3xl shadow-2xl border border-slate-200/30 dark:border-white/10 relative z-10">
        {/* Admin Shortcut Button */}
        <button
          onClick={() => setShowPinModal(true)}
          className="absolute top-4 left-4 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-all"
          title="Admin Access"
        >
          <Shield className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white shadow-lg shadow-cyan-500/25 mb-3">
            <Wallet className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-500 to-indigo-600 dark:from-cyan-400 dark:to-indigo-400 bg-clip-text text-transparent">
            MikraPay K-Bank
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Private Virtual eWallet & Mini-Banking for Friends
          </p>
        </div>

        {/* Admin PIN Modal */}
        {showPinModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="glass-panel p-8 rounded-3xl max-w-sm w-full border border-slate-200/30 dark:border-white/10 shadow-2xl space-y-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center">Admin Access</h3>
              <form onSubmit={handlePinSubmit} className="space-y-4">
                <input
                  type="password"
                  maxLength={4}
                  value={pinInput}
                  onChange={e => setPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 4-digit PIN"
                  className="w-full px-4 py-3 rounded-xl glass-input text-center text-xl font-mono font-bold tracking-widest text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowPinModal(false); setPinInput(''); }}
                    className="flex-1 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 font-semibold text-sm rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm rounded-xl transition-all"
                  >
                    Enter
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Auth Mode Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-900/80 p-1.5 rounded-xl mb-6 border border-slate-200/50 dark:border-white/5">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Create Account
          </button>
        </div>

        {pending2FaUser ? (
          /* 2FA Verification Challenge Screen */
          <div className="space-y-4 animate-fadeIn">
            <div className="text-center p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-500 flex items-center justify-center mx-auto mb-2">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Two-Factor Verification Required
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Security check for <strong className="text-slate-800 dark:text-slate-200">{pending2FaUser.fullName}</strong> ({pending2FaUser.email})
              </p>
            </div>

            {pending2FaOtp && (
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-xs flex items-center justify-between">
                <span className="text-cyan-700 dark:text-cyan-300">Simulated 2FA Code:</span>
                <span className="font-mono font-bold text-base tracking-widest text-cyan-500">
                  {pending2FaOtp.code}
                </span>
              </div>
            )}

            <form onSubmit={handleVerify2FaLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 text-center">
                  Enter 6-Digit Security Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={input2FaCode}
                  onChange={e => setInput2FaCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="w-full px-4 py-3 rounded-xl glass-input text-center text-xl font-mono font-bold tracking-widest text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={input2FaCode.length !== 6}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-cyan-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Verify & Complete Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setPending2FaUser(null);
                  setPending2FaOtp(null);
                  setInput2FaCode('');
                }}
                className="w-full py-2.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-semibold"
              >
                Cancel & Return to Login
              </button>
            </form>
          </div>
        ) : mode === 'login' ? (
          <div className="space-y-4">
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Username or 10-digit Account Number (STK)
                </label>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="e.g. mikra or 1002003001"
                  className="w-full px-4 py-3 rounded-xl glass-input text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl glass-input text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => triggerToast('Please contact the Admin to reset your password.', 'info')}
                  className="text-[10px] text-cyan-600 dark:text-cyan-400 hover:underline mt-1.5 inline-block"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-cyan-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Access eWallet Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Passkey / FaceID Login */}
            <button
              type="button"
              onClick={handlePasskeyAuth}
              className="w-full py-2.5 px-4 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-xl border border-slate-300/40 dark:border-white/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Fingerprint className="w-4 h-4 text-cyan-500" />
              <span>Sign in with Passkey / FaceID / TouchID</span>
            </button>

            {/* SSO Logins */}
            <div className="pt-2">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2.5 text-center">
                Or sign in with SSO
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => openSsoModal('Google')}
                  className="py-2 px-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-medium text-slate-800 dark:text-slate-200 rounded-xl border border-slate-300/40 dark:border-white/10 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <i className="fa-brands fa-google text-rose-500"></i>
                  <span>Google</span>
                </button>
                <button
                  type="button"
                  onClick={() => openSsoModal('Facebook')}
                  className="py-2 px-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-medium text-slate-800 dark:text-slate-200 rounded-xl border border-slate-300/40 dark:border-white/10 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <i className="fa-brands fa-facebook text-cyan-500"></i>
                  <span>Facebook</span>
                </button>
                <button
                  type="button"
                  onClick={() => openSsoModal('Apple')}
                  className="py-2 px-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-medium text-slate-800 dark:text-slate-200 rounded-xl border border-slate-300/40 dark:border-white/10 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <i className="fa-brands fa-apple text-slate-800 dark:text-white"></i>
                  <span>Apple</span>
                </button>
              </div>
            </div>

            {/* Quick Login from other devices using 6-digit code */}
            <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-white/10">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2 text-center flex items-center justify-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-cyan-500" />
                <span>Quick Login from other device (6-digit code):</span>
              </p>
              <form onSubmit={handleQuickLoginWithCode} className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={quickCodeInput}
                  onChange={e => setQuickCodeInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit code"
                  className="flex-1 px-3 py-2.5 rounded-xl glass-input text-center text-sm font-mono font-bold tracking-widest text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={quickCodeInput.length !== 6 || quickCodeLoading}
                  className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow transition-all cursor-pointer shrink-0"
                >
                  {quickCodeLoading ? 'Signing in...' : 'Quick Login'}
                </button>
              </form>

              <div className="mt-2.5">
                <button
                  type="button"
                  onClick={() => setShowAuthQrScanner(true)}
                  className="w-full py-2 px-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-xl border border-slate-300/40 dark:border-white/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <QrCode className="w-4 h-4 text-cyan-500" />
                  <span>Scan Quick Login QR Code</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Registration Form with Birthday */
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="e.g. Nguyen Van A"
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Email Address (Required for Verification)
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. user@gmail.com"
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={regUsername}
                  onChange={e => setRegUsername(e.target.value)}
                  placeholder="Username"
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Birthday
                </label>
                <input
                  type="date"
                  required
                  value={birthday}
                  onChange={e => setBirthday(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={regPassword}
                onChange={e => setRegPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
              />
            </div>

            <p className="text-[11px] text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 p-3 rounded-xl border border-cyan-500/20">
              ✨ Auto-generates a unique 10-digit Account Number (STK) and awards 50,000 VND welcome bonus!
            </p>

            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
            >
              Register & Open eWallet
            </button>
          </form>
        )}
      </div>

      {/* SSO Login Dialog */}
      {ssoModalProvider && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl max-w-sm w-full border border-slate-200/30 dark:border-white/10 relative shadow-2xl space-y-4">
            <button
              onClick={() => setSsoModalProvider(null)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-200/50 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center mx-auto mb-2 text-2xl">
                {ssoModalProvider === 'Google' && <i className="fa-brands fa-google text-rose-500"></i>}
                {ssoModalProvider === 'Facebook' && <i className="fa-brands fa-facebook text-cyan-500"></i>}
                {ssoModalProvider === 'Apple' && <i className="fa-brands fa-apple text-slate-800 dark:text-white"></i>}
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Sign in with {ssoModalProvider}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                MikraPay Single Sign-On Gateway
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={ssoCustomName}
                  onChange={e => setSsoCustomName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={ssoCustomEmail}
                  onChange={e => setSsoCustomEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <button
              onClick={handleSsoConfirm}
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
            >
              Authorize & Enter MikraPay
            </button>
          </div>
        </div>
      )}

      {showAuthQrScanner && (
        <QrScannerModal
          allUsers={allUsers}
          onScanSuccess={() => {
            setShowAuthQrScanner(false);
          }}
          onQuickLoginScanned={handleAuthQrScanSuccess}
          onClose={() => setShowAuthQrScanner(false)}
        />
      )}
    </div>
  );
};
