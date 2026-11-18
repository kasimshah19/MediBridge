import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import Button from '../ui/Button';
import { Camera, Image as ImageIcon, XCircle, AlertCircle } from 'lucide-react';

export const QrScanner = ({
  onScanSuccess,
  onScanFailure,
  fps = 10,
  qrbox = 250,
  aspectRatio = 1.0,
  className = '',
}) => {
  const [scannerStarted, setScannerStarted] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [hasCamera, setHasCamera] = useState(true);
  const scannerRef = useRef(null);
  const elementId = useRef(`qr-reader-${Math.random().toString(36).substring(7)}`).current;
  const fileInputRef = useRef(null);

  useEffect(() => {
    const html5QrCode = new Html5Qrcode(elementId);
    scannerRef.current = html5QrCode;

    Html5Qrcode.getCameras()
      .then((cameras) => {
        if (!cameras || cameras.length === 0) {
          setHasCamera(false);
          setErrorMessage('No camera found on this device. You can upload a QR image below.');
          return;
        }

        const cameraId = cameras[cameras.length - 1].id; // Prefer back camera
        html5QrCode
          .start(
            cameraId,
            { fps, qrbox, aspectRatio },
            (decodedText, decodedResult) => {
              if (onScanSuccess) {
                onScanSuccess(decodedText, decodedResult);
              }
            },
            (error) => {
              if (onScanFailure) {
                onScanFailure(error);
              }
            }
          )
          .then(() => {
            setScannerStarted(true);
            setErrorMessage(null);
          })
          .catch((err) => {
            console.warn('Unable to start camera:', err);
            setScannerStarted(false);
            setErrorMessage('Camera access denied or unavailable. Please upload a photo instead.');
          });
      })
      .catch((err) => {
        console.warn('Camera enumeration error:', err);
        setHasCamera(false);
        setErrorMessage('Camera permission not granted. You can scan by uploading an image.');
      });

    return () => {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current
            .stop()
            .then(() => scannerRef.current.clear())
            .catch(() => {});
        } else {
          try {
            scannerRef.current.clear();
          } catch {}
        }
      }
    };
  }, [elementId, fps, qrbox, aspectRatio, onScanSuccess, onScanFailure]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !scannerRef.current) return;

    try {
      setErrorMessage(null);
      const decoded = await scannerRef.current.scanFile(file, true);
      if (decoded && onScanSuccess) {
        onScanSuccess(decoded);
      }
    } catch (err) {
      setErrorMessage('No valid QR code detected in the selected image.');
    }
  };

  return (
    <div className={`flex flex-col items-center w-full max-w-sm mx-auto ${className}`}>
      {/* Scanner Viewport */}
      <div className="w-full bg-slate-900 rounded-2xl overflow-hidden relative border-2 border-slate-700 shadow-inner min-h-[260px] flex items-center justify-center">
        <div id={elementId} className="w-full h-full" />

        {!scannerStarted && !errorMessage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-4">
            <Camera className="w-10 h-10 animate-pulse text-teal-400 mb-2" />
            <p className="text-xs font-medium">Requesting camera access...</p>
          </div>
        )}

        {errorMessage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-slate-900/95 text-slate-300">
            <AlertCircle className="w-8 h-8 text-amber-400 mb-2" />
            <p className="text-xs mb-3">{errorMessage}</p>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs"
            >
              <ImageIcon className="w-3.5 h-3.5 mr-1.5" />
              Upload Photo Instead
            </Button>
          </div>
        )}
      </div>

      {/* Alternative File Upload */}
      <div className="mt-3 flex items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="text-xs text-slate-600 hover:text-slate-900"
        >
          <ImageIcon className="w-3.5 h-3.5 mr-1.5" />
          Upload QR photo from gallery
        </Button>
      </div>
    </div>
  );
};

export default QrScanner;
