"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DEFAULT_KELAS_LIST } from "@/lib/constants";
import Link from "next/link";

type ChatRecord = {
  id: string;
  kelompok: number;
  kelas: string;
  nama_anggota: string;
  kasus_id: number;
  role: string;
  content: string;
  created_at: string;
};

// Sesuai skema tabel lkpd_reports
type LkpdReport = {
  id: string;
  kelompok: number;
  kelas: string;
  kasus_id: number;
  bukti_petunjuk: string;
  analisis_pelanggaran: string;
  solusi_rekomendasi: string;
  is_submitted: boolean;
  updated_at: string;
};

type KelasItem = {
  kode_kelas: string;
  nama_kelas: string;
};

const daftarKasusMap: Record<number, string> = {
  1: "Pembajakan Game 'CyberQuest'",
  2: "Plagiarisme Desain Maskot",
  3: "Pencurian Konten Video (Re-uploader)"
};

const parseBukti = (raw: string) => {
  try {
    return JSON.parse(raw);
  } catch {
    return { p1: raw, p2: "", p3: "" };
  }
};

const parseAnalisis = (raw: string) => {
  try {
    return JSON.parse(raw);
  } catch {
    return { tindakan: raw, jenis: "", kerugian: "" };
  }
};

const parseSolusi = (raw: string) => {
  try {
    return JSON.parse(raw);
  } catch {
    return { solusi: raw, aturan: "", refleksi: "" };
  }
};

export default function AdminDashboard() {
  const [chats, setChats] = useState<ChatRecord[]>([]);
  const [lkpdList, setLkpdList] = useState<LkpdReport[]>([]);
  const [kelasList, setKelasList] = useState<KelasItem[]>(DEFAULT_KELAS_LIST);
  const [selectedKelasFilter, setSelectedKelasFilter] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedKelompok, setSelectedKelompok] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"lkpd" | "chat">("lkpd");

  // State Modals
  const [showKelasModal, setShowKelasModal] = useState(false);
  const [inputNamaKelasBaru, setInputNamaKelasBaru] = useState("");
  const [inputKodeKelasBaru, setInputKodeKelasBaru] = useState("");
  const [isSavingKelas, setIsSavingKelas] = useState(false);
  const [pesanSuksesKelas, setPesanSuksesKelas] = useState("");

  const fetchData = async () => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("url_proyek_supabase_anda")) {
      setError("Supabase belum dikonfigurasi. Silakan lengkapi .env.local dan jalankan script SQL.");
      setIsLoading(false);
      return;
    }

    try {
      // 1. Ambil log chat
      const { data: chatData, error: chatError } = await supabase
        .from("chat_history")
        .select("*")
        .order("created_at", { ascending: true });

      if (chatError) throw chatError;
      setChats(chatData || []);

      // 2. Ambil laporan LKPD Digital dari tabel lkpd_reports
      const { data: lkpdData, error: lkpdError } = await supabase
        .from("lkpd_reports")
        .select("*")
        .order("updated_at", { ascending: false });

      if (!lkpdError && lkpdData) {
        setLkpdList(lkpdData);
      }

      // 3. Ambil daftar sesi kelas aktif dari tabel kelas_sesi
      const { data: sesiData, error: sesiError } = await supabase
        .from("kelas_sesi")
        .select("kode_kelas, nama_kelas")
        .order("created_at", { ascending: true });

      if (!sesiError && sesiData && sesiData.length > 0) {
        setKelasList(sesiData);
      }

    } catch (err: any) {
      console.error("Error fetching admin data:", err);
      setError("Gagal mengambil data dari Supabase. Pastikan tabel chat_history, lkpd_reports, dan kelas_sesi sudah dibuat.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Auto-refresh data tiap 10 detik agar guru memantau secara real-time
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Generator Kode Kelas Acak / Random
  const generateRandomKodeKelas = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let randomStr = "";
    for (let i = 0; i < 4; i++) {
      randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const cleanNama = inputNamaKelasBaru.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    const prefix = cleanNama ? `HAKI-${cleanNama}` : "HAKI";
    setInputKodeKelasBaru(`${prefix}-${randomStr}`);
  };

  // Handler Generate Kode Kelas Baru
  const handleSimpanKelasBaru = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputNamaKelasBaru.trim()) return;

    const cleanNama = inputNamaKelasBaru.trim().toUpperCase();
    const cleanKode = (inputKodeKelasBaru.trim() || `HAKI-${cleanNama}`).toUpperCase();

    setIsSavingKelas(true);
    setPesanSuksesKelas("");

    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("url_proyek_supabase_anda")) {
        const { error: insertError } = await supabase
          .from("kelas_sesi")
          .insert({
            kode_kelas: cleanKode,
            nama_kelas: cleanNama
          });

        if (insertError) {
          console.warn("Gagal simpan ke DB kelas_sesi, menambahkan ke state lokal:", insertError);
        }
      }

      // Update state lokal
      setKelasList((prev) => {
        const filtered = prev.filter((k) => k.kode_kelas !== cleanKode);
        return [...filtered, { kode_kelas: cleanKode, nama_kelas: cleanNama }];
      });

      setPesanSuksesKelas(`✅ Berhasil membuat kelas ${cleanNama} dengan Kode: ${cleanKode}`);
      setInputNamaKelasBaru("");
      setInputKodeKelasBaru("");
    } catch (err) {
      console.error("Error creating class session:", err);
    } finally {
      setIsSavingKelas(false);
    }
  };

  // Filter chats & lkpd berdasarkan kelas yang dipilih
  const filteredChats = selectedKelasFilter === "ALL" 
    ? chats 
    : chats.filter((c) => c.kelas?.toUpperCase() === selectedKelasFilter.toUpperCase());

  const filteredLkpd = selectedKelasFilter === "ALL" 
    ? lkpdList 
    : lkpdList.filter((l) => l.kelas?.toUpperCase() === selectedKelasFilter.toUpperCase());

  // Kumpulkan nomor kelompok unik dari hasil filter
  const allKelompokKeys = Array.from(
    new Set([
      ...filteredChats.map((c) => c.kelompok),
      ...filteredLkpd.map((l) => l.kelompok)
    ])
  ).sort((a, b) => a - b);

  // Helper untuk mendapatkan data kelompok
  const getGroupMetadata = (k: number) => {
    const lkpd = filteredLkpd.find((l) => l.kelompok === k);
    const chat = filteredChats.find((c) => c.kelompok === k);

    let namaAnggota = chat?.nama_anggota || "";
    if (!namaAnggota && lkpd?.solusi_rekomendasi) {
      try {
        const s = JSON.parse(lkpd.solusi_rekomendasi);
        if (s.nama_anggota) namaAnggota = s.nama_anggota;
      } catch {}
    }
    if (!namaAnggota) namaAnggota = "Belum ada nama anggota";

    return {
      kelas: lkpd?.kelas || chat?.kelas || (selectedKelasFilter !== "ALL" ? selectedKelasFilter : "9"),
      nama_anggota: namaAnggota,
      kasus_id: lkpd?.kasus_id || chat?.kasus_id || 1,
      bukti_petunjuk: lkpd?.bukti_petunjuk || "",
      analisis_pelanggaran: lkpd?.analisis_pelanggaran || "",
      solusi_rekomendasi: lkpd?.solusi_rekomendasi || "",
      is_submitted: lkpd?.is_submitted || false,
      updated_at: lkpd?.updated_at || null,
      messages: filteredChats.filter((c) => c.kelompok === k)
    };
  };

  // Handler Cetak / PDF
  const handlePrint = () => {
    window.print();
  };

  // Handler Ekspor Rekap LKPD ke Excel (CSV)
  const exportToCsv = (groupsToExport: number[]) => {
    if (!groupsToExport || groupsToExport.length === 0) {
      alert("Tidak ada data kelompok untuk diekspor.");
      return;
    }

    const headers = [
      "No",
      "Kelas",
      "Kelompok",
      "Kasus ID",
      "Judul Kasus",
      "Status LKPD",
      "Susunan Anggota & Peran Tim",
      "Petunjuk 1 (Pelaku/Tindakan)",
      "Petunjuk 2 (Aset/Karya)",
      "Petunjuk 3 (Lisensi/Status Hukum)",
      "Analisis Pelanggaran (HOTS C4)",
      "Jenis HAKI/Lisensi yang Dilanggar",
      "Pihak Dirugikan & Dampak",
      "Solusi Adil Korban (HOTS C5)",
      "Aturan Etis Mitigasi",
      "Jurnal Refleksi Diri",
      "Terakhir Diperbarui"
    ];

    const rows = groupsToExport.map((k, index) => {
      const meta = getGroupMetadata(k);
      const b = parseBukti(meta.bukti_petunjuk);
      const a = parseAnalisis(meta.analisis_pelanggaran);
      const s = parseSolusi(meta.solusi_rekomendasi);

      return [
        index + 1,
        meta.kelas,
        `Kelompok ${k}`,
        meta.kasus_id,
        daftarKasusMap[meta.kasus_id] || `Kasus #${meta.kasus_id}`,
        meta.is_submitted ? "FINAL TERKIRIM" : "DRAFT",
        meta.nama_anggota,
        b.p1,
        b.p2,
        b.p3,
        a.tindakan,
        a.jenis,
        a.kerugian,
        s.solusi,
        s.aturan,
        s.refleksi,
        meta.updated_at ? new Date(meta.updated_at).toLocaleString("id-ID") : "-"
      ].map((val) => `"${String(val || "").replace(/"/g, '""')}"`).join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const prefix = groupsToExport.length === 1 ? `Kelompok_${groupsToExport[0]}` : (selectedKelasFilter === "ALL" ? "Semua_Kelas" : `Kelas_${selectedKelasFilter}`);
    const namaFile = `Rekap_LKPD_Detektif_HAKI_${prefix}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute("href", url);
    link.setAttribute("download", namaFile);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedGroupData = selectedKelompok ? getGroupMetadata(selectedKelompok) : null;

  return (
    <>
      {/* STYLE KHUSUS UNTUK CETAK PDF */}
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          @page {
            size: A4 portrait;
            margin: 12mm 15mm 12mm 15mm;
          }
        }
      `}</style>

      {/* DASHBOARD UTAMA (DISEMBUNYIKAN SAAT CETAK / PRINT) */}
      <div className="no-print print:hidden h-screen md:h-[100dvh] bg-slate-100 flex flex-col md:flex-row overflow-hidden">
        {/* Sidebar - Daftar Kelompok & Filter Kelas (Scrollbar Terpisah) */}
        <div className="w-full md:w-80 lg:w-96 bg-white border-r border-slate-200 flex flex-col shrink-0 max-h-[42vh] md:max-h-none md:h-full overflow-hidden">
          
          {/* Header Dasbor Guru */}
          <div className="p-4 border-b border-slate-200 bg-slate-900 text-white shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
                <h1 className="text-base font-bold">Dasbor Guru</h1>
              </div>
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={fetchData} 
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-all flex items-center gap-1 font-medium cursor-pointer"
                  title="Refresh Data"
                >
                  <span>🔄</span> Refresh
                </button>
              </div>
            </div>

            {/* Filter Kelas & Tombol Tambah Kelas & Ekspor Rekap */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px] text-slate-400 font-medium">
                <span>Filter Sesi Kelas:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => exportToCsv(allKelompokKeys)}
                    className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                    title="Ekspor seluruh rekap LKPD kelas ini ke file Excel (CSV)"
                  >
                    <span>📊</span> Ekspor Excel
                  </button>
                  <button
                    onClick={() => setShowKelasModal(true)}
                    className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>➕</span> Buat Kelas
                  </button>
                </div>
              </div>
            <select
              value={selectedKelasFilter}
              onChange={(e) => {
                setSelectedKelasFilter(e.target.value);
                setSelectedKelompok(null);
              }}
              className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 font-semibold"
            >
              <option value="ALL">🌐 Semua Kelas</option>
              {kelasList.map((k) => (
                <option key={k.kode_kelas} value={k.nama_kelas}>
                  Kelas {k.nama_kelas} (Kode: {k.kode_kelas})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* List Kelompok Aktif (Scrollbar Terpisah) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400">
          <div className="flex justify-between items-center px-1 mb-1">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {selectedKelasFilter === "ALL" ? "Semua Kelompok" : `Kelompok Kelas ${selectedKelasFilter}`}
            </h2>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
              {allKelompokKeys.length} Tim
            </span>
          </div>

          {allKelompokKeys.length === 0 && !isLoading && !error && (
            <div className="text-center py-8 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
              <span className="text-3xl block mb-2">⏳</span>
              <p className="text-xs text-slate-500 font-medium">
                {selectedKelasFilter === "ALL" 
                  ? "Belum ada kelompok yang mengisi identitas atau interogasi." 
                  : `Belum ada aktivitas investigasi dari Kelas ${selectedKelasFilter}.`}
              </p>
            </div>
          )}

          {allKelompokKeys.map((k) => {
            const group = getGroupMetadata(k);
            const isSelected = selectedKelompok === k;
            const hasReport = !!group.bukti_petunjuk || !!group.analisis_pelanggaran || !!group.solusi_rekomendasi;

            return (
              <button
                key={k}
                onClick={() => setSelectedKelompok(k)}
                className={`w-full text-left p-3.5 rounded-2xl transition-all border ${
                  isSelected 
                    ? "bg-blue-50 border-blue-300 shadow-sm ring-1 ring-blue-400" 
                    : "bg-white border-slate-100 hover:border-blue-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-bold text-slate-800 text-sm">Kelompok {k}</span>
                  <div className="flex items-center gap-1.5">
                    {group.is_submitted ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded-md font-bold">
                        🚀 Final
                      </span>
                    ) : hasReport ? (
                      <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded-md font-bold">
                        📝 Draft
                      </span>
                    ) : null}
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                      Kasus #{group.kasus_id}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-medium text-blue-600">Kelas {group.kelas}</span>
                  <span>{group.messages.length} Chat</span>
                </div>
                <p className="text-xs text-slate-400 truncate mt-1">
                  {group.nama_anggota}
                </p>
              </button>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <Link href="/" className="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-semibold text-slate-600 hover:bg-white border border-slate-200 rounded-xl transition-all shadow-sm">
            ← Kembali ke Beranda
          </Link>
        </div>
      </div>

      {/* Main Content: Monitor LKPD Digital & Chat (Scrollbar Terpisah untuk Hasil Kelompok) */}
      <div className="flex-1 bg-slate-50 p-3 md:p-6 overflow-hidden flex flex-col h-[58vh] md:h-full">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-pulse flex flex-col items-center">
              <div className="w-12 h-12 bg-blue-200 rounded-full mb-3"></div>
              <p className="text-slate-500 font-medium text-sm">Memuat data investigasi kelas...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="max-w-md p-6 bg-red-50 border border-red-200 rounded-2xl text-center">
              <span className="text-4xl mb-3 block">⚠️</span>
              <h3 className="text-base font-bold text-red-800 mb-1">Gagal Memuat Data</h3>
              <p className="text-xs text-red-600">{error}</p>
            </div>
          </div>
        ) : !selectedKelompok || !selectedGroupData ? (
          <div className="flex-1 flex items-center justify-center text-center p-6">
            <div className="max-w-sm">
              <div className="text-6xl mb-4 grayscale opacity-20">🗂️</div>
              <h2 className="text-lg font-bold text-slate-700 mb-1">Pilih Kelompok</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Pilih salah satu kelompok di panel samping untuk memeriksa <strong>LKPD Digital</strong> serta transkrip chat interogasi mereka.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col overflow-hidden h-full">
            {/* Header Detail Kelompok Terpilih */}
            <div className="p-4 md:p-5 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-extrabold text-lg text-slate-800">Kelompok {selectedKelompok}</h2>
                  <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2.5 py-0.5 rounded-full">
                    Kelas {selectedGroupData.kelas}
                  </span>
                  <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-md border border-slate-200">
                    Kasus #{selectedGroupData.kasus_id}
                  </span>
                  {selectedGroupData.is_submitted ? (
                    <span className="text-xs bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2.5 py-0.5 rounded-full">
                      ✓ Final Terkirim
                    </span>
                  ) : (
                    <span className="text-xs bg-amber-100 text-amber-800 border border-amber-300 font-bold px-2.5 py-0.5 rounded-full">
                      ⏳ Draft
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">Anggota Tim:</span> {selectedGroupData.nama_anggota}
                </p>
              </div>

              {/* Tabs Switcher: LKPD Digital vs Riwayat Chat */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto shrink-0">
                <button
                  onClick={() => setActiveTab("lkpd")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === "lkpd" 
                      ? "bg-white text-emerald-700 shadow-sm" 
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>📋</span> LKPD Digital
                </button>
                <button
                  onClick={() => setActiveTab("chat")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === "chat" 
                      ? "bg-white text-blue-700 shadow-sm" 
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>💬</span> Riwayat Chat ({selectedGroupData.messages.length})
                </button>
              </div>
            </div>

            {/* Content Area Berdasarkan Tab (Scrollbar Independen untuk Hasil Kelompok) */}
            <div className="flex-1 p-4 md:p-6 overflow-y-auto bg-slate-50/60 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400">
              
              {/* TAB 1: LAPORAN LKPD DIGITAL (lkpd_reports) */}
              {activeTab === "lkpd" && (() => {
                const bukti = parseBukti(selectedGroupData.bukti_petunjuk);
                const analisis = parseAnalisis(selectedGroupData.analisis_pelanggaran);
                const solusi = parseSolusi(selectedGroupData.solusi_rekomendasi);

                return (
                  <div className="space-y-5 max-w-4xl mx-auto">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                            <span>📋</span> Berkas Investigasi Kelompok {selectedKelompok}
                          </h3>
                          {selectedGroupData.is_submitted ? (
                            <span className="text-xs bg-emerald-600 text-white font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                              <span>✓</span> Final Terkirim
                            </span>
                          ) : (
                            <span className="text-xs bg-amber-500 text-white font-bold px-2.5 py-0.5 rounded-full">
                              Draft (Belum Submit)
                            </span>
                          )}
                        </div>
                        {selectedGroupData.updated_at && (
                          <span className="text-xs text-slate-500 block mt-0.5">
                            Update Terakhir: {new Date(selectedGroupData.updated_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                          </span>
                        )}
                      </div>

                      {/* Tombol Aksi: Cetak PDF & Ekspor Excel */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={handlePrint}
                          className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
                          title="Cetak atau Simpan sebagai PDF (Lembar Resmi Tugas PPG)"
                        >
                          <span>🖨️</span> Cetak / PDF
                        </button>
                        <button
                          onClick={() => exportToCsv([selectedKelompok])}
                          className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
                          title="Unduh data LKPD kelompok ini ke format Excel / CSV"
                        >
                          <span>📊</span> Unduh Excel
                        </button>
                      </div>
                    </div>

                    {/* BAGIAN I: IDENTITAS TIM DETEKTIF */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">I</span>
                          <h4 className="font-bold text-slate-800 text-sm">IDENTITAS TIM DETEKTIF</h4>
                        </div>
                        <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2.5 py-0.5 rounded-full border border-blue-200">
                          5–6 Anak/Kelompok
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl text-xs text-slate-700">
                        <div><strong className="text-slate-500 block text-[11px]">Kelas:</strong> {selectedGroupData.kelas}</div>
                        <div><strong className="text-slate-500 block text-[11px]">Nomor Kelompok:</strong> Kelompok {selectedKelompok}</div>
                        <div><strong className="text-slate-500 block text-[11px]">Kasus:</strong> Kasus #{selectedGroupData.kasus_id}</div>
                      </div>
                      <div>
                        <strong className="text-slate-500 block text-xs mb-1.5">Nama Anggota & Peran:</strong>
                        <div className="text-xs text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-100 font-medium space-y-1">
                          {selectedGroupData.nama_anggota ? (
                            selectedGroupData.nama_anggota.split(", ").map((item, idx) => (
                              <p key={idx}>{item}</p>
                            ))
                          ) : (
                            <p className="text-slate-400 italic">Belum ada nama anggota</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* BAGIAN II: CATATAN BUKTI INVESTIGASI (EVIDENCE LOG) */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                        <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">II</span>
                        <h4 className="font-bold text-slate-800 text-sm">CATATAN BUKTI INVESTIGASI (EVIDENCE LOG FROM AI)</h4>
                      </div>
                      <div className="space-y-2.5 text-xs">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <strong className="text-slate-600 block text-[11px] mb-1">1. Petunjuk #1 (Mengenai Pelaku/Tindakan):</strong>
                          <p className="text-slate-800 whitespace-pre-wrap">{bukti.p1 || <span className="text-slate-400 italic">(Belum diisi)</span>}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <strong className="text-slate-600 block text-[11px] mb-1">2. Petunjuk #2 (Mengenai Aset/Karya yang Dirugikan):</strong>
                          <p className="text-slate-800 whitespace-pre-wrap">{bukti.p2 || <span className="text-slate-400 italic">(Belum diisi)</span>}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <strong className="text-slate-600 block text-[11px] mb-1">3. Petunjuk #3 (Mengenai Lisensi/Status Hukum Karya):</strong>
                          <p className="text-slate-800 whitespace-pre-wrap">{bukti.p3 || <span className="text-slate-400 italic">(Belum diisi)</span>}</p>
                        </div>
                      </div>
                    </div>

                    {/* BAGIAN III: LEMBAR ANALISIS HAKI (HOTS - C4) */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                        <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center text-xs font-bold">III</span>
                        <h4 className="font-bold text-slate-800 text-sm">LEMBAR ANALISIS HAKI (HOTS - C4)</h4>
                      </div>
                      <div className="space-y-2.5 text-xs">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <strong className="text-slate-600 block text-[11px] mb-1">1. Tindakan spesifik yang melanggar etika/hukum:</strong>
                          <p className="text-slate-800 whitespace-pre-wrap">{analisis.tindakan || <span className="text-slate-400 italic">(Belum diisi)</span>}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <strong className="text-slate-600 block text-[11px] mb-1">2. Jenis Hak Kekayaan Intelektual / Lisensi yang dilanggar:</strong>
                          <p className="text-slate-800 whitespace-pre-wrap">{analisis.jenis || <span className="text-slate-400 italic">(Belum diisi)</span>}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <strong className="text-slate-600 block text-[11px] mb-1">3. Pihak yang paling dirugikan dan dampak kerugiannya:</strong>
                          <p className="text-slate-800 whitespace-pre-wrap">{analisis.kerugian || <span className="text-slate-400 italic">(Belum diisi)</span>}</p>
                        </div>
                      </div>
                    </div>

                    {/* BAGIAN IV: REKOMENDASI SOLUSI & MITIGASI (HOTS - C5) */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                        <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-bold">IV</span>
                        <h4 className="font-bold text-slate-800 text-sm">REKOMENDASI SOLUSI & MITIGASI KASUS (HOTS - C5)</h4>
                      </div>
                      <div className="space-y-2.5 text-xs">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <strong className="text-slate-600 block text-[11px] mb-1">1. Langkah penyelesaian adil untuk korban saat ini:</strong>
                          <p className="text-slate-800 whitespace-pre-wrap">{solusi.solusi || <span className="text-slate-400 italic">(Belum diisi)</span>}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <strong className="text-slate-600 block text-[11px] mb-1">2. Aturan etis masa depan agar tidak melanggar HAKI:</strong>
                          <p className="text-slate-800 whitespace-pre-wrap">{solusi.aturan || <span className="text-slate-400 italic">(Belum diisi)</span>}</p>
                        </div>
                      </div>
                    </div>

                    {/* BAGIAN V: JURNAL REFLEKSI DIRI */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                        <span className="w-6 h-6 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center text-xs font-bold">V</span>
                        <h4 className="font-bold text-slate-800 text-sm">JURNAL REFLEKSI DIRI</h4>
                      </div>
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs">
                        <strong className="text-slate-600 block text-[11px] mb-1">• Hal paling berharga yang dipelajari tentang Hak Cipta:</strong>
                        <p className="text-slate-800 whitespace-pre-wrap">{solusi.refleksi || <span className="text-slate-400 italic">(Belum diisi)</span>}</p>
                      </div>
                    </div>

                  </div>
                );
              })()}

              {/* TAB 2: RIWAYAT CHAT INTEROGASI */}
              {activeTab === "chat" && (
                <div className="space-y-4 max-w-3xl mx-auto">
                  {selectedGroupData.messages.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <span className="text-4xl block mb-2">💬</span>
                      <p className="text-sm">Belum ada obrolan interogasi dari kelompok ini.</p>
                    </div>
                  ) : (
                    selectedGroupData.messages.map((msg, i) => (
                      <div key={msg.id || i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] md:max-w-[80%] p-4 rounded-2xl shadow-sm ${
                          msg.role === "user" 
                            ? "bg-blue-600 text-white rounded-br-sm" 
                            : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"
                        }`}>
                          {msg.role === "user" ? (
                            <span className="block text-[11px] text-blue-200 font-bold mb-1">Pertanyaan Siswa</span>
                          ) : (
                            <span className="block text-[11px] text-slate-400 font-bold mb-1">Saksi Mata AI</span>
                          )}
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          <span className="block text-[10px] opacity-50 mt-2 text-right">
                            {new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

            </div>
          </div>
        )}
      </div>


      {/* Modal Generate Kode Kelas Baru */}
      {showKelasModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 border border-slate-200 relative">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎓</span>
                <h3 className="text-lg font-bold text-slate-800">Generate Sesi Kelas Baru</h3>
              </div>
              <button 
                onClick={() => {
                  setShowKelasModal(false);
                  setPesanSuksesKelas("");
                }}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Buat kode kelas baru untuk sesi pembelajaran kelas tertentu agar data investigasi dan LKPD siswa terpisah rapi per kelas.
            </p>

            <form onSubmit={handleSimpanKelasBaru} className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Kelas
                </label>
                <input
                  type="text"
                  required
                  value={inputNamaKelasBaru}
                  onChange={(e) => {
                    setInputNamaKelasBaru(e.target.value);
                    if (!inputKodeKelasBaru || inputKodeKelasBaru.startsWith("HAKI-")) {
                      setInputKodeKelasBaru(`HAKI-${e.target.value.trim().toUpperCase()}`);
                    }
                  }}
                  placeholder="Contoh: 9D atau IX-B"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Kode Akses Kelas
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomKodeKelas}
                    className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <span>🎲</span> Acak / Random
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={inputKodeKelasBaru}
                    onChange={(e) => setInputKodeKelasBaru(e.target.value.toUpperCase())}
                    placeholder="Contoh: HAKI-9D atau 9D-4K2X"
                    className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 font-mono uppercase tracking-wider focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={generateRandomKodeKelas}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-300 flex items-center gap-1 shrink-0 active:scale-95"
                    title="Generate Kode Acak"
                  >
                    <span>🎲</span> Acak
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Klik <strong>"🎲 Acak"</strong> untuk menghasilkan kode unik otomatis, atau ketik kode manual.
                </span>
              </div>

              {pesanSuksesKelas && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-medium">
                  {pesanSuksesKelas}
                </div>
              )}

              <button
                type="submit"
                disabled={isSavingKelas || !inputNamaKelasBaru.trim()}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-md"
              >
                {isSavingKelas ? "Menyimpan..." : "Simpan & Aktifkan Kelas"}
              </button>
            </form>

            <div className="border-t border-slate-100 pt-3">
              <h4 className="text-xs font-bold text-slate-600 mb-2">Daftar Kode Kelas Aktif:</h4>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {kelasList.map((k) => (
                  <div key={k.kode_kelas} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="font-semibold text-slate-700">Kelas {k.nama_kelas}</span>
                    <span className="font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[11px]">
                      {k.kode_kelas}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                setShowKelasModal(false);
                setPesanSuksesKelas("");
              }}
              className="w-full mt-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
      </div>

      {/* DOKUMEN RESMI UNTUK CETAK PDF (Hanya Tampil Saat Print / PDF) */}
      {selectedGroupData && (
        <div id="printable-area" className="hidden print-only p-4 bg-white text-black font-sans leading-normal">
          {/* KOP RESMI LAPORAN LKPD PPG */}
          <div className="border-b-2 border-black pb-2 mb-3 text-center">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-700">
              PROGRAM PENDIDIKAN PROFESI GURU (PPG) • KARYA INOVASI PEMBELAJARAN
            </h3>
            <h1 className="text-base font-extrabold uppercase tracking-wide text-black mt-0.5">
              LEMBAR KERJA PESERTA DIDIK (LKPD) DIGITAL DETEKTIF HAKI
            </h1>
            <p className="text-[10px] text-gray-600 mt-0.5">
              Topik: Hak Kekayaan Intelektual, Hak Cipta, Plagiarisme Digital, dan Etika AI • Model Problem-Based Learning
            </p>
          </div>

          {/* BAGIAN I: IDENTITAS TIM DETEKTIF */}
          <div className="border border-black rounded p-3 mb-2.5 text-[11px]">
            <div className="flex justify-between items-center border-b border-gray-300 pb-1 mb-1.5 font-bold uppercase text-[10px]">
              <span>BAGIAN I: IDENTITAS TIM DETEKTIF</span>
              <span>(5–6 Anak / Kelompok)</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-2 bg-gray-50 p-2 border border-gray-200 rounded text-[10px]">
              <div><span className="text-gray-500 block">Kelas:</span> <strong className="text-black text-[11px]">{selectedGroupData.kelas}</strong></div>
              <div><span className="text-gray-500 block">Nomor Kelompok:</span> <strong className="text-black text-[11px]">Kelompok {selectedKelompok}</strong></div>
              <div><span className="text-gray-500 block">Kasus yang Diteliti:</span> <strong className="text-black text-[11px]">Kasus #{selectedGroupData.kasus_id} ({daftarKasusMap[selectedGroupData.kasus_id] || "Studi Kasus HAKI"})</strong></div>
            </div>
            <div>
              <span className="font-semibold block mb-1 text-[10px] text-gray-700">Nama Anggota Tim & Pembagian Peran:</span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 pl-2 text-[10px]">
                {selectedGroupData.nama_anggota.split(", ").map((item, idx) => (
                  <p key={idx}>• {item}</p>
                ))}
              </div>
            </div>
          </div>

          {/* BAGIAN II: CATATAN BUKTI INVESTIGASI (EVIDENCE LOG) */}
          <div className="border border-black rounded p-3 mb-2.5 text-[11px]">
            <div className="border-b border-gray-300 pb-1 mb-1.5 font-bold uppercase text-[10px]">
              BAGIAN II: CATATAN BUKTI INVESTIGASI (EVIDENCE LOG FROM AI)
            </div>
            {(() => {
              const bukti = parseBukti(selectedGroupData.bukti_petunjuk);
              return (
                <div className="space-y-1.5 text-[10px]">
                  <div>
                    <strong className="block text-gray-800">1. Petunjuk #1 (Mengenai Pelaku / Tindakan yang Dilakukan):</strong>
                    <p className="p-1.5 border border-gray-200 rounded bg-gray-50 min-h-[26px] whitespace-pre-wrap">{bukti.p1 || "-"}</p>
                  </div>
                  <div>
                    <strong className="block text-gray-800">2. Petunjuk #2 (Mengenai Aset / Karya yang Dirugikan):</strong>
                    <p className="p-1.5 border border-gray-200 rounded bg-gray-50 min-h-[26px] whitespace-pre-wrap">{bukti.p2 || "-"}</p>
                  </div>
                  <div>
                    <strong className="block text-gray-800">3. Petunjuk #3 (Mengenai Lisensi / Status Hukum Karya):</strong>
                    <p className="p-1.5 border border-gray-200 rounded bg-gray-50 min-h-[26px] whitespace-pre-wrap">{bukti.p3 || "-"}</p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* BAGIAN III: LEMBAR ANALISIS HAKI (HOTS - C4) */}
          <div className="border border-black rounded p-3 mb-2.5 text-[11px]">
            <div className="border-b border-gray-300 pb-1 mb-1.5 font-bold uppercase text-[10px]">
              BAGIAN III: LEMBAR ANALISIS HAKI (HOTS - C4)
            </div>
            {(() => {
              const analisis = parseAnalisis(selectedGroupData.analisis_pelanggaran);
              return (
                <div className="space-y-1.5 text-[10px]">
                  <div>
                    <strong className="block text-gray-800">1. Tindakan Spesifik Pelanggaran Hukum / Etika Digital:</strong>
                    <p className="p-1.5 border border-gray-200 rounded bg-gray-50 min-h-[26px] whitespace-pre-wrap">{analisis.tindakan || "-"}</p>
                  </div>
                  <div>
                    <strong className="block text-gray-800">2. Jenis Hak Kekayaan Intelektual atau Lisensi yang Dilanggar:</strong>
                    <p className="p-1.5 border border-gray-200 rounded bg-gray-50 min-h-[26px] whitespace-pre-wrap">{analisis.jenis || "-"}</p>
                  </div>
                  <div>
                    <strong className="block text-gray-800">3. Pihak yang Paling Dirugikan dan Dampak Kerugiannya (Moral / Ekonomi):</strong>
                    <p className="p-1.5 border border-gray-200 rounded bg-gray-50 min-h-[26px] whitespace-pre-wrap">{analisis.kerugian || "-"}</p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* BAGIAN IV: REKOMENDASI SOLUSI & MITIGASI (HOTS - C5) */}
          <div className="border border-black rounded p-3 mb-2.5 text-[11px]">
            <div className="border-b border-gray-300 pb-1 mb-1.5 font-bold uppercase text-[10px]">
              BAGIAN IV: REKOMENDASI SOLUSI & MITIGASI KASUS (HOTS - C5)
            </div>
            {(() => {
              const solusi = parseSolusi(selectedGroupData.solusi_rekomendasi);
              return (
                <div className="space-y-1.5 text-[10px]">
                  <div>
                    <strong className="block text-gray-800">1. Langkah Penyelesaian Adil untuk Korban Saat Ini:</strong>
                    <p className="p-1.5 border border-gray-200 rounded bg-gray-50 min-h-[26px] whitespace-pre-wrap">{solusi.solusi || "-"}</p>
                  </div>
                  <div>
                    <strong className="block text-gray-800">2. Aturan Etis Masa Depan agar Terhindar dari Pelanggaran HAKI:</strong>
                    <p className="p-1.5 border border-gray-200 rounded bg-gray-50 min-h-[26px] whitespace-pre-wrap">{solusi.aturan || "-"}</p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* BAGIAN V: JURNAL REFLEKSI DIRI */}
          <div className="border border-black rounded p-3 mb-2.5 text-[11px]">
            <div className="border-b border-gray-300 pb-1 mb-1.5 font-bold uppercase text-[10px]">
              BAGIAN V: JURNAL REFLEKSI DIRI
            </div>
            {(() => {
              const solusi = parseSolusi(selectedGroupData.solusi_rekomendasi);
              return (
                <div className="text-[10px]">
                  <strong className="block text-gray-800">• Hal paling berharga yang saya pelajari hari ini tentang Hak Cipta:</strong>
                  <p className="p-1.5 border border-gray-200 rounded bg-gray-50 min-h-[26px] whitespace-pre-wrap mt-0.5">{solusi.refleksi || "-"}</p>
                </div>
              );
            })()}
          </div>

          {/* RUBRIK PENILAIAN & PENGESAHAN GURU PEMBIMBING */}
          <div className="border-2 border-black rounded p-3 text-[10px]">
            <div className="font-bold uppercase text-[10px] border-b border-black pb-1 mb-1.5 flex justify-between items-center">
              <span>LEMBAR PENILAIAN & EVALUASI GURU PEMBIMBING (PPG)</span>
              <span>NILAI AKHIR: [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; / 100 ]</span>
            </div>
            <div className="mb-3">
              <span className="font-semibold block text-gray-600 mb-0.5">Catatan Evaluasi / Umpan Balik Guru:</span>
              <div className="border-b border-dotted border-gray-400 h-4"></div>
              <div className="border-b border-dotted border-gray-400 h-4"></div>
            </div>
            <div className="grid grid-cols-2 text-center pt-1">
              <div>
                <p className="text-gray-600">Mengetahui,</p>
                <p className="font-bold">Ketua Tim Detektif</p>
                <div className="h-10"></div>
                <p className="font-bold underline">(......................................................)</p>
              </div>
              <div>
                <p className="text-gray-600">Guru Pembimbing / Penilai</p>
                <p className="font-bold">Mahasiswa PPG</p>
                <div className="h-10"></div>
                <p className="font-bold underline">(......................................................)</p>
                <p className="text-[9px] text-gray-600">NIP / NIM: .......................................</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
