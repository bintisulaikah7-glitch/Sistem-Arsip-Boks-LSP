import React, { useState, useRef, useEffect, useMemo } from 'react';
import { BoxArchive, MAX_RAK_CAPACITY, MAX_LEMARI_CAPACITY, isUnassignedLemari } from '../types/archive';
import { cleanTrainingName } from '../services/api';
import {
  Server,
  Layers,
  ChevronRight,
  ArrowLeft,
  Home,
  Package,
  FolderOpen,
  Boxes,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Search,
  X,
  GraduationCap,
  Calendar,
} from 'lucide-react';

interface HierarchyNavigatorProps {
  boxes: BoxArchive[];
  selectedLemari: string;
  selectedRak: string;
  onSelectLemari: (lemari: string) => void;
  onSelectRak: (rak: string) => void;
  onBackToLemari: () => void;
  onBackToHome: () => void;
  onResetFilter?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export const HierarchyNavigator: React.FC<HierarchyNavigatorProps> = ({
  boxes,
  selectedLemari,
  selectedRak,
  onSelectLemari,
  onSelectRak,
  onBackToLemari,
  onBackToHome,
  onResetFilter,
  searchQuery = '',
  onSearchChange,
}) => {
  const [isFrontSuggestionsOpen, setIsFrontSuggestionsOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsFrontSuggestionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Aggregate Lemari and Rak hierarchy
  const hierarchyData = useMemo(() => {
    const lemariMap = new Map<
      string,
      {
        label: string;
        boxes: BoxArchive[];
        raksMap: Map<string, BoxArchive[]>;
      }
    >();

    boxes.forEach((box) => {
      const rawLem = box.lokasi?.lemari_label?.trim();
      let lemLabel = 'Lemari Kosong';
      if (rawLem && !isUnassignedLemari(rawLem)) {
        lemLabel = rawLem;
      } else if (rawLem && isUnassignedLemari(rawLem)) {
        lemLabel = rawLem;
      }

      const rawRak = box.lokasi?.rak?.trim();
      const rakLabel = rawRak || (isUnassignedLemari(lemLabel) ? 'Unassigned' : 'Rak A');

      if (!lemariMap.has(lemLabel)) {
        lemariMap.set(lemLabel, {
          label: lemLabel,
          boxes: [],
          raksMap: new Map(),
        });
      }

      const lemData = lemariMap.get(lemLabel)!;
      lemData.boxes.push(box);

      if (!lemData.raksMap.has(rakLabel)) {
        lemData.raksMap.set(rakLabel, []);
      }
      lemData.raksMap.get(rakLabel)!.push(box);
    });

    const lemarisArray = Array.from(lemariMap.values()).map((lem) => {
      const isUnassigned = isUnassignedLemari(lem.label);

      const raks = Array.from(lem.raksMap.entries()).map(([rakName, rakBoxes]) => {
        const uniqueTrainings = new Set(rakBoxes.map((b) => cleanTrainingName(b.nama_pelatihan)));
        const lengkapCount = rakBoxes.filter((b) => {
          const sa = (b.status_arsip || '').toLowerCase();
          return sa.includes('lengkap') || sa.includes('aktif') || sa.includes('tersedia');
        }).length;

        // Ketentuan 1 & 3: Abaikan batasan kapasitas jika di penampungan unassigned / lemari kosong
        const isRakUnassigned = isUnassigned || isUnassignedLemari(rakName);
        const isFull = isRakUnassigned ? false : rakBoxes.length >= MAX_RAK_CAPACITY;
        const remainingSlots = isRakUnassigned ? Infinity : Math.max(0, MAX_RAK_CAPACITY - rakBoxes.length);

        return {
          rakName,
          boxCount: rakBoxes.length,
          trainingsCount: uniqueTrainings.size,
          lengkapCount,
          isFull,
          remainingSlots,
          boxes: rakBoxes,
          isUnassigned: isRakUnassigned,
        };
      });

      // Sort raks naturally
      raks.sort((a, b) => a.rakName.localeCompare(b.rakName, undefined, { numeric: true }));

      const uniqueTrainingsInLemari = new Set(lem.boxes.map((b) => cleanTrainingName(b.nama_pelatihan)));
      // Ketentuan 1 & 3: Abaikan pengecekan maxCapacity jika lemari memiliki ID/nama "kosong" atau "unassigned" (isFull = false)
      const isFull = isUnassigned ? false : lem.boxes.length >= MAX_LEMARI_CAPACITY;
      const remainingSlots = isUnassigned ? Infinity : Math.max(0, MAX_LEMARI_CAPACITY - lem.boxes.length);

      return {
        label: lem.label,
        totalBoxes: lem.boxes.length,
        raksCount: raks.length,
        trainingsCount: uniqueTrainingsInLemari.size,
        isFull,
        remainingSlots,
        raks,
        isUnassigned,
      };
    });

    // Sort lemaris: Lemari fisik (Lemari 1, 2, dst) tetap berurutan di awal, Lemari Kosong di akhir
    lemarisArray.sort((a, b) => {
      const aUn = isUnassignedLemari(a.label);
      const bUn = isUnassignedLemari(b.label);
      if (aUn && !bUn) return 1;
      if (!aUn && bUn) return -1;
      return a.label.localeCompare(b.label, undefined, { numeric: true });
    });

    return lemarisArray;
  }, [boxes]);

  // Current active lemari data
  const activeLemari = useMemo(() => {
    if (!selectedLemari) return null;
    return hierarchyData.find((l) => l.label === selectedLemari) || null;
  }, [hierarchyData, selectedLemari]);

  // Current active rak data
  const activeRak = useMemo(() => {
    if (!activeLemari || !selectedRak) return null;
    return activeLemari.raks.find((r) => r.rakName === selectedRak) || null;
  }, [activeLemari, selectedRak]);

  // Autocomplete suggestions for Front Page Search Bar
  const frontSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || q.length < 1) return [];

    const trainingMatches = new Set<string>();
    const boxIdMatches = new Set<string>();
    const lemariMatches = new Set<string>();
    const rakMatches = new Set<string>();
    const yearMatches = new Set<string>();

    boxes.forEach((box) => {
      const cTrain = cleanTrainingName(box.nama_pelatihan);
      if (cTrain.toLowerCase().includes(q)) {
        trainingMatches.add(cTrain);
      } else if (box.nama_pelatihan.toLowerCase().includes(q)) {
        trainingMatches.add(box.nama_pelatihan);
      }

      if (box.id_box.toLowerCase().includes(q)) {
        boxIdMatches.add(box.id_box);
      }

      if (box.lokasi?.lemari_label?.toLowerCase().includes(q) || q.startsWith('l')) {
        if (box.lokasi?.lemari_label) lemariMatches.add(box.lokasi.lemari_label);
      }

      if (box.lokasi?.rak?.toLowerCase().includes(q)) {
        if (box.lokasi?.rak) rakMatches.add(box.lokasi.rak);
      }

      if (String(box.tahun_pelaksanaan).includes(q)) {
        yearMatches.add(String(box.tahun_pelaksanaan));
      }
    });

    const result: { label: string; category: 'pelatihan' | 'id_box' | 'lokasi' | 'tahun'; value: string }[] = [];

    Array.from(trainingMatches).slice(0, 4).forEach((t) => {
      result.push({ label: t, category: 'pelatihan', value: t });
    });

    Array.from(boxIdMatches).slice(0, 3).forEach((id) => {
      result.push({ label: id, category: 'id_box', value: id });
    });

    Array.from(lemariMatches).slice(0, 2).forEach((lem) => {
      result.push({ label: lem, category: 'lokasi', value: lem });
    });

    Array.from(rakMatches).slice(0, 2).forEach((r) => {
      result.push({ label: r, category: 'lokasi', value: r });
    });

    Array.from(yearMatches).slice(0, 2).forEach((yr) => {
      result.push({ label: `Tahun ${yr}`, category: 'tahun', value: yr });
    });

    return result.slice(0, 7);
  }, [boxes, searchQuery]);

  // Persistent Quick Nav Toolbar
  const renderQuickNavToolbar = () => (
    <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-2.5 mb-4 flex flex-wrap items-center justify-between gap-2 text-xs">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1 hidden sm:inline">
          Navigasi Cepat:
        </span>
        <button
          onClick={onBackToHome}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
            !selectedLemari
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
          }`}
          title="Kembali ke halaman utama daftar lemari"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Beranda Lemari</span>
        </button>

        {selectedLemari && (
          <button
            onClick={onBackToLemari}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              selectedLemari && !selectedRak
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
            title={`Lihat semua rak di ${selectedLemari}`}
          >
            <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
            <span>Lihat Semua Rak ({selectedLemari})</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {onResetFilter && (
          <button
            onClick={onResetFilter}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg text-xs font-medium transition-colors"
            title="Reset filter pencarian"
          >
            <RotateCcw className="w-3 h-3 text-slate-400" />
            <span>Reset Filter</span>
          </button>
        )}
      </div>
    </div>
  );

  // KHUSUS LEMARI KOSONG / UNASSIGNED STORAGE: Bypass Level 2 (Daftar Rak), arahkan langsung ke Level 3 (Daftar Boks)
  if (selectedLemari && isUnassignedLemari(selectedLemari)) {
    return (
      <div className="space-y-4 mb-6">
        {renderQuickNavToolbar()}

        {/* Breadcrumb Bar */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <nav className="flex items-center gap-2 text-xs font-semibold text-slate-600 flex-wrap">
            <button
              onClick={onBackToHome}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <Home className="w-3.5 h-3.5 text-slate-500" />
              <span>Beranda Lemari</span>
            </button>

            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold shadow-xs">
              <Server className="w-3.5 h-3.5" />
              <span>Lemari Kosong</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-blue-700 text-blue-100">
                {activeLemari?.totalBoxes || 0} / &infin; Boks
              </span>
            </div>
          </nav>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 text-xs">
              <span className="text-blue-800 font-semibold">Status:</span>
              <span className="font-mono font-bold text-blue-900">
                {activeLemari?.totalBoxes || 0} / &infin; Boks
              </span>
              <span className="text-[11px] text-blue-700 font-medium">
                (Penampungan Dinamis)
              </span>
            </div>

            <button
              onClick={onBackToHome}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors self-start sm:self-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Beranda Lemari</span>
            </button>
          </div>
        </div>

        {/* Section Header Banner with Primary Blue Theme */}
        <div className="text-white p-5 rounded-2xl shadow-sm bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border mb-2 bg-blue-500/30 text-blue-200 border-blue-400/30">
                <Server className="w-3.5 h-3.5" />
                <span>Penampungan Dinamis (Holding Area)</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2 flex-wrap">
                <span>Daftar Arsip Boks Unassigned (Penampungan Dinamis)</span>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-blue-500/30 text-blue-100 border border-blue-400/30">
                  {activeLemari?.totalBoxes || 0} / &infin; Boks
                </span>
              </h2>
              <p className="text-xs text-blue-200 mt-1">
                Seluruh boks arsip penampungan sementara / tanpa alokasi lemari fisik ditampilkan secara seragam dalam satu daftar terpadu tanpa batasan kapasitas fisik.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-xl border border-white/15 min-w-[200px]">
              <div className="flex items-center justify-between text-xs text-blue-200 mb-1.5">
                <span>Total Boks Unassigned</span>
                <span className="font-mono font-bold text-white text-sm">
                  {activeLemari?.totalBoxes || 0} Boks
                </span>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg bg-blue-400/20 border border-blue-300/30 text-[11px] font-semibold text-blue-100 mb-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span>Holding Area (Tanpa Batas)</span>
              </div>
              <span className="text-[11px] text-blue-200/90 block text-right font-medium">
                Kapasitas: &infin; (Unlimited)
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // LEVEL 3: When Rak is selected for Physical Lemari, render Breadcrumbs Header
  if (selectedLemari && selectedRak) {
    const isRakFull = activeRak ? activeRak.boxCount >= MAX_RAK_CAPACITY : false;

    return (
      <div className="space-y-4 mb-6">
        {renderQuickNavToolbar()}

        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Breadcrumbs */}
            <nav className="flex items-center flex-wrap gap-2 text-xs font-semibold text-slate-600">
              <button
                onClick={onBackToHome}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                <Home className="w-3.5 h-3.5 text-slate-500" />
                <span>Beranda Lemari</span>
              </button>

              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

              <button
                onClick={onBackToLemari}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                <Server className="w-3.5 h-3.5 text-blue-600" />
                <span>{selectedLemari}</span>
              </button>

              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white font-bold shadow-xs bg-blue-600">
                <Layers className="w-3.5 h-3.5" />
                <span>{selectedRak}</span>
              </div>
            </nav>

            {/* Kapasitas Status & Back Action */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
                <span className="text-slate-500 font-medium">Kapasitas Rak:</span>
                <span className="font-mono font-bold text-slate-800">
                  {activeRak?.boxCount || 0} / {MAX_RAK_CAPACITY} Boks
                </span>
                {isRakFull ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 border border-slate-300">
                    PENUH
                  </span>
                ) : (
                  <span className="text-[11px] text-blue-700 font-semibold">
                    (Sisa {activeRak?.remainingSlots} Slot)
                  </span>
                )}
              </div>

              <button
                onClick={onBackToLemari}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Lihat Semua Rak ({selectedLemari})</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // LEVEL 2: When Lemari is selected, ONLY show the Raks inside this Lemari
  if (selectedLemari && activeLemari) {
    const isUnassigned = isUnassignedLemari(activeLemari.label);
    const isLemariFull = isUnassigned ? false : activeLemari.totalBoxes >= MAX_LEMARI_CAPACITY;
    const lemariPercent = isUnassigned ? 0 : Math.min(100, Math.round((activeLemari.totalBoxes / MAX_LEMARI_CAPACITY) * 100));

    return (
      <div className="space-y-4 mb-6">
        {renderQuickNavToolbar()}

        {/* Breadcrumb Bar */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <nav className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <button
              onClick={onBackToHome}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <Home className="w-3.5 h-3.5 text-slate-500" />
              <span>Beranda Lemari</span>
            </button>

            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white font-bold shadow-xs bg-blue-600">
              <Server className="w-3.5 h-3.5" />
              <span>{selectedLemari}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-blue-700 text-blue-100">
                {activeLemari.totalBoxes} / {MAX_LEMARI_CAPACITY} Boks
              </span>
            </div>
          </nav>

          <button
            onClick={onBackToHome}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors self-start sm:self-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Beranda Lemari</span>
          </button>
        </div>

        {/* Section Header with Lemari Capacity Overview */}
        <div className="text-white p-5 rounded-2xl shadow-sm bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border mb-2 bg-blue-500/30 text-blue-200 border-blue-400/30">
                <Server className="w-3.5 h-3.5" />
                <span>Level 2: Navigasi Rak &amp; Kapasitas</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span>Daftar Rak di {selectedLemari}</span>
                {isLemariFull && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-700 text-slate-200 border border-slate-500">
                    PENUH (44/44)
                  </span>
                )}
              </h2>
              <p className="text-xs text-blue-200 mt-1">
                Kapasitas fisik maksimal: 11 boks per rak (total maksimal 44 boks per lemari).
              </p>
            </div>

            {/* Lemari Capacity Card */}
            <div className="bg-white/10 p-3.5 rounded-xl border border-white/15 min-w-[200px]">
              <div className="flex items-center justify-between text-xs text-blue-200 mb-1.5">
                <span className="font-semibold">Kapasitas Lemari:</span>
                <span className="font-mono font-bold text-white">
                  {activeLemari.totalBoxes} / {MAX_LEMARI_CAPACITY} Boks
                </span>
              </div>
              <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden mb-1">
                <div
                  className="h-full bg-blue-400 transition-all duration-300"
                  style={{ width: `${lemariPercent}%` }}
                />
              </div>
              <span className="text-[11px] text-blue-200 block text-right">
                {isLemariFull ? (
                  <span className="text-slate-300 font-semibold">Kapasitas Penuh (44/44)</span>
                ) : (
                  <span>Tersisa {activeLemari.remainingSlots} Slot</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Grid of Rak Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {activeLemari.raks.map((rak) => {
            const isRakFull = rak.boxCount >= MAX_RAK_CAPACITY;
            const percent = Math.min(100, Math.round((rak.boxCount / MAX_RAK_CAPACITY) * 100));

            return (
              <div
                key={rak.rakName}
                onClick={() => onSelectRak(rak.rakName)}
                className="bg-white rounded-xl border-2 border-slate-200 hover:border-blue-600 hover:shadow-lg transition-all duration-200 p-5 cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white">
                      <Layers className="w-5 h-5" />
                    </div>

                    {/* Badge */}
                    {isRakFull ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                        PENUH (11/11)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200">
                        {rak.boxCount} / {MAX_RAK_CAPACITY} Boks
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {rak.rakName}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {rak.trainingsCount} Skema Pelatihan Terdata
                  </p>

                  {/* Kapasitas Progress Bar */}
                  <div className="mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div className="flex items-center justify-between text-[11px] mb-1 font-medium">
                      <span className="text-slate-500">Status Kapasitas:</span>
                      <span className={isRakFull ? 'text-slate-600 font-bold' : 'text-blue-700 font-semibold'}>
                        {isRakFull ? 'Penuh (11/11)' : `Tersisa ${rak.remainingSlots} Slot`}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                    <span className="flex items-center gap-1 text-slate-700 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>{rak.lengkapCount} Berkas Lengkap</span>
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectRak(rak.rakName);
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-white rounded-lg transition-colors shadow-2xs bg-slate-900 group-hover:bg-blue-600"
                  >
                    <span>Buka Rak Ini</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // LEVEL 1: Initial View / Halaman Depan -> PROMINENT SEARCH BAR + Visual Grid of Lemari (All Blue/Neutral)
  return (
    <div className="space-y-5 mb-6">
      {renderQuickNavToolbar()}

      {/* Requirement 2: SEARCH BAR UTAMA DI HALAMAN DEPAN (LEVEL LEMARI) */}
      <div
        ref={searchContainerRef}
        className="bg-white rounded-2xl border-2 border-blue-200 shadow-md p-4 sm:p-5 relative"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Pencarian Cepat Arsip Seluruh Lemari
              </h3>
              <p className="text-[11px] text-slate-500">
                Cari berdasarkan nama pelatihan, ID boks, tahun, atau nomor boks tanpa harus membuka lemari satu per satu
              </p>
            </div>
          </div>
          <span className="text-[11px] text-blue-600 font-semibold bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100 self-start sm:self-auto">
            Pencarian Otomatis Seluruh Lemari
          </span>
        </div>

        {/* Input Field with Autocomplete */}
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onFocus={() => setIsFrontSuggestionsOpen(true)}
            onChange={(e) => {
              if (onSearchChange) onSearchChange(e.target.value);
              setIsFrontSuggestionsOpen(true);
            }}
            placeholder="Ketik kata kunci pelatihan (contoh: 'jahit', 'comp 1', 'L1', '2024', 'AC')..."
            className="w-full pl-11 pr-10 py-3 bg-slate-50 hover:bg-slate-50/80 focus:bg-white border-2 border-slate-200 focus:border-blue-600 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => {
                if (onSearchChange) onSearchChange('');
                setIsFrontSuggestionsOpen(false);
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors"
              title="Bersihkan pencarian"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Autocomplete Dropdown */}
          {isFrontSuggestionsOpen && frontSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-40 overflow-hidden divide-y divide-slate-100 animate-fade-in">
              <div className="p-2.5 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>Saran Pencarian (Klik untuk Langsung Buka)</span>
                <span className="text-blue-600">Pencarian Langsung</span>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {frontSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (onSearchChange) onSearchChange(item.value);
                      setIsFrontSuggestionsOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left hover:bg-blue-50 transition-colors flex items-center justify-between group text-xs"
                  >
                    <div className="flex items-center gap-2.5 truncate pr-2">
                      {item.category === 'pelatihan' && (
                        <GraduationCap className="w-4 h-4 text-blue-600 shrink-0" />
                      )}
                      {item.category === 'id_box' && (
                        <Package className="w-4 h-4 text-indigo-600 shrink-0" />
                      )}
                      {item.category === 'lokasi' && (
                        <Server className="w-4 h-4 text-sky-600 shrink-0" />
                      )}
                      {item.category === 'tahun' && (
                        <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                      )}
                      <span className="font-semibold text-slate-800 group-hover:text-blue-700 truncate">
                        {item.label}
                      </span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 px-2 py-0.5 rounded bg-slate-100 group-hover:bg-blue-100 group-hover:text-blue-800 shrink-0">
                      {item.category}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-5 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30 mb-2">
              <Boxes className="w-3.5 h-3.5" />
              <span>Level 1: Navigasi Lemari Arsip</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Pilih Lemari Penyimpanan Arsip
            </h2>
            <p className="text-xs text-blue-200 mt-1">
              Kapasitas maksimal: <strong>44 boks per lemari</strong> (4 rak x 11 boks file).
            </p>
          </div>
          <div className="text-left sm:text-right bg-white/10 p-3 rounded-xl border border-white/15">
            <span className="text-[11px] uppercase tracking-wider text-blue-200 block">Total Arsip Terdata</span>
            <span className="text-xl font-mono font-extrabold text-white">
              {boxes.length} Boks Fisik
            </span>
            <span className="text-[11px] text-blue-200 block">
              di {hierarchyData.length} Lemari Aktif
            </span>
          </div>
        </div>
      </div>

      {/* Grid of Lemari Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {hierarchyData.map((lemari) => {
          const isUnassigned = isUnassignedLemari(lemari.label);
          // Ketentuan 1 & 3: Abaikan pengecekan maxCapacity jika lemari memiliki ID/nama "kosong" atau "unassigned" (isFull = false)
          const isFull = isUnassigned ? false : lemari.totalBoxes >= MAX_LEMARI_CAPACITY;
          const percent = isUnassigned ? 0 : Math.min(100, Math.round((lemari.totalBoxes / MAX_LEMARI_CAPACITY) * 100));

          return (
            <div
              key={lemari.label}
              onClick={() => onSelectLemari(lemari.label)}
              className="bg-white rounded-2xl border-2 border-slate-200 hover:border-blue-600 hover:shadow-xl transition-all duration-200 p-5 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
            >
              {/* Top Accent Strip */}
              <div className="absolute top-0 left-0 right-0 h-1.5 transition-opacity bg-gradient-to-r from-blue-600 to-indigo-600 opacity-80 group-hover:opacity-100" />

              <div>
                <div className="flex items-center justify-between mb-3 mt-1">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors shadow-2xs bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white">
                    {isUnassigned ? <Package className="w-6 h-6" /> : <Server className="w-6 h-6" />}
                  </div>

                  {/* Badge Kapasitas: Ketentuan 2 - Sembunyikan format / 44 Boks untuk Lemari Kosong */}
                  {isUnassigned ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-extrabold border bg-blue-50 text-blue-800 border-blue-200 shadow-2xs">
                      {lemari.totalBoxes} / &infin; Boks
                    </span>
                  ) : isFull ? (
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                      PENUH (44/44)
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-extrabold border bg-blue-50 text-blue-800 border-blue-200">
                      {lemari.totalBoxes} / {MAX_LEMARI_CAPACITY} Boks
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                  {lemari.label}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isUnassigned
                    ? `${lemari.totalBoxes} Boks Unassigned • Penampungan Dinamis`
                    : `${lemari.raksCount} Rak Aktif • ${lemari.trainingsCount} Skema Pelatihan`}
                </p>

                {/* Indikator Status & Kapasitas */}
                {isUnassigned ? (
                  <div className="mt-3.5 bg-blue-50/70 p-2.5 rounded-xl border border-blue-200/70">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-blue-900 mb-1">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        <span>Penampungan Dinamis</span>
                      </span>
                      <span className="font-mono text-blue-800">
                        {lemari.totalBoxes} Boks Unassigned
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-blue-700/80">
                      <span>Holding Area / Tanpa Batas</span>
                      <span className="font-bold text-blue-900">Kapasitas: &infin;</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between text-[11px] mb-1 font-medium">
                      <span className="text-slate-500">Kapasitas Lemari:</span>
                      <span className={isFull ? 'text-slate-600 font-bold' : 'text-blue-700 font-semibold'}>
                        {isFull
                          ? 'Penuh (44/44 Boks)'
                          : `Tersisa ${lemari.remainingSlots} Slot Boks`}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Rak / Penampungan Preview */}
                {isUnassigned ? (
                  <div className="mt-3.5 pt-3 border-t border-slate-100">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block mb-2">
                      Penyimpanan Terpadu:
                    </span>
                    <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 px-2.5 py-2 rounded-lg border border-slate-200">
                      <span className="font-medium text-slate-700">Akses Langsung:</span>
                      <span className="font-bold text-blue-700 font-mono">Daftar Boks Lengkap (&infin;)</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3.5 pt-3 border-t border-slate-100">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block mb-2">
                      Daftar Rak &amp; Kapasitasnya:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {lemari.raks.map((r) => {
                        const rFull = r.boxCount >= MAX_RAK_CAPACITY;
                        return (
                          <span
                            key={r.rakName}
                            className="px-2 py-0.5 rounded text-[11px] font-medium border flex items-center gap-1 bg-slate-100 text-slate-700 border-slate-200"
                          >
                            <span>{r.rakName}</span>
                            <span className="font-mono text-[10px]">
                              ({r.boxCount}/{MAX_RAK_CAPACITY})
                            </span>
                            {rFull && (
                              <span className="text-[9px] text-slate-500 font-bold">
                                &bull; PENUH
                              </span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="mt-5 pt-3 border-t border-slate-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectLemari(lemari.label);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-bold text-white rounded-xl transition-colors shadow-sm bg-slate-900 group-hover:bg-blue-600"
                >
                  <span>Buka {isUnassigned ? 'Penampungan Dinamis' : 'Lemari Ini'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
