export const MAX_RAK_CAPACITY = 11;
export const MAX_LEMARI_CAPACITY = 44; // 4 Rak x 11 Boks untuk Lemari Fisik

/**
 * Memeriksa apakah lemari merupakan kategori "Lemari Kosong" / unassigned / holding area
 * Lemari Kosong berfungsi sebagai penampungan dinamis tanpa batasan kapasitas maksimal (isFull = false).
 */
export const isUnassignedLemari = (lemariLabelOrId?: string | number | null): boolean => {
  if (lemariLabelOrId === undefined || lemariLabelOrId === null) return true;
  const str = String(lemariLabelOrId).trim().toLowerCase();
  if (!str || str === '-' || str === 'none' || str === 'null' || str === 'undefined') return true;
  return (
    str.includes('kosong') ||
    str.includes('unassigned') ||
    str.includes('tanpa lemari') ||
    str.includes('holding')
  );
};

export interface ArchiveLocation {
  lemari: number | string;
  lemari_label: string;
  rak: string;
  baris: string;
}

export interface BoxArchive {
  id_box: string;
  nama_pelatihan: string;
  tahun_pelaksanaan: number;
  jumlah_peserta: number;
  jumlah_peserta_bk: number;
  status_arsip: string;
  status_barang: string;
  hasilUjiKompetensi: string;
  link_dokumentasi: string;
  nomor_box: string;
  lokasi: ArchiveLocation;
  // Raw fields backup
  raw?: Record<string, unknown>;
}

export interface FilterOptions {
  searchQuery: string;
  lemari: string;
  rak: string;
  statusArsip: string;
  statusBarang: string;
  tahun: string;
}

export interface HierarchyLemari {
  label: string;
  id: number | string;
  boxCount: number;
  raks: {
    nama: string;
    boxCount: number;
  }[];
}
