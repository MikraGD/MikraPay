/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X, Shield, Fingerprint, Mail, KeyRound, CheckCircle,
  AlertCircle, Smartphone, Check, RefreshCw, Trash2, ShieldCheck, Lock
} from 'lucide-react';
import { UserAccount } from '../types';
import { createPasskey, verifyPasskey, isWebAuthnSupported } from '../utils/webauthn';
import {
  validateEmailChange,
  validatePasswordChange,
  generateOtp,
  verifyOtpCode
} from '../utils/rules';

interface SettingsModalProps {
  session: UserAccount;
  allUsers: UserAccount[];
  onUpdateUser: (updatedUser: UserAccount) => void;
  onClose: () => void;
  triggerToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenVerifyModal?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  session,
  allUsers,
  onUpdateUser,
  onClose,
  triggerToast,
  onOpenVerifyModal,
}) => {
  const [activeTab, setActiveTab] = useState<'passkey' | '2fa' | 'email' | 'security'>('passkey');

  // Passkey State
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const webAuthnSupported = isWebAuthnSupported();

  // 2FA State
  const [twoFactorStep, setTwoFactorStep] = useState<'idle' | 'confirming'>('idle');
  const [twoFactorOtpCode, setTwoFactorOtpCode] = useState('');
  const [generated2FaOtp, setGenerated2FaOtp] = useState<{ code: string; expiresAt: number } | null>(null);

  // Email Change State
  const [newEmail, setNewEmail] = useState('');
  const [emailOtpInput, setEmailOtpInput] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState<{ code: string; expiresAt: number; targetEmail: string } | null>(null);
  const [emailChangeLoading, setEmailChangeLoading] = useState(false);

  // Password Change State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Profile Edit State
  const [editFullName, setEditFullName] = useState(session.fullName);
  const [editBirthday, setEditBirthday] = useState(session.birthday || '');

  // ================= PASSKEY HANDLERS =================
  const handleRegisterPasskey = async () => {
    if (!webAuthnSupported) {
      triggerToast('WebAuthn / Passkeys are not supported on this browser or platform.', 'error');
      return;
    }

    setPasskeyLoading(true);
    triggerToast('Prompting device authenticator (Face ID / Touch ID / Windows Hello)...', 'info');

    try {
      const res = await createPasskey(session.username, session.fullName);
      setPasskeyLoading(false);

      if (res.success && res.credentialId) {
        const updated: UserAccount = {
          ...session,
          passkeyRegistered: true,
          passkeyCredentialId: res.credentialId,
          passkeyDeviceName: navigator.userAgent.includes('Mac')
            ? 'Apple Touch ID / Face ID'
            : navigator.userAgent.includes('Windows')
            ? 'Windows Hello'
            : navigator.userAgent.includes('Android')
            ? 'Android Biometrics'
            : 'FIDO2 Security Key',
          passkeyRegisteredAt: new Date().toISOString(),
        };

        onUpdateUser(updated);
        triggerToast('Passkey registered successfully! You can now sign in without passwords.', 'success');
      } else {
        // Strictly no fallback
        triggerToast(res.error || 'Failed to register passkey. Prompt was cancelled.', 'error');
      }
    } catch (err: unknown) {
      setPasskeyLoading(false);
      const msg = err instanceof Error ? err.message : String(err);
      triggerToast(msg || 'Passkey creation failed.', 'error');
    }
  };

  const handleTestPasskey = async () => {
    if (!session.passkeyRegistered) return;
    setPasskeyLoading(true);
    triggerToast('Verifying passkey on this device...', 'info');

    try {
      const res = await verifyPasskey(session.passkeyCredentialId);
      setPasskeyLoading(false);
      if (res.success) {
        triggerToast('Passkey verified! Hardware authentication successful.', 'success');
      } else {
        triggerToast(res.error || 'Passkey test failed or was cancelled.', 'error');
      }
    } catch (err: unknown) {
      setPasskeyLoading(false);
      const msg = err instanceof Error ? err.message : String(err);
      triggerToast(msg || 'Passkey test error.', 'error');
    }
  };

  const handleRemovePasskey = () => {
    const updated: UserAccount = {
      ...session,
      passkeyRegistered: false,
      passkeyCredentialId: undefined,
      passkeyDeviceName: undefined,
      passkeyRegisteredAt: undefined,
    };
    onUpdateUser(updated);
    triggerToast('Passkey removed from your account.', 'info');
  };

  // ================= 2FA HANDLERS =================
  const handleStartEnable2Fa = () => {
    const code = generateOtp();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    setGenerated2FaOtp({ code, expiresAt });
    setTwoFactorStep('confirming');
    setTwoFactorOtpCode('');
    triggerToast(`2FA Setup Code dispatched to ${session.email}: [${code}]`, 'info');
  };

  const handleConfirmEnable2Fa = () => {
    if (!generated2FaOtp) return;
    const verification = verifyOtpCode(twoFactorOtpCode, generated2FaOtp.code, generated2FaOtp.expiresAt);
    if (!verification.valid) {
      triggerToast(verification.error || 'Invalid 2FA verification code.', 'error');
      return;
    }

    const updated: UserAccount = {
      ...session,
      twoFactorEnabled: true,
      twoFactorType: 'email',
    };
    onUpdateUser(updated);
    setTwoFactorStep('idle');
    setGenerated2FaOtp(null);
    triggerToast('Two-Factor Authentication (2FA) is now active for your account!', 'success');
  };

  const handleDisable2Fa = () => {
    const updated: UserAccount = {
      ...session,
      twoFactorEnabled: false,
      twoFactorType: undefined,
    };
    onUpdateUser(updated);
    setTwoFactorStep('idle');
    setGenerated2FaOtp(null);
    triggerToast('Two-Factor Authentication (2FA) has been disabled.', 'info');
  };

  // ================= CHANGE EMAIL HANDLERS =================
  const handleSendEmailOtp = () => {
    const validation = validateEmailChange(session.email, newEmail, allUsers);
    if (!validation.valid) {
      triggerToast(validation.error || 'Invalid email address.', 'error');
      return;
    }

    setEmailChangeLoading(true);
    const code = generateOtp();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    setEmailOtpSent({
      code,
      expiresAt,
      targetEmail: newEmail.trim().toLowerCase(),
    });
    setEmailChangeLoading(false);
    triggerToast(`Verification OTP dispatched to ${newEmail}: [${code}]`, 'info');
  };

  const handleConfirmEmailChange = () => {
    if (!emailOtpSent) {
      triggerToast('Please request a verification code first.', 'error');
      return;
    }

    const verification = verifyOtpCode(emailOtpInput, emailOtpSent.code, emailOtpSent.expiresAt);
    if (!verification.valid) {
      triggerToast(verification.error || 'Invalid verification code.', 'error');
      return;
    }

    const updated: UserAccount = {
      ...session,
      email: emailOtpSent.targetEmail,
      emailVerified: true, // Successfully verified through OTP
    };

    onUpdateUser(updated);
    setEmailOtpSent(null);
    setNewEmail('');
    setEmailOtpInput('');
    triggerToast(`Email successfully updated to ${updated.email} and verified!`, 'success');
  };

  // ================= PASSWORD & PROFILE HANDLERS =================
  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validatePasswordChange(session.password, oldPassword, newPassword, confirmPassword);
    if (!validation.valid) {
      triggerToast(validation.error || 'Password update failed.', 'error');
      return;
    }

    const updated: UserAccount = {
      ...session,
      password: newPassword,
    };
    onUpdateUser(updated);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    triggerToast('Password changed successfully.', 'success');
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFullName.trim()) {
      triggerToast('Full Name cannot be empty.', 'error');
      return;
    }

    const updated: UserAccount = {
      ...session,
      fullName: editFullName.trim(),
      birthday: editBirthday,
    };
    onUpdateUser(updated);
    triggerToast('Profile details updated.', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-2xl rounded-3xl border border-slate-200/40 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/40 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Account Settings & Security</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Manage Passkey, 2FA, Email, and Credentials</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close Settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex px-6 pt-3 border-b border-slate-200/30 dark:border-white/5 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('passkey')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'passkey'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Fingerprint className="w-4 h-4" />
            <span>Passkey & Biometrics</span>
          </button>

          <button
            onClick={() => setActiveTab('2fa')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === '2fa'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>2FA Protection</span>
          </button>

          <button
            onClick={() => setActiveTab('email')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'email'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Email Management</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'security'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Password & Profile</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* ================= TAB: PASSKEY ================= */}
          {activeTab === 'passkey' && (
            <div className="space-y-4">
              <div className="flex items-start justify-between p-4 rounded-2xl glass-card border border-slate-200/50 dark:border-white/10 gap-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    session.passkeyRegistered
                      ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                      : 'bg-slate-200/50 dark:bg-white/10 text-slate-400'
                  }`}>
                    <Fingerprint className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Device Passkey</h4>
                      {session.passkeyRegistered ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/50 dark:bg-white/10 text-slate-500 font-semibold">
                          Not Configured
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Sign in instantly with Touch ID, Face ID, Windows Hello, or physical security keys. No passwords needed.
                    </p>
                    {session.passkeyRegistered && (
                      <div className="mt-2 text-[11px] font-mono text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2.5 py-1.5 rounded-lg border border-cyan-500/20">
                        Device: {session.passkeyDeviceName || 'Platform Authenticator'} • Credential ID: {session.passkeyCredentialId?.substring(0, 16)}...
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {!session.passkeyRegistered ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-700 dark:text-cyan-300">
                    <p className="font-semibold mb-1">Strict Passkey Security</p>
                    <p>
                      MikraPay uses the official FIDO2/WebAuthn standard directly in your browser.
                      No fake fallbacks are used. Registering a passkey links your physical biometric key to your account.
                    </p>
                  </div>

                  <button
                    onClick={handleRegisterPasskey}
                    disabled={passkeyLoading || !webAuthnSupported}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Fingerprint className="w-4 h-4" />
                    <span>{passkeyLoading ? 'Prompting Device Authenticator...' : 'Add Passkey on this Device'}</span>
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleTestPasskey}
                    disabled={passkeyLoading}
                    className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-xl border border-slate-300/40 dark:border-white/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${passkeyLoading ? 'animate-spin' : ''}`} />
                    <span>Test Passkey Sensor</span>
                  </button>

                  <button
                    onClick={handleRemovePasskey}
                    className="py-2.5 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-semibold text-xs rounded-xl border border-rose-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Passkey</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================= TAB: 2FA ================= */}
          {activeTab === '2fa' && (
            <div className="space-y-4">
              <div className="flex items-start justify-between p-4 rounded-2xl glass-card border border-slate-200/50 dark:border-white/10 gap-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    session.twoFactorEnabled
                      ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                      : 'bg-slate-200/50 dark:bg-white/10 text-slate-400'
                  }`}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Two-Factor Authentication (2FA)</h4>
                      {session.twoFactorEnabled ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Enabled
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/50 dark:bg-white/10 text-slate-500 font-semibold">
                          Disabled
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Protect account logins by requiring a 6-digit one-time security code sent to your verified email ({session.email}).
                    </p>
                  </div>
                </div>
              </div>

              {!session.twoFactorEnabled ? (
                twoFactorStep === 'idle' ? (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      When enabled, whenever you or anyone signs into your MikraPay account using your password, a one-time 6-digit code will be sent to your email to prevent unauthorized access.
                    </p>
                    <button
                      onClick={handleStartEnable2Fa}
                      className="w-full py-3 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-cyan-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Enable 2FA Protection</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 p-4 rounded-2xl glass-card border border-cyan-500/30">
                    <div className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">
                      Enter the 6-digit confirmation code sent to <strong>{session.email}</strong> to activate 2FA:
                    </div>

                    {generated2FaOtp && (
                      <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-xs flex items-center justify-between">
                        <span>Simulated OTP Inbox:</span>
                        <span className="font-mono font-bold text-base tracking-widest text-cyan-500">{generated2FaOtp.code}</span>
                      </div>
                    )}

                    <input
                      type="text"
                      maxLength={6}
                      value={twoFactorOtpCode}
                      onChange={e => setTwoFactorOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 6-digit code"
                      className="w-full px-4 py-2.5 rounded-xl glass-input text-center text-lg font-mono font-bold tracking-widest text-slate-900 dark:text-white"
                    />

                    <div className="flex gap-2">
                      <button
                        onClick={handleConfirmEnable2Fa}
                        disabled={twoFactorOtpCode.length !== 6}
                        className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow transition-all cursor-pointer"
                      >
                        Confirm & Activate 2FA
                      </button>
                      <button
                        onClick={() => setTwoFactorStep('idle')}
                        className="px-4 py-2.5 bg-slate-200/60 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-xs font-semibold rounded-xl"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div className="space-y-3">
                  <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-600 dark:text-emerald-400">
                    Your account is protected by Two-Factor Authentication. Sign-ins require both your password and an email OTP verification code.
                  </div>
                  <button
                    onClick={handleDisable2Fa}
                    className="py-2.5 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-semibold text-xs rounded-xl border border-rose-500/30 transition-all cursor-pointer"
                  >
                    Disable 2FA Protection
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================= TAB: EMAIL ================= */}
          {activeTab === 'email' && (
            <div className="space-y-5">
              {/* Current Email Status */}
              <div className="p-4 rounded-2xl glass-card border border-slate-200/50 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Current Registered Email</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5">{session.email}</div>
                  </div>
                  {session.emailVerified ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" /> Verified
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/30 text-xs font-semibold">
                        Unverified
                      </span>
                      {onOpenVerifyModal && (
                        <button
                          onClick={onOpenVerifyModal}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-all cursor-pointer"
                        >
                          Verify Now
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Change Email Section */}
              <div className="space-y-3.5">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Change Email Address
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enter your new email address. A 6-digit OTP confirmation code will be dispatched to verify your ownership before updating your account.
                </p>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    New Email Address
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      placeholder="e.g. newaddress@example.com"
                      className="flex-1 px-4 py-2.5 rounded-xl glass-input text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleSendEmailOtp}
                      disabled={emailChangeLoading || !newEmail.trim()}
                      className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-cyan-500/20 transition-all cursor-pointer shrink-0"
                    >
                      Send OTP Code
                    </button>
                  </div>
                </div>

                {emailOtpSent && (
                  <div className="p-4 rounded-2xl glass-card border border-cyan-500/30 space-y-3 animate-fadeIn">
                    <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-xs flex items-center justify-between">
                      <span className="text-cyan-700 dark:text-cyan-300">
                        OTP Sent to <strong>{emailOtpSent.targetEmail}</strong>:
                      </span>
                      <span className="font-mono font-bold text-base tracking-widest text-cyan-500">{emailOtpSent.code}</span>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Enter 6-Digit OTP Code
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={emailOtpInput}
                        onChange={e => setEmailOtpInput(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••"
                        className="w-full px-4 py-2.5 rounded-xl glass-input text-center text-lg font-mono font-bold tracking-widest text-slate-900 dark:text-white"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleConfirmEmailChange}
                      disabled={emailOtpInput.length !== 6}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow transition-all cursor-pointer"
                    >
                      Confirm Email Change & Verify
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= TAB: SECURITY & PROFILE ================= */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Profile Information */}
              <form onSubmit={handleUpdateProfile} className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Personal Details
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editFullName}
                      onChange={e => setEditFullName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Birthday
                    </label>
                    <input
                      type="date"
                      value={editBirthday}
                      onChange={e => setEditBirthday(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="py-2.5 px-4 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-300/40 dark:border-white/10 cursor-pointer"
                >
                  Save Profile Details
                </button>
              </form>

              <div className="border-t border-slate-200/40 dark:border-white/10"></div>

              {/* Password Change */}
              <form onSubmit={handleUpdatePassword} className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Change Password
                </h4>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    value={oldPassword}
                    onChange={e => setOldPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      New Password (min 6 chars)
                    </label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-cyan-500/20 cursor-pointer"
                >
                  Update Password
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
