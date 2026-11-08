/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserAccount, Transaction, WalletRequest, SavingsVault } from '../types';

export const DEFAULT_USERS: UserAccount[] = [
  {
    id: 'u-1',
    username: 'admin',
    password: 'admin123',
    fullName: 'System Admin (Liquidity Vault)',
    birthday: '1990-01-01',
    email: 'admin@mikrapay.internal',
    emailVerified: true,
    stk: '9999999999',
    role: 'admin',
    balance: 1000000,
    avatar: '👑',
    createdAt: new Date().toISOString()
  },
  {
    id: 'u-2',
    username: 'mikra',
    password: '123456',
    fullName: 'Mikra Founder',
    birthday: '1998-05-15',
    email: 'mikrayoutube@gmail.com',
    emailVerified: true,
    stk: '1002003001',
    role: 'user',
    balance: 500000,
    avatar: '🦊',
    createdAt: new Date().toISOString()
  },
  {
    id: 'u-3',
    username: 'coocnut1344',
    password: '123456',
    fullName: 'Coocnut Friend',
    birthday: '2000-11-20',
    email: 'coocnut1344@gmail.com',
    emailVerified: false, // Intentional: tests forced email verification!
    stk: '1002003002',
    role: 'user',
    balance: 200000,
    avatar: '🥥',
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-init-1',
    senderStk: '9999999999',
    senderName: 'System Liquidity Vault',
    receiverStk: '1002003001',
    receiverName: 'Mikra Founder',
    amount: 500000,
    type: 'deposit',
    note: 'Initial account activation & seed balance',
    timestamp: new Date().toISOString()
  },
  {
    id: 'tx-init-2',
    senderStk: '1002003001',
    senderName: 'Mikra Founder',
    receiverStk: '1002003002',
    receiverName: 'Coocnut Friend',
    amount: 50000,
    type: 'transfer',
    note: 'Coffee & snacks split ☕',
    timestamp: new Date(Date.now() - 3600000).toISOString()
  }
];

export const INITIAL_SAVINGS: SavingsVault[] = [
  {
    id: 'sav-1',
    userStk: '1002003001',
    title: 'Da Nang Summer Trip ✈️',
    targetAmount: 2000000,
    currentAmount: 450000,
    category: 'Travel',
    createdAt: new Date().toISOString()
  }
];

export function getStoredUsers(): UserAccount[] {
  try {
    const raw = localStorage.getItem('mikrapay_users');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading stored users:', e);
  }
  return DEFAULT_USERS;
}

export function saveStoredUsers(users: UserAccount[]): void {
  try {
    localStorage.setItem('mikrapay_users', JSON.stringify(users));
  } catch (e) {
    console.error('Error saving users:', e);
  }
}

export function getStoredSession(): UserAccount | null {
  try {
    const raw = localStorage.getItem('mikrapay_session');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading session:', e);
  }
  return null;
}

export function saveStoredSession(user: UserAccount | null): void {
  try {
    if (user) {
      localStorage.setItem('mikrapay_session', JSON.stringify(user));
    } else {
      localStorage.removeItem('mikrapay_session');
    }
  } catch (e) {
    console.error('Error saving session:', e);
  }
}

export function getStoredTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem('mikrapay_transactions');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading transactions:', e);
  }
  return INITIAL_TRANSACTIONS;
}

export function saveStoredTransactions(transactions: Transaction[]): void {
  try {
    localStorage.setItem('mikrapay_transactions', JSON.stringify(transactions));
  } catch (e) {
    console.error('Error saving transactions:', e);
  }
}

export function getStoredRequests(): WalletRequest[] {
  try {
    const raw = localStorage.getItem('mikrapay_requests');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading requests:', e);
  }
  return [];
}

export function saveStoredRequests(requests: WalletRequest[]): void {
  try {
    localStorage.setItem('mikrapay_requests', JSON.stringify(requests));
  } catch (e) {
    console.error('Error saving requests:', e);
  }
}

export function getStoredSavings(): SavingsVault[] {
  try {
    const raw = localStorage.getItem('mikrapay_savings');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading savings:', e);
  }
  return INITIAL_SAVINGS;
}

export function saveStoredSavings(savings: SavingsVault[]): void {
  try {
    localStorage.setItem('mikrapay_savings', JSON.stringify(savings));
  } catch (e) {
    console.error('Error saving savings:', e);
  }
}
