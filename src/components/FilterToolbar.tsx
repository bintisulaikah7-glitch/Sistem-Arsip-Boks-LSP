import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FilterOptions, BoxArchive } from '../types/archive';
import { cleanTrainingName } from '../services/api';
import {
  Search,
  Filter,
  X,
  LayoutGrid,
  ListFilter,
  Printer,
  Table,
  Home,
  FolderOpen,
  RotateCcw,
  Sparkles,
  GraduationCap,
  Package,
  Server,
  Calendar,
} from 'lucide-react';

interface FilterToolbarProps {
  filters: FilterOptions;
  boxes: BoxArchive[];
  onFilterChange: (newFilters: Partial<FilterOptions>) => void;
  onResetFilters: () => void;
  viewMode: 'grid' | 'table';
  onToggleViewMode: (mode: 'grid' | 'table') => void;
  totalFiltered: number;
  totalAll: number;
  availableYears: number[];
  availableStatusArsip: string[];
  availableStatusBarang: string[];
  onOpenBatchPrint: () => void;
  selectedLemari?: string;
  selectedRak?: string;
  onBackToHome?: () => void;
  onBackToLemari?: () => void;
}

export const FilterToolbar: React.FC<FilterToolbarProps> = ({
  filters,
  boxes,
  onFilterChange,
  onResetFilters,
  viewMode,
  onToggleViewMode,
  totalFiltered,
  totalAll,
  availableYears,
  availableStatusArsip,
  availableStatusBarang,
  onOpenBatchPrint,
  selectedLemari,
  selectedRak,
  onBackToHome,
  onBackToLemari,
}) => {
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const hasActiveFilters = Boolean(
    filters.searchQuery ||
    filters.statusArsip ||
    filters.statusBarang ||
    filters.tahun
  );

  // Close suggestions when clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsSuggestionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute smart autocomplete suggestions based on current input
  const suggestions = useMemo(() => {
    const q = filters.searchQuery.trim().toLowerCase();
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

    return result.slice(0, 8);
  }, [boxes, filters.searchQuery]);

  const handleSelectSuggestion = (val: string) => {
    onFilterChange({ searchQuery: val });
    setIsSuggestionsOpen(false);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 mb-6" ref={containerRef}>
      {/* Quick Nav Shortcut Bar inside Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">
            Navigasi:
          </span>

          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
              title="Kembali ke Beranda Lemari"
            >
              <Home className="w-3.5 h-3.5 text-slate-500" />
              <span>Beranda Lemari</span>
            </button>
          )}

          {selectedLemari && onBackToLemari && (
            <button
              onClick={onBackToLemari}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
              title="Lihat Semua Rak di Lemari Ini"
            >
              <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
              <span>Lihat Semua Rak ({selectedLemari})</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md font-semibold transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Search input with Fuzzy Autocomplete Dropdown */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filters.searchQuery}
            onFocus={() => setIsSuggestionsOpen(true)}
            onChange={(e) => {
              onFilterChange({ searchQuery: e.target.value });
              setIsSuggestionsOpen(true);
            }}
            placeholder="Ketik pencarian fleksibel (contoh: 'jahit', 'comp 1', 'L1', '2024', 'AC')..."
            className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          {filters.searchQuery && (
            <button
              onClick={() => {
                onFilterChange({ searchQuery: '' });
                setIsSuggestionsOpen(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Autocomplete Suggestions Dropdown */}
          {isSuggestionsOpen && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-40 overflow-hidden divide-y divide-slate-100 animate-fade-in">
              <div className="p-2 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>Saran Kata Kunci (Pencocokan Sebagian / Fuzzy)</span>
                <span className="text-slate-400">Klik untuk memilih</span>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {suggestions.map((item, idx) => {
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSuggestion(item.value)}
                      className="w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors flex items-center justify-between group text-xs"
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        {item.category === 'pelatihan' && (
                          <GraduationCap className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        )}
                        {item.category === 'id_box' && (
                          <Package className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        )}
                        {item.category === 'lokasi' && (
                          <Server className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        )}
                        {item.category === 'tahun' && (
                          <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        )}
                        <span className="font-medium text-slate-800 group-hover:text-blue-700 truncate">
                          {item.label}
                        </span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 px-1.5 py-0.5 rounded bg-slate-100 group-hover:bg-blue-100 group-hover:text-blue-800 shrink-0">
                        {item.category}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Dropdown Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Arsip Filter */}
          <div className="flex items-center gap-1.5">
            <select
              value={filters.statusArsip}
              onChange={(e) => onFilterChange({ statusArsip: e.target.value })}
              className="px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Status Arsip: Semua</option>
              {availableStatusArsip.map((status) => (
                <option key={status} value={status}>
                  Arsip: {status}
                </option>
              ))}
            </select>
          </div>

          {/* Status Barang Filter */}
          <div className="flex items-center gap-1.5">
            <select
              value={filters.statusBarang}
              onChange={(e) => onFilterChange({ statusBarang: e.target.value })}
              className="px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Status Barang: Semua</option>
              {availableStatusBarang.map((status) => (
                <option key={status} value={status}>
                  Barang: {status}
                </option>
              ))}
            </select>
          </div>

          {/* Tahun Filter */}
          <div className="flex items-center gap-1.5">
            <select
              value={filters.tahun}
              onChange={(e) => onFilterChange({ tahun: e.target.value })}
              className="px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tahun: Semua</option>
              {availableYears.map((yr) => (
                <option key={yr} value={String(yr)}>
                  Tahun {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters button */}
          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 rounded-lg transition-colors"
              title="Reset semua filter pencarian"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          {/* Cetak Stiker Label Massal */}
          <button
            onClick={onOpenBatchPrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors"
            title="Cetak label stiker QR code untuk boks terpilih"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Cetak Label ({totalFiltered})</span>
          </button>

          {/* Grid vs Table View Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => onToggleViewMode('grid')}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-blue-600 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Tampilan Grid Card"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => onToggleViewMode('table')}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-blue-600 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Tampilan Tabel Detail"
            >
              <Table className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Info Bar */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span>
            Menampilkan <strong className="text-slate-800 font-mono">{totalFiltered}</strong> dari{' '}
            <strong className="text-slate-800 font-mono">{totalAll}</strong> arsip boks
          </span>
          {hasActiveFilters && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-blue-50 text-blue-700 border border-blue-200 font-medium">
              Filter Aktif
            </span>
          )}
        </div>
        <span className="text-slate-400 text-[11px] hidden sm:inline">
          Tip: Pencarian otomatis mencocokkan kata kunci sebagian (seperti 'jahit', 'comp 1', 'L1', '2024')
        </span>
      </div>
    </div>
  );
};
