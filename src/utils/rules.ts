/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserAccount, Transaction, WalletRequest } from '../types';

export function generateStk(): string {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function validateTransfer(
  sender: UserAccount,
  receiverStk: string,
  amount: number,
  allUsers: UserAccount[]
): { valid: boolean; error?: string; receiver?: UserAccount } {
  if (!sender.emailVerified) {
    return { valid: false, error: 'Email verification required before transferring funds.' };
  }

  if (isNaN(amount) || amount <= 0) {
    return { valid: false, error: 'Please enter a positive transfer amount.' };
  }

  if (sender.balance < amount) {
    return { valid: false, error: 'Insufficient account balance.' };
  }

  const cleanStk = receiverStk.trim();
  if (cleanStk === sender.stk) {
    return { valid: false, error: 'You cannot transfer funds to your own account.' };
  }

  const receiver = allUsers.find(u => u.stk === cleanStk);
  if (!receiver) {
    return { valid: false, error: `Recipient STK ${cleanStk} not found in MikraPay network.` };
  }

  return { valid: true, receiver };
}

export function executeTransfer(
  sender: UserAccount,
  receiver: UserAccount,
  amount: number,
  note: string
): { updatedSender: UserAccount; updatedReceiver: UserAccount; transaction: Transaction } {
  const updatedSender: UserAccount = {
    ...sender,
    balance: sender.balance - amount,
  };

  const updatedReceiver: UserAccount = {
    ...receiver,
    balance: receiver.balance + amount,
  };

  const transaction: Transaction = {
    id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    senderStk: sender.stk,
    senderName: sender.fullName,
    receiverStk: receiver.stk,
    receiverName: receiver.fullName,
    amount,
    type: 'transfer',
    note: note.trim() || 'Peer-to-peer transfer via MikraPay',
    timestamp: new Date().toISOString(),
  };

  return { updatedSender, updatedReceiver, transaction };
}

export function validateRequestSubmission(
  user: UserAccount,
  type: 'deposit' | 'withdraw',
  amount: number
): { valid: boolean; error?: string } {
  if (!user.emailVerified) {
    return { valid: false, error: `Email verification required before submitting a ${type} request.` };
  }

  if (isNaN(amount) || amount <= 0) {
    return { valid: false, error: 'Please specify a valid amount.' };
  }

  if (type === 'withdraw' && user.balance < amount) {
    return { valid: false, error: 'Insufficient balance to withdraw this amount.' };
  }

  return { valid: true };
}

export function executeRequestApproval(
  request: WalletRequest,
  user: UserAccount
): { success: boolean; error?: string; updatedUser?: UserAccount; transaction?: Transaction } {
  if (request.type === 'deposit') {
    const updatedUser: UserAccount = {
      ...user,
      balance: user.balance + request.amount,
    };
    const transaction: Transaction = {
      id: 'tx-' + Date.now(),
      senderStk: '9999999999',
      senderName: 'System Liquidity Vault (Admin Approved)',
      receiverStk: user.stk,
      receiverName: user.fullName,
      amount: request.amount,
      type: 'deposit',
      note: 'Admin approved wallet deposit',
      timestamp: new Date().toISOString(),
    };
    return { success: true, updatedUser, transaction };
  }

  if (request.type === 'withdraw') {
    if (user.balance < request.amount) {
      return { success: false, error: 'User has insufficient balance for withdrawal approval.' };
    }
    const updatedUser: UserAccount = {
      ...user,
      balance: user.balance - request.amount,
    };
    const transaction: Transaction = {
      id: 'tx-' + Date.now(),
      senderStk: user.stk,
      senderName: user.fullName,
      receiverStk: '9999999999',
      receiverName: 'System Liquidity Vault (Admin Withdrawal)',
      amount: request.amount,
      type: 'withdraw',
      note: 'Admin approved wallet withdrawal',
      timestamp: new Date().toISOString(),
    };
    return { success: true, updatedUser, transaction };
  }

  return { success: false, error: 'Unknown request type.' };
}

export function calculateSavingsProgress(current: number, target: number): number {
  if (target <= 0) return 0;
  const ratio = (current / target) * 100;
  return Math.min(100, Math.max(0, Math.round(ratio)));
}

export function verifyOtpCode(
  inputCode: string,
  actualCode: string,
  expiresAt: number,
  now: number = Date.now()
): { valid: boolean; error?: string } {
  if (now > expiresAt) {
    return { valid: false, error: 'Verification code has expired. Please request a new code.' };
  }
  if (inputCode.trim() !== actualCode.trim()) {
    return { valid: false, error: 'Invalid verification code.' };
  }
  return { valid: true };
}

export function validateEmailChange(
  currentEmail: string,
  newEmail: string,
  allUsers: UserAccount[]
): { valid: boolean; error?: string } {
  const clean = newEmail.trim().toLowerCase();
  if (!clean) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(clean)) {
    return { valid: false, error: 'Invalid email format. E.g. name@domain.com' };
  }
  if (clean === currentEmail.trim().toLowerCase()) {
    return { valid: false, error: 'The new email must be different from your current email.' };
  }
  const exists = allUsers.some(u => u.email.toLowerCase() === clean);
  if (exists) {
    return { valid: false, error: 'This email is already registered to another account.' };
  }
  return { valid: true };
}

export function validatePasswordChange(
  currentPassword?: string,
  inputOldPassword?: string,
  newPassword?: string,
  confirmPassword?: string,
  requireOldPassword: boolean = true
): { valid: boolean; error?: string } {
  if (requireOldPassword && currentPassword && inputOldPassword !== currentPassword) {
    return { valid: false, error: 'Current password does not match.' };
  }
  if (!newPassword || newPassword.length < 6) {
    return { valid: false, error: 'New password must be at least 6 characters long.' };
  }
  if (newPassword !== confirmPassword) {
    return { valid: false, error: 'New password and confirmation do not match.' };
  }
  return { valid: true };
}

export function validateTwoFactorCode(
  inputCode: string,
  expectedCode: string,
  expiresAt: number,
  now: number = Date.now()
): { valid: boolean; error?: string } {
  return verifyOtpCode(inputCode, expectedCode, expiresAt, now);
}

