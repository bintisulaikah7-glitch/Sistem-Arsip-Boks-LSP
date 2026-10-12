import React from 'react';
import { BoxArchive } from '../types/archive';
import {
  Package,
  QrCode,
  ExternalLink,
  Pencil,
  Users,
  CheckCircle,
  AlertCircle,
  FolderArchive,
  Layers,
  MapPin,
} from 'lucide-react';

interface BoxCardProps {
  box: BoxArchive;
  onSelectBox: (box: BoxArchive) => void;
  onEditBox: (box: BoxArchive) => void;
}

export const BoxCard: React.FC<BoxCardProps> = ({
  box,
  onSelectBox,
  onEditBox,
}) => {
  // Helpers to colorize status tags
  const getStatusArsipBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('aktif') || s.includes('tersedia') || s.includes('lengkap')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200/70';
    }
    if (s.includes('tidak lengkap') || s.includes('kurang')) {
      return 'bg-amber-50 text-amber-700 border-amber-200/70';
    }
    if (s.includes('inaktif') || s.includes('tidak tersedia')) {
      return 'bg-slate-100 text-slate-700 border-slate-200';
    }
    if (s.includes('musnah') || s.includes('rusak')) {
      return 'bg-rose-50 text-rose-700 border-rose-200/70';
    }
    return 'bg-blue-50 text-blue-700 border-blue-200/70';
  };

  const getStatusBarangBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('lengkap')) {
      return 'bg-teal-50 text-teal-700 border-teal-200/70';
    }
    if (s.includes('tidak lengkap')) {
      return 'bg-amber-50 text-amber-700 border-amber-200/70';
    }
    if (s.includes('pinjam')) {
      return 'bg-sky-50 text-sky-700 border-sky-200/70';
    }
    if (s.includes('tidak ada') || s.includes('kosong')) {
      return 'bg-slate-100 text-slate-600 border-slate-200';
    }
    return 'bg-purple-50 text-purple-700 border-purple-200/70';
  };

  const totalPeserta = Number(box.jumlah_peserta) || 0;
  const pesertaBK = Number(box.jumlah_peserta_bk) || 0;
  const pesertaKompeten = Math.max(0, totalPeserta - pesertaBK);
  const rasioKompeten = totalPeserta > 0 ? Math.round((pesertaKompeten / totalPeserta) * 100) : 100;

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all duration-200 flex flex-col justify-between overflow-hidden group">
      {/* Top Header Card: ID and Location Badge */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-2.5">
          {/* ID Box Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 text-white font-mono text-xs font-semibold tracking-wide shadow-xs">
            <Package className="w-3.5 h-3.5 text-blue-400" />
            <span className="truncate max-w-[200px]" title={box.id_box}>{box.id_box}</span>
          </div>

          {/* Tahun Pelaksanaan */}
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 font-mono">
            {box.tahun_pelaksanaan}
          </span>
        </div>

        {/* Training Title */}
        <h3
          onClick={() => onSelectBox(box)}
          className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 cursor-pointer hover:text-blue-600 transition-colors mb-2"
          title={box.nama_pelatihan}
        >
          {box.nama_pelatihan}
        </h3>

        {/* Location coordinates */}
        <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-3 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
          <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
          <span className="font-semibold text-slate-700">{box.lokasi?.lemari_label || 'Lemari'}</span>
          <span className="text-slate-300">•</span>
          <span>{box.lokasi?.rak || 'Rak'}</span>
          <span className="text-slate-300">•</span>
          <span className="font-mono text-slate-700 font-medium">{box.nomor_box}</span>
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusArsipBadge(
              box.status_arsip
            )}`}
          >
            <FolderArchive className="w-3 h-3" />
            <span>Arsip: {box.status_arsip || 'Aktif'}</span>
          </span>

          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBarangBadge(
              box.status_barang
            )}`}
          >
            <CheckCircle className="w-3 h-3" />
            <span>Barang: {box.status_barang || 'Lengkap'}</span>
          </span>
        </div>

        {/* Participants statistics */}
        <div className="pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center justify-between text-slate-600 mb-1">
            <span className="flex items-center gap-1 text-[11px]">
              <Users className="w-3 h-3 text-slate-400" />
              <span>{totalPeserta} Peserta</span>
            </span>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-emerald-700 font-medium">{pesertaKompeten} K</span>
              {pesertaBK > 0 && <span className="text-rose-600 font-medium">{pesertaBK} BK</span>}
            </div>
          </div>

          {/* Mini progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full"
              style={{ width: `${rasioKompeten}%` }}
              title={`Kompeten: ${rasioKompeten}%`}
            />
            {pesertaBK > 0 && (
              <div
                className="bg-rose-400 h-full"
                style={{ width: `${100 - rasioKompeten}%` }}
                title={`Belum Kompeten: ${100 - rasioKompeten}%`}
              />
            )}
          </div>
        </div>

        {/* Hasil Uji Ringkas */}
        {box.hasilUjiKompetensi && (
          <p className="mt-2 text-[11px] text-slate-500 truncate" title={box.hasilUjiKompetensi}>
            <span className="font-medium text-slate-600">Hasil Uji:</span> {box.hasilUjiKompetensi}
          </p>
        )}
      </div>

      {/* Card Actions Footer */}
      <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-1">
        {/* Drive shortcut */}
        {box.link_dokumentasi ? (
          <a
            href={box.link_dokumentasi}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:underline"
            title="Buka Dokumen Google Drive"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Drive</span>
          </a>
        ) : (
          <span className="text-[11px] text-slate-400">No Drive Link</span>
        )}

        <div className="flex items-center gap-1.5 ml-auto">
          {/* Edit Data */}
          <button
            onClick={() => onEditBox(box)}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-md transition-colors"
            title="Edit Data Boks"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          {/* QR Code & Detail Modal */}
          <button
            onClick={() => onSelectBox(box)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-slate-900 hover:bg-blue-600 rounded-md transition-colors shadow-2xs"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Detail & QR</span>
          </button>
        </div>
      </div>
    </div>
  );
};
