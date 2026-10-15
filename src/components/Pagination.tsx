import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  className = '',
}) => {
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers with smart ellipsis windowing
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        start = 2;
        end = 4;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
        end = totalPages - 1;
      }

      if (start > 2) {
        pages.push('...');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push('...');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 shadow-2xs px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${className}`}
    >
      {/* Left Info: Summary info & Items Per Page Selector */}
      <div className="flex flex-wrap items-center gap-3 text-slate-600 order-2 sm:order-1">
        <div className="flex items-center gap-1.5 font-medium">
          <span>Menampilkan</span>
          <span className="font-mono font-bold text-slate-800">
            {startItem}&ndash;{endItem}
          </span>
          <span>dari</span>
          <span className="font-mono font-bold text-blue-700">{totalItems}</span>
          <span>boks</span>
        </div>

        {onItemsPerPageChange && (
          <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
            <span className="text-slate-500">Per hal:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value={12}>12 boks</option>
              <option value={18}>18 boks</option>
              <option value={24}>24 boks</option>
              <option value={36}>36 boks</option>
            </select>
          </div>
        )}
      </div>

      {/* Right / Center: Navigation Buttons */}
      <div className="flex items-center gap-1.5 order-1 sm:order-2">
        {/* First Page Button */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className={`p-1.5 rounded-lg border text-slate-600 transition-colors ${
            currentPage === 1
              ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400'
              : 'bg-white hover:bg-slate-100 border-slate-200 hover:text-blue-700 active:bg-slate-200'
          }`}
          title="Halaman Pertama"
          aria-label="Halaman Pertama"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous Button ("Sebelumnya") */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border font-medium transition-colors ${
            currentPage === 1
              ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400'
              : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-blue-700 active:bg-slate-200'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden xs:inline">Sebelumnya</span>
        </button>

        {/* Page Number Buttons */}
        <div className="flex items-center gap-1 mx-1">
          {pageNumbers.map((p, idx) => {
            if (p === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="w-7 h-7 flex items-center justify-center text-slate-400 select-none font-bold"
                >
                  &hellip;
                </span>
              );
            }

            const pageNum = Number(p);
            const isActive = pageNum === currentPage;

            return (
              <button
                key={`page-${pageNum}`}
                type="button"
                onClick={() => onPageChange(pageNum)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg font-mono text-xs font-bold transition-all flex items-center justify-center ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next Button ("Selanjutnya") */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border font-medium transition-colors ${
            currentPage === totalPages
              ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400'
              : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-blue-700 active:bg-slate-200'
          }`}
        >
          <span className="hidden xs:inline">Selanjutnya</span>
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last Page Button */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className={`p-1.5 rounded-lg border text-slate-600 transition-colors ${
            currentPage === totalPages
              ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400'
              : 'bg-white hover:bg-slate-100 border-slate-200 hover:text-blue-700 active:bg-slate-200'
          }`}
          title="Halaman Terakhir"
          aria-label="Halaman Terakhir"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile Indicator badge */}
      <div className="sm:hidden text-center text-slate-500 font-mono text-[11px] order-3">
        Halaman <strong className="text-slate-800">{currentPage}</strong> dari{' '}
        <strong className="text-slate-800">{totalPages}</strong>
      </div>
    </div>
  );
};
