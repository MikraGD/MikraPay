/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import QRCode from 'qrcode';
import jsQR from 'jsqr';

export async function generateQrDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: 320,
      margin: 2,
      color: {
        dark: '#030712', // deep slate/black
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    });
  } catch (err) {
    console.error('Failed to generate QR data URL:', err);
    throw err;
  }
}

export function scanQrFromImageData(imageData: ImageData): string | null {
  try {
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });
    return code ? code.data : null;
  } catch (err) {
    console.error('Error scanning QR from ImageData:', err);
    return null;
  }
}

export function parseMikraPayPayload(data: string): { stk?: string; amount?: number; note?: string } {
  // Can be simple 10-digit STK, or JSON, or URI format: mikrapay://transfer?stk=1002003001&amount=50000
  if (/^[0-9]{10}$/.test(data.trim())) {
    return { stk: data.trim() };
  }

  try {
    if (data.startsWith('mikrapay://')) {
      const url = new URL(data.replace('mikrapay://', 'https://placeholder/'));
      const stk = url.searchParams.get('stk') || undefined;
      const amountStr = url.searchParams.get('amount');
      const note = url.searchParams.get('note') || undefined;
      return {
        stk: stk || undefined,
        amount: amountStr ? parseFloat(amountStr) : undefined,
        note: note || undefined,
      };
    }

    if (data.startsWith('{')) {
      const parsed = JSON.parse(data);
      return {
        stk: parsed.stk,
        amount: parsed.amount,
        note: parsed.note,
      };
    }
  } catch (e) {
    console.warn('Could not parse payload as complex URI/JSON, checking for 10-digit STK inside string');
  }

  // Fallback regex to extract any 10-digit number
  const match = data.match(/\b[0-9]{10}\b/);
  if (match) {
    return { stk: match[0] };
  }

  return {};
}
