/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import jsQR from 'jsqr';
import { parseMikraPayPayload } from '../utils/qr';
import { UserAccount } from '../types';

interface QrScannerModalProps {
  allUsers: UserAccount[];
  currentStk?: string;
  onScanSuccess: (scannedStk: string) => void;
  onQuickLoginScanned?: (code: string) => void;
  onClose: () => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  allUsers,
  currentStk,
  onScanSuccess,
  onQuickLoginScanned,
  onClose,
}) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<string>('Initializing camera...');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let isCancelled = false;

    // Attempt to start real WebRTC camera
    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera access API not supported in this browser environment.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        });

        if (isCancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play();
          setCameraActive(true);
          setScanStatus('Scanning QR code from live camera feed...');
          scanLiveFeed();
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn('Camera stream could not be started:', err);
        setCameraError(msg || 'Unable to access camera. Please allow camera permissions or upload a QR image.');
        setScanStatus('Camera unavailable. You can upload an image or select a recipient below.');
      }
    };

    startCamera();

    return () => {
      isCancelled = true;
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Continuous frame scanning using canvas + jsQR
  const scanLiveFeed = () => {
    const video = videoRef.current;
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameId.current = requestAnimationFrame(scanLiveFeed);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        const { stk, quickLoginCode } = parseMikraPayPayload(code.data);
        if (quickLoginCode && onQuickLoginScanned) {
          onQuickLoginScanned(quickLoginCode);
          return;
        }
        if (stk) {
          onScanSuccess(stk);
          return;
        }
      }
    }

    animationFrameId.current = requestAnimationFrame(scanLiveFeed);
  };

  // Decode uploaded QR image file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          const { stk, quickLoginCode } = parseMikraPayPayload(code.data);
          if (quickLoginCode && onQuickLoginScanned) {
            onQuickLoginScanned(quickLoginCode);
          } else if (stk) {
            onScanSuccess(stk);
          } else {
            alert('Scanned QR data: ' + code.data);
          }
        } else {
          alert('No readable QR code found in the selected image.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel p-6 sm:p-8 rounded-3xl max-w-md w-full border border-slate-200/30 dark:border-white/10 relative shadow-2xl space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-200/50 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          aria-label="Close Scanner"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
            <Camera className="w-5 h-5 text-cyan-500" />
            <span>MikraPay Real QR Scanner</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{scanStatus}</p>
        </div>

        {/* Live Camera Viewfinder or Fallback */}
        <div className="relative w-full h-56 bg-slate-950 rounded-2xl overflow-hidden border-2 border-dashed border-cyan-500/50 flex items-center justify-center">
          <video
            ref={videoRef}
            className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
          />

          {/* Viewfinder Target Reticle */}
          {cameraActive && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-40 h-40 border-2 border-cyan-400/80 rounded-2xl relative animate-pulse">
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-400"></div>
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-cyan-400"></div>
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-cyan-400"></div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-400"></div>
              </div>
            </div>
          )}

          {!cameraActive && (
            <div className="text-center p-4 space-y-2">
              <Camera className="w-10 h-10 text-cyan-500 mx-auto opacity-70 animate-bounce" />
              <p className="text-xs text-slate-400">
                {cameraError ? 'Camera unavailable in sandbox' : 'Requesting camera permissions...'}
              </p>
            </div>
          )}
        </div>

        {/* Image File QR Scan Upload */}
        <div className="pt-1">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-800 dark:text-white text-xs font-semibold border border-slate-300/40 dark:border-white/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4 text-cyan-500" />
            <span>Upload & Decode QR Image File</span>
          </button>
        </div>

        {/* Quick Demo Friend Selection */}
        <div className="pt-2 border-t border-slate-200/40 dark:border-white/10 space-y-2">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 text-center">
            Or select registered recipient:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {allUsers
              .filter(u => u.stk !== currentStk)
              .map(u => (
                <button
                  key={u.stk}
                  onClick={() => onScanSuccess(u.stk)}
                  className="p-2.5 rounded-xl glass-card hover:border-cyan-500/50 hover:bg-cyan-500/10 text-left border border-slate-200/40 dark:border-white/10 transition-all cursor-pointer flex items-center gap-2"
                >
                  <span className="text-xl">{u.avatar}</span>
                  <div className="truncate">
                    <div className="text-xs font-bold text-slate-800 dark:text-white truncate">
                      {u.fullName}
                    </div>
                    <div className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400">
                      {u.stk}
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
