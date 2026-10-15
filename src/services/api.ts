import { BoxArchive, ArchiveLocation, isUnassignedLemari } from '../types/archive';

export const SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzaDIZHoPMM7HZKsiiBWVrK9YaZT33My1YGFSNkAPpGAhXTaSsUOW_vKaGDlOqv7FDG/exec';

export const API_ENDPOINT = SCRIPT_URL;

export const STORAGE_CACHE_KEY = 'lsp_archive_boxes_cache';
export const STORAGE_LAST_SYNC_KEY = 'lsp_archive_last_sync';
export const STORAGE_HASH_KEY = 'lsp_archive_cache_hash';

// Helper untuk menghitung checksum/hash data boks secara cepat
export function computeDataHash(data: BoxArchive[]): string {
  if (!Array.isArray(data) || data.length === 0) return 'empty';
  let str = `${data.length}:`;
  for (let i = 0; i < data.length; i++) {
    const b = data[i];
    str += `${b.id_box}|${b.nama_pelatihan}|${b.tahun_pelaksanaan}|${b.jumlah_peserta}|${b.jumlah_peserta_bk}|${b.status_arsip}|${b.status_barang}|${b.lokasi?.lemari_label}|${b.lokasi?.rak}|${b.nomor_box};`;
  }
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

// Pastikan setiap boks arsip memiliki id_box unik agar tidak terjadi duplicate key error
export function ensureUniqueBoxIds(boxes: BoxArchive[]): BoxArchive[] {
  const seen = new Map<string, number>();
  return boxes.map((box, index) => {
    let rawId = (box.id_box || '').trim();
    if (!rawId || rawId === '-' || rawId.toLowerCase() === 'undefined') {
      rawId = `BOX-${index + 1}`;
    }
    const count = seen.get(rawId) || 0;
    seen.set(rawId, count + 1);
    if (count > 0) {
      return {
        ...box,
        id_box: `${rawId} (${count + 1})`,
      };
    }
    return {
      ...box,
      id_box: rawId,
    };
  });
}

// 1. Penerapan Cache (LocalStorage): Ambil data langsung dari localStorage
export function getCachedArchiveBoxes(): { data: BoxArchive[]; timestamp: string; hash: string } | null {
  try {
    const rawData = localStorage.getItem(STORAGE_CACHE_KEY);
    if (!rawData) return null;
    const parsed = JSON.parse(rawData);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    const sanitized = ensureUniqueBoxIds(parsed);
    const timestamp = localStorage.getItem(STORAGE_LAST_SYNC_KEY) || new Date().toISOString();
    let hash = localStorage.getItem(STORAGE_HASH_KEY) || '';
    if (!hash) {
      hash = computeDataHash(sanitized);
      try {
        localStorage.setItem(STORAGE_HASH_KEY, hash);
      } catch {
        // ignore storage quota error
      }
    }
    return { data: sanitized, timestamp, hash };
  } catch (err) {
    console.warn('Gagal membaca cache lokal:', err);
    return null;
  }
}

// Simpan data boks ke cache localStorage browser beserta timestamp
export function saveArchiveBoxesToCache(data: BoxArchive[], timestamp?: string): string {
  const ts = timestamp || new Date().toISOString();
  const hash = computeDataHash(data);
  try {
    localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(STORAGE_LAST_SYNC_KEY, ts);
    localStorage.setItem(STORAGE_HASH_KEY, hash);
  } catch (err) {
    console.warn('Gagal menyimpan cache ke localStorage:', err);
  }
  return hash;
}

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
  const candidateLemari =
    locRaw.lemari_label ||
    item['Kode Lemari'] ||
    item.lemari_label ||
    item.lemari ||
    item['Lemari'];

  let lemari_label = 'Lemari 1';
  if (candidateLemari !== undefined && candidateLemari !== null && String(candidateLemari).trim() !== '') {
    const trimmed = String(candidateLemari).trim();
    if (isUnassignedLemari(trimmed)) {
      lemari_label = 'Lemari Kosong';
    } else {
      lemari_label = trimmed;
    }
  } else if (locRaw.lemari !== undefined && locRaw.lemari !== null && locRaw.lemari !== '') {
    lemari_label = `Lemari ${locRaw.lemari}`;
  } else if (
    item.hasOwnProperty('Kode Lemari') ||
    item.hasOwnProperty('lemari_label') ||
    item.hasOwnProperty('lemari')
  ) {
    // Properti lemari ada di dataset tapi bernilai kosong/unassigned
    lemari_label = 'Lemari Kosong';
  }

  const isUnassigned = isUnassignedLemari(lemari_label);

  // Extract lemari number if available
  const lemariNumMatch = lemari_label.match(/\d+/);
  const lemari = locRaw.lemari !== undefined
    ? locRaw.lemari
    : (lemariNumMatch ? parseInt(lemariNumMatch[0], 10) : (isUnassigned ? 'kosong' : 1));

  // Extract rak
  const rawRak =
    locRaw.rak ||
    item['Nomor Rak'] ||
    item.rak;
  const rak = rawRak ? String(rawRak).trim() : (isUnassigned ? 'Unassigned' : 'Rak A');

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

export interface FetchArchiveResult {
  data: BoxArchive[];
  timestamp: string;
  hasChanged: boolean;
  fromCache: boolean;
  isOffline?: boolean;
  isError?: boolean;
  error?: string;
  hash: string;
}

// Fetch archives from Google Apps Script Web App dengan Timeout, Cache Fallback & Smart Polling
export async function fetchArchiveBoxes(options?: {
  timeoutMs?: number;
  currentHash?: string;
}): Promise<FetchArchiveResult> {
  const timeoutMs = options?.timeoutMs ?? 10000;
  const currentHash = options?.currentHash || localStorage.getItem(STORAGE_HASH_KEY) || '';

  // 3. Handling Network Error / Offline:
  // Jika browser dalam mode offline murni (navigator.onLine === false), segera gunakan cache tanpa menunggu error network
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    const cached = getCachedArchiveBoxes();
    if (cached) {
      return {
        data: cached.data,
        timestamp: cached.timestamp,
        hasChanged: false,
        fromCache: true,
        isOffline: true,
        hash: cached.hash,
      };
    }
  }

  // Gunakan AbortController untuk timeout pencegahan fetch menggantung
  const controller = new AbortController();
  const timeoutTimer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutTimer);

    if (!response.ok) {
      throw new Error(`HTTP error status: ${response.status}`);
    }

    const json = await response.json();
    if (!Array.isArray(json)) {
      throw new Error('Format data tidak sesuai, bukan array.');
    }

    const normalizedData = ensureUniqueBoxIds(json.map(normalizeArchiveItem));
    const newHash = computeDataHash(normalizedData);
    const nowISO = new Date().toISOString();

    // 2. Optimasi Smart Polling: Cek apakah ada perubahan data
    const hasChanged = currentHash !== newHash;

    if (hasChanged) {
      // Data berubah: simpan data baru beserta timestamp & hash ke localStorage
      saveArchiveBoxesToCache(normalizedData, nowISO);
    } else {
      // Data tidak mengalami perubahan: cukup perbarui timestamp verifikasi terakhir
      try {
        localStorage.setItem(STORAGE_LAST_SYNC_KEY, nowISO);
      } catch {
        // ignore
      }
    }

    return {
      data: normalizedData,
      timestamp: nowISO,
      hasChanged,
      fromCache: false,
      hash: newHash,
      isOffline: false,
    };
  } catch (error: any) {
    clearTimeout(timeoutTimer);
    console.warn('Gagal memuat dari API langsung atau timeout, mempertahankan data dari localStorage...', error);

    const isTimeout = error?.name === 'AbortError';
    const errorMsg = isTimeout
      ? 'Koneksi ke server timeout (>10 detik).'
      : (error?.message || 'Gagal terhubung ke server');

    // 3. Handling Network Error / Offline:
    // Jika panggilan fetch ke Apps Script gagal atau timeout, pertahankan data dari localStorage agar UI tidak kosong/blank.
    const cached = getCachedArchiveBoxes();
    if (cached) {
      return {
        data: cached.data,
        timestamp: cached.timestamp,
        hasChanged: false,
        fromCache: true,
        isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
        isError: true,
        error: errorMsg,
        hash: cached.hash,
      };
    }

    // Jika sama sekali belum pernah ada cache
    throw error;
  }
}

// Save or Update Archive Box to Google Apps Script Web App
export async function saveArchiveBox(boxData: BoxArchive, isEdit: boolean = false): Promise<any> {
  const payload = {
    id_box: boxData.id_box,
    nama_pelatihan: boxData.nama_pelatihan,
    tahun_pelaksanaan: Number(boxData.tahun_pelaksanaan),
    jumlah_peserta: Number(boxData.jumlah_peserta),
    jumlah_peserta_bk: Number(boxData.jumlah_peserta_bk),
    status_arsip: boxData.status_arsip,
    status_barang: boxData.status_barang,
    kode_lemari: boxData.lokasi?.lemari_label || `Lemari ${boxData.lokasi?.lemari || 1}`,
    nomor_rak: boxData.lokasi?.rak || 'Rak A',
    nomor_box: boxData.nomor_box || 'Box 1',
    // Properti pendukung aplikasi
    action: isEdit ? 'edit' : 'create',
    hasilUjiKompetensi: boxData.hasilUjiKompetensi || 'Kompeten',
    link_dokumentasi: boxData.link_dokumentasi || '',
    lokasi: boxData.lokasi,
  };

  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    let resultJson: any = null;
    try {
      resultJson = await response.json();
    } catch {
      try {
        const text = await response.text();
        resultJson = JSON.parse(text);
      } catch {
        if (response.ok) {
          resultJson = { status: 'success' };
        }
      }
    }

    if (resultJson?.status === 'success' || response.ok) {
      return resultJson || { status: 'success' };
    } else {
      throw new Error(resultJson?.message || 'Server merespon dengan status error');
    }
  } catch (err: any) {
    console.error('Error saat menyimpan ke Apps Script:', err);
    throw err;
  }
}
