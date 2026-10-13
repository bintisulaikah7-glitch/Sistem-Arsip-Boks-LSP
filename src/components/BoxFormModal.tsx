import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BoxArchive, MAX_RAK_CAPACITY, MAX_LEMARI_CAPACITY } from '../types/archive';
import { SCRIPT_URL } from '../services/api';
import {
  X,
  Save,
  Wand2,
  Package,
  Layers,
  MapPin,
  Calendar,
  Users,
  Link,
  CheckCircle2,
  FolderArchive,
  AlertCircle,
  AlertTriangle,
  Loader2,
  ShieldAlert,
  Lock,
} from 'lucide-react';

interface BoxFormModalProps {
  isOpen: boolean;
  boxToEdit: BoxArchive | null;
  boxes: BoxArchive[];
  onClose: () => void;
  onSave?: (boxData: BoxArchive, isEdit: boolean) => Promise<void>;
  onLocalSync?: (boxData: BoxArchive, isEdit: boolean) => void;
  showToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
  existingLemaris: string[];
  existingRaks: string[];
}

export const BoxFormModal: React.FC<BoxFormModalProps> = ({
  isOpen,
  boxToEdit,
  boxes,
  onClose,
  onSave,
  onLocalSync,
  showToast,
  existingLemaris,
  existingRaks,
}) => {
  const isEdit = Boolean(boxToEdit);

  // Form states
  const [idBox, setIdBox] = useState('');
  const [namaPelatihan, setNamaPelatihan] = useState('');
  const [tahun, setTahun] = useState<number>(new Date().getFullYear());
  const [jumlahPeserta, setJumlahPeserta] = useState<number>(20);
  const [jumlahPesertaBK, setJumlahPesertaBK] = useState<number>(0);
  const [statusArsip, setStatusArsip] = useState('Aktif');
  const [statusBarang, setStatusBarang] = useState('Lengkap');
  const [hasilUjiKompetensi, setHasilUjiKompetensi] = useState('');
  const [linkDokumentasi, setLinkDokumentasi] = useState('');
  const [lemariLabel, setLemariLabel] = useState('Lemari 1');
  const [customLemari, setCustomLemari] = useState('');
  const [rak, setRak] = useState('Rak A');
  const [customRak, setCustomRak] = useState('');
  const [nomorBox, setNomorBox] = useState('Box 1');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Populate form if editing or opening
  useEffect(() => {
    if (boxToEdit) {
      setIdBox(boxToEdit.id_box || '');
      setNamaPelatihan(boxToEdit.nama_pelatihan || '');
      setTahun(boxToEdit.tahun_pelaksanaan || new Date().getFullYear());
      setJumlahPeserta(boxToEdit.jumlah_peserta || 0);
      setJumlahPesertaBK(boxToEdit.jumlah_peserta_bk || 0);
      setStatusArsip(boxToEdit.status_arsip || 'Aktif');
      setStatusBarang(boxToEdit.status_barang || 'Lengkap');
      setHasilUjiKompetensi(boxToEdit.hasilUjiKompetensi || '');
      setLinkDokumentasi(boxToEdit.link_dokumentasi || '');

      const lemLabel = boxToEdit.lokasi?.lemari_label || 'Lemari 1';
      if (existingLemaris.includes(lemLabel)) {
        setLemariLabel(lemLabel);
        setCustomLemari('');
      } else {
        setLemariLabel('custom');
        setCustomLemari(lemLabel);
      }

      const rakLabel = boxToEdit.lokasi?.rak || 'Rak A';
      if (existingRaks.includes(rakLabel)) {
        setRak(rakLabel);
        setCustomRak('');
      } else {
        setRak('custom');
        setCustomRak(rakLabel);
      }

      setNomorBox(boxToEdit.nomor_box || 'Box 1');
    } else {
      // Defaults for new box
      const initialLemari = existingLemaris[0] || 'Lemari 1';
      const initialRak = existingRaks[0] || 'Rak A';
      const initialYear = new Date().getFullYear();
      setIdBox(`${initialLemari} - ${initialRak} - Box 1`);
      setNamaPelatihan('');
      setTahun(initialYear);
      setJumlahPeserta(20);
      setJumlahPesertaBK(0);
      setStatusArsip('Aktif');
      setStatusBarang('Lengkap');
      setHasilUjiKompetensi('');
      setLinkDokumentasi('');
      setLemariLabel(initialLemari);
      setCustomLemari('');
      setRak(initialRak);
      setCustomRak('');
      setNomorBox('Box 1');
    }
    setErrorMsg('');
  }, [boxToEdit, isOpen, existingLemaris, existingRaks]);

  // Requirement 1: Perhitungan Kapasitas Lemari & Rak yang Dipilih
  const selectedFinalLemari = lemariLabel === 'custom' ? customLemari.trim() : lemariLabel;
  const selectedFinalRak = rak === 'custom' ? customRak.trim() : rak;

  const { lemariBoxCount, rakBoxCount, isLemariFull, isRakFull, isCapacityFull } = useMemo(() => {
    if (!selectedFinalLemari) {
      return { lemariBoxCount: 0, rakBoxCount: 0, isLemariFull: false, isRakFull: false, isCapacityFull: false };
    }

    // Hitung boks pada lemari terpilih (abaikan boks yang sedang diedit jika tidak pindah lokasi)
    const lemariBoxes = boxes.filter((b) => {
      if (isEdit && boxToEdit && b.id_box === boxToEdit.id_box) return false;
      return b.lokasi?.lemari_label?.toLowerCase() === selectedFinalLemari.toLowerCase();
    });

    const rakBoxes = lemariBoxes.filter((b) => {
      return b.lokasi?.rak?.toLowerCase() === selectedFinalRak.toLowerCase();
    });

    const lCount = lemariBoxes.length;
    const rCount = rakBoxes.length;

    const lFull = lCount >= MAX_LEMARI_CAPACITY;
    const rFull = rCount >= MAX_RAK_CAPACITY;

    return {
      lemariBoxCount: lCount,
      rakBoxCount: rCount,
      isLemariFull: lFull,
      isRakFull: rFull,
      isCapacityFull: lFull || rFull,
    };
  }, [boxes, selectedFinalLemari, selectedFinalRak, isEdit, boxToEdit]);

  // Helper counts for select options
  const getLemariOptionCount = (lemName: string) => {
    return boxes.filter((b) => {
      if (isEdit && boxToEdit && b.id_box === boxToEdit.id_box) return false;
      return b.lokasi?.lemari_label?.toLowerCase() === lemName.toLowerCase();
    }).length;
  };

  const getRakOptionCount = (rakName: string) => {
    if (!selectedFinalLemari) return 0;
    return boxes.filter((b) => {
      if (isEdit && boxToEdit && b.id_box === boxToEdit.id_box) return false;
      return (
        b.lokasi?.lemari_label?.toLowerCase() === selectedFinalLemari.toLowerCase() &&
        b.lokasi?.rak?.toLowerCase() === rakName.toLowerCase()
      );
    }).length;
  };

  // Helper format nomor boks (jika user hanya ketik angka '1', otomatis diformat jadi 'Box 1')
  const formatBoxNumber = (boxStr: string) => {
    const trimmed = boxStr.trim();
    if (!trimmed) return 'Box 1';
    if (/^\d+$/.test(trimmed)) {
      return `Box ${trimmed}`;
    }
    return trimmed;
  };

  // Fungsi kalkulasi ID Boks otomatis real-time (contoh format: Lemari 1 - Rak A - Box 1)
  const calculateAutoId = useCallback(
    (lem: string, cLem: string, rk: string, cRk: string, numBox: string, _thn?: number) => {
      const finalLemari = lem === 'custom' ? (cLem.trim() || 'Lemari Baru') : (lem || 'Lemari 1');
      const finalRak = rk === 'custom' ? (cRk.trim() || 'Rak Baru') : (rk || 'Rak A');
      const cleanBox = formatBoxNumber(numBox);
      return `${finalLemari} - ${finalRak} - ${cleanBox}`;
    },
    []
  );

  // Real-time auto update ID Boks saat Lemari, Rak, Nomor Boks, atau Tahun Pelaksanaan berubah
  useEffect(() => {
    if (!isEdit && isOpen) {
      const newId = calculateAutoId(lemariLabel, customLemari, rak, customRak, nomorBox, tahun);
      setIdBox(newId);
    }
  }, [isEdit, isOpen, lemariLabel, customLemari, rak, customRak, nomorBox, tahun, calculateAutoId]);

  if (!isOpen) return null;

  // Sinkronisasi manual ID Boks ke lokasi (bisa dipakai saat mode edit jika dipindah)
  const handleSyncIdToLocation = () => {
    const newId = calculateAutoId(lemariLabel, customLemari, rak, customRak, nomorBox, tahun);
    setIdBox(newId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    // 1. Gunakan e.preventDefault() pada saat submit form agar halaman tidak ter-refresh
    e.preventDefault();
    setErrorMsg('');

    // Validasi kapasitas rak/lemari
    if (isCapacityFull) {
      setErrorMsg(
        `Rak/Lemari ini sudah penuh! (Rak: ${rakBoxCount}/${MAX_RAK_CAPACITY}, Lemari: ${lemariBoxCount}/${MAX_LEMARI_CAPACITY}). Silakan pilih Rak atau Lemari lain.`
      );
      return;
    }

    if (!namaPelatihan.trim()) {
      setErrorMsg('Nama pelatihan tidak boleh kosong.');
      return;
    }

    if (!selectedFinalLemari) {
      setErrorMsg('Pilih atau masukkan nama Lemari.');
      return;
    }

    if (!selectedFinalRak) {
      setErrorMsg('Pilih atau masukkan nama Rak.');
      return;
    }

    const finalId = idBox.trim() || `${selectedFinalLemari} - ${selectedFinalRak} - ${nomorBox.trim() || 'Box 1'}`;

    const lemariNumMatch = selectedFinalLemari.match(/\d+/);
    const lemariNumber = lemariNumMatch ? parseInt(lemariNumMatch[0], 10) : 1;

    // 3. Pastikan struktur payload JSON yang dikirimkan memiliki kunci berikut:
    //    - id_box: (String ID Boks, contoh: 'L1-RA-BOX01-2026')
    //    - nama_pelatihan: (String Nama Pelatihan)
    //    - tahun_pelaksanaan: (Number Tahun)
    //    - jumlah_peserta: (Number Total Peserta)
    //    - jumlah_peserta_bk: (Number Peserta Belum Kompeten)
    //    - status_arsip: (String Status Arsip, misal 'Tersedia')
    //    - status_barang: (String Status Barang, misal 'Lengkap')
    //    - kode_lemari: (String, misal 'Lemari 1')
    //    - nomor_rak: (String, misal 'Rak A')
    //    - nomor_box: (String, misal 'Box 1')
    const payload = {
      id_box: finalId,
      nama_pelatihan: namaPelatihan.trim(),
      tahun_pelaksanaan: Number(tahun) || new Date().getFullYear(),
      jumlah_peserta: Number(jumlahPeserta) || 0,
      jumlah_peserta_bk: Number(jumlahPesertaBK) || 0,
      status_arsip: statusArsip,
      status_barang: statusBarang,
      kode_lemari: selectedFinalLemari,
      nomor_rak: selectedFinalRak,
      nomor_box: nomorBox.trim() || 'Box 1',
    };

    // Objek lengkap untuk sinkronisasi state lokal di aplikasi
    const newBoxData: BoxArchive = {
      id_box: finalId,
      nama_pelatihan: namaPelatihan.trim(),
      tahun_pelaksanaan: Number(tahun) || new Date().getFullYear(),
      jumlah_peserta: Number(jumlahPeserta) || 0,
      jumlah_peserta_bk: Number(jumlahPesertaBK) || 0,
      status_arsip: statusArsip,
      status_barang: statusBarang,
      hasilUjiKompetensi: hasilUjiKompetensi.trim() || 'Kompeten',
      link_dokumentasi: linkDokumentasi.trim(),
      nomor_box: nomorBox.trim() || 'Box 1',
      lokasi: {
        lemari: lemariNumber,
        lemari_label: selectedFinalLemari,
        rak: selectedFinalRak,
        baris: nomorBox.trim() || 'Box 1',
      },
    };

    // 4. Set state loading tombol menjadi 'Menyimpan...' saat proses berlangsung
    setIsSubmitting(true);

    try {
      // 2. Kirim data via fetch(SCRIPT_URL, { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) })
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      let responseData: any = null;
      try {
        responseData = await response.json();
      } catch {
        try {
          const text = await response.text();
          responseData = JSON.parse(text);
        } catch {
          if (response.ok) {
            responseData = { status: 'success' };
          }
        }
      }

      // 5. Jika respon sukses (status === 'success'), tampilkan notifikasi toast sukses,
      //    tutup modal, dan jalankan pembaruan data/sync lokal agar data baru langsung muncul di tabel/pilihan tanpa reload halaman.
      if (responseData?.status === 'success' || response.ok) {
        // Jalankan pembaruan data / sync lokal
        if (onLocalSync) {
          onLocalSync(newBoxData, isEdit);
        } else if (onSave) {
          await onSave(newBoxData, isEdit);
        }

        // Tampilkan notifikasi toast sukses
        if (showToast) {
          showToast(
            isEdit
              ? `Perubahan boks "${finalId}" berhasil disimpan ke backend!`
              : `Boks baru "${finalId}" berhasil ditambahkan ke backend!`,
            'success'
          );
        }

        // Tutup modal
        onClose();
      } else {
        throw new Error(responseData?.message || 'Server merespon dengan status error.');
      }
    } catch (err: any) {
      console.error('Error saat menyimpan form:', err);
      // Jika terjadi kesalahan jaringan / CORS tetapi data valid, beri notifikasi yang jelas
      setErrorMsg(
        err?.message ||
          'Gagal mengirim data ke Google Apps Script. Pastikan endpoint aktif dan memiliki akses CORS.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-blue-700 to-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {isEdit ? 'Perbarui Data Arsip Boks' : 'Tambah Arsip Boks Baru'}
              </h2>
              <p className="text-xs text-blue-100">
                Penyimpanan divalidasi dengan batas maksimal 11 boks/rak &amp; 44 boks/lemari
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[calc(85vh-140px)] overflow-y-auto">
          {/* Requirement 1: Alert Banner Jika Kapasitas Penuh */}
          {isCapacityFull && (
            <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl text-xs text-rose-800 flex items-start gap-3 shadow-xs">
              <ShieldAlert className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <strong className="font-extrabold text-sm text-rose-900 block mb-0.5">
                  Rak atau Lemari Ini Sudah PENUH!
                </strong>
                <p className="leading-relaxed">
                  {isRakFull && (
                    <span>
                      &bull; <strong>{selectedFinalRak}</strong> di {selectedFinalLemari} sudah berisi{' '}
                      <strong>{rakBoxCount} / {MAX_RAK_CAPACITY} boks</strong> (Maksimal tercapai).
                    </span>
                  )}
                  {isLemariFull && (
                    <span className="block mt-1">
                      &bull; <strong>{selectedFinalLemari}</strong> sudah berisi{' '}
                      <strong>{lemariBoxCount} / {MAX_LEMARI_CAPACITY} boks</strong> (Kapasitas lemari penuh).
                    </span>
                  )}
                </p>
                <p className="mt-2 text-rose-700 font-bold">
                  Silakan pilih Rak atau Lemari lain yang masih memiliki slot kosong sebelum menyimpan!
                </p>
              </div>
            </div>
          )}

          {errorMsg && !isCapacityFull && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ID Boks: Read-Only & Otomatis Real-Time */}
          <div className="bg-slate-50/90 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-blue-600" />
                <span>ID Boks Arsip</span>
                <span className="text-rose-500">*</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                  <Wand2 className="w-2.5 h-2.5 animate-pulse" />
                  Otomatis Real-Time
                </span>
              </label>

              {isEdit ? (
                <button
                  type="button"
                  onClick={handleSyncIdToLocation}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                  title="Sesuaikan ID boks dengan lokasi lemari dan rak yang dipilih"
                >
                  <Wand2 className="w-3 h-3" />
                  <span>Sesuaikan ID ke Lokasi</span>
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded border border-slate-300">
                  <Lock className="w-3 h-3 text-slate-500" />
                  <span>Read-Only</span>
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                value={idBox}
                readOnly
                placeholder="Contoh: Lemari 1 - Rak A - Box 1"
                required
                className="w-full px-3 py-2 bg-slate-200/70 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 cursor-not-allowed select-all focus:outline-none focus:ring-0"
                title="Input ID Boks Arsip bersifat read-only dan diperbarui otomatis secara real-time"
              />
            </div>

            <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                Nilai ID boks diperbarui otomatis secara real-time mengikuti pilihan <strong>Lemari</strong>, <strong>Rak</strong>, <strong>Nomor Boks</strong>, atau <strong>Tahun Pelaksanaan</strong>.
              </span>
            </p>
          </div>

          {/* Nama Pelatihan */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Nama Pelatihan / Skema Uji Kompetensi <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={namaPelatihan}
              onChange={(e) => setNamaPelatihan(e.target.value)}
              placeholder="Contoh: Sistem 3-in-1 (UpSkilling) Teknisi AC Residential JIIPE"
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Lokasi Fisik dengan Cek Kapasitas Real-Time */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>Lokasi Penyimpanan Fisik &amp; Validasi Kapasitas</span>
              </span>

              {/* Status slot badge */}
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold ${
                  isCapacityFull
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}
              >
                Rak: {rakBoxCount}/{MAX_RAK_CAPACITY} &bull; Lemari: {lemariBoxCount}/{MAX_LEMARI_CAPACITY}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Lemari */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Lemari</label>
                <select
                  value={lemariLabel}
                  onChange={(e) => setLemariLabel(e.target.value)}
                  className={`w-full px-2.5 py-1.5 bg-white border rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 ${
                    isLemariFull ? 'border-rose-400 bg-rose-50/50' : 'border-slate-300'
                  }`}
                >
                  {existingLemaris.map((lem) => {
                    const count = getLemariOptionCount(lem);
                    const isFull = count >= MAX_LEMARI_CAPACITY;
                    return (
                      <option key={lem} value={lem}>
                        {lem} ({count}/{MAX_LEMARI_CAPACITY} {isFull ? '- PENUH' : 'Boks'})
                      </option>
                    );
                  })}
                  <option value="custom">+ Lemari Baru...</option>
                </select>
                {lemariLabel === 'custom' && (
                  <input
                    type="text"
                    value={customLemari}
                    onChange={(e) => setCustomLemari(e.target.value)}
                    placeholder="Nama Lemari Baru"
                    className="mt-1.5 w-full px-2 py-1 bg-white border border-blue-400 rounded text-xs"
                  />
                )}
              </div>

              {/* Rak */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Rak</label>
                <select
                  value={rak}
                  onChange={(e) => setRak(e.target.value)}
                  className={`w-full px-2.5 py-1.5 bg-white border rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 ${
                    isRakFull ? 'border-rose-400 bg-rose-50/50' : 'border-slate-300'
                  }`}
                >
                  {existingRaks.map((r) => {
                    const count = getRakOptionCount(r);
                    const isFull = count >= MAX_RAK_CAPACITY;
                    return (
                      <option key={r} value={r}>
                        {r} ({count}/{MAX_RAK_CAPACITY} {isFull ? '- PENUH' : 'Boks'})
                      </option>
                    );
                  })}
                  <option value="custom">+ Rak Baru...</option>
                </select>
                {rak === 'custom' && (
                  <input
                    type="text"
                    value={customRak}
                    onChange={(e) => setCustomRak(e.target.value)}
                    placeholder="Nama Rak Baru"
                    className="mt-1.5 w-full px-2 py-1 bg-white border border-blue-400 rounded text-xs"
                  />
                )}
              </div>

              {/* Nomor Box */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Nomor Boks</label>
                <input
                  type="text"
                  value={nomorBox}
                  onChange={(e) => setNomorBox(e.target.value)}
                  placeholder="Contoh: Box 1"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Tahun & Peserta */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Tahun Pelaksanaan</label>
              <input
                type="number"
                min="2010"
                max="2035"
                value={tahun}
                onChange={(e) => setTahun(parseInt(e.target.value, 10) || new Date().getFullYear())}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-medium focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Total Peserta</label>
              <input
                type="number"
                min="0"
                value={jumlahPeserta}
                onChange={(e) => setJumlahPeserta(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-medium focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Peserta Belum Kompeten (BK)</label>
              <input
                type="number"
                min="0"
                max={jumlahPeserta}
                value={jumlahPesertaBK}
                onChange={(e) => setJumlahPesertaBK(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-medium focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Status Arsip & Barang */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Status Arsip Berkas</label>
              <select
                value={statusArsip}
                onChange={(e) => setStatusArsip(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="Aktif">Aktif</option>
                <option value="Tersedia">Tersedia</option>
                <option value="Tidak Lengkap">Tidak Lengkap</option>
                <option value="Inaktif">Inaktif</option>
                <option value="Dimusnahkan">Dimusnahkan</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Status Barang Fisik</label>
              <select
                value={statusBarang}
                onChange={(e) => setStatusBarang(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="Lengkap">Lengkap</option>
                <option value="Tidak Lengkap">Tidak Lengkap</option>
                <option value="Dipinjam">Dipinjam</option>
                <option value="Tidak Ada">Tidak Ada</option>
              </select>
            </div>
          </div>

          {/* Hasil Uji Kompetensi */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Hasil Uji Kompetensi / Keterangan Barang
            </label>
            <input
              type="text"
              value={hasilUjiKompetensi}
              onChange={(e) => setHasilUjiKompetensi(e.target.value)}
              placeholder="Contoh: PCB Speaker, Modul, dll."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Link Dokumentasi Google Drive */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              URL Link Google Drive / Spreadsheet Dokumentasi
            </label>
            <div className="relative">
              <Link className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                value={linkDokumentasi}
                onChange={(e) => setLinkDokumentasi(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isCapacityFull}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-lg shadow-sm transition-all ${
                isCapacityFull
                  ? 'bg-rose-400 cursor-not-allowed opacity-70'
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-blue-500/25'
              }`}
              title={isCapacityFull ? 'Kapasitas penuh! Silakan pilih rak atau lemari lain' : 'Simpan data'}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : isCapacityFull ? (
                <>
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Kapasitas Penuh (Terkunci)</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{isEdit ? 'Simpan Perubahan' : 'Tambah Boks'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
