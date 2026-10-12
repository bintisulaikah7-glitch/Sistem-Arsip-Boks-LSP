import { BoxArchive, ArchiveLocation } from '../types/archive';

export const API_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbzaDIZHoPMM7HZKsiiBWVrK9YaZT33My1YGFSNkAPpGAhXTaSsUOW_vKaGDlOqv7FDG/exec';

const STORAGE_CACHE_KEY = 'lsp_archive_boxes_cache';
const STORAGE_LAST_SYNC_KEY = 'lsp_archive_last_sync';

// Helper to clean training name by stripping suffix like (1), (2), (01), etc.
export function cleanTrainingName(name: string): string {
  if (!name) return '';
  return name.replace(/\s*\(\s*\d+\s*\)\s*$/i, '').trim();
}

// Requirement 2: Flexible / Fuzzy Substring Multi-Token Matcher
export function matchesFuzzyQuery(box: BoxArchive, query: string): boolean {
  if (!query || !query.trim()) return true;

  const rawQ = query.trim().toLowerCase();
  const tokens = rawQ.split(/\s+/).filter(Boolean);

  const searchableParts = [
    box.nama_pelatihan,
    cleanTrainingName(box.nama_pelatihan),
    box.id_box,
    box.nomor_box,
    String(box.tahun_pelaksanaan),
    box.lokasi?.lemari_label,
    `l${box.lokasi?.lemari || ''}`,
    box.lokasi?.rak,
    box.hasilUjiKompetensi,
    box.status_arsip,
    box.status_barang,
  ]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());

  const fullSearchable = searchableParts.join(' ');

  // Direct substring match
  if (fullSearchable.includes(rawQ)) return true;

  // Multi-token match: all tokens must match
  return tokens.every((tok) => {
    // Check abbreviation for lemari (e.g. "l1", "l2")
    const lm = tok.match(/^l(\d+)$/);
    if (
      lm &&
      (box.lokasi?.lemari_label?.toLowerCase().includes(`lemari ${lm[1]}`) ||
        box.id_box.toLowerCase().includes(`l${lm[1]}`))
    ) {
      return true;
    }
    // Check abbreviation for rak (e.g. "ra", "rb")
    const rm = tok.match(/^r([a-z])$/);
    if (
      rm &&
      (box.lokasi?.rak?.toLowerCase().includes(`rak ${rm[1]}`) ||
        box.id_box.toLowerCase().includes(`r${rm[1]}`))
    ) {
      return true;
    }
    return fullSearchable.includes(tok);
  });
}

// Normalizer to handle inconsistent API keys and formats
export function normalizeArchiveItem(item: Record<string, any>, index: number): BoxArchive {
  const locRaw = item.lokasi || {};

  // Extract lemari
  const rawLemariLabel =
    locRaw.lemari_label ||
    item['Kode Lemari'] ||
    item.lemari_label ||
    (locRaw.lemari ? `Lemari ${locRaw.lemari}` : '') ||
    'Lemari 1';
  const lemari_label = String(rawLemariLabel).trim();

  // Extract lemari number if available
  const lemariNumMatch = lemari_label.match(/\d+/);
  const lemari = locRaw.lemari !== undefined
    ? locRaw.lemari
    : (lemariNumMatch ? parseInt(lemariNumMatch[0], 10) : 1);

  // Extract rak
  const rawRak =
    locRaw.rak ||
    item['Nomor Rak'] ||
    item.rak ||
    'Rak A';
  const rak = String(rawRak).trim();

  // Extract box number / baris
  const rawBoxNumber =
    item.nomor_box ||
    item['Nomor Box'] ||
    locRaw.baris ||
    item.baris ||
    `Box ${index + 1}`;
  const nomor_box = String(rawBoxNumber).trim();
  const baris = String(locRaw.baris || nomor_box).trim();

  const lokasi: ArchiveLocation = {
    lemari,
    lemari_label,
    rak,
    baris,
  };

  // Extract id_box
  const id_box = String(
    item.id_box ||
    item.ID_Box ||
    item.id ||
    `${lemari_label} - ${rak} - ${nomor_box}`
  ).trim();

  // Extract training name
  const nama_pelatihan = String(
    item.nama_pelatihan ||
    item['Nama Pelatihan'] ||
    'Pelatihan Sertifikasi LSP'
  ).trim();

  // Extract year
  const rawTahun = item.tahun_pelaksanaan || item['Tahun Pelaksanaan'];
  const tahun_pelaksanaan = rawTahun ? parseInt(String(rawTahun), 10) || new Date().getFullYear() : new Date().getFullYear();

  // Extract participants
  const rawPeserta = item.jumlah_peserta || item['Jumlah Peserta'];
  const jumlah_peserta = rawPeserta !== undefined ? parseInt(String(rawPeserta), 10) || 0 : 0;

  const rawPesertaBK = item.jumlah_peserta_bk || item['Jumlah Peserta BK'];
  const jumlah_peserta_bk = rawPesertaBK !== undefined ? parseInt(String(rawPesertaBK), 10) || 0 : 0;

  // Status Arsip
  const rawStatusArsip = item.status_arsip || item['Status Arsip'] || 'Aktif';
  const status_arsip = String(rawStatusArsip).trim();

  // Status Barang
  const rawStatusBarang = item.status_barang || item['Status Barang'] || 'Lengkap';
  const status_barang = String(rawStatusBarang).trim();

  // Hasil Uji Kompetensi
  const rawHasil = item.hasilUjiKompetensi || item['Hasil Uji Kompetensi'] || 'Kompeten';
  const hasilUjiKompetensi = String(rawHasil).trim();

  // Link Dokumentasi
  const rawLink = item.link_dokumentasi || item['Link Google Drive'] || item.link || '';
  const link_dokumentasi = String(rawLink).trim();

  return {
    id_box,
    nama_pelatihan,
    tahun_pelaksanaan,
    jumlah_peserta,
    jumlah_peserta_bk,
    status_arsip,
    status_barang,
    hasilUjiKompetensi,
    link_dokumentasi,
    nomor_box,
    lokasi,
    raw: item,
  };
}

// Fetch archives from Google Apps Script Web App
export async function fetchArchiveBoxes(): Promise<{ data: BoxArchive[]; timestamp: string }> {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();
    if (!Array.isArray(json)) {
      throw new Error('Format data tidak sesuai, bukan array.');
    }

    const normalizedData = json.map(normalizeArchiveItem);
    const nowISO = new Date().toISOString();

    // Cache locally
    try {
      localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(normalizedData));
      localStorage.setItem(STORAGE_LAST_SYNC_KEY, nowISO);
    } catch {
      // ignore storage quota errors
    }

    return {
      data: normalizedData,
      timestamp: nowISO,
    };
  } catch (error) {
    console.warn('Gagal memuat dari API langsung, memeriksa cache lokal...', error);
    
    // Check local storage cache
    const cached = localStorage.getItem(STORAGE_CACHE_KEY);
    const lastSync = localStorage.getItem(STORAGE_LAST_SYNC_KEY) || new Date().toISOString();
    
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return {
            data: parsed,
            timestamp: lastSync,
          };
        }
      } catch {
        // ignore parse error
      }
    }

    throw error;
  }
}

// Save or Update Archive Box to Google Apps Script Web App
export async function saveArchiveBox(boxData: BoxArchive, isEdit: boolean = false): Promise<boolean> {
  const payload = {
    action: isEdit ? 'edit' : 'create',
    id_box: boxData.id_box,
    nama_pelatihan: boxData.nama_pelatihan,
    tahun_pelaksanaan: boxData.tahun_pelaksanaan,
    jumlah_peserta: boxData.jumlah_peserta,
    jumlah_peserta_bk: boxData.jumlah_peserta_bk,
    status_arsip: boxData.status_arsip,
    status_barang: boxData.status_barang,
    hasilUjiKompetensi: boxData.hasilUjiKompetensi,
    link_dokumentasi: boxData.link_dokumentasi,
    nomor_box: boxData.nomor_box,
    lokasi: boxData.lokasi,
    // Google Sheets column variations
    'ID_Box': boxData.id_box,
    'Nama Pelatihan': boxData.nama_pelatihan,
    'Tahun Pelaksanaan': boxData.tahun_pelaksanaan,
    'Jumlah Peserta': boxData.jumlah_peserta,
    'Jumlah Peserta BK': boxData.jumlah_peserta_bk,
    'Status Arsip': boxData.status_arsip,
    'Status Barang': boxData.status_barang,
    'Hasil Uji Kompetensi': boxData.hasilUjiKompetensi,
    'Link Google Drive': boxData.link_dokumentasi,
    'Kode Lemari': boxData.lokasi.lemari_label,
    'Nomor Rak': boxData.lokasi.rak,
    'Nomor Box': boxData.nomor_box,
  };

  try {
    // Standard CORS POST with text/plain to avoid preflight issues in Google Apps Script
    await fetch(API_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    return true;
  } catch (err) {
    console.error('Error saat menyimpan ke Apps Script:', err);
    // If standard fetch fails, retry without headers
    try {
      await fetch(API_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(payload),
      });
      return true;
    } catch {
      throw new Error('Gagal mengirimkan data ke Google Apps Script.');
    }
  }
}
