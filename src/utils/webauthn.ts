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
    const hostname = window.location.hostname;
    // rpId is valid if domain is non-empty; if omitted, browser uses origin domain
    const rpConfig = hostname && hostname.includes('.')
      ? { name: 'MikraPay K-Bank', id: hostname }
      : { name: 'MikraPay K-Bank' };

    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: rpConfig,
      user: {
        id: userIdBuffer,
        name: username,
        displayName: displayName || username,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' }, // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'preferred',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
    };

    const credential = (await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    })) as PublicKeyCredential | null;

    if (credential && credential.id) {
      return { success: true, credentialId: credential.id };
    }
    return { success: false, error: 'No passkey credential was created.' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('WebAuthn creation prompt:', err);
    return { success: false, error: msg || 'Passkey registration was cancelled or unsupported on this device.' };
  }
}

export async function verifyPasskey(allowedCredentialId?: string): Promise<{ success: boolean; credentialId?: string; error?: string }> {
  if (!isWebAuthnSupported()) {
    return { success: false, error: 'WebAuthn is not supported on this browser.' };
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const hostname = window.location.hostname;
    const rpId = hostname && hostname.includes('.') ? hostname : undefined;

    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      timeout: 60000,
      userVerification: 'preferred',
      ...(rpId ? { rpId } : {}),
      ...(allowedCredentialId ? {
        allowCredentials: [{
          id: strToBuffer(allowedCredentialId),
          type: 'public-key'
        }]
      } : {})
    };

    const assertion = (await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
    })) as PublicKeyCredential | null;

    if (assertion && assertion.id) {
      return { success: true, credentialId: assertion.id };
    }
    return { success: false, error: 'Passkey verification was not completed.' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('WebAuthn assertion error:', err);
    return { success: false, error: msg || 'Passkey verification failed or was cancelled.' };
  }
}
