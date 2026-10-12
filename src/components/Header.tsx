import React from 'react';
import {
  Archive,
  RefreshCw,
  PlusCircle,
  Clock,
  FileSpreadsheet,
  ExternalLink,
} from 'lucide-react';

interface HeaderProps {
  lastSyncTime: string;
  secondsRemaining: number;
  isLoading: boolean;
  onRefresh: () => void;
  onOpenAddModal: () => void;
  totalBoxes: number;
}

export const Header: React.FC<HeaderProps> = ({
  lastSyncTime,
  secondsRemaining,
  isLoading,
  onRefresh,
  onOpenAddModal,
  totalBoxes,
}) => {
  // Format last sync time nicely
  const formattedTime = React.useMemo(() => {
    if (!lastSyncTime) return '-';
    try {
      const d = new Date(lastSyncTime);
      return d.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return lastSyncTime;
    }
  }, [lastSyncTime]);

  // Percentage for the 60s countdown
  const progressPercent = Math.max(0, Math.min(100, ((60 - secondsRemaining) / 60) * 100));

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-700 via-indigo-600 to-sky-700 text-white shadow-md shadow-blue-500/20 ring-1 ring-blue-500/30 shrink-0">
              <Archive className="w-5 h-5" />
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                  Sistem Manajemen Arsip Boks LSP
                </h1>
                {/* Badge Database Aktif bernuansa hijau rapi */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Database Aktif
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Tata Kelola Dokumen &amp; Boks Sertifikasi &bull; <span className="text-slate-700 font-semibold">{totalBoxes} Boks Terdata</span>
              </p>
            </div>
          </div>

          {/* Right Section: Live Sync, Shortcut Buka Spreadsheet, Refresh, and Tambah Boks */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Live Sync Status Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="font-semibold text-slate-700 text-[11px]">Live Sync</span>
              </div>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <Clock className="w-3 h-3 text-slate-400" />
                <span className="hidden sm:inline">Pembaruan:</span>
                <span className="font-mono font-medium text-slate-700">{formattedTime}</span>
              </div>
              <div
                className="hidden md:flex items-center text-[10px] text-blue-600 bg-blue-50/80 px-1.5 py-0.5 rounded border border-blue-100 font-mono"
                title="Sinkronisasi otomatis setiap 60 detik"
              >
                <span>{secondsRemaining}s</span>
              </div>
            </div>

            {/* Tombol Shortcut Buka Spreadsheet */}
            <a
              href="https://docs.google.com/spreadsheets/d/1Cq3QzccIPDSVyXY2dq4S61wHVRJFh0LaP2xT6OViK-M/edit?usp=sharing"
              target="_blank"
              rel="noreferrer noopener"
              onClick={(e) => {
                e.preventDefault();
                window.open(
                  'https://docs.google.com/spreadsheets/d/1Cq3QzccIPDSVyXY2dq4S61wHVRJFh0LaP2xT6OViK-M/edit?usp=sharing',
                  '_blank',
                  'noopener,noreferrer'
                );
              }}
              title="Buka Spreadsheet Master Arsip Google Sheets"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 border border-emerald-300/80 rounded-lg shadow-2xs transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Buka Spreadsheet</span>
              <ExternalLink className="w-3 h-3 text-emerald-600/70 shrink-0 hidden sm:inline" />
            </a>

            {/* Manual Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              title="Perbarui data sekarang"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
              <span className="hidden sm:inline">{isLoading ? 'Menyinkronkan...' : 'Refresh'}</span>
            </button>

            {/* Tambah Boks Baru */}
            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm shadow-blue-500/25 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Tambah Arsip Boks</span>
            </button>
          </div>
        </div>

        {/* 60s Progress indicator bar at bottom of header */}
        <div className="w-full h-0.5 bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </header>
  );
};
