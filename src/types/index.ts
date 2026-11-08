/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserAccount {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  birthday?: string;
  email: string;
  emailVerified: boolean;
  stk: string; // 10-digit account number
  role: 'admin' | 'user';
  balance: number;
  avatar: string;
  passkeyRegistered?: boolean;
  passkeyCredentialId?: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  senderStk: string;
  senderName: string;
  receiverStk: string;
  receiverName: string;
  amount: number;
  type: 'transfer' | 'deposit' | 'withdraw' | 'reward';
  note: string;
  timestamp: string;
}

export interface WalletRequest {
  id: string;
  userStk: string;
  userName: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string;
}

export interface SavingsVault {
  id: string;
  userStk: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  category: string;
  createdAt: string;
}

export interface EmailVerificationToken {
  email: string;
  code: string;
  expiresAt: number;
}
