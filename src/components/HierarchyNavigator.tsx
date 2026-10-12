import React, { useState, useRef, useEffect, useMemo } from 'react';
import { BoxArchive, MAX_RAK_CAPACITY, MAX_LEMARI_CAPACITY } from '../types/archive';
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
      const lemLabel = box.lokasi?.lemari_label?.trim() || 'Lemari 1';
      const rakLabel = box.lokasi?.rak?.trim() || 'Rak A';

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
      const raks = Array.from(lem.raksMap.entries()).map(([rakName, rakBoxes]) => {
        const uniqueTrainings = new Set(rakBoxes.map((b) => cleanTrainingName(b.nama_pelatihan)));
        const lengkapCount = rakBoxes.filter((b) => {
          const sa = (b.status_arsip || '').toLowerCase();
          return sa.includes('lengkap') || sa.includes('aktif') || sa.includes('tersedia');
        }).length;

        const isFull = rakBoxes.length >= MAX_RAK_CAPACITY;
        const remainingSlots = Math.max(0, MAX_RAK_CAPACITY - rakBoxes.length);

        return {
          rakName,
          boxCount: rakBoxes.length,
          trainingsCount: uniqueTrainings.size,
          lengkapCount,
          isFull,
          remainingSlots,
          boxes: rakBoxes,
        };
      });

      // Sort raks naturally
      raks.sort((a, b) => a.rakName.localeCompare(b.rakName, undefined, { numeric: true }));

      const uniqueTrainingsInLemari = new Set(lem.boxes.map((b) => cleanTrainingName(b.nama_pelatihan)));
      const isFull = lem.boxes.length >= MAX_LEMARI_CAPACITY;
      const remainingSlots = Math.max(0, MAX_LEMARI_CAPACITY - lem.boxes.length);

      return {
        label: lem.label,
        totalBoxes: lem.boxes.length,
        raksCount: raks.length,
        trainingsCount: uniqueTrainingsInLemari.size,
        isFull,
        remainingSlots,
        raks,
      };
    });

    // Sort lemaris naturally
    lemarisArray.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));

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

  // LEVEL 3: When Rak is selected, render Breadcrumbs Header
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

              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold shadow-xs">
                <Layers className="w-3.5 h-3.5" />
                <span>{selectedRak}</span>
              </div>
            </nav>

            {/* Kapasitas Status & Back Action */}
            <div className="flex items-center gap-3">
              {/* Capacity Badge: Consistent Blue / Neutral theme */}
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

  // LEVEL 2: When Lemari is selected, ONLY show the Raks inside this Lemari with consistent Blue/Neutral colors
  if (selectedLemari && activeLemari) {
    const isLemariFull = activeLemari.totalBoxes >= MAX_LEMARI_CAPACITY;
    const lemariPercent = Math.min(100, Math.round((activeLemari.totalBoxes / MAX_LEMARI_CAPACITY) * 100));

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

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold shadow-xs">
              <Server className="w-3.5 h-3.5" />
              <span>{selectedLemari}</span>
              <span className="text-[10px] bg-blue-700 px-1.5 py-0.2 rounded font-mono">
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
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30 mb-2">
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
                Kapasitas fisik maksimal: <strong>11 boks per rak</strong> (total maksimal 44 boks per lemari).
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

        {/* Grid of Rak Cards: Elegant Blue/Neutral theme with no red borders */}
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
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
                      <Layers className="w-5 h-5" />
                    </div>

                    {/* Small Neutral / Blue Badge when full */}
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

                  {/* Kapasitas Progress Bar in Blue */}
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
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-white bg-slate-900 group-hover:bg-blue-600 rounded-lg transition-colors shadow-2xs"
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

      {/* Grid of Lemari Cards: Requirement 1 - Consistent Elegant Blue/Neutral theme with NO red borders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {hierarchyData.map((lemari) => {
          const isFull = lemari.totalBoxes >= MAX_LEMARI_CAPACITY;
          const percent = Math.min(100, Math.round((lemari.totalBoxes / MAX_LEMARI_CAPACITY) * 100));

          return (
            <div
              key={lemari.label}
              onClick={() => onSelectLemari(lemari.label)}
              className="bg-white rounded-2xl border-2 border-slate-200 hover:border-blue-600 hover:shadow-xl transition-all duration-200 p-5 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
            >
              {/* Top Accent Strip in Blue */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-80 group-hover:opacity-100 transition-opacity" />

              <div>
                <div className="flex items-center justify-between mb-3 mt-1">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors shadow-2xs">
                    <Server className="w-6 h-6" />
                  </div>

                  {/* Badge Kapasitas: Neutral / Blue without red */}
                  {isFull ? (
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
                  {lemari.raksCount} Rak Aktif &bull; {lemari.trainingsCount} Skema Pelatihan
                </p>

                {/* Progress Bar Kapasitas in Blue */}
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

                {/* Rak Pills Preview */}
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
              </div>

              {/* Action Button */}
              <div className="mt-5 pt-3 border-t border-slate-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectLemari(lemari.label);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-bold text-white rounded-xl bg-slate-900 group-hover:bg-blue-600 transition-colors shadow-sm"
                >
                  <span>Buka Lemari Ini</span>
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
