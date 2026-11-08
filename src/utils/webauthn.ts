/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Helper to convert string to ArrayBuffer
function strToBuffer(str: string): ArrayBuffer {
  const enc = new TextEncoder();
  return enc.encode(str).buffer;
}

// Check if WebAuthn is supported on this browser
export function isWebAuthnSupported(): boolean {
  return typeof window !== 'undefined' &&
    window.PublicKeyCredential !== undefined &&
    typeof window.PublicKeyCredential === 'function';
}

export async function createPasskey(username: string, displayName: string): Promise<{ success: boolean; credentialId?: string; error?: string }> {
  if (!isWebAuthnSupported()) {
    return { success: false, error: 'WebAuthn Passkeys are not supported on this browser.' };
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userIdBuffer = strToBuffer(username);

    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: 'MikraPay K-Bank',
        id: window.location.hostname || 'localhost',
      },
      user: {
        id: userIdBuffer,
        name: username,
        displayName: displayName,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' }, // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
    };

    const credential = (await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    })) as PublicKeyCredential | null;

    if (credential) {
      return { success: true, credentialId: credential.id };
    }
    return { success: false, error: 'No credential generated.' };
  } catch (err: any) {
    console.warn('WebAuthn creation prompt:', err);
    // User cancelled or platform authenticator unavailable
    return { success: false, error: err.message || 'Passkey creation was cancelled or unsupported.' };
  }
}

export async function verifyPasskey(): Promise<{ success: boolean; credentialId?: string; error?: string }> {
  if (!isWebAuthnSupported()) {
    return { success: false, error: 'WebAuthn is not supported on this browser.' };
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      timeout: 60000,
      userVerification: 'preferred',
      rpId: window.location.hostname || 'localhost',
    };

    const assertion = (await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
    })) as PublicKeyCredential | null;

    if (assertion) {
      return { success: true, credentialId: assertion.id };
    }
    return { success: false, error: 'No credential returned.' };
  } catch (err: any) {
    console.warn('WebAuthn assertion error:', err);
    return { success: false, error: err.message || 'Passkey verification failed or cancelled.' };
  }
}
