/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserAccount, Transaction, WalletRequest, SavingsVault } from '../types';
import { db, doc, collection, setDoc, onSnapshot, handleFirestoreError, OperationType } from '../firebase';

export const DEFAULT_USERS: UserAccount[] = [];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_SAVINGS: SavingsVault[] = [];

export async function initiateQuickLoginRequest(): Promise<{ code: string }> {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  try {
    await setDoc(doc(db, 'quick_logins', code), {
      code,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `quick_logins/${code}`);
  }
  return { code };
}

export function listenForQuickLoginApproval(code: string, onApproved: (stk: string) => void) {
  return onSnapshot(doc(db, 'quick_logins', code), (snap) => {
    const data = snap.data();
    if (data && data.status === 'approved' && data.stk) {
      onApproved(data.stk);
    }
  });
}

export async function approveQuickLoginRequest(code: string, stk: string): Promise<boolean> {
  try {
    const { getDoc, updateDoc } = await import('firebase/firestore');
    const docRef = doc(db, 'quick_logins', code);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return false;
    
    await updateDoc(docRef, {
      status: 'approved',
      stk,
      approvedAt: new Date().toISOString()
    });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `quick_logins/${code}`);
    return false;
  }
}

export function getStoredUsers(): UserAccount[] {
  try {
    const raw = localStorage.getItem('mikrapay_users');
    if (raw) {
      const parsed: UserAccount[] = JSON.parse(raw);
      const filtered = parsed.filter(u => u.username !== 'admin' && u.username !== 'mikra' && u.username !== 'coocnut1344');
      return filtered;
    }
  } catch (e) {
    console.error('Error loading stored users:', e);
  }
  return DEFAULT_USERS;
}

export function saveStoredUsers(users: UserAccount[]): void {
  try {
    localStorage.setItem('mikrapay_users', JSON.stringify(users));
    // Asynchronously replicate to Firestore
    users.forEach(async u => {
      try {
        await setDoc(doc(db, 'users', u.stk), u, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${u.stk}`);
      }
    });
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
    // Replicate newest transaction to Firestore
    if (transactions.length > 0) {
      const latest = transactions[0];
      setDoc(doc(db, 'transactions', latest.id), latest, { merge: true }).catch((err: unknown) => {
        handleFirestoreError(err, OperationType.WRITE, `transactions/${latest.id}`);
      });
    }
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
    if (requests.length > 0) {
      const latest = requests[0];
      setDoc(doc(db, 'requests', latest.id), latest, { merge: true }).catch((err: unknown) => {
        handleFirestoreError(err, OperationType.WRITE, `requests/${latest.id}`);
      });
    }
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
    savings.forEach(s => {
      setDoc(doc(db, 'savings', s.id), s, { merge: true }).catch((err: unknown) => {
        handleFirestoreError(err, OperationType.WRITE, `savings/${s.id}`);
      });
    });
  } catch (e) {
    console.error('Error saving savings:', e);
  }
}
