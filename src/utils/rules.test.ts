/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateStk,
  generateOtp,
  validateTransfer,
  executeTransfer,
  validateRequestSubmission,
  executeRequestApproval,
  calculateSavingsProgress,
  verifyOtpCode,
  validateEmailChange,
  validatePasswordChange,
  validateTwoFactorCode
} from './rules';
import { UserAccount, WalletRequest } from '../types';

const senderUser: UserAccount = {
  id: 'u-sender',
  username: 'sender',
  fullName: 'Sender User',
  email: 'sender@example.com',
  emailVerified: true,
  stk: '1002003001',
  role: 'user',
  balance: 200000,
  avatar: '🦊',
  createdAt: new Date().toISOString()
};

const receiverUser: UserAccount = {
  id: 'u-recv',
  username: 'recv',
  fullName: 'Receiver User',
  email: 'recv@example.com',
  emailVerified: true,
  stk: '1002003002',
  role: 'user',
  balance: 50000,
  avatar: '🥥',
  createdAt: new Date().toISOString()
};

test('generateStk produces 10-digit numeric string', () => {
  const stk = generateStk();
  assert.equal(stk.length, 10);
  assert.match(stk, /^[0-9]{10}$/);
});

test('generateOtp produces 6-digit numeric string', () => {
  const otp = generateOtp();
  assert.equal(otp.length, 6);
  assert.match(otp, /^[0-9]{6}$/);
});

test('validateTransfer blocks unverified emails', () => {
  const unverifiedSender = { ...senderUser, emailVerified: false };
  const res = validateTransfer(unverifiedSender, '1002003002', 10000, [senderUser, receiverUser]);
  assert.equal(res.valid, false);
  assert.match(res.error || '', /Email verification required/);
});

test('validateTransfer prevents self-transfers and insufficient balances', () => {
  const selfRes = validateTransfer(senderUser, senderUser.stk, 10000, [senderUser, receiverUser]);
  assert.equal(selfRes.valid, false);

  const brokeRes = validateTransfer(senderUser, receiverUser.stk, 500000, [senderUser, receiverUser]);
  assert.equal(brokeRes.valid, false);
  assert.match(brokeRes.error || '', /Insufficient/);
});

test('executeTransfer updates balances and creates transaction record', () => {
  const { updatedSender, updatedReceiver, transaction } = executeTransfer(senderUser, receiverUser, 50000, 'Dinner split');
  assert.equal(updatedSender.balance, 150000);
  assert.equal(updatedReceiver.balance, 100000);
  assert.equal(transaction.amount, 50000);
  assert.equal(transaction.senderStk, senderUser.stk);
  assert.equal(transaction.receiverStk, receiverUser.stk);
  assert.equal(transaction.note, 'Dinner split');
});

test('executeRequestApproval approves deposit and withdrawal correctly', () => {
  const depositReq: WalletRequest = {
    id: 'req-1',
    userStk: senderUser.stk,
    userName: senderUser.fullName,
    type: 'deposit',
    amount: 100000,
    status: 'pending',
    timestamp: new Date().toISOString()
  };
  const depResult = executeRequestApproval(depositReq, senderUser);
  assert.equal(depResult.success, true);
  assert.equal(depResult.updatedUser?.balance, 300000);

  const withdrawReq: WalletRequest = {
    id: 'req-2',
    userStk: senderUser.stk,
    userName: senderUser.fullName,
    type: 'withdraw',
    amount: 50000,
    status: 'pending',
    timestamp: new Date().toISOString()
  };
  const withResult = executeRequestApproval(withdrawReq, senderUser);
  assert.equal(withResult.success, true);
  assert.equal(withResult.updatedUser?.balance, 150000);
});

test('calculateSavingsProgress calculates clamped percentage', () => {
  assert.equal(calculateSavingsProgress(50000, 200000), 25);
  assert.equal(calculateSavingsProgress(300000, 200000), 100);
  assert.equal(calculateSavingsProgress(0, 200000), 0);
});

test('verifyOtpCode checks match and expiration', () => {
  const now = 1000000;
  const valid = verifyOtpCode('123456', '123456', now + 60000, now);
  assert.equal(valid.valid, true);

  const wrong = verifyOtpCode('654321', '123456', now + 60000, now);
  assert.equal(wrong.valid, false);

  const expired = verifyOtpCode('123456', '123456', now - 1000, now);
  assert.equal(expired.valid, false);
});

test('validateEmailChange validates format and avoids collisions', () => {
  const invalidFormat = validateEmailChange('user@example.com', 'bad-email', [senderUser]);
  assert.equal(invalidFormat.valid, false);

  const sameEmail = validateEmailChange('user@example.com', 'user@example.com', [senderUser]);
  assert.equal(sameEmail.valid, false);

  const collision = validateEmailChange('user@example.com', 'sender@example.com', [senderUser]);
  assert.equal(collision.valid, false);

  const valid = validateEmailChange('user@example.com', 'newperson@domain.com', [senderUser]);
  assert.equal(valid.valid, true);
});

test('validatePasswordChange requires correct current pass and length', () => {
  const wrongCurrent = validatePasswordChange('oldpass123', 'wrong', 'newsecret', 'newsecret');
  assert.equal(wrongCurrent.valid, false);

  const shortPass = validatePasswordChange('oldpass123', 'oldpass123', '123', '123');
  assert.equal(shortPass.valid, false);

  const mismatch = validatePasswordChange('oldpass123', 'oldpass123', 'newsecret', 'different');
  assert.equal(mismatch.valid, false);

  const valid = validatePasswordChange('oldpass123', 'oldpass123', 'newsecret123', 'newsecret123');
  assert.equal(valid.valid, true);
});

