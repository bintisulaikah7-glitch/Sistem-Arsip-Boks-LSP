import React from 'react';
import { BoxArchive } from '../types/archive';
import {
  ExternalLink,
  QrCode,
  Pencil,
  ArrowUpDown,
  FolderArchive,
  CheckCircle,
} from 'lucide-react';

interface BoxTableProps {
  boxes: BoxArchive[];
  onSelectBox: (box: BoxArchive) => void;
  onEditBox: (box: BoxArchive) => void;
}

export const BoxTable: React.FC<BoxTableProps> = ({
  boxes,
  onSelectBox,
  onEditBox,
}) => {
  const [sortField, setSortField] = React.useState<keyof BoxArchive>('id_box');
  const [sortAsc, setSortAsc] = React.useState(true);

  const handleSort = (field: keyof BoxArchive) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedBoxes = React.useMemo(() => {
    return [...boxes].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortAsc
          ? valA.localeCompare(valB, undefined, { numeric: true })
          : valB.localeCompare(valA, undefined, { numeric: true });
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }

      return 0;
    });
  }, [boxes, sortField, sortAsc]);

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('id_box')}>
                <div className="flex items-center gap-1">
                  <span>ID Boks</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('nama_pelatihan')}>
                <div className="flex items-center gap-1">
                  <span>Nama Pelatihan</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-3">Lokasi Fisik</th>
              <th className="py-3 px-3 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('tahun_pelaksanaan')}>
                <div className="flex items-center gap-1">
                  <span>Tahun</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-3 text-center">Peserta</th>
              <th className="py-3 px-3">Status Arsip</th>
              <th className="py-3 px-3">Status Barang</th>
              <th className="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedBoxes.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  Tidak ada data boks arsip yang sesuai dengan filter.
                </td>
              </tr>
            ) : (
              sortedBoxes.map((box) => (
                <tr key={box.id_box} className="hover:bg-blue-50/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                    <button
                      onClick={() => onSelectBox(box)}
                      className="hover:text-blue-600 hover:underline"
                    >
                      {box.id_box}
                    </button>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900 max-w-xs truncate" title={box.nama_pelatihan}>
                    {box.nama_pelatihan}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap text-slate-600">
                    <span className="font-semibold text-slate-800">{box.lokasi?.lemari_label}</span>
                    <span className="text-slate-400"> • </span>
                    <span>{box.lokasi?.rak}</span>
                    <span className="text-slate-400"> • </span>
                    <span className="font-mono text-slate-500">{box.nomor_box}</span>
                  </td>
                  <td className="py-3 px-3 font-mono font-semibold text-slate-700">
                    {box.tahun_pelaksanaan}
                  </td>
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    <span className="font-bold text-slate-800">{box.jumlah_peserta}</span>
                    <span className="text-slate-400 text-[10px] ml-1">
                      ({Math.max(0, box.jumlah_peserta - box.jumlah_peserta_bk)} K
                      {box.jumlah_peserta_bk > 0 ? ` / ${box.jumlah_peserta_bk} BK` : ''})
                    </span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {box.status_arsip || 'Aktif'}
                    </span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {box.status_barang || 'Lengkap'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {box.link_dokumentasi && (
                        <a
                          href={box.link_dokumentasi}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md"
                          title="Buka Google Drive"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => onEditBox(box)}
                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md"
                        title="Edit Data"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onSelectBox(box)}
                        className="p-1.5 text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md"
                        title="Lihat Detail & QR Code"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
