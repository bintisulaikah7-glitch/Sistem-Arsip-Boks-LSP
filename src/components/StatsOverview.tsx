import React from 'react';
import { BoxArchive } from '../types/archive';
import { cleanTrainingName } from '../services/api';
import {
  Package,
  Users,
  GraduationCap,
  FolderCheck,
  CheckCircle2,
  Layers,
  Sparkles,
} from 'lucide-react';

interface StatsOverviewProps {
  boxes: BoxArchive[];
  filteredCount?: number;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ boxes, filteredCount }) => {
  const stats = React.useMemo(() => {
    const totalPhysicalBoxes = boxes.length;

    // 1. Grouping Pelatihan berdasarkan Nama Bersih (hapus suffix "(1)", "(2)", dst.)
    // untuk mencegah duplikasi nama pelatihan & double-counting jumlah peserta
    const trainingGroups = new Map<
      string,
      {
        cleanName: string;
        boxesCount: number;
        pesertaMax: number;
        bkMax: number;
        years: Set<number>;
      }
    >();

    let arsipLengkapCount = 0;
    let barangLengkapCount = 0;
    const lemaris = new Set<string>();
    const raks = new Set<string>();

    boxes.forEach((box) => {
      const rawName = box.nama_pelatihan || '';
      const cName = cleanTrainingName(rawName);
      const groupKey = cName.toLowerCase();
      const pCount = Number(box.jumlah_peserta) || 0;
      const bkCount = Number(box.jumlah_peserta_bk) || 0;

      if (!trainingGroups.has(groupKey)) {
        trainingGroups.set(groupKey, {
          cleanName: cName,
          boxesCount: 0,
          pesertaMax: pCount,
          bkMax: bkCount,
          years: new Set<number>(),
        });
      }

      const group = trainingGroups.get(groupKey)!;
      group.boxesCount += 1;
      // Ambil nilai representatif / konsolidasi cohort untuk mencegah hitung ganda (double count)
      group.pesertaMax = Math.max(group.pesertaMax, pCount);
      group.bkMax = Math.max(group.bkMax, bkCount);
      if (box.tahun_pelaksanaan) {
        group.years.add(box.tahun_pelaksanaan);
      }

      // Hitung kelengkapan
      const sa = (box.status_arsip || '').toLowerCase();
      if (sa.includes('lengkap') || sa.includes('aktif') || sa.includes('tersedia')) {
        arsipLengkapCount++;
      }

      const sb = (box.status_barang || '').toLowerCase();
      if (sb.includes('lengkap') || sb.includes('tersedia')) {
        barangLengkapCount++;
      }

      if (box.lokasi?.lemari_label) lemaris.add(box.lokasi.lemari_label);
      if (box.lokasi?.rak) raks.add(`${box.lokasi.lemari_label}-${box.lokasi.rak}`);
    });

    const totalPelatihanUnik = trainingGroups.size;

    // Konsolidasi total peserta uji (bebas duplikasi)
    let totalPesertaKonsolidasi = 0;
    let totalBKKonsolidasi = 0;

    trainingGroups.forEach((group) => {
      totalPesertaKonsolidasi += group.pesertaMax;
      totalBKKonsolidasi += group.bkMax;
    });

    const totalKompetenKonsolidasi = Math.max(0, totalPesertaKonsolidasi - totalBKKonsolidasi);
    const persentaseKompeten =
      totalPesertaKonsolidasi > 0
        ? Math.round((totalKompetenKonsolidasi / totalPesertaKonsolidasi) * 100)
        : 100;

    const persentaseArsipLengkap =
      totalPhysicalBoxes > 0 ? Math.round((arsipLengkapCount / totalPhysicalBoxes) * 100) : 0;
    const persentaseBarangLengkap =
      totalPhysicalBoxes > 0 ? Math.round((barangLengkapCount / totalPhysicalBoxes) * 100) : 0;

    return {
      totalPhysicalBoxes,
      totalPelatihanUnik,
      totalPesertaKonsolidasi,
      totalKompetenKonsolidasi,
      totalBKKonsolidasi,
      persentaseKompeten,
      arsipLengkapCount,
      persentaseArsipLengkap,
      barangLengkapCount,
      persentaseBarangLengkap,
      totalLemari: lemaris.size,
      totalRak: raks.size,
    };
  }, [boxes]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {/* 1. Total Boks Fisik */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total Boks Fisik
          </span>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Package className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
            {stats.totalPhysicalBoxes}
          </span>
          <span className="text-xs text-slate-500 font-medium">Boks Terdata</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>{stats.totalLemari} Lemari &bull; {stats.totalRak} Rak</span>
          <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
            Baris Arsip
          </span>
        </div>
      </div>

      {/* 2. Total Pelatihan (Terkonsolidasi / Deduplikasi Suffix Boks) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total Pelatihan
          </span>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <GraduationCap className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-indigo-600 font-mono">
            {stats.totalPelatihanUnik}
          </span>
          <span className="text-xs text-slate-500 font-medium">Skema/Program</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span className="text-indigo-700 font-medium">Terkonsolidasi</span>
          <span className="text-[10px] text-slate-400">Grouping Suffix (1), (2)</span>
        </div>
      </div>

      {/* 3. Total Peserta Uji (Bebas Duplikasi) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total Peserta Uji
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
            {stats.totalPesertaKonsolidasi.toLocaleString('id-ID')}
          </span>
          <span className="text-xs font-semibold text-emerald-600">
            {stats.persentaseKompeten}% K
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span className="text-emerald-700 font-medium">
            {stats.totalKompetenKonsolidasi.toLocaleString('id-ID')} Kompeten
          </span>
          <span className="text-rose-600 font-medium">
            {stats.totalBKKonsolidasi} BK
          </span>
        </div>
      </div>

      {/* 4. Kelengkapan Berkas & Fisik */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Kelengkapan Arsip
          </span>
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
            {stats.persentaseArsipLengkap}%
          </span>
          <span className="text-xs text-slate-500">Berkas Tersedia</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span className="text-teal-700 font-medium">
            {stats.arsipLengkapCount} Arsip Lengkap
          </span>
          <span className="text-slate-500 font-medium">
            {stats.persentaseBarangLengkap}% Barang Lengkap
          </span>
        </div>
      </div>
    </div>
  );
};
