import React, { useState, useEffect, useRef } from 'react';
import { BoxArchive } from '../types/archive';
import {
  X,
  QrCode,
  Search,
  Scan,
  Camera,
  Upload,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  VideoOff,
} from 'lucide-react';

interface QuickScannerModalProps {
  isOpen: boolean;
  boxes: BoxArchive[];
  onClose: () => void;
  onSelectBox: (box: BoxArchive) => void;
}

export const QuickScannerModal: React.FC<QuickScannerModalProps> = ({
  isOpen,
  boxes,
  onClose,
  onSelectBox,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  const [scannedInput, setScannedInput] = useState('');
  const [errorNotFound, setErrorNotFound] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  // Helper to find box by ID or raw string or URL
  const findBoxMatch = (rawInput: string): BoxArchive | null => {
    let target = rawInput.trim();
    if (!target) return null;

    // If full URL was scanned: check ?id=, ?scan=, or ?box=
    if (target.includes('?') || target.includes('#')) {
      try {
        const url = new URL(target, window.location.origin);
        const paramId =
          url.searchParams.get('id') ||
          url.searchParams.get('scan') ||
          url.searchParams.get('box');
        if (paramId) {
          target = decodeURIComponent(paramId).trim();
        }
      } catch {
        // fallback regex match
        const match = target.match(/(?:id|scan|box)=([^&]+)/i);
        if (match && match[1]) {
          target = decodeURIComponent(match[1]).trim();
        }
      }
    }

    const cleanTarget = target.toLowerCase();
    const noSpaceTarget = cleanTarget.replace(/\s+/g, '');

    return (
      boxes.find(
        (b) =>
          b.id_box.toLowerCase() === cleanTarget ||
          b.id_box.toLowerCase().replace(/\s+/g, '') === noSpaceTarget ||
          b.id_box.toLowerCase().includes(cleanTarget)
      ) || null
    );
  };

  // Start Camera Stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Kamera tidak didukung oleh browser ini.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setIsScanning(true);
      }

      // Check if BarcodeDetector is supported in this browser
      if ('BarcodeDetector' in window) {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'upc_a'],
        });

        scanIntervalRef.current = window.setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes.length > 0) {
                const detectedVal = barcodes[0].rawValue;
                if (detectedVal) {
                  const match = findBoxMatch(detectedVal);
                  if (match) {
                    stopCamera();
                    onSelectBox(match);
                    onClose();
                  }
                }
              }
            } catch {
              // ignore detection loop error
            }
          }
        }, 400);
      }
    } catch (err: any) {
      console.warn('Gagal mengakses kamera:', err);
      setCameraError(
        err?.name === 'NotAllowedError'
          ? 'Izin kamera ditolak. Silakan izinkan akses kamera atau gunakan pencarian manual.'
          : 'Kamera tidak dapat diakses pada perangkat ini. Silakan gunakan pencarian manual ID Boks.'
      );
      setActiveTab('manual');
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleManualSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorNotFound(false);

    const match = findBoxMatch(scannedInput);
    if (match) {
      stopCamera();
      onSelectBox(match);
      onClose();
    } else {
      setErrorNotFound(true);
    }
  };

  // Quick picks
  const quickPicks = boxes.slice(0, 5);

  return (
    <div
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Pindai / Cari ID Boks Arsip</h2>
              <p className="text-xs text-blue-200">
                Pindai QR code fisik atau tempel ID boks untuk langsung membuka detail
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-3 text-center flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'camera'
                ? 'bg-white text-blue-600 border-b-2 border-blue-600 font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Kamera Scanner Langsung</span>
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-3 text-center flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'manual'
                ? 'bg-white text-blue-600 border-b-2 border-blue-600 font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Input / Tempel ID Cepat</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {activeTab === 'camera' ? (
            /* CAMERA SCANNER TAB */
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-4/3 flex items-center justify-center shadow-inner border border-slate-800">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />

                {/* Reticle / Viewfinder Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-white/60 rounded-xl relative flex items-center justify-center shadow-lg">
                    {/* Corner marks */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-blue-400 -mt-1 -ml-1 rounded-tl" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-blue-400 -mt-1 -mr-1 rounded-tr" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-blue-400 -mb-1 -ml-1 rounded-bl" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-blue-400 -mb-1 -mr-1 rounded-br" />

                    {/* Animated Scanning Laser Line */}
                    <div className="w-full h-0.5 bg-red-500 shadow-sm shadow-red-500/80 animate-pulse" />
                  </div>
                </div>

                {cameraError && (
                  <div className="absolute inset-0 bg-slate-900/90 p-4 text-center flex flex-col items-center justify-center text-white">
                    <VideoOff className="w-8 h-8 text-rose-400 mb-2" />
                    <p className="text-xs text-rose-200 max-w-xs">{cameraError}</p>
                    <button
                      onClick={() => setActiveTab('manual')}
                      className="mt-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
                    >
                      Beralih ke Input ID
                    </button>
                  </div>
                )}
              </div>

              <p className="text-center text-xs text-slate-500">
                Arahkan kamera ke stiker QR code boks. Saat kode terdeteksi, modal detail akan langsung terbuka.
              </p>
            </div>
          ) : (
            /* MANUAL INPUT TAB */
            <div className="space-y-4">
              <form onSubmit={handleManualSubmit} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    ID Boks atau URL QR Code:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      autoFocus
                      value={scannedInput}
                      onChange={(e) => {
                        setScannedInput(e.target.value);
                        setErrorNotFound(false);
                      }}
                      placeholder="Contoh: Lemari 4 - Rak D - Box 10 atau tempel URL"
                      className="w-full pl-3 pr-20 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      Buka
                    </button>
                  </div>
                </div>

                {errorNotFound && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>ID Boks tidak ditemukan di database arsip saat ini.</span>
                  </div>
                )}
              </form>

              {/* Sample Quick Picks */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Boks Tersedia (Klik Langsung untuk Buka):
                </span>
                <div className="space-y-1.5">
                  {quickPicks.map((b) => (
                    <button
                      key={b.id_box}
                      onClick={() => {
                        stopCamera();
                        onSelectBox(b);
                        onClose();
                      }}
                      className="w-full p-2.5 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-left transition-colors flex items-center justify-between group"
                    >
                      <div className="truncate pr-2">
                        <span className="text-xs font-mono font-bold text-slate-900 block truncate">
                          {b.id_box}
                        </span>
                        <span className="text-[11px] text-slate-500 truncate block">
                          {b.nama_pelatihan}
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
          <span className="text-slate-400">Total {boxes.length} boks terdaftar</span>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
