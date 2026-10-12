import React from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { BoxArchive } from '../types/archive';
import {
  X,
  MapPin,
  Users,
  CheckCircle2,
  ExternalLink,
  Download,
  Pencil,
  Copy,
  Check,
  FolderArchive,
  Sparkles,
} from 'lucide-react';

interface BoxDetailModalProps {
  box: BoxArchive | null;
  isOpen?: boolean;
  onClose: () => void;
  onEdit: (box: BoxArchive) => void;
}

export const BoxDetailModal: React.FC<BoxDetailModalProps> = ({
  box,
  isOpen = true,
  onClose,
  onEdit,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!box || isOpen === false) return null;

  // Target URL QR Code: mengarah ke URL produksi GitHub Pages
  const qrTargetUrl = `https://bintisulaikah7-glitch.github.io/Sistem-Arsip-Boks-LSP/?box=${encodeURIComponent(box.id_box)}`;

  // Copy deep link or box ID
  const handleCopyLink = () => {
    navigator.clipboard.writeText(qrTargetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download QR Code as PNG
  const handleDownloadQR = () => {
    const canvas = document.getElementById(`qr-canvas-${box.id_box}`) as HTMLCanvasElement;
    if (!canvas) return;

    const pngUrl = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.href = pngUrl;
    downloadLink.download = `QR_${box.id_box.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const totalPeserta = Number(box.jumlah_peserta) || 0;
  const pesertaBK = Number(box.jumlah_peserta_bk) || 0;
  const pesertaKompeten = Math.max(0, totalPeserta - pesertaBK);
  const rasioKompeten = totalPeserta > 0 ? Math.round((pesertaKompeten / totalPeserta) * 100) : 100;

  return (
    <>
      {/* Background Overlay */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in"
        onClick={onClose}
      >
        {/* Modal Window */}
        <div
          className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden my-auto relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white relative">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              title="Tutup Modal (Esc)"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded font-mono text-xs font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30">
                {box.id_box}
              </span>
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-white/10 text-white/90">
                Tahun {box.tahun_pelaksanaan}
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white leading-tight pr-10">
              {box.nama_pelatihan}
            </h2>

            {/* Location pill on dark header */}
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/10 backdrop-blur-xs text-xs text-blue-100 border border-white/15">
              <MapPin className="w-3.5 h-3.5 text-blue-300" />
              <span>
                <strong>{box.lokasi?.lemari_label || 'Lemari'}</strong> &bull; {box.lokasi?.rak || 'Rak'} &bull; <strong>{box.nomor_box}</strong>
              </span>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-5 sm:p-6 space-y-6 max-h-[calc(85vh-160px)] overflow-y-auto">
            {/* Grid 2 Columns: Info Details & QR Code Generator */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Column: Data Details (7 cols) */}
              <div className="md:col-span-7 space-y-4">
                {/* Section: Lokasi Fisik Penyimpanan */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    <span>Koordinat Lokasi Arsip</span>
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                      <span className="text-[10px] uppercase text-slate-400 block font-semibold">Lemari</span>
                      <strong className="text-sm text-slate-900 block truncate">{box.lokasi?.lemari_label}</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                      <span className="text-[10px] uppercase text-slate-400 block font-semibold">Rak</span>
                      <strong className="text-sm text-slate-900 block truncate">{box.lokasi?.rak}</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                      <span className="text-[10px] uppercase text-slate-400 block font-semibold">Boks</span>
                      <strong className="text-sm text-slate-900 block truncate font-mono">{box.nomor_box}</strong>
                    </div>
                  </div>
                </div>

                {/* Section: Status Berkas & Barang */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                    <span className="text-xs text-slate-500 font-medium block mb-1">Status Arsip</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-white text-slate-800 border border-slate-200 shadow-2xs">
                      <FolderArchive className="w-3.5 h-3.5 text-blue-600" />
                      <span>{box.status_arsip || 'Aktif'}</span>
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                    <span className="text-xs text-slate-500 font-medium block mb-1">Status Barang</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-white text-slate-800 border border-slate-200 shadow-2xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{box.status_barang || 'Lengkap'}</span>
                    </span>
                  </div>
                </div>

                {/* Section: Peserta & Kelulusan */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Data Peserta Sertifikasi</span>
                    </h4>
                    <span className="text-xs font-mono font-bold text-slate-700">
                      Total: {totalPeserta} Peserta
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-emerald-700 font-medium flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                        Kompeten (K):
                      </span>
                      <strong className="text-emerald-700 font-mono">{pesertaKompeten} ({rasioKompeten}%)</strong>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-rose-700 font-medium flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                        Belum Kompeten (BK):
                      </span>
                      <strong className="text-rose-700 font-mono">{pesertaBK}</strong>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full transition-all"
                        style={{ width: `${rasioKompeten}%` }}
                      />
                      {pesertaBK > 0 && (
                        <div
                          className="bg-rose-400 h-full transition-all"
                          style={{ width: `${100 - rasioKompeten}%` }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Hasil Uji */}
                  {box.hasilUjiKompetensi && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 text-xs">
                      <span className="text-slate-500 block mb-0.5">Keterangan Hasil Uji / Barang:</span>
                      <p className="font-medium text-slate-800 bg-white p-2 rounded border border-slate-200">
                        {box.hasilUjiKompetensi}
                      </p>
                    </div>
                  )}
                </div>

                {/* Google Drive Link */}
                {box.link_dokumentasi ? (
                  <a
                    href={box.link_dokumentasi}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3.5 rounded-xl bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200/90 text-blue-900 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                        <ExternalLink className="w-4 h-4" />
                      </div>
                      <div>
                        <strong className="text-xs block font-bold">Link Dokumentasi Google Drive</strong>
                        <span className="text-[11px] text-blue-700 truncate block max-w-[280px]">
                          {box.link_dokumentasi}
                        </span>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-400 text-center">
                    Belum ada link Google Drive yang terdaftar untuk boks ini.
                  </div>
                )}
              </div>

              {/* Right Column: QR Code Generator & Actions (5 cols) */}
              <div className="md:col-span-5 flex flex-col justify-between space-y-4 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/90">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>QR Code Identitas Boks</span>
                    </h4>
                    <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                      Scan to Open
                    </span>
                  </div>

                  {/* QR Code Canvas Box */}
                  <div className="bg-white p-4 rounded-xl border-2 border-slate-200/90 shadow-xs flex flex-col items-center justify-center">
                    {/* Hidden canvas for PNG export */}
                    <div className="hidden">
                      <QRCodeCanvas
                        id={`qr-canvas-${box.id_box}`}
                        value={qrTargetUrl}
                        size={512}
                        level="H"
                        includeMargin={true}
                      />
                    </div>

                    {/* Visible crisp SVG QR Code */}
                    <div className="p-2 bg-white rounded-lg">
                      <QRCodeSVG
                        value={qrTargetUrl}
                        size={180}
                        level="H"
                        includeMargin={true}
                        className="w-full max-w-[190px] h-auto drop-shadow-2xs"
                      />
                    </div>

                    <p className="mt-2 text-[11px] text-center font-mono font-bold text-slate-800">
                      {box.id_box}
                    </p>
                    <p className="text-[10px] text-slate-500 text-center mt-0.5">
                      Arahkan kamera smartphone untuk langsung membuka boks ini
                    </p>
                  </div>
                </div>

                {/* QR Code Action Buttons */}
                <div className="space-y-2 pt-2">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Unduh QR PNG */}
                    <button
                      onClick={handleDownloadQR}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors"
                      title="Download gambar QR Code resolusi tinggi"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-600" />
                      <span>Unduh PNG</span>
                    </button>

                    {/* Salin Tautan Langsung */}
                    <button
                      onClick={handleCopyLink}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors"
                      title="Salin tautan cepat ke boks ini"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-600" />
                          <span>Salin Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              ID Boks: <code className="font-mono text-slate-800">{box.id_box}</code>
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onClose();
                  onEdit(box);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Data</span>
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};