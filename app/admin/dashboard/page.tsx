"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DEFAULT_KELAS_LIST, DAFTAR_KASUS } from "@/lib/constants";
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

// Skema Hasil Evaluasi AI (Tahap 2)
export type EvaluasiAI = {
  skorTotal: number;
  predikat: string;
  kategori: {
    kelengkapanBukti: { skor: number; max: number; catatan: string };
    analisisPelanggaranC4: { skor: number; max: number; catatan: string };
    solusiMitigasiC5: { skor: number; max: number; catatan: string };
    refleksiDiri: { skor: number; max: number; catatan: string };
  };
  analisisHukum: string;
  kelebihan: string[];
  kekurangan: string[];
  rekomendasiGuru: string;
  waktuEvaluasi?: string;
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
  durasi_menit?: number;
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
    const parsed = JSON.parse(raw);
    return {
      solusi: parsed.solusi || (typeof raw === "string" && !raw.startsWith("{") ? raw : ""),
      aturan: parsed.aturan || "",
      refleksi: parsed.refleksi || "",
      nama_anggota: parsed.nama_anggota || "",
      evaluasi_ai: (parsed.evaluasi_ai || null) as EvaluasiAI | null
    };
  } catch {
    return {
      solusi: raw,
      aturan: "",
      refleksi: "",
      nama_anggota: "",
      evaluasi_ai: null
    };
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

  // State Tahap 2: Dual View Mode & AI Assessment
  const [lkpdViewMode, setLkpdViewMode] = useState<"siswa" | "evaluasi" | "split">("siswa");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalError, setEvalError] = useState("");
  const [evalSuccess, setEvalSuccess] = useState("");

  // State Modals
  const [showKelasModal, setShowKelasModal] = useState(false);
  const [inputNamaKelasBaru, setInputNamaKelasBaru] = useState("");
  const [inputKodeKelasBaru, setInputKodeKelasBaru] = useState("");
  const [inputDurasiMenit, setInputDurasiMenit] = useState<number>(30);
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
        .select("*")
        .order("created_at", { ascending: true });

      if (!sesiError && sesiData && sesiData.length > 0) {
        setKelasList(sesiData.map((s: any) => ({
          kode_kelas: s.kode_kelas,
          nama_kelas: s.nama_kelas,
          durasi_menit: s.durasi_menit ? Number(s.durasi_menit) : 30
        })));
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

  // Handler Generate Kode Kelas Baru dengan Setting Durasi Timer
  const handleSimpanKelasBaru = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputNamaKelasBaru.trim()) return;

    const cleanNama = inputNamaKelasBaru.trim().toUpperCase();
    const cleanKode = (inputKodeKelasBaru.trim() || `HAKI-${cleanNama}`).toUpperCase();
    const durasiNum = Number(inputDurasiMenit) || 30;

    setIsSavingKelas(true);
    setPesanSuksesKelas("");

    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("url_proyek_supabase_anda")) {
        const { error: insertError } = await supabase
          .from("kelas_sesi")
          .insert({
            kode_kelas: cleanKode,
            nama_kelas: cleanNama,
            durasi_menit: durasiNum
          });

        if (insertError) {
          console.warn("Mencoba fallback insert tanpa durasi_menit jika kolom belum ada di DB:", insertError);
          await supabase
            .from("kelas_sesi")
            .insert({
              kode_kelas: cleanKode,
              nama_kelas: cleanNama
            });
        }
      }

      // Update state lokal
      setKelasList((prev) => {
        const filtered = prev.filter((k) => k.kode_kelas !== cleanKode);
        return [...filtered, { kode_kelas: cleanKode, nama_kelas: cleanNama, durasi_menit: durasiNum }];
      });

      setPesanSuksesKelas(`✅ Berhasil membuat kelas ${cleanNama} (Durasi: ${durasiNum} Menit) dengan Kode: ${cleanKode}`);
      setInputNamaKelasBaru("");
      setInputKodeKelasBaru("");
      setInputDurasiMenit(30);
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

    const kelasStr = lkpd?.kelas || chat?.kelas || (selectedKelasFilter !== "ALL" ? selectedKelasFilter : "9");
    const matchedKelasObj = kelasList.find(
      (item) => item.nama_kelas.toUpperCase() === kelasStr.toUpperCase() || item.kode_kelas.toUpperCase() === kelasStr.toUpperCase()
    );
    const durasiMenit = matchedKelasObj?.durasi_menit || 30;

    return {
      kelas: kelasStr,
      durasi_menit: durasiMenit,
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

  // Helper Predikat Badge Styling
  const getPredikatBadge = (predikat: string) => {
    const p = predikat || "";
    if (p.includes("Sangat Baik") || p.includes("A")) {
      return { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-300" };
    }
    if (p.includes("Baik") || p.includes("B")) {
      return { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300" };
    }
    if (p.includes("Cukup") || p.includes("C")) {
      return { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-300" };
    }
    return { bg: "bg-rose-100", text: "text-rose-800", border: "border-rose-300" };
  };

  // Handler Asesmen & Rubrik Evaluasi AI (Tahap 2)
  const handleRunEvaluation = async (targetKelompok: number) => {
    const group = getGroupMetadata(targetKelompok);
    const bukti = parseBukti(group.bukti_petunjuk);
    const analisis = parseAnalisis(group.analisis_pelanggaran);
    const solusi = parseSolusi(group.solusi_rekomendasi);

    // Periksa apakah lembar kerja siswa sudah terisi
    const hasAnyContent =
      (bukti.p1 && bukti.p1.trim()) ||
      (bukti.p2 && bukti.p2.trim()) ||
      (bukti.p3 && bukti.p3.trim()) ||
      (analisis.tindakan && analisis.tindakan.trim()) ||
      (analisis.jenis && analisis.jenis.trim()) ||
      (analisis.kerugian && analisis.kerugian.trim()) ||
      (solusi.solusi && solusi.solusi.trim()) ||
      (solusi.aturan && solusi.aturan.trim()) ||
      (solusi.refleksi && solusi.refleksi.trim());

    if (!hasAnyContent) {
      alert("Kelompok ini belum mengisi Lembar Kerja Siswa (LKPD). Pastikan siswa telah mengisi bukti atau analisis terlebih dahulu sebelum dievaluasi AI.");
      return;
    }

    setIsEvaluating(true);
    setEvalError("");
    setEvalSuccess("");

    try {
      const kasusItem = DAFTAR_KASUS.find((k) => k.id === group.kasus_id) || {
        id: group.kasus_id,
        judul: daftarKasusMap[group.kasus_id] || `Kasus #${group.kasus_id}`,
        deskripsi: ""
      };

      const res = await fetch("/api/evaluasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kasus: kasusItem,
          kelas: group.kelas,
          kelompok: targetKelompok,
          namaAnggota: group.nama_anggota,
          bukti,
          analisis,
          solusi
        })
      });

      const evalData = await res.json();
      if (!res.ok) {
        throw new Error(evalData.error || evalData.detail || "Gagal mendapatkan evaluasi AI.");
      }

      // Siapkan payload baru untuk solusi_rekomendasi
      let currentSolusiObj: any = {};
      try {
        currentSolusiObj = JSON.parse(group.solusi_rekomendasi);
      } catch {
        currentSolusiObj = {
          solusi: solusi.solusi,
          aturan: solusi.aturan,
          refleksi: solusi.refleksi,
          nama_anggota: group.nama_anggota
        };
      }

      const updatedSolusiStr = JSON.stringify({
        ...currentSolusiObj,
        evaluasi_ai: evalData
      });

      // Update Supabase
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("url_proyek_supabase_anda")) {
        const { error: updateErr } = await supabase
          .from("lkpd_reports")
          .update({
            solusi_rekomendasi: updatedSolusiStr,
            updated_at: new Date().toISOString()
          })
          .eq("kelompok", targetKelompok)
          .eq("kelas", group.kelas);

        if (updateErr) {
          console.warn("Gagal update evaluasi ke Supabase:", updateErr);
        }
      }

      // Update local state lkpdList
      setLkpdList((prev) => {
        const index = prev.findIndex((l) => l.kelompok === targetKelompok && l.kelas.toUpperCase() === group.kelas.toUpperCase());
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            solusi_rekomendasi: updatedSolusiStr,
            updated_at: new Date().toISOString()
          };
          return updated;
        } else {
          return [
            ...prev,
            {
              id: `eval-${Date.now()}`,
              kelompok: targetKelompok,
              kelas: group.kelas,
              kasus_id: group.kasus_id,
              bukti_petunjuk: group.bukti_petunjuk,
              analisis_pelanggaran: group.analisis_pelanggaran,
              solusi_rekomendasi: updatedSolusiStr,
              is_submitted: group.is_submitted,
              updated_at: new Date().toISOString()
            }
          ];
        }
      });

      setEvalSuccess("Evaluasi AI berhasil diperbarui dan tersimpan!");
      setLkpdViewMode("evaluasi");
    } catch (err: any) {
      console.error("Gagal menjalankan evaluasi:", err);
      setEvalError(err.message || "Terjadi kesalahan saat memproses evaluasi AI.");
    } finally {
      setIsEvaluating(false);
    }
  };

  // Handler Ekspor Rekap LKPD ke Excel (CSV) dengan Data Asli & Evaluasi AI
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
      "Skor Evaluasi AI",
      "Predikat AI",
      "Ulasan Hukum UU 28/2014 (AI)",
      "Rekomendasi Umpan Balik Guru (AI)",
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
        s.evaluasi_ai ? `${s.evaluasi_ai.skorTotal}/100` : "Belum Dinilai",
        s.evaluasi_ai?.predikat || "-",
        s.evaluasi_ai?.analisisHukum || "-",
        s.evaluasi_ai?.rekomendasiGuru || "-",
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
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h2 className="font-extrabold text-lg text-slate-800">Kelompok {selectedKelompok}</h2>
                  <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2.5 py-0.5 rounded-full">
                    Kelas {selectedGroupData.kelas}
                  </span>
                  <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 font-semibold px-2 py-0.5 rounded-md flex items-center gap-1" title="Batas waktu investigasi kelas ini">
                    <span>⏱️</span> {selectedGroupData.durasi_menit || 30} Menit
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
                  <div className="space-y-5 max-w-5xl mx-auto">
                    {/* Header LKPD Digital & Tombol Aksi */}
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

                    {/* Sub-Tabs Switcher: 1. Hasil Asli Siswa vs 2. Hasil Evaluasi AI vs Tampilan Berdampingan */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setLkpdViewMode("siswa")}
                          className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            lkpdViewMode === "siswa"
                              ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <span>📝</span> 1. Hasil Asli Siswa
                        </button>

                        <button
                          onClick={() => setLkpdViewMode("evaluasi")}
                          className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            lkpdViewMode === "evaluasi"
                              ? "bg-white text-purple-700 shadow-sm ring-1 ring-slate-200"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <span>🤖</span> 2. Hasil Evaluasi AI
                          {solusi.evaluasi_ai ? (
                            <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-extrabold ml-0.5 border border-purple-200">
                              {solusi.evaluasi_ai.skorTotal}/100
                            </span>
                          ) : (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full font-bold ml-0.5">
                              Belum Dinilai
                            </span>
                          )}
                        </button>

                        <button
                          onClick={() => setLkpdViewMode("split")}
                          className={`hidden md:flex px-3.5 py-2 rounded-xl text-xs font-bold transition-all items-center gap-1.5 ${
                            lkpdViewMode === "split"
                              ? "bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                          title="Bandingkan Jawaban Asli Siswa dan Hasil Asesmen AI secara berdampingan"
                        >
                          <span>⚖️</span> Tampilan Berdampingan
                        </button>
                      </div>

                      {/* Tombol Cepat Jalankan Evaluasi AI */}
                      <button
                        onClick={() => handleRunEvaluation(selectedKelompok)}
                        disabled={isEvaluating}
                        className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
                        title="Jalankan asesmen otomatis berbasis UU No. 28/2014 & Rubrik HOTS"
                      >
                        {isEvaluating ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Menilai dengan AI...</span>
                          </>
                        ) : (
                          <>
                            <span>✨</span>
                            <span>{solusi.evaluasi_ai ? "Evaluasi Ulang AI" : "Jalankan Evaluasi AI"}</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Banner Notifikasi Evaluasi */}
                    {evalSuccess && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>✅</span>
                          <span>{evalSuccess}</span>
                        </div>
                        <button onClick={() => setEvalSuccess("")} className="text-emerald-600 hover:text-emerald-900 font-bold text-sm px-1">✕</button>
                      </div>
                    )}
                    {evalError && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-medium flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>⚠️</span>
                          <span>{evalError}</span>
                        </div>
                        <button onClick={() => setEvalError("")} className="text-red-600 hover:text-red-900 font-bold text-sm px-1">✕</button>
                      </div>
                    )}

                    {/* Helper: Komponen Tampilan 1 (Hasil Asli Siswa) */}
                    {(() => {
                      const renderHasilAsliContent = (isCompact = false) => (
                        <div className="space-y-4">
                          {/* BAGIAN I: IDENTITAS TIM DETEKTIF */}
                          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">I</span>
                                <h4 className="font-bold text-slate-800 text-sm">IDENTITAS TIM DETEKTIF</h4>
                              </div>
                              <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2.5 py-0.5 rounded-full border border-blue-200">
                                5–6 Anak/Kelompok
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-xl text-xs text-slate-700">
                              <div><strong className="text-slate-500 block text-[11px]">Kelas:</strong> {selectedGroupData.kelas}</div>
                              <div><strong className="text-slate-500 block text-[11px]">Nomor Kelompok:</strong> Kelompok {selectedKelompok}</div>
                              <div><strong className="text-slate-500 block text-[11px]">Kasus:</strong> Kasus #{selectedGroupData.kasus_id} ({daftarKasusMap[selectedGroupData.kasus_id] || "Studi Kasus"})</div>
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
                          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
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
                          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
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
                          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
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
                          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
                            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                              <span className="w-6 h-6 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center text-xs font-bold">V</span>
                              <h4 className="font-bold text-slate-800 text-sm">JURNAL REFLEKSI DIRI</h4>
                            </div>
                            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs">
                              <strong className="text-slate-600 block text-[11px] mb-1">• Hal paling berharga yang dipelajari tentang Hak Cipta:</strong>
                              <p className="text-slate-800 whitespace-pre-wrap">{solusi.refleksi || <span className="text-slate-400 italic">(Belum diisi)</span>}</p>
                            </div>
                          </div>

                          {!isCompact && (
                            <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                              <div className="text-purple-900">
                                <strong className="block font-bold">💡 Ingin menilai berkas ini secara komprehensif?</strong>
                                <span className="text-purple-700">Jalankan asesmen otomatis AI berbasis UU Hak Cipta & Rubrik HOTS (C4 & C5).</span>
                              </div>
                              <button
                                onClick={() => handleRunEvaluation(selectedKelompok)}
                                disabled={isEvaluating}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 shrink-0"
                              >
                                <span>🤖</span>
                                <span>{solusi.evaluasi_ai ? "Buka Evaluasi AI" : "Mulai Evaluasi AI"}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );

                      {/* Helper: Komponen Tampilan 2 (Hasil Evaluasi AI) */}
                      const renderHasilEvaluasiContent = () => {
                        const evalData = solusi.evaluasi_ai;

                        if (!evalData) {
                          return (
                            <div className="bg-white border-2 border-dashed border-purple-200 rounded-3xl p-8 text-center max-w-xl mx-auto my-4 shadow-sm">
                              <div className="w-16 h-16 rounded-3xl bg-purple-100 text-purple-700 flex items-center justify-center text-3xl mx-auto mb-4">
                                🤖
                              </div>
                              <h3 className="text-base font-extrabold text-slate-800 mb-2">
                                Belum Ada Evaluasi AI untuk Kelompok {selectedKelompok}
                              </h3>
                              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                                Asesor AI akan menganalisis jawaban siswa berdasarkan prinsip hukum <strong>UU No. 28 Tahun 2014 tentang Hak Cipta</strong> serta Rubrik Penilaian HOTS (Bukti 25, Analisis C4 35, Solusi C5 25, Refleksi 15).
                              </p>
                              <button
                                onClick={() => handleRunEvaluation(selectedKelompok)}
                                disabled={isEvaluating}
                                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-2xl shadow-lg shadow-purple-200 transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer active:scale-95"
                              >
                                {isEvaluating ? (
                                  <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Menganalisis Berkas Siswa...</span>
                                  </>
                                ) : (
                                  <>
                                    <span>✨</span>
                                    <span>Jalankan Evaluasi AI Sekarang</span>
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        }

                        const badgeStyle = getPredikatBadge(evalData.predikat);

                        return (
                          <div className="space-y-4">
                            {/* Hero Card: Skor Total & Predikat */}
                            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 rounded-3xl p-5 text-white shadow-md border border-indigo-900/40 relative overflow-hidden">
                              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                  <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex flex-col items-center justify-center shrink-0">
                                    <span className="text-2xl font-black text-amber-400">{evalData.skorTotal}</span>
                                    <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">/ 100</span>
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Asesmen AI PPG</span>
                                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                                        {evalData.predikat}
                                      </span>
                                    </div>
                                    <h4 className="text-base font-extrabold text-white">
                                      Hasil Evaluasi Kelompok {selectedKelompok}
                                    </h4>
                                    {evalData.waktuEvaluasi && (
                                      <p className="text-[11px] text-slate-400 mt-0.5">
                                        Dievaluasi: {new Date(evalData.waktuEvaluasi).toLocaleString("id-ID")}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <button
                                  onClick={() => handleRunEvaluation(selectedKelompok)}
                                  disabled={isEvaluating}
                                  className="self-start sm:self-auto px-3.5 py-2 bg-white/15 hover:bg-white/25 border border-white/20 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                                  title="Jalankan kembali asesmen AI"
                                >
                                  <span>🔄</span> Evaluasi Ulang
                                </button>
                              </div>
                            </div>

                            {/* 4 Rubrik Penilaian HOTS */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* 1. Kelengkapan Bukti (25) */}
                              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <span>🔍</span> Bukti Investigasi
                                  </span>
                                  <span className="text-xs font-black bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-lg">
                                    {evalData.kategori?.kelengkapanBukti?.skor || 0} / {evalData.kategori?.kelengkapanBukti?.max || 25}
                                  </span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="bg-blue-600 h-1.5 rounded-full"
                                    style={{ width: `${Math.min(100, ((evalData.kategori?.kelengkapanBukti?.skor || 0) / (evalData.kategori?.kelengkapanBukti?.max || 25)) * 100)}%` }}
                                  ></div>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                  {evalData.kategori?.kelengkapanBukti?.catatan || "-"}
                                </p>
                              </div>

                              {/* 2. Analisis Pelanggaran HOTS C4 (35) */}
                              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <span>🧠</span> Analisis HAKI (HOTS C4)
                                  </span>
                                  <span className="text-xs font-black bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-lg">
                                    {evalData.kategori?.analisisPelanggaranC4?.skor || 0} / {evalData.kategori?.analisisPelanggaranC4?.max || 35}
                                  </span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="bg-purple-600 h-1.5 rounded-full"
                                    style={{ width: `${Math.min(100, ((evalData.kategori?.analisisPelanggaranC4?.skor || 0) / (evalData.kategori?.analisisPelanggaranC4?.max || 35)) * 100)}%` }}
                                  ></div>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                  {evalData.kategori?.analisisPelanggaranC4?.catatan || "-"}
                                </p>
                              </div>

                              {/* 3. Solusi & Mitigasi HOTS C5 (25) */}
                              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <span>💡</span> Rekomendasi Solusi (HOTS C5)
                                  </span>
                                  <span className="text-xs font-black bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-lg">
                                    {evalData.kategori?.solusiMitigasiC5?.skor || 0} / {evalData.kategori?.solusiMitigasiC5?.max || 25}
                                  </span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="bg-amber-500 h-1.5 rounded-full"
                                    style={{ width: `${Math.min(100, ((evalData.kategori?.solusiMitigasiC5?.skor || 0) / (evalData.kategori?.solusiMitigasiC5?.max || 25)) * 100)}%` }}
                                  ></div>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                  {evalData.kategori?.solusiMitigasiC5?.catatan || "-"}
                                </p>
                              </div>

                              {/* 4. Refleksi Diri (15) */}
                              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <span>📖</span> Jurnal Refleksi Diri
                                  </span>
                                  <span className="text-xs font-black bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-lg">
                                    {evalData.kategori?.refleksiDiri?.skor || 0} / {evalData.kategori?.refleksiDiri?.max || 15}
                                  </span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="bg-rose-500 h-1.5 rounded-full"
                                    style={{ width: `${Math.min(100, ((evalData.kategori?.refleksiDiri?.skor || 0) / (evalData.kategori?.refleksiDiri?.max || 15)) * 100)}%` }}
                                  ></div>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                  {evalData.kategori?.refleksiDiri?.catatan || "-"}
                                </p>
                              </div>
                            </div>

                            {/* Ulasan Kesesuaian Hukum UU Hak Cipta No. 28 Tahun 2014 */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-2">
                              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                <span className="text-base">⚖️</span>
                                <h4 className="font-bold text-slate-800 text-sm">
                                  Ulasan Kesesuaian Hukum (UU No. 28 Tahun 2014 tentang Hak Cipta)
                                </h4>
                              </div>
                              <p className="text-xs text-slate-700 leading-relaxed bg-blue-50/50 p-3.5 rounded-xl border border-blue-100 whitespace-pre-wrap">
                                {evalData.analisisHukum || "Belum ada ulasan hukum."}
                              </p>
                            </div>

                            {/* Kelebihan vs Hal yang Perlu Disempurnakan */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* Kelebihan */}
                              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
                                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                  <span className="text-base">🌟</span>
                                  <h4 className="font-bold text-emerald-800 text-xs uppercase tracking-wide">
                                    Kelebihan Jawaban Siswa
                                  </h4>
                                </div>
                                <ul className="space-y-1.5 text-xs text-slate-700">
                                  {evalData.kelebihan && evalData.kelebihan.length > 0 ? (
                                    evalData.kelebihan.map((item, idx) => (
                                      <li key={idx} className="flex items-start gap-2 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100">
                                        <span className="text-emerald-600 font-bold">✓</span>
                                        <span className="leading-relaxed">{item}</span>
                                      </li>
                                    ))
                                  ) : (
                                    <li className="text-slate-400 italic">Tidak ada catatan</li>
                                  )}
                                </ul>
                              </div>

                              {/* Catatan Kritis / Kekurangan */}
                              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
                                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                  <span className="text-base">💡</span>
                                  <h4 className="font-bold text-amber-800 text-xs uppercase tracking-wide">
                                    Hal yang Perlu Disempurnakan
                                  </h4>
                                </div>
                                <ul className="space-y-1.5 text-xs text-slate-700">
                                  {evalData.kekurangan && evalData.kekurangan.length > 0 ? (
                                    evalData.kekurangan.map((item, idx) => (
                                      <li key={idx} className="flex items-start gap-2 bg-amber-50/60 p-2.5 rounded-xl border border-amber-100">
                                        <span className="text-amber-600 font-bold">•</span>
                                        <span className="leading-relaxed">{item}</span>
                                      </li>
                                    ))
                                  ) : (
                                    <li className="text-slate-400 italic">Tidak ada catatan</li>
                                  )}
                                </ul>
                              </div>
                            </div>

                            {/* Rekomendasi Umpan Balik Guru (Pedagogical Feedback) */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-2">
                              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                <span className="text-base">💬</span>
                                <h4 className="font-bold text-slate-800 text-sm">
                                  Rekomendasi Umpan Balik Guru untuk Kelompok
                                </h4>
                              </div>
                              <div className="bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-100 text-xs text-indigo-950 leading-relaxed italic whitespace-pre-wrap">
                                &ldquo;{evalData.rekomendasiGuru || "Belum ada rekomendasi umpan balik."}&rdquo;
                              </div>
                            </div>
                          </div>
                        );
                      };

                      // Render Berdasarkan Mode Terpilih
                      if (lkpdViewMode === "siswa") {
                        return renderHasilAsliContent(false);
                      }

                      if (lkpdViewMode === "evaluasi") {
                        return renderHasilEvaluasiContent();
                      }

                      // Mode "split" (Tampilan Berdampingan)
                      return (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                          <div>
                            <div className="flex items-center gap-2 mb-2.5 px-1">
                              <span className="text-base">📝</span>
                              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                1. Hasil Asli Pengerjaan Siswa
                              </h4>
                            </div>
                            {renderHasilAsliContent(true)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-2.5 px-1">
                              <span className="text-base">🤖</span>
                              <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wider">
                                2. Hasil Evaluasi & Rubrik AI
                              </h4>
                            </div>
                            {renderHasilEvaluasiContent()}
                          </div>
                        </div>
                      );
                    })()}

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

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <span>⏱️</span>
                    <span>Durasi Waktu Investigasi Siswa</span>
                  </label>
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    {inputDurasiMenit} Menit
                  </span>
                </div>

                {/* Preset Cepat Durasi Timer */}
                <div className="grid grid-cols-5 gap-1.5 mb-2">
                  {[15, 20, 30, 45, 60].map((menit) => (
                    <button
                      key={menit}
                      type="button"
                      onClick={() => setInputDurasiMenit(menit)}
                      className={`py-1.5 px-1 rounded-xl text-xs font-bold transition-all border ${
                        inputDurasiMenit === menit
                          ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {menit}m
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={5}
                    max={180}
                    required
                    value={inputDurasiMenit}
                    onChange={(e) => setInputDurasiMenit(Math.max(1, parseInt(e.target.value) || 0))}
                    className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                    placeholder="Contoh: 30"
                  />
                  <span className="text-xs font-bold text-slate-600 shrink-0">Menit</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Timer hitung mundur ini akan aktif di layar investigasi siswa saat mereka menginterogasi saksi dan mengisi LKPD.
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
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded font-semibold flex items-center gap-1" title={`Batas waktu investigasi: ${k.durasi_menit || 30} menit`}>
                        <span>⏱️</span> {k.durasi_menit || 30}m
                      </span>
                      <span className="font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[11px]">
                        {k.kode_kelas}
                      </span>
                    </div>
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

          {/* BAGIAN VI: HASIL EVALUASI ASESOR AI (Jika sudah dinilai) */}
          {(() => {
            const solusi = parseSolusi(selectedGroupData.solusi_rekomendasi);
            const evalData = solusi.evaluasi_ai;
            if (!evalData) return null;

            return (
              <div className="border-2 border-indigo-950 rounded p-3 mb-2.5 text-[10px] bg-slate-50">
                <div className="border-b border-indigo-900 pb-1 mb-1.5 font-bold uppercase text-[10px] text-indigo-950 flex justify-between items-center">
                  <span>BAGIAN VI: HASIL EVALUASI & PENILAIAN ASESOR AI (UU NO. 28/2014 & RUBRIK HOTS)</span>
                  <span className="bg-indigo-900 text-white px-2 py-0.5 rounded font-extrabold text-[10px]">
                    SKOR TOTAL: {evalData.skorTotal} / 100 ({evalData.predikat})
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-2 text-[10px]">
                  <div className="p-1.5 border border-gray-300 rounded bg-white">
                    <strong className="block text-gray-700">1. Bukti Investigasi:</strong>
                    <span className="font-bold">{evalData.kategori?.kelengkapanBukti?.skor || 0} / {evalData.kategori?.kelengkapanBukti?.max || 25}</span>
                  </div>
                  <div className="p-1.5 border border-gray-300 rounded bg-white">
                    <strong className="block text-gray-700">2. Analisis HOTS C4:</strong>
                    <span className="font-bold">{evalData.kategori?.analisisPelanggaranC4?.skor || 0} / {evalData.kategori?.analisisPelanggaranC4?.max || 35}</span>
                  </div>
                  <div className="p-1.5 border border-gray-300 rounded bg-white">
                    <strong className="block text-gray-700">3. Solusi HOTS C5:</strong>
                    <span className="font-bold">{evalData.kategori?.solusiMitigasiC5?.skor || 0} / {evalData.kategori?.solusiMitigasiC5?.max || 25}</span>
                  </div>
                  <div className="p-1.5 border border-gray-300 rounded bg-white">
                    <strong className="block text-gray-700">4. Refleksi Diri:</strong>
                    <span className="font-bold">{evalData.kategori?.refleksiDiri?.skor || 0} / {evalData.kategori?.refleksiDiri?.max || 15}</span>
                  </div>
                </div>
                <div className="space-y-1.5 text-[10px]">
                  <div>
                    <strong className="block text-gray-800">Ulasan Kesesuaian Hukum (UU Hak Cipta No. 28/2014):</strong>
                    <p className="p-1.5 border border-gray-300 rounded bg-white">{evalData.analisisHukum}</p>
                  </div>
                  <div>
                    <strong className="block text-gray-800">Rekomendasi Umpan Balik Guru:</strong>
                    <p className="p-1.5 border border-gray-300 rounded bg-white italic">{evalData.rekomendasiGuru}</p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* RUBRIK PENILAIAN & PENGESAHAN GURU PEMBIMBING */}
          {(() => {
            const solusi = parseSolusi(selectedGroupData.solusi_rekomendasi);
            const evalData = solusi.evaluasi_ai;

            return (
              <div className="border-2 border-black rounded p-3 text-[10px]">
                <div className="font-bold uppercase text-[10px] border-b border-black pb-1 mb-1.5 flex justify-between items-center">
                  <span>LEMBAR PENILAIAN & EVALUASI GURU PEMBIMBING (PPG)</span>
                  <span>
                    NILAI AKHIR: [&nbsp;
                    {evalData ? (
                      <strong className="text-black font-extrabold">{evalData.skorTotal} / 100 ({evalData.predikat})</strong>
                    ) : (
                      "........ / 100"
                    )}
                    &nbsp;]
                  </span>
                </div>
                <div className="mb-3">
                  <span className="font-semibold block text-gray-600 mb-0.5">Catatan Evaluasi / Umpan Balik Guru:</span>
                  {evalData?.rekomendasiGuru ? (
                    <p className="p-1.5 border border-gray-300 rounded bg-gray-50 italic text-[10px]">
                      {evalData.rekomendasiGuru}
                    </p>
                  ) : (
                    <>
                      <div className="border-b border-dotted border-gray-400 h-4"></div>
                      <div className="border-b border-dotted border-gray-400 h-4"></div>
                    </>
                  )}
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
            );
          })()}
        </div>
      )}

    </>
  );
}
