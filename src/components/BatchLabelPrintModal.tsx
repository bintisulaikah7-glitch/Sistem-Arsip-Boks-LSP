import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { BoxArchive } from '../types/archive';
import {
  X,
  Printer,
  Package,
  Layers,
  MapPin,
  CheckCircle,
} from 'lucide-react';

interface BatchLabelPrintModalProps {
  isOpen: boolean;
  boxes: BoxArchive[];
  onClose: () => void;
}

export const BatchLabelPrintModal: React.FC<BatchLabelPrintModalProps> = ({
  isOpen,
  boxes,
  onClose,
}) => {
  const [maxLabels, setMaxLabels] = useState<number>(12);

  if (!isOpen) return null;

  const labelsToPrint = boxes.slice(0, maxLabels);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 to-blue-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Printer className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h2 className="text-base font-bold">Cetak Stiker Label Boks Arsip Massal</h2>
              <p className="text-xs text-blue-200">
                Format label stiker fisik standar LSP siap cetak ke kertas stiker A4
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

        {/* Options */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Jumlah Label:</span>
            <select
              value={maxLabels}
              onChange={(e) => setMaxLabels(Number(e.target.value))}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded-md text-xs font-medium"
            >
              <option value={6}>6 Label Pertama</option>
              <option value={12}>12 Label (1 Lembar Standar)</option>
              <option value={24}>24 Label</option>
              <option value={boxes.length}>Semua ({boxes.length} Boks)</option>
            </select>
            <span className="text-slate-500">
              Menampilkan {labelsToPrint.length} dari total {boxes.length} boks terpilih.
            </span>
          </div>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Mulai Cetak ({labelsToPrint.length})</span>
          </button>
        </div>

        {/* Label Preview Grid */}
        <div className="p-5 max-h-[60vh] overflow-y-auto bg-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {labelsToPrint.map((b) => {
              const BASE_URL = "https://ai.studio/apps/c0bea046-9b24-4a56-9657-80b9bd04452e";
              const qrUrl = `${BASE_URL}?box=${encodeURIComponent(b.id_box)}`;

              return (
                <div
                  key={b.id_box}
                  className="bg-white p-3.5 rounded-lg border-2 border-slate-300 shadow-2xs flex gap-3 items-center"
                >
                  {/* Left Label Info */}
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] font-bold tracking-wider uppercase text-blue-700 block">
                      LSP ARSIP BOKS
                    </span>
                    <strong className="text-xs font-mono font-black text-slate-900 block truncate">
                      {b.id_box}
                    </strong>
                    <p className="text-[11px] font-bold text-slate-800 line-clamp-1 mt-0.5">
                      {b.nama_pelatihan}
                    </p>
                    <div className="mt-1 text-[10px] text-slate-600 flex items-center gap-1 font-medium">
                      <span>{b.lokasi?.lemari_label}</span>
                      <span>&bull;</span>
                      <span>{b.lokasi?.rak}</span>
                      <span>&bull;</span>
                      <span className="font-mono">{b.nomor_box}</span>
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 block">
                      Tahun {b.tahun_pelaksanaan} | {b.jumlah_peserta} Peserta
                    </span>
                  </div>

                  {/* QR Code */}
                  <div className="p-1 bg-white border border-slate-200 rounded flex-shrink-0">
                    <QRCodeSVG value={qrUrl} size={65} level="M" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Tutup
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-blue-600 rounded-lg transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Halaman Ini</span>
          </button>
        </div>
      </div>
    </div>
  );
};
