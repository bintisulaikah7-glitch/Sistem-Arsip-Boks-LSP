import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { BoxArchive, FilterOptions, isUnassignedLemari } from './types/archive';
import {
  fetchArchiveBoxes,
  saveArchiveBox,
  cleanTrainingName,
  matchesFuzzyQuery,
  getCachedArchiveBoxes,
  saveArchiveBoxesToCache,
  computeDataHash,
  ensureUniqueBoxIds,
} from './services/api';
import { Header } from './components/Header';
import { StatsOverview } from './components/StatsOverview';
import { HierarchyNavigator } from './components/HierarchyNavigator';
import { FilterToolbar } from './components/FilterToolbar';
import { BoxCard } from './components/BoxCard';
import { BoxTable } from './components/BoxTable';
import { BoxDetailModal } from './components/BoxDetailModal';
import { BoxFormModal } from './components/BoxFormModal';
import { QuickScannerModal } from './components/QuickScannerModal';
import { BatchLabelPrintModal } from './components/BatchLabelPrintModal';
import { Pagination } from './components/Pagination';
import {
  Package,
  Layers,
  Inbox,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  PlusCircle,
  QrCode,
  ShieldCheck,
  Search,
  X,
  ArrowLeft,
  Home,
  WifiOff,
  CloudOff,
} from 'lucide-react';

const SYNC_INTERVAL_SECONDS = 60;

export default function App() {
  // 1. Penerapan Cache (LocalStorage):
  // Saat aplikasi pertama kali dimuat, render data langsung dari localStorage agar tampilan instan tanpa menunggu loading network
  const [boxes, setBoxes] = useState<BoxArchive[]>(() => {
    const cached = getCachedArchiveBoxes();
    return cached ? ensureUniqueBoxIds(cached.data) : [];
  });
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => {
    const cached = getCachedArchiveBoxes();
    return cached ? cached.timestamp : '';
  });
  const [dataHash, setDataHash] = useState<string>(() => {
    const cached = getCachedArchiveBoxes();
    return cached ? cached.hash : '';
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const cached = getCachedArchiveBoxes();
    return !cached; // Jika cache sudah ada di browser, instan tanpa skeleton loading!
  });
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(SYNC_INTERVAL_SECONDS);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Status Koneksi (Online / Offline / Server Error)
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'error'>(() => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return 'offline';
    }
    return 'online';
  });

  // 2. Status Tab Browser Aktif / Inaktif (untuk pause timer Live Sync saat tab hidden)
  const [isTabActive, setIsTabActive] = useState<boolean>(() => {
    return typeof document !== 'undefined' ? !document.hidden : true;
  });

  // Toast feedback state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Drill-down selection states:
  // Step 1: selectedLemari = '' -> Show Lemari Grid
  // Step 2: selectedLemari = 'Lemari 1', selectedRak = '' -> Show Rak Grid
  // Step 3: selectedLemari = 'Lemari 1', selectedRak = 'Rak A' -> Show Box Grid/Table
  const [selectedLemari, setSelectedLemari] = useState<string>('');
  const [selectedRak, setSelectedRak] = useState<string>('');

  // Filters state (for search & status inside current view or global)
  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: '',
    lemari: '',
    rak: '',
    statusArsip: '',
    statusBarang: '',
    tahun: '',
  });

  // View mode for boxes
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals state
  const [selectedBox, setSelectedBox] = useState<BoxArchive | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [boxToEdit, setBoxToEdit] = useState<BoxArchive | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isBatchPrintOpen, setIsBatchPrintOpen] = useState<boolean>(false);

  // Show toast notification helper
  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  }, []);

  const handleOpenBoxDetail = useCallback((box: BoxArchive) => {
    setSelectedBox(box);
    setIsDetailOpen(true);
  }, []);

  const handleCloseBoxDetail = useCallback(() => {
    setIsDetailOpen(false);
    setSelectedBox(null);
  }, []);

  // Fetch archives from Google Apps Script Web App dengan Smart Polling & Offline Handling
  const loadData = useCallback(
    async (isSilent = false) => {
      if (!isSilent) {
        setIsRefreshing(true);
      }
      try {
        const currentHash = dataHash || (boxes.length > 0 ? computeDataHash(boxes) : '');
        const result = await fetchArchiveBoxes({ currentHash });

        // 3. Handling Network Error / Offline:
        // Jika fetch gagal atau timeout, pertahankan data dari localStorage/state agar UI tidak kosong/blank
        if (result.isError) {
          setConnectionStatus(result.isOffline ? 'offline' : 'error');
          setErrorMessage(result.error || 'Gagal terhubung ke Google Apps Script.');

          // Pertahankan data cache lokal jika data state saat ini kosong
          if (result.data && result.data.length > 0 && boxes.length === 0) {
            setBoxes(result.data);
            setLastSyncTime(result.timestamp);
            setDataHash(result.hash);
          }

          if (!isSilent) {
            showToast(
              result.isOffline
                ? 'Mode offline aktif. Menampilkan data dari cache LocalStorage.'
                : 'Gagal terhubung ke server. Menggunakan data tersimpan di cache.',
              'error'
            );
          }
          return boxes.length > 0 ? boxes : result.data;
        }

        // Koneksi berhasil dan online
        setConnectionStatus('online');
        setErrorMessage(null);
        setLastSyncTime(result.timestamp);
        setSecondsRemaining(SYNC_INTERVAL_SECONDS);

        // 2. Optimasi Smart Polling: Jangan tarik/timpa seluruh data jika data tidak mengalami perubahan
        if (result.hasChanged) {
          setBoxes(result.data);
          setDataHash(result.hash);
          if (!isSilent) {
            showToast(`Sinkronisasi sukses: ${result.data.length} boks arsip dimuat.`, 'success');
          }
        } else {
          // Data identik/tidak berubah: tidak trigger re-render array boxes
          if (!isSilent) {
            showToast(`Data arsip telah terverifikasi up-to-date (${result.data.length} boks).`, 'info');
          }
        }
        return result.data;
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setConnectionStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error');
        setErrorMessage(err?.message || 'Gagal memuat data dari API.');

        // Fallback ke cache jika data masih kosong
        const fallback = getCachedArchiveBoxes();
        if (fallback && boxes.length === 0) {
          setBoxes(fallback.data);
          setLastSyncTime(fallback.timestamp);
          setDataHash(fallback.hash);
        }

        if (!isSilent) {
          showToast('Koneksi bermasalah. Tetap menampilkan data dari cache.', 'error');
        }
        return boxes;
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [boxes, dataHash, showToast]
  );

  // Listener untuk status Online / Offline browser
  useEffect(() => {
    const handleOnline = () => {
      setConnectionStatus('online');
      showToast('Koneksi internet terhubung kembali! Menyinkronkan data...', 'info');
      loadData(true);
    };

    const handleOffline = () => {
      setConnectionStatus('offline');
      showToast('Perangkat offline. Menampilkan data dari cache LocalStorage.', 'error');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadData, showToast]);

  // 2. Optimasi Smart Polling: Pantau tab browser (document.hidden)
  useEffect(() => {
    const handleVisibilityChange = () => {
      const active = !document.hidden;
      setIsTabActive(active);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Logika di dalam useEffect utama saat aplikasi pertama kali dimuat
  useEffect(() => {
    const initApp = async () => {
      // Jika belum ada data dari cache, tampilkan skeleton loading
      if (boxes.length === 0) {
        setIsLoading(true);
      }

      // Validasi & sinkronisasi data dengan server di background
      const loadedBoxes = await loadData(true);
      const activeBoxes = loadedBoxes && loadedBoxes.length > 0 ? loadedBoxes : boxes;

      // Ambil parameter 'box' dari URL
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        let targetBox = urlParams.get('box') || urlParams.get('id');

        // Fallback jika parameter berada di URL hash
        if (!targetBox && window.location.hash) {
          const hashClean = window.location.hash.replace(/^#[?\/]?/, '');
          const hashParams = new URLSearchParams(hashClean);
          targetBox = hashParams.get('box') || hashParams.get('id');
        }

        // Jika targetBox ada, cari boks yang cocok di data API lalu otomatis jalankan setSelectedBox(foundBox) dan setIsDetailOpen(true)
        if (targetBox && activeBoxes && activeBoxes.length > 0) {
          let decoded = '';
          try {
            decoded = decodeURIComponent(targetBox.replace(/\+/g, ' ')).trim();
          } catch {
            decoded = targetBox.trim();
          }

          const targetLower = decoded.toLowerCase();
          const targetNoSpace = targetLower.replace(/\s+/g, '');

          // Cari boks yang cocok
          const foundBox = activeBoxes.find((b) => {
            const bId = (b.id_box || '').trim().toLowerCase();
            const bIdNoSpace = bId.replace(/\s+/g, '');
            return (
              bId === targetLower ||
              bIdNoSpace === targetNoSpace ||
              bId.includes(targetLower) ||
              targetLower.includes(bId)
            );
          });

          if (foundBox) {
            // Otomatis buka Modal Detail Boks langsung di layar HP!
            setSelectedBox(foundBox);
            setIsDetailOpen(true);

            if (foundBox.lokasi?.lemari_label) {
              setSelectedLemari(foundBox.lokasi.lemari_label);
            }
            if (foundBox.lokasi?.rak) {
              setSelectedRak(foundBox.lokasi.rak);
            }

            showToast(`Boks "${foundBox.id_box}" langsung terbuka dari scan QR!`, 'success');
          } else {
            showToast(`Boks "${decoded}" tidak ditemukan di database arsip.`, 'error');
          }
        }
      }
    };

    initApp();
  }, [loadData, showToast]);

  // 2. 60-Second Real-Time Polling Timer:
  // Hentikan/Pause timer Live Sync saat tab browser sedang tidak aktif (document.hidden)
  useEffect(() => {
    const timer = setInterval(() => {
      // Hentikan/Pause timer Live Sync saat tab browser sedang tidak aktif
      if (typeof document !== 'undefined' && document.hidden) {
        return; // Jangan jalankan polling atau kurangi countdown saat tab hidden
      }

      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          loadData(true);
          return SYNC_INTERVAL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loadData]);

  // Pembaruan data / sync lokal agar data baru langsung muncul di tabel & filter tanpa reload halaman
  const handleLocalSyncBox = useCallback((boxData: BoxArchive, isEdit: boolean) => {
    setBoxes((prev) => {
      const exists = prev.some((b) => b.id_box === boxData.id_box);
      let updated: BoxArchive[];
      if (isEdit || exists) {
        updated = prev.map((b) => (b.id_box === boxData.id_box ? boxData : b));
      } else {
        updated = [boxData, ...prev];
      }
      const newHash = saveArchiveBoxesToCache(updated);
      setDataHash(newHash);
      return updated;
    });
  }, []);

  // Handle saving new or updated box
  const handleSaveBox = async (boxData: BoxArchive, isEdit: boolean) => {
    handleLocalSyncBox(boxData, isEdit);

    try {
      await saveArchiveBox(boxData, isEdit);
      showToast(
        isEdit
          ? `Perubahan boks "${boxData.id_box}" berhasil disimpan ke backend!`
          : `Boks baru "${boxData.id_box}" berhasil ditambahkan ke backend!`,
        'success'
      );
    } catch (err: any) {
      showToast('Data tersimpan secara lokal. Gagal sinkron ke Google Apps Script.', 'error');
      throw err;
    }
  };

  // Helper values for autocomplete & filters
  const existingLemaris = useMemo(() => {
    const set = new Set<string>();
    boxes.forEach((b) => {
      const label = b.lokasi?.lemari_label?.trim();
      if (label) {
        if (isUnassignedLemari(label)) {
          set.add('Lemari Kosong');
        } else {
          set.add(label);
        }
      }
    });
    // Selalu pastikan opsi Lemari Kosong tersedia sebagai Holding Area
    set.add('Lemari Kosong');
    const arr = Array.from(set);
    return arr.sort((a, b) => {
      const aUn = isUnassignedLemari(a);
      const bUn = isUnassignedLemari(b);
      if (aUn && !bUn) return 1;
      if (!aUn && bUn) return -1;
      return a.localeCompare(b, undefined, { numeric: true });
    });
  }, [boxes]);

  const existingRaks = useMemo(() => {
    const set = new Set<string>();
    boxes.forEach((b) => {
      const r = b.lokasi?.rak?.trim();
      if (r) {
        if (isUnassignedLemari(r)) {
          set.add('Unassigned');
        } else {
          set.add(r);
        }
      }
    });
    const arr = Array.from(set);
    return arr.length > 0 ? arr.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })) : ['Rak A', 'Rak B', 'Rak C', 'Rak D'];
  }, [boxes]);

  const availableYears = useMemo(() => {
    const set = new Set<number>();
    boxes.forEach((b) => {
      if (b.tahun_pelaksanaan) set.add(b.tahun_pelaksanaan);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [boxes]);

  const availableStatusArsip = useMemo(() => {
    const set = new Set<string>();
    boxes.forEach((b) => {
      if (b.status_arsip) set.add(b.status_arsip.trim());
    });
    return Array.from(set).sort();
  }, [boxes]);

  const availableStatusBarang = useMemo(() => {
    const set = new Set<string>();
    boxes.forEach((b) => {
      if (b.status_barang) set.add(b.status_barang.trim());
    });
    return Array.from(set).sort();
  }, [boxes]);

  // Global search flag
  const isGlobalSearchActive = Boolean(filters.searchQuery.trim());

  // Filtered Boxes computation for Level 3 (Boks) or Global Search
  const displayBoxes = useMemo(() => {
    return boxes.filter((box) => {
      // Requirement 2: Flexible Fuzzy Substring Multi-Token Matcher
      if (filters.searchQuery && !matchesFuzzyQuery(box, filters.searchQuery)) {
        return false;
      }

      // If global search is NOT active, enforce strict Drill-down matching
      if (!isGlobalSearchActive) {
        if (selectedLemari) {
          const isSelectedLemUnassigned = isUnassignedLemari(selectedLemari);
          const boxLem = box.lokasi?.lemari_label;
          if (isSelectedLemUnassigned) {
            if (!isUnassignedLemari(boxLem)) return false;
          } else if (boxLem?.toLowerCase() !== selectedLemari.toLowerCase()) {
            return false;
          }
        }

        if (selectedRak) {
          const isSelectedRakUnassigned = isUnassignedLemari(selectedRak);
          const boxRak = box.lokasi?.rak;
          if (isSelectedRakUnassigned) {
            if (!isUnassignedLemari(boxRak)) return false;
          } else if (boxRak?.toLowerCase() !== selectedRak.toLowerCase()) {
            return false;
          }
        }
      }

      // Status Arsip filter
      if (filters.statusArsip && box.status_arsip?.toLowerCase() !== filters.statusArsip.toLowerCase()) {
        return false;
      }

      // Status Barang filter
      if (filters.statusBarang && box.status_barang?.toLowerCase() !== filters.statusBarang.toLowerCase()) {
        return false;
      }

      // Tahun filter
      if (filters.tahun && String(box.tahun_pelaksanaan) !== filters.tahun) {
        return false;
      }

      return true;
    });
  }, [boxes, selectedLemari, selectedRak, filters, isGlobalSearchActive]);

  // Pagination State (Level 3 & Pencarian Boks)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(12);
  const boxListTopRef = useRef<HTMLDivElement>(null);

  // Requirement 3: Jika pengguna melakukan pencarian (filter) atau berpindah lemari/rak, pagination harus menyesuaikan secara otomatis
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, selectedLemari, selectedRak]);

  const totalPages = Math.max(1, Math.ceil(displayBoxes.length / itemsPerPage));

  // Pastikan currentPage tidak melebihi totalPages saat hasil filter mengecil
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Batasi daftar boks yang di-render sesuai halaman aktif
  const paginatedBoxes = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return displayBoxes.slice(start, start + itemsPerPage);
  }, [displayBoxes, currentPage, itemsPerPage]);

  // Requirement 4: Saat halaman berganti, gulirkan posisi layar kembali ke atas daftar boks secara halus
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    if (boxListTopRef.current) {
      boxListTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleItemsPerPageChange = useCallback((newCount: number) => {
    setItemsPerPage(newCount);
    setCurrentPage(1);
    if (boxListTopRef.current) {
      boxListTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Handlers for Drill-down Navigation
  const handleSelectLemari = (lemari: string) => {
    setSelectedLemari(lemari);
    setSelectedRak(''); // reset rak when changing lemari
    setFilters((prev) => ({ ...prev, searchQuery: '' })); // clear search
  };

  const handleSelectRak = (rak: string) => {
    setSelectedRak(rak);
  };

  const handleBackToLemari = () => {
    setSelectedRak('');
  };

  const handleBackToHome = () => {
    setSelectedLemari('');
    setSelectedRak('');
    setFilters((prev) => ({ ...prev, searchQuery: '' }));
  };

  const handleResetAllFilters = () => {
    setFilters({
      searchQuery: '',
      lemari: '',
      rak: '',
      statusArsip: '',
      statusBarang: '',
      tahun: '',
    });
  };

  // Requirement 3: Handler when camera scanner or quick code finds a box
  const handleDirectBoxFromScanner = (box: BoxArchive) => {
    // LANGSUNG buka Modal Detail Data Boks tersebut secara otomatis!
    handleOpenBoxDetail(box);

    // Bawa view navigasi ke lemari & rak boks tersebut
    if (box.lokasi?.lemari_label) {
      setSelectedLemari(box.lokasi.lemari_label);
    }
    if (box.lokasi?.rak) {
      setSelectedRak(box.lokasi.rak);
    }

    showToast(`Boks "${box.id_box}" dibuka via scan barcode!`, 'success');
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans">
      {/* Toast Feedback */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce-in max-w-sm">
          <div
            className={`px-4 py-3 rounded-xl shadow-xl border flex items-center gap-2.5 text-xs font-semibold ${
              toast.type === 'success'
                ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
                : toast.type === 'error'
                ? 'bg-rose-900 text-rose-100 border-rose-700'
                : 'bg-slate-900 text-slate-100 border-slate-700'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header Bar: Simplified without scan button per Requirement 3 */}
      <Header
        lastSyncTime={lastSyncTime}
        secondsRemaining={secondsRemaining}
        isLoading={isRefreshing}
        onRefresh={() => loadData(false)}
        onOpenAddModal={() => {
          setBoxToEdit(null);
          setIsFormModalOpen(true);
        }}
        totalBoxes={boxes.length}
        connectionStatus={connectionStatus}
        isTabActive={isTabActive}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Requirement 2: Perbaikan Perhitungan Dashboard (Deduplikasi Pelatihan & Mencegah Total Double) */}
        <StatsOverview boxes={boxes} filteredCount={displayBoxes.length} />

        {/* Global Search Bar Active Banner (jika pengguna mencari kata kunci spesifik) */}
        {isGlobalSearchActive ? (
          <div className="space-y-4 mb-6">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-blue-900 font-semibold">
                <Search className="w-4 h-4 text-blue-600" />
                <span>
                  Hasil Pencarian Global: Menemukan <strong>{displayBoxes.length}</strong> boks dari seluruh lemari untuk kata kunci "
                  {filters.searchQuery}"
                </span>
              </div>
              <button
                onClick={() => setFilters((prev) => ({ ...prev, searchQuery: '' }))}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 text-blue-700 border border-blue-300 rounded-lg text-xs font-bold transition-colors shadow-2xs"
              >
                <X className="w-3.5 h-3.5" />
                <span>Tutup Pencarian &amp; Kembali ke Lemari</span>
              </button>
            </div>

            {/* Filter Toolbar for search */}
            <FilterToolbar
              filters={filters}
              boxes={boxes}
              onFilterChange={(newFilters) => setFilters((prev) => ({ ...prev, ...newFilters }))}
              onResetFilters={handleResetAllFilters}
              viewMode={viewMode}
              onToggleViewMode={setViewMode}
              totalFiltered={displayBoxes.length}
              totalAll={boxes.length}
              availableYears={availableYears}
              availableStatusArsip={availableStatusArsip}
              availableStatusBarang={availableStatusBarang}
              onOpenBatchPrint={() => setIsBatchPrintOpen(true)}
              selectedLemari={selectedLemari}
              selectedRak={selectedRak}
              onBackToHome={handleBackToHome}
              onBackToLemari={handleBackToLemari}
            />

            {/* Anchor for smooth scroll */}
            <div ref={isGlobalSearchActive ? boxListTopRef : undefined} className="scroll-mt-6" />

            {/* Render Box Results */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedBoxes.map((box, idx) => (
                  <BoxCard
                    key={`${box.id_box || 'box'}-${idx}`}
                    box={box}
                    onSelectBox={handleOpenBoxDetail}
                    onEditBox={(b) => {
                      setBoxToEdit(b);
                      setIsFormModalOpen(true);
                    }}
                  />
                ))}
              </div>
            ) : (
              <BoxTable
                boxes={paginatedBoxes}
                onSelectBox={handleOpenBoxDetail}
                onEditBox={(b) => {
                  setBoxToEdit(b);
                  setIsFormModalOpen(true);
                }}
              />
            )}

            {/* Pagination Controls */}
            {displayBoxes.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={displayBoxes.length}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
                className="mt-6"
              />
            )}
          </div>
        ) : (
          /* Requirement 1: STRICT DRILL-DOWN NAVIGATION */
          <>
            {/* Level 1 (Lemari) or Level 2 (Rak) or Level 3 (Boks) Header */}
            <HierarchyNavigator
              boxes={boxes}
              selectedLemari={selectedLemari}
              selectedRak={selectedRak}
              onSelectLemari={handleSelectLemari}
              onSelectRak={handleSelectRak}
              onBackToLemari={handleBackToLemari}
              onBackToHome={handleBackToHome}
              onResetFilter={handleResetAllFilters}
              searchQuery={filters.searchQuery}
              onSearchChange={(q) => setFilters((prev) => ({ ...prev, searchQuery: q }))}
            />

            {/* LEVEL 3: Tampilkan DAFTAR BOKS FILE di dalam Rak hanya saat Rak sudah dipilih */}
            {selectedLemari && selectedRak && (
              <div className="space-y-4">
                {/* Filter and View mode toolbar for this rack */}
                <FilterToolbar
                  filters={filters}
                  boxes={boxes}
                  onFilterChange={(newFilters) => setFilters((prev) => ({ ...prev, ...newFilters }))}
                  onResetFilters={handleResetAllFilters}
                  viewMode={viewMode}
                  onToggleViewMode={setViewMode}
                  totalFiltered={displayBoxes.length}
                  totalAll={boxes.length}
                  availableYears={availableYears}
                  availableStatusArsip={availableStatusArsip}
                  availableStatusBarang={availableStatusBarang}
                  onOpenBatchPrint={() => setIsBatchPrintOpen(true)}
                  selectedLemari={selectedLemari}
                  selectedRak={selectedRak}
                  onBackToHome={handleBackToHome}
                  onBackToLemari={handleBackToLemari}
                />

                {/* Box cards or Table in this Rak */}
                {isLoading && boxes.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
                    <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-slate-800">Menyinkronkan data arsip...</h3>
                  </div>
                ) : displayBoxes.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center shadow-xs">
                    <Inbox className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-slate-800">Tidak ada boks file di rak ini</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      Belum ada arsip boks tersimpan di {selectedLemari} &bull; {selectedRak}.
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <button
                        onClick={handleBackToLemari}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                      >
                        Pilih Rak Lain
                      </button>
                      <button
                        onClick={() => {
                          setBoxToEdit(null);
                          setIsFormModalOpen(true);
                        }}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors"
                      >
                        Tambah Boks di Rak Ini
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Anchor for smooth scroll */}
                    <div ref={!isGlobalSearchActive ? boxListTopRef : undefined} className="scroll-mt-6" />

                    {viewMode === 'grid' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {paginatedBoxes.map((box, idx) => (
                          <BoxCard
                            key={`${box.id_box || 'box'}-${idx}`}
                            box={box}
                            onSelectBox={handleOpenBoxDetail}
                            onEditBox={(b) => {
                              setBoxToEdit(b);
                              setIsFormModalOpen(true);
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <BoxTable
                        boxes={paginatedBoxes}
                        onSelectBox={handleOpenBoxDetail}
                        onEditBox={(b) => {
                          setBoxToEdit(b);
                          setIsFormModalOpen(true);
                        }}
                      />
                    )}

                    {/* Pagination Controls */}
                    {displayBoxes.length > 0 && (
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={displayBoxes.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={handlePageChange}
                        onItemsPerPageChange={handleItemsPerPageChange}
                        className="mt-6"
                      />
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-xs text-slate-500 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Sistem Manajemen Arsip Boks LSP</span>
            <span className="text-slate-300">&bull;</span>
            <span>Navigasi Berjenjang: Lemari &rarr; Rak &rarr; Boks</span>
          </div>
          <div>
            <span>Live Polling GAS 60 Detik &bull; Terdata {boxes.length} Boks Fisik</span>
          </div>
        </div>
      </footer>

      {/* Requirement 3: Modal Detail Data Boks (Otomatis terbuka saat pindaian / klik) */}
      <BoxDetailModal
        isOpen={isDetailOpen}
        box={selectedBox}
        onClose={handleCloseBoxDetail}
        onEdit={(b) => {
          handleCloseBoxDetail();
          setBoxToEdit(b);
          setIsFormModalOpen(true);
        }}
      />

      {/* Modal Form Tambah/Edit Data */}
      <BoxFormModal
        isOpen={isFormModalOpen}
        boxToEdit={boxToEdit}
        boxes={boxes}
        onClose={() => {
          setIsFormModalOpen(false);
          setBoxToEdit(null);
        }}
        onSave={handleSaveBox}
        onLocalSync={handleLocalSyncBox}
        showToast={showToast}
        existingLemaris={existingLemaris}
        existingRaks={existingRaks}
      />

      {/* Requirement 3: Quick Scanner & Barcode Lookup Camera Modal */}
      <QuickScannerModal
        isOpen={isScannerOpen}
        boxes={boxes}
        onClose={() => setIsScannerOpen(false)}
        onSelectBox={handleDirectBoxFromScanner}
      />

      {/* Modal Cetak Label Massal */}
      <BatchLabelPrintModal
        isOpen={isBatchPrintOpen}
        boxes={displayBoxes}
        onClose={() => setIsBatchPrintOpen(false)}
      />
    </div>
  );
}
