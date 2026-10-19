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


const daftarKasusMap: Record<number, string> = Object.fromEntries(
  DAFTAR_KASUS.map((k) => [k.id, k.judul])
);

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
      anggota_detail: parsed.anggota_detail || null,
      evaluasi_ai: (parsed.evaluasi_ai || null) as EvaluasiAI | null
    };
  } catch {
    return {
      solusi: raw,
      aturan: "",
      refleksi: "",
      nama_anggota: "",
      anggota_detail: null,
      evaluasi_ai: null
    };
  }
};

// Helper untuk mengekstrak peranan anggota tim
const parseNamaAnggotaString = (raw: string) => {
  const result = {
    interregator: "",
    pencatat1: "",
    pencatat2: "",
    analis1: "",
    analis2: "",
    jurubicara: ""
  };
  if (!raw) return result;

  const parts = raw.split(/,\s*(?=\d+\.)/);
  parts.forEach(part => {
    const clean = part.trim();
    if (clean.includes("(Interregator")) {
      result.interregator = clean.replace(/^\d+\.\s*/, "").replace(/\s*\(Interregator.*/, "").trim();
    } else if (clean.includes("(Pencatat Bukti 1)")) {
      result.pencatat1 = clean.replace(/^\d+\.\s*/, "").replace(/\s*\(Pencatat Bukti 1.*/, "").trim();
    } else if (clean.includes("(Pencatat Bukti 2)")) {
      result.pencatat2 = clean.replace(/^\d+\.\s*/, "").replace(/\s*\(Pencatat Bukti 2.*/, "").trim();
    } else if (clean.includes("(Analis HAKI 1)")) {
      result.analis1 = clean.replace(/^\d+\.\s*/, "").replace(/\s*\(Analis HAKI 1.*/, "").trim();
    } else if (clean.includes("(Analis HAKI 2)")) {
      result.analis2 = clean.replace(/^\d+\.\s*/, "").replace(/\s*\(Analis HAKI 2.*/, "").trim();
    } else if (clean.includes("(Juru Bicara")) {
      result.jurubicara = clean.replace(/^\d+\.\s*/, "").replace(/\s*\(Juru Bicara.*/, "").trim();
    }
  });

  return result;
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

  // State Modals & Kelola Kelas (CRUD & Reset)
  const [showKelasModal, setShowKelasModal] = useState(false);
  const [editingKelas, setEditingKelas] = useState<KelasItem | null>(null);
  const [inputNamaKelasBaru, setInputNamaKelasBaru] = useState("");
  const [inputKodeKelasBaru, setInputKodeKelasBaru] = useState("");
  const [inputDurasiMenit, setInputDurasiMenit] = useState<number>(30);
  const [isSavingKelas, setIsSavingKelas] = useState(false);
  const [pesanSuksesKelas, setPesanSuksesKelas] = useState("");
  const [pesanErrorKelas, setPesanErrorKelas] = useState("");
  const [copiedKode, setCopiedKode] = useState<string | null>(null);

  // State Konfirmasi Aksi (Hapus Kelas, Reset Sesi Data Kelas, Reset Kelompok Khusus, Reset Default)
  const [confirmDeleteKelas, setConfirmDeleteKelas] = useState<KelasItem | null>(null);
  const [confirmResetSesiKelas, setConfirmResetSesiKelas] = useState<KelasItem | null>(null);
  const [confirmResetKelompok, setConfirmResetKelompok] = useState<{ kelompok: number; kelas: string } | null>(null);
  const [confirmResetDefault, setConfirmResetDefault] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // State Tahap 5: Mode Presentasi Proyektor (Laptop Guru)
  const [showPresentationModal, setShowPresentationModal] = useState(false);
  const [presentationKelompok, setPresentationKelompok] = useState<number>(1);
  const [currentSlide, setCurrentSlide] = useState<number>(1);
  const [showChatInPresentation, setShowChatInPresentation] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Keyboard Navigation untuk Mode Presentasi (Arrow Left/Right, Space, Escape, PageUp/Down)
  useEffect(() => {
    if (!showPresentationModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        setCurrentSlide((prev) => Math.min(5, prev + 1));
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        setCurrentSlide((prev) => Math.max(1, prev - 1));
      } else if (e.key === "Escape") {
        setShowPresentationModal(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showPresentationModal]);

  // Fullscreen Handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  };

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
        const mapped = sesiData.map((s: any) => ({
          kode_kelas: s.kode_kelas,
          nama_kelas: s.nama_kelas,
          durasi_menit: s.durasi_menit ? Number(s.durasi_menit) : 30
        }));
        setKelasList(mapped);
        try {
          localStorage.setItem("hakita_custom_kelas", JSON.stringify(mapped));
        } catch {}
      } else {
        // Fallback ke localStorage jika Supabase kosong atau offline
        try {
          const cached = localStorage.getItem("hakita_custom_kelas");
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setKelasList(parsed);
            }
          }
        } catch {}
      }

    } catch (err: any) {
      console.error("Error fetching admin data:", err);
      // Fallback ke localStorage jika Supabase error
      try {
        const cached = localStorage.getItem("hakita_custom_kelas");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setKelasList(parsed);
          }
        }
      } catch {}
      setError("Gagal mengambil data dari Supabase. Pastikan tabel chat_history, lkpd_reports, dan kelas_sesi sudah dibuat.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Muat cache lokal kelas saat pertama kali load agar instan
    try {
      const cached = localStorage.getItem("hakita_custom_kelas");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setKelasList(parsed);
        }
      }
    } catch {}

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

  // Handler Salin Kode Kelas
  const handleSalinKode = (kode: string) => {
    try {
      navigator.clipboard.writeText(kode);
      setCopiedKode(kode);
      setTimeout(() => setCopiedKode(null), 2000);
    } catch {
      // Fallback jika clipboard API diblokir browser
    }
  };

  // Mulai Edit Kelas
  const handleMulaiEditKelas = (kelas: KelasItem) => {
    setEditingKelas(kelas);
    setInputNamaKelasBaru(kelas.nama_kelas);
    setInputKodeKelasBaru(kelas.kode_kelas);
    setInputDurasiMenit(kelas.durasi_menit || 30);
    setPesanSuksesKelas("");
    setPesanErrorKelas("");
  };

  // Batal Edit Kelas
  const handleBatalEditKelas = () => {
    setEditingKelas(null);
    setInputNamaKelasBaru("");
    setInputKodeKelasBaru("");
    setInputDurasiMenit(30);
    setPesanSuksesKelas("");
    setPesanErrorKelas("");
  };

  // Handler Simpan Kelas (Tambah Baru atau Update Hasil Edit)
  const handleSimpanKelasBaru = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputNamaKelasBaru.trim()) return;

    const cleanNama = inputNamaKelasBaru.trim().toUpperCase();
    const cleanKode = (inputKodeKelasBaru.trim() || `HAKI-${cleanNama}`).toUpperCase();
    const durasiNum = Number(inputDurasiMenit) || 30;

    // Cek apakah kode kelas bentrok dengan kelas lain yang berbeda
    const isDuplicate = kelasList.some(
      (k) =>
        k.kode_kelas.toUpperCase() === cleanKode &&
        (!editingKelas || editingKelas.kode_kelas.toUpperCase() !== cleanKode)
    );

    if (isDuplicate) {
      setPesanErrorKelas(`Kode kelas "${cleanKode}" sudah digunakan oleh kelas lain. Harap gunakan kode unik.`);
      return;
    }

    setIsSavingKelas(true);
    setPesanSuksesKelas("");
    setPesanErrorKelas("");

    try {
      const hasSupabase =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("url_proyek_supabase_anda");

      if (editingKelas) {
        // --- 1. MODE EDIT KELAS ---
        if (hasSupabase) {
          const { error: updateError } = await supabase
            .from("kelas_sesi")
            .update({
              kode_kelas: cleanKode,
              nama_kelas: cleanNama,
              durasi_menit: durasiNum
            })
            .eq("kode_kelas", editingKelas.kode_kelas);

          if (updateError) {
            console.warn("Mencoba update fallback tanpa durasi_menit:", updateError);
            await supabase
              .from("kelas_sesi")
              .update({
                kode_kelas: cleanKode,
                nama_kelas: cleanNama
              })
              .eq("kode_kelas", editingKelas.kode_kelas);
          }

          // Jika nama kelas ikut diubah, perbarui juga referensi kelas pada laporan LKPD & riwayat chat
          if (editingKelas.nama_kelas !== cleanNama) {
            await supabase
              .from("lkpd_reports")
              .update({ kelas: cleanNama })
              .eq("kelas", editingKelas.nama_kelas);

            await supabase
              .from("chat_history")
              .update({ kelas: cleanNama })
              .eq("kelas", editingKelas.nama_kelas);
          }
        }

        // Perbarui state kelasList
        const updatedKelas = kelasList.map((k) =>
          k.kode_kelas === editingKelas.kode_kelas
            ? { kode_kelas: cleanKode, nama_kelas: cleanNama, durasi_menit: durasiNum }
            : k
        );
        setKelasList(updatedKelas);
        try {
          localStorage.setItem("hakita_custom_kelas", JSON.stringify(updatedKelas));
        } catch {}

        // Sinkronkan nama kelas di tabel laporan lokal jika diubah
        if (editingKelas.nama_kelas !== cleanNama) {
          setLkpdList((prev) =>
            prev.map((l) => (l.kelas === editingKelas.nama_kelas ? { ...l, kelas: cleanNama } : l))
          );
          setChats((prev) =>
            prev.map((c) => (c.kelas === editingKelas.nama_kelas ? { ...c, kelas: cleanNama } : c))
          );
          if (selectedKelasFilter === editingKelas.nama_kelas) {
            setSelectedKelasFilter(cleanNama);
          }
        }

        setPesanSuksesKelas(`✅ Berhasil memperbarui Kelas ${cleanNama} (Durasi: ${durasiNum} Menit) dengan Kode: ${cleanKode}`);
        setEditingKelas(null);
        setInputNamaKelasBaru("");
        setInputKodeKelasBaru("");
        setInputDurasiMenit(30);
      } else {
        // --- 2. MODE TAMBAH KELAS BARU ---
        if (hasSupabase) {
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
        const newKelasList = [
          ...kelasList.filter((k) => k.kode_kelas !== cleanKode),
          { kode_kelas: cleanKode, nama_kelas: cleanNama, durasi_menit: durasiNum }
        ];
        setKelasList(newKelasList);
        try {
          localStorage.setItem("hakita_custom_kelas", JSON.stringify(newKelasList));
        } catch {}

        setPesanSuksesKelas(`✅ Berhasil membuat kelas ${cleanNama} (Durasi: ${durasiNum} Menit) dengan Kode: ${cleanKode}`);
        setInputNamaKelasBaru("");
        setInputKodeKelasBaru("");
        setInputDurasiMenit(30);
      }
    } catch (err: any) {
      console.error("Error saving class session:", err);
      setPesanErrorKelas("Gagal menyimpan data kelas. Silakan periksa koneksi Supabase Anda.");
    } finally {
      setIsSavingKelas(false);
    }
  };

  // Handler Hapus Kelas
  const handleHapusKelas = async (kelas: KelasItem) => {
    setIsActionLoading(true);
    setPesanSuksesKelas("");
    setPesanErrorKelas("");

    try {
      const hasSupabase =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("url_proyek_supabase_anda");

      if (hasSupabase) {
        // 1. Hapus kelas dari tabel kelas_sesi
        await supabase
          .from("kelas_sesi")
          .delete()
          .eq("kode_kelas", kelas.kode_kelas);

        // 2. Hapus seluruh data laporan LKPD kelas ini (nama_kelas dan kode_kelas)
        await supabase
          .from("lkpd_reports")
          .delete()
          .ilike("kelas", kelas.nama_kelas);

        if (kelas.kode_kelas && kelas.kode_kelas.toUpperCase() !== kelas.nama_kelas.toUpperCase()) {
          await supabase
            .from("lkpd_reports")
            .delete()
            .ilike("kelas", kelas.kode_kelas);
        }

        // 3. Hapus seluruh data log chat interogasi kelas ini (nama_kelas dan kode_kelas)
        await supabase
          .from("chat_history")
          .delete()
          .ilike("kelas", kelas.nama_kelas);

        if (kelas.kode_kelas && kelas.kode_kelas.toUpperCase() !== kelas.nama_kelas.toUpperCase()) {
          await supabase
            .from("chat_history")
            .delete()
            .ilike("kelas", kelas.kode_kelas);
        }
      }

      // Bersihkan dari daftar kelas lokal
      const updated = kelasList.filter((k) => k.kode_kelas !== kelas.kode_kelas);
      setKelasList(updated);
      try {
        localStorage.setItem("hakita_custom_kelas", JSON.stringify(updated));
      } catch {}

      // Bersihkan seluruh data LKPD dan riwayat chat kelas ini dari state lokal
      setLkpdList((prev) =>
        prev.filter(
          (l) =>
            l.kelas?.toUpperCase() !== kelas.nama_kelas.toUpperCase() &&
            l.kelas?.toUpperCase() !== kelas.kode_kelas.toUpperCase()
        )
      );
      setChats((prev) =>
        prev.filter(
          (c) =>
            c.kelas?.toUpperCase() !== kelas.nama_kelas.toUpperCase() &&
            c.kelas?.toUpperCase() !== kelas.kode_kelas.toUpperCase()
        )
      );

      if (selectedKelasFilter === kelas.nama_kelas) {
        setSelectedKelasFilter("ALL");
      }

      if (editingKelas?.kode_kelas === kelas.kode_kelas) {
        handleBatalEditKelas();
      }

      setPesanSuksesKelas(`🗑️ Kelas ${kelas.nama_kelas} (${kelas.kode_kelas}) beserta seluruh data LKPD, nama siswa, dan riwayat chat berhasil dihapus.`);
      setConfirmDeleteKelas(null);
    } catch (err: any) {
      console.error("Error deleting class and its data:", err);
      setPesanErrorKelas("Gagal menghapus kelas dan datanya. Silakan coba lagi.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handler Reset Sesi Investigasi Kelas (Hapus Laporan LKPD, Nama Anggota, dan Chat khusus kelas ini)
  const handleResetSesiKelas = async (kelas: KelasItem) => {
    setIsActionLoading(true);
    setPesanSuksesKelas("");
    setPesanErrorKelas("");

    try {
      const hasSupabase =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("url_proyek_supabase_anda");

      if (hasSupabase) {
        // Hapus lkpd_reports berdasarkan nama_kelas dan kode_kelas
        await supabase
          .from("lkpd_reports")
          .delete()
          .ilike("kelas", kelas.nama_kelas);

        if (kelas.kode_kelas && kelas.kode_kelas.toUpperCase() !== kelas.nama_kelas.toUpperCase()) {
          await supabase
            .from("lkpd_reports")
            .delete()
            .ilike("kelas", kelas.kode_kelas);
        }

        // Hapus chat_history berdasarkan nama_kelas dan kode_kelas
        await supabase
          .from("chat_history")
          .delete()
          .ilike("kelas", kelas.nama_kelas);

        if (kelas.kode_kelas && kelas.kode_kelas.toUpperCase() !== kelas.nama_kelas.toUpperCase()) {
          await supabase
            .from("chat_history")
            .delete()
            .ilike("kelas", kelas.kode_kelas);
        }
      }

      // Bersihkan juga dari state lokal
      setLkpdList((prev) =>
        prev.filter(
          (l) =>
            l.kelas?.toUpperCase() !== kelas.nama_kelas.toUpperCase() &&
            l.kelas?.toUpperCase() !== kelas.kode_kelas.toUpperCase()
        )
      );
      setChats((prev) =>
        prev.filter(
          (c) =>
            c.kelas?.toUpperCase() !== kelas.nama_kelas.toUpperCase() &&
            c.kelas?.toUpperCase() !== kelas.kode_kelas.toUpperCase()
        )
      );

      setPesanSuksesKelas(`🔄 Seluruh data investigasi LKPD, susunan nama anggota tim, dan riwayat chat interogasi untuk Kelas ${kelas.nama_kelas} berhasil dibersihkan! Kelas siap digunakan untuk sesi pembelajaran baru.`);
      setConfirmResetSesiKelas(null);
    } catch (err: any) {
      console.error("Error resetting class session:", err);
      setPesanErrorKelas("Gagal membersihkan data sesi kelas. Silakan coba lagi.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handler Reset Seluruh Daftar Kelas ke Bawaan (Default: 9A, 9B, 9C)
  const handleResetDefaultKelas = async () => {
    setIsActionLoading(true);
    setPesanSuksesKelas("");
    setPesanErrorKelas("");

    try {
      const hasSupabase =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("url_proyek_supabase_anda");

      if (hasSupabase) {
        for (const def of DEFAULT_KELAS_LIST) {
          await supabase.from("kelas_sesi").upsert({
            kode_kelas: def.kode_kelas,
            nama_kelas: def.nama_kelas,
            durasi_menit: def.durasi_menit || 30
          }, { onConflict: "kode_kelas" });
        }
      }

      setKelasList(DEFAULT_KELAS_LIST);
      try {
        localStorage.setItem("hakita_custom_kelas", JSON.stringify(DEFAULT_KELAS_LIST));
      } catch {}

      handleBatalEditKelas();
      setPesanSuksesKelas(`🔄 Daftar kelas berhasil dikembalikan ke setelan awal sistem (Kelas 9A, 9B, 9C).`);
      setConfirmResetDefault(false);
    } catch (err: any) {
      console.error("Error restoring default classes:", err);
      setPesanErrorKelas("Gagal mengembalikan kelas default. Silakan coba lagi.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handler Reset Data Investigasi Kelompok Tertentu / Khusus
  const handleResetKelompokSpesifik = async (kelompok: number, kelas: string) => {
    setIsActionLoading(true);
    setPesanSuksesKelas("");
    setPesanErrorKelas("");

    try {
      const hasSupabase =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("url_proyek_supabase_anda");

      const kObj = kelasList.find(
        (k) => k.nama_kelas.toUpperCase() === kelas.toUpperCase() || k.kode_kelas.toUpperCase() === kelas.toUpperCase()
      );
      const kodeAlt = kObj?.kode_kelas;
      const namaAlt = kObj?.nama_kelas;

      if (hasSupabase) {
        // Hapus lkpd_reports kelompok ini
        await supabase
          .from("lkpd_reports")
          .delete()
          .eq("kelompok", kelompok)
          .ilike("kelas", kelas);

        if (kodeAlt && kodeAlt.toUpperCase() !== kelas.toUpperCase()) {
          await supabase
            .from("lkpd_reports")
            .delete()
            .eq("kelompok", kelompok)
            .ilike("kelas", kodeAlt);
        }
        if (namaAlt && namaAlt.toUpperCase() !== kelas.toUpperCase()) {
          await supabase
            .from("lkpd_reports")
            .delete()
            .eq("kelompok", kelompok)
            .ilike("kelas", namaAlt);
        }

        // Hapus chat_history kelompok ini
        await supabase
          .from("chat_history")
          .delete()
          .eq("kelompok", kelompok)
          .ilike("kelas", kelas);

        if (kodeAlt && kodeAlt.toUpperCase() !== kelas.toUpperCase()) {
          await supabase
            .from("chat_history")
            .delete()
            .eq("kelompok", kelompok)
            .ilike("kelas", kodeAlt);
        }
        if (namaAlt && namaAlt.toUpperCase() !== kelas.toUpperCase()) {
          await supabase
            .from("chat_history")
            .delete()
            .eq("kelompok", kelompok)
            .ilike("kelas", namaAlt);
        }
      }

      // Bersihkan juga dari state lokal
      setLkpdList((prev) =>
        prev.filter(
          (l) =>
            !(
              l.kelompok === kelompok &&
              (l.kelas?.toUpperCase() === kelas.toUpperCase() ||
                (kodeAlt && l.kelas?.toUpperCase() === kodeAlt.toUpperCase()) ||
                (namaAlt && l.kelas?.toUpperCase() === namaAlt.toUpperCase()))
            )
        )
      );
      setChats((prev) =>
        prev.filter(
          (c) =>
            !(
              c.kelompok === kelompok &&
              (c.kelas?.toUpperCase() === kelas.toUpperCase() ||
                (kodeAlt && c.kelas?.toUpperCase() === kodeAlt.toUpperCase()) ||
                (namaAlt && c.kelas?.toUpperCase() === namaAlt.toUpperCase()))
            )
        )
      );

      // Otomatis pindahkan pilihan kelompok jika kelompok yang di-reset sedang dipilih
      setSelectedKelompok((prev) => {
        if (prev === kelompok) {
          const sisaKelompok = allKelompokKeys.filter((k) => k !== kelompok);
          return sisaKelompok.length > 0 ? sisaKelompok[0] : null;
        }
        return prev;
      });

      setConfirmResetKelompok(null);
      setPesanSuksesKelas(`🔄 Berhasil mereset data Kelompok ${kelompok} (Kelas ${kelas}). Susunan nama anggota, berkas LKPD, dan riwayat interogasi telah dibersihkan.`);
    } catch (err: any) {
      console.error("Error resetting specific group:", err);
      setPesanErrorKelas(`Gagal mereset data Kelompok ${kelompok}. Silakan coba lagi.`);
    } finally {
      setIsActionLoading(false);
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

  // Auto-select kelompok pertama saat data dimuat agar tampilan mobile & desktop langsung menampilkan LKPD
  useEffect(() => {
    if (allKelompokKeys.length > 0) {
      if (selectedKelompok === null || !allKelompokKeys.includes(selectedKelompok)) {
        setSelectedKelompok(allKelompokKeys[0]);
      }
    } else {
      setSelectedKelompok(null);
    }
  }, [allKelompokKeys, selectedKelompok]);

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
          <div className="p-4 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain drop-shadow" />
                <h1 className="text-base font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-200">
                  Dasbor Guru
                </h1>
              </div>
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={fetchData} 
                  className="text-xs bg-slate-800/90 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-xl border border-slate-700 transition-all flex items-center gap-1 font-bold cursor-pointer"
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
                    onClick={() => {
                      setPresentationKelompok(selectedKelompok || allKelompokKeys[0] || 1);
                      setCurrentSlide(1);
                      setShowPresentationModal(true);
                    }}
                    className="text-amber-300 hover:text-amber-200 font-bold flex items-center gap-1 cursor-pointer bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-lg hover:bg-amber-500/25 transition-all shadow-sm"
                    title="Buka Mode Layar Penuh Proyektor untuk Presentasi Kelas"
                  >
                    <span>📽️</span> Proyektor
                  </button>
                  <button
                    onClick={() => exportToCsv(allKelompokKeys)}
                    className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                    title="Ekspor seluruh rekap LKPD kelas ini ke file Excel (CSV)"
                  >
                    <span>📊</span> Ekspor Excel
                  </button>
                  <button
                    onClick={() => {
                      handleBatalEditKelas();
                      setShowKelasModal(true);
                    }}
                    className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer bg-cyan-500/15 border border-cyan-500/30 px-2.5 py-0.5 rounded-lg hover:bg-cyan-500/25 transition-all shadow-sm"
                    title="Kelola Daftar Sesi Kelas, Tambah, Edit, Hapus, atau Reset LKPD"
                  >
                    <span>⚙️</span> Kelola Kelas
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
              <div
                key={k}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedKelompok(k)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedKelompok(k);
                  }
                }}
                className={`w-full text-left p-3.5 rounded-2xl transition-all border cursor-pointer select-none ${
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
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmResetKelompok({ kelompok: k, kelas: group.kelas });
                      }}
                      className="text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold px-1.5 py-0.5 rounded-md transition-all active:scale-95 flex items-center gap-0.5"
                      title={`Reset / Bersihkan data LKPD & chat Kelompok ${k}`}
                    >
                      <span>🔄</span>
                      <span>Reset</span>
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-medium text-blue-600">Kelas {group.kelas}</span>
                  <span>{group.messages.length} Chat</span>
                </div>
                <p className="text-xs text-slate-400 truncate mt-1">
                  {group.nama_anggota}
                </p>
              </div>
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

                      {/* Tombol Aksi: Cetak PDF, Ekspor Excel, & Tayangkan ke Proyektor */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => {
                            setPresentationKelompok(selectedKelompok);
                            setCurrentSlide(1);
                            setShowChatInPresentation(false);
                            setShowPresentationModal(true);
                          }}
                          className="text-xs bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold px-3.5 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
                          title="Tayangkan ke Layar Proyektor / Smart TV Kelas untuk Presentasi Siswa di Depan Kelas"
                        >
                          <span>📽️</span> Tayangkan ke Proyektor
                        </button>
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
                        <button
                          type="button"
                          onClick={() => setConfirmResetKelompok({ kelompok: selectedKelompok, kelas: selectedGroupData.kelas })}
                          className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold px-3 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
                          title={`Reset / Bersihkan berkas LKPD dan chat interogasi khusus Kelompok ${selectedKelompok} agar siswa dapat mengulang dari awal`}
                        >
                          <span>🔄</span> Reset Kelompok {selectedKelompok}
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
                            {/* Studi Kasus (Stukas) Deskripsi */}
                            {(() => {
                              const currKasus = DAFTAR_KASUS.find(k => k.id === selectedGroupData.kasus_id) || DAFTAR_KASUS[0];
                              return (
                                <div className="bg-amber-50/80 border border-amber-200/90 p-3 rounded-xl text-xs space-y-1">
                                  <div className="flex items-center justify-between">
                                    <strong className="text-amber-900 text-[11px] uppercase tracking-wider flex items-center gap-1 font-bold">
                                      <span>📑</span> Studi Kasus (Stukas) #{currKasus.id}: {currKasus.judul}
                                    </strong>
                                  </div>
                                  <p className="text-slate-700 leading-relaxed text-[11px]">
                                    {currKasus.deskripsi}
                                  </p>
                                </div>
                              );
                            })()}
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


      {/* Modal Kelola Kelas Lengkap: Buat, Edit, Hapus, dan Reset Sesi */}
      {showKelasModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 relative overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Header Modal */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex justify-between items-center border-b border-slate-700 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-xl shadow-inner">
                  🎓
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                    Kelola Sesi & Akses Kelas
                  </h3>
                  <p className="text-xs text-slate-300 font-medium">
                    Atur kelas baru, perbarui kode akses & durasi timer, hapus kelas, atau reset lembar kerja siswa.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowKelasModal(false);
                  setPesanSuksesKelas("");
                  setPesanErrorKelas("");
                  handleBatalEditKelas();
                }}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm transition-all"
                title="Tutup Modal"
              >
                ✕
              </button>
            </div>

            {/* Body Scrollable */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
              
              {/* Notifikasi Pesan Sukses */}
              {pesanSuksesKelas && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2 shadow-sm animate-fade-in">
                  <span className="flex items-center gap-1.5">{pesanSuksesKelas}</span>
                  <button onClick={() => setPesanSuksesKelas("")} className="text-emerald-600 hover:text-emerald-900 font-bold px-1.5">✕</button>
                </div>
              )}

              {/* Notifikasi Pesan Error */}
              {pesanErrorKelas && (
                <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2 shadow-sm animate-fade-in">
                  <span className="flex items-center gap-1.5">⚠️ {pesanErrorKelas}</span>
                  <button onClick={() => setPesanErrorKelas("")} className="text-rose-600 hover:text-rose-900 font-bold px-1.5">✕</button>
                </div>
              )}

              {/* SECTION 1: FORM BUAT / EDIT KELAS */}
              <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                editingKelas 
                  ? "bg-amber-50/70 border-amber-300 shadow-sm" 
                  : "bg-slate-50 border-slate-200"
              }`}>
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${
                      editingKelas
                        ? "bg-amber-200 text-amber-900 border border-amber-300 font-black"
                        : "bg-blue-100 text-blue-800 border border-blue-200"
                    }`}>
                      {editingKelas ? `✏️ Mode Edit: Kelas ${editingKelas.nama_kelas}` : "➕ Buat Sesi Kelas Baru"}
                    </span>
                    {editingKelas && (
                      <span className="text-[11px] text-amber-700 font-mono">
                        (Kode saat ini: {editingKelas.kode_kelas})
                      </span>
                    )}
                  </div>
                  {editingKelas && (
                    <button
                      type="button"
                      onClick={handleBatalEditKelas}
                      className="text-xs text-slate-500 hover:text-slate-800 font-bold hover:underline cursor-pointer"
                    >
                      Batal Edit ✕
                    </button>
                  )}
                </div>

                <form onSubmit={handleSimpanKelasBaru} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nama Kelas <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={inputNamaKelasBaru}
                        onChange={(e) => {
                          setInputNamaKelasBaru(e.target.value);
                          if (!editingKelas && (!inputKodeKelasBaru || inputKodeKelasBaru.startsWith("HAKI-"))) {
                            setInputKodeKelasBaru(`HAKI-${e.target.value.trim().toUpperCase()}`);
                          }
                        }}
                        placeholder="Contoh: 9D, 9E, IX-B"
                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500 bg-white"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Nama kelas yang akan tampil pada laporan LKPD.
                      </span>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-bold text-slate-700">
                          Kode Akses Siswa <span className="text-rose-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={generateRandomKodeKelas}
                          className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <span>🎲</span> Acak Otomatis
                        </button>
                      </div>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          required
                          value={inputKodeKelasBaru}
                          onChange={(e) => setInputKodeKelasBaru(e.target.value.toUpperCase())}
                          placeholder="Contoh: HAKI-9D"
                          className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 font-mono uppercase tracking-wider focus:outline-none focus:border-blue-500 bg-white font-bold"
                        />
                        <button
                          type="button"
                          onClick={generateRandomKodeKelas}
                          className="px-2.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95"
                          title="Generate Kode Acak"
                        >
                          🎲
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Kode unik yang dimasukkan siswa untuk masuk kelas.
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <span>⏱️</span>
                        <span>Batas Waktu / Timer Investigasi Siswa</span>
                      </label>
                      <span className="text-xs font-extrabold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-300">
                        {inputDurasiMenit} Menit
                      </span>
                    </div>

                    {/* Presets Cepat */}
                    <div className="grid grid-cols-5 gap-1.5 mb-2">
                      {[15, 20, 30, 45, 60].map((menit) => (
                        <button
                          key={menit}
                          type="button"
                          onClick={() => setInputDurasiMenit(menit)}
                          className={`py-1.5 px-1 rounded-xl text-xs font-bold transition-all border ${
                            inputDurasiMenit === menit
                              ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
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
                        className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500 bg-white"
                        placeholder="Contoh: 30"
                      />
                      <span className="text-xs font-bold text-slate-600 shrink-0">Menit Investigasi</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={isSavingKelas || !inputNamaKelasBaru.trim()}
                      className={`flex-1 py-2.5 font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 ${
                        editingKelas
                          ? "bg-amber-600 hover:bg-amber-700 text-white active:scale-98"
                          : "bg-blue-600 hover:bg-blue-700 text-white active:scale-98"
                      } disabled:opacity-50 cursor-pointer`}
                    >
                      {isSavingKelas ? (
                        <span>Menyimpan...</span>
                      ) : editingKelas ? (
                        <span>💾 Simpan Perubahan Kelas</span>
                      ) : (
                        <span>➕ Simpan & Aktifkan Kelas Baru</span>
                      )}
                    </button>
                    {editingKelas && (
                      <button
                        type="button"
                        onClick={handleBatalEditKelas}
                        className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                      >
                        Batal
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* SECTION 2: DAFTAR KELAS AKTIF DENGAN AKSI (EDIT, RESET SESI, HAPUS) */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center px-1">
                  <div>
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <span>📋</span> Daftar Sesi Kelas Aktif ({kelasList.length})
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Klik ✏️ untuk edit nama/durasi, 🔄 untuk reset data LKPD, atau 🗑️ untuk menghapus kelas.
                    </p>
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2 pr-1 [scrollbar-width:thin]">
                  {kelasList.map((k) => {
                    const lkpdCount = lkpdList.filter((l) => l.kelas?.toUpperCase() === k.nama_kelas.toUpperCase()).length;
                    const chatCount = chats.filter((c) => c.kelas?.toUpperCase() === k.nama_kelas.toUpperCase()).length;
                    const isSelected = editingKelas?.kode_kelas === k.kode_kelas;

                    return (
                      <div
                        key={k.kode_kelas}
                        className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-amber-50 border-amber-400 shadow-sm ring-1 ring-amber-400"
                            : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
                        }`}
                      >
                        {/* Info Kelas */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-slate-800 text-sm flex items-center gap-1">
                              <span>🎓</span> Kelas {k.nama_kelas}
                            </span>
                            
                            {/* Kode Badge dengan Tombol Salin */}
                            <button
                              type="button"
                              onClick={() => handleSalinKode(k.kode_kelas)}
                              className="font-mono font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer"
                              title="Klik untuk salin kode kelas ke clipboard"
                            >
                              <span>{k.kode_kelas}</span>
                              <span className="text-[10px] text-blue-500">
                                {copiedKode === k.kode_kelas ? "✅ Tersalin!" : "📋"}
                              </span>
                            </button>

                            {/* Badge Durasi */}
                            <span className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-lg font-bold flex items-center gap-1">
                              <span>⏱️</span> {k.durasi_menit || 30}m
                            </span>
                          </div>

                          {/* Ringkasan Data Siswa Aktif di Kelas ini */}
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                            <span className={lkpdCount > 0 ? "text-emerald-700 font-semibold" : "text-slate-400"}>
                              📄 {lkpdCount} LKPD terisi
                            </span>
                            <span>•</span>
                            <span className={chatCount > 0 ? "text-blue-700 font-semibold" : "text-slate-400"}>
                              💬 {chatCount} pesan interogasi
                            </span>
                          </div>

                          {/* Tombol Cepat Reset Kelompok Khusus jika ada data di kelas ini */}
                          {lkpdCount > 0 && (
                            <div className="pt-1.5 flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] text-slate-400 font-bold uppercase">Reset Tim Khusus:</span>
                              {Array.from(new Set(lkpdList.filter((l) => l.kelas?.toUpperCase() === k.nama_kelas.toUpperCase()).map((l) => l.kelompok)))
                                .sort((a, b) => a - b)
                                .map((kelNum) => (
                                  <button
                                    key={kelNum}
                                    type="button"
                                    onClick={() => setConfirmResetKelompok({ kelompok: kelNum, kelas: k.nama_kelas })}
                                    className="text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded-md font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                                    title={`Reset hanya data Kelompok ${kelNum} pada Kelas ${k.nama_kelas}`}
                                  >
                                    <span>🔄 Tim {kelNum}</span>
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>

                        {/* Tombol Aksi Lengkap: Edit, Reset Sesi, Hapus */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                          {/* Tombol Edit */}
                          <button
                            type="button"
                            onClick={() => handleMulaiEditKelas(k)}
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                            title="Edit nama kelas, kode akses, atau durasi waktu investigasi"
                          >
                            <span>✏️</span> Edit
                          </button>

                          {/* Tombol Reset Sesi Data Kelas */}
                          <button
                            type="button"
                            onClick={() => setConfirmResetSesiKelas(k)}
                            className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                            title="Reset / hapus seluruh jawaban LKPD dan riwayat chat kelas ini agar siap dipakai sesi berikutnya"
                          >
                            <span>🔄</span> Reset Sesi
                          </button>

                          {/* Tombol Hapus Kelas */}
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteKelas(k)}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                            title="Hapus kelas ini dari daftar sesi aktif"
                          >
                            <span>🗑️</span> Hapus
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 3: RESET GLOBAL KE DEFAULT */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-slate-700 block">Kembalikan Daftar Kelas ke Setelan Bawaan?</span>
                  <span className="text-slate-400 text-[11px]">
                    Akan memulihkan daftar kelas awal sistem (Kelas 9A, 9B, 9C dengan timer 30 menit).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmResetDefault(true)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-300 rounded-xl text-xs transition-all shrink-0 cursor-pointer shadow-xs"
                >
                  🔄 Reset ke Default (9A, 9B, 9C)
                </button>
              </div>

            </div>

            {/* Footer Modal */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                onClick={() => {
                  setShowKelasModal(false);
                  setPesanSuksesKelas("");
                  setPesanErrorKelas("");
                  handleBatalEditKelas();
                }}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm"
              >
                Tutup Jendela
              </button>
            </div>

            {/* DIALOG KONFIRMASI HAPUS KELAS */}
            {confirmDeleteKelas && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-rose-200 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-2xl mx-auto">
                    🗑️
                  </div>
                  <h4 className="text-base font-bold text-slate-800">
                    Hapus Kelas {confirmDeleteKelas.nama_kelas}?
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Kelas dengan kode <strong className="font-mono text-slate-800">{confirmDeleteKelas.kode_kelas}</strong> beserta <strong>seluruh data lembar kerja LKPD dan riwayat chat interogasi siswa</strong> untuk kelas ini akan dihapus permanen dari sistem.
                  </p>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      disabled={isActionLoading}
                      onClick={() => setConfirmDeleteKelas(null)}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      disabled={isActionLoading}
                      onClick={() => handleHapusKelas(confirmDeleteKelas)}
                      className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm"
                    >
                      {isActionLoading ? "Menghapus..." : "Ya, Hapus Kelas"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* DIALOG KONFIRMASI RESET SESI KELAS */}
            {confirmResetSesiKelas && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-amber-200 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-2xl mx-auto">
                    🔄
                  </div>
                  <h4 className="text-base font-bold text-slate-800">
                    Reset Sesi Kelas {confirmResetSesiKelas.nama_kelas}?
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Seluruh lembar kerja LKPD dan riwayat chat interogasi khusus <strong>Kelas {confirmResetSesiKelas.nama_kelas}</strong> akan dibersihkan permanen agar siap digunakan untuk sesi pembelajaran baru.
                  </p>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      disabled={isActionLoading}
                      onClick={() => setConfirmResetSesiKelas(null)}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      disabled={isActionLoading}
                      onClick={() => handleResetSesiKelas(confirmResetSesiKelas)}
                      className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm"
                    >
                      {isActionLoading ? "Membersihkan..." : "Ya, Bersihkan Sesi"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* DIALOG KONFIRMASI RESET DEFAULT KELAS */}
            {confirmResetDefault && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-300 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-2xl mx-auto">
                    ⚙️
                  </div>
                  <h4 className="text-base font-bold text-slate-800">
                    Kembalikan Daftar Kelas Bawaan?
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Daftar kelas akan direset ke setelan awal: <strong>Kelas 9A, 9B, dan 9C</strong> (Timer masing-masing 30 menit).
                  </p>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      disabled={isActionLoading}
                      onClick={() => setConfirmResetDefault(false)}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      disabled={isActionLoading}
                      onClick={handleResetDefaultKelas}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm"
                    >
                      {isActionLoading ? "Memproses..." : "Ya, Reset ke Default"}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* DIALOG KONFIRMASI RESET KELOMPOK KHUSUS */}
      {confirmResetKelompok && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[70] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-rose-200 text-center space-y-3.5">
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
              🔄
            </div>
            <h4 className="text-base sm:text-lg font-black text-slate-800">
              Reset Kelompok {confirmResetKelompok.kelompok}?
            </h4>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs text-slate-700 space-y-1">
              <p>
                <span className="text-slate-400 font-semibold">Kelas:</span>{" "}
                <span className="font-bold text-slate-800">Kelas {confirmResetKelompok.kelas}</span>
              </p>
              <p>
                <span className="text-slate-400 font-semibold">Target:</span>{" "}
                <span className="font-bold text-rose-600">Kelompok {confirmResetKelompok.kelompok}</span>
              </p>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Seluruh lembar kerja LKPD dan riwayat chat interogasi khusus <strong>Kelompok {confirmResetKelompok.kelompok}</strong> akan dibersihkan permanen. Siswa dalam kelompok ini dapat masuk kembali dan memulai investigasi dari awal.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={isActionLoading}
                onClick={() => setConfirmResetKelompok(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isActionLoading}
                onClick={() => handleResetKelompokSpesifik(confirmResetKelompok.kelompok, confirmResetKelompok.kelas)}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md transition-all active:scale-95"
              >
                {isActionLoading ? "Mereset..." : "Ya, Reset Kelompok Ini"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAHAP 5: MODAL PRESENTASI PROYEKTOR / SMART TV KELAS */}
      {showPresentationModal && (() => {
        const presGroupData = getGroupMetadata(presentationKelompok);
        const presBukti = parseBukti(presGroupData.bukti_petunjuk);
        const presAnalisis = parseAnalisis(presGroupData.analisis_pelanggaran);
        const presSolusi = parseSolusi(presGroupData.solusi_rekomendasi);
        const presKasus = DAFTAR_KASUS.find(d => d.id === presGroupData.kasus_id) || DAFTAR_KASUS[0];
        const presEval = presSolusi.evaluasi_ai;

        let presAnggotaDetail = parseNamaAnggotaString(presGroupData.nama_anggota);
        if (presSolusi.anggota_detail) {
          presAnggotaDetail = { ...presAnggotaDetail, ...presSolusi.anggota_detail };
        }

        const totalSlides = 5;

        return (
          <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col text-slate-100 overflow-hidden select-none animate-in fade-in duration-200">
            {/* Top Bar Presentasi Proyektor */}
            <div className="h-16 bg-slate-900 border-b border-slate-800 px-4 md:px-6 flex items-center justify-between shrink-0 gap-3">
              {/* Info Kelas & Logo */}
              <div className="flex items-center gap-3 shrink-0">
                <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm md:text-base text-white tracking-wide">
                      DETEKTIF HAKI
                    </span>
                    <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black rounded-full uppercase tracking-wider">
                      📽️ Mode Proyektor Kelas
                    </span>
                    <span className="text-xs bg-blue-600/30 text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-500/30 font-mono font-bold">
                      Kelas {presGroupData.kelas}
                    </span>
                  </div>
                </div>
              </div>

              {/* Kelompok Switcher Cepat untuk Guru */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shrink-0">
                <span className="text-[11px] font-bold text-slate-400 px-2 hidden lg:inline">Pilih Tim Maju:</span>
                {[1, 2, 3, 4, 5, 6].map((num) => {
                  const hasData = allKelompokKeys.includes(num);
                  const isPresSelected = presentationKelompok === num;
                  return (
                    <button
                      key={num}
                      onClick={() => {
                        setPresentationKelompok(num);
                        setCurrentSlide(1);
                        setShowChatInPresentation(false);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isPresSelected
                          ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg font-black ring-2 ring-amber-400"
                          : hasData
                          ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                          : "bg-slate-900/60 hover:bg-slate-800 text-slate-500 border border-slate-800/80"
                      }`}
                      title={hasData ? `Kelompok ${num} (Sudah Ada Data)` : `Kelompok ${num} (Belum Ada Data)`}
                    >
                      <span>Kel {num}</span>
                      {hasData && !isPresSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Tombol Fullscreen & Tutup */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={toggleFullscreen}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Aktifkan Layar Penuh (F11)"
                >
                  <span>{isFullscreen ? "🗗" : "⛶"}</span>
                  <span className="hidden sm:inline">{isFullscreen ? "Perkecil" : "Layar Penuh"}</span>
                </button>
                <button
                  onClick={() => setShowPresentationModal(false)}
                  className="px-3.5 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl text-xs font-bold border border-rose-500/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  title="Tutup Mode Presentasi (Esc)"
                >
                  <span>✕</span>
                  <span className="hidden sm:inline">Tutup (Esc)</span>
                </button>
              </div>
            </div>

            {/* Slide Navigation Tabs Bar */}
            <div className="bg-slate-900/80 border-b border-slate-800 px-4 md:px-6 py-2 flex items-center justify-between overflow-x-auto [scrollbar-width:none] shrink-0 gap-2">
              <div className="flex items-center gap-2">
                {[
                  { num: 1, label: "1. Tim & Kasus", icon: "👥" },
                  { num: 2, label: "2. Bukti Kunci (AI)", icon: "🔍" },
                  { num: 3, label: "3. Analisis HAKI (C4)", icon: "⚖️" },
                  { num: 4, label: "4. Solusi & Mitigasi (C5)", icon: "🛡️" },
                  { num: 5, label: "5. Refleksi & Diskusi Kelas", icon: "🌟" }
                ].map((s) => (
                  <button
                    key={s.num}
                    onClick={() => {
                      setCurrentSlide(s.num);
                      setShowChatInPresentation(false);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      currentSlide === s.num
                        ? "bg-blue-600 text-white shadow-md ring-1 ring-blue-400"
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    <span>{s.icon}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>

              <div className="text-xs font-bold text-slate-400 hidden md:flex items-center gap-2 shrink-0">
                <span>Tim Presenter:</span>
                <span className="text-amber-400 font-extrabold bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-lg">
                  Kelompok {presentationKelompok}
                </span>
              </div>
            </div>

            {/* Body Slide Presentasi */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col justify-between max-w-6xl mx-auto w-full [scrollbar-width:thin]">
              
              {/* SLIDE 1: IDENTITAS TIM DETEKTIF & KASUS */}
              {currentSlide === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 my-auto">
                  <div className="text-center space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold rounded-full uppercase tracking-wider">
                      <span>Kasus #{presKasus.id} • Diteliti oleh Kelompok {presentationKelompok}</span>
                    </div>
                    <h2 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 tracking-tight">
                      "{presKasus.judul}"
                    </h2>
                  </div>

                  {/* Ringkasan Kasus */}
                  <div className="bg-slate-900/90 border-l-4 border-blue-500 border-y border-r border-slate-800 p-5 rounded-2xl shadow-xl">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-1 flex items-center gap-1.5">
                      <span>📁</span> Ringkasan Skenario Masalah (Problem Context):
                    </h3>
                    <p className="text-sm md:text-base text-slate-200 leading-relaxed font-normal">
                      {presKasus.deskripsi}
                    </p>
                  </div>

                  {/* Grid 6 Anggota & Peran Detektif */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                      <span>🕵️‍♂️</span> Susunan Tim Detektif & Pembagian Peran (5–6 Anggota):
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {/* Peran 1 */}
                      <div className="bg-slate-900/90 border border-blue-500/30 p-3.5 rounded-2xl">
                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block mb-1">
                          1. Interregator Chat AI 💬
                        </span>
                        <p className="text-sm font-extrabold text-white truncate">
                          {presAnggotaDetail.interregator || "(Belum Diisi)"}
                        </p>
                        <span className="text-[10px] text-slate-500 block mt-0.5">Tanya jawab dengan Saksi AI</span>
                      </div>

                      {/* Peran 2 */}
                      <div className="bg-slate-900/90 border border-emerald-500/30 p-3.5 rounded-2xl">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                          2. Pencatat Bukti 1 📝
                        </span>
                        <p className="text-sm font-extrabold text-white truncate">
                          {presAnggotaDetail.pencatat1 || "(Belum Diisi)"}
                        </p>
                        <span className="text-[10px] text-slate-500 block mt-0.5">Mencatat petunjuk pelaku</span>
                      </div>

                      {/* Peran 3 */}
                      <div className="bg-slate-900/90 border border-teal-500/30 p-3.5 rounded-2xl">
                        <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block mb-1">
                          3. Pencatat Bukti 2 📋
                        </span>
                        <p className="text-sm font-extrabold text-white truncate">
                          {presAnggotaDetail.pencatat2 || "(Belum Diisi)"}
                        </p>
                        <span className="text-[10px] text-slate-500 block mt-0.5">Mencatat petunjuk aset & lisensi</span>
                      </div>

                      {/* Peran 4 */}
                      <div className="bg-slate-900/90 border border-purple-500/30 p-3.5 rounded-2xl">
                        <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block mb-1">
                          4. Analis HAKI 1 ⚖️
                        </span>
                        <p className="text-sm font-extrabold text-white truncate">
                          {presAnggotaDetail.analis1 || "(Belum Diisi)"}
                        </p>
                        <span className="text-[10px] text-slate-500 block mt-0.5">Menganalisis jenis pelanggaran</span>
                      </div>

                      {/* Peran 5 */}
                      <div className="bg-slate-900/90 border border-indigo-500/30 p-3.5 rounded-2xl">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-1">
                          5. Analis HAKI 2 🔍
                        </span>
                        <p className="text-sm font-extrabold text-white truncate">
                          {presAnggotaDetail.analis2 || "(Belum Diisi)"}
                        </p>
                        <span className="text-[10px] text-slate-500 block mt-0.5">Menganalisis pihak dirugikan</span>
                      </div>

                      {/* Peran 6 (Juru Bicara - Highlighted) */}
                      <div className="bg-gradient-to-br from-amber-950/60 to-slate-900 border-2 border-amber-500/70 p-3.5 rounded-2xl shadow-lg ring-1 ring-amber-400/40 relative">
                        <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-amber-500 text-slate-950 text-[9px] font-black rounded-md uppercase">
                          🎤 Presenter
                        </span>
                        <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block mb-1">
                          6. Juru Bicara Presentasi 🎤
                        </span>
                        <p className="text-sm font-black text-amber-100 truncate">
                          {presAnggotaDetail.jurubicara || "(Opsional / 5 Anak)"}
                        </p>
                        <span className="text-[10px] text-amber-400/80 block mt-0.5 font-semibold">Memimpin presentasi kelas</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SLIDE 2: BUKTI INVESTIGASI (EVIDENCE LOG) */}
              {currentSlide === 2 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300 my-auto">
                  <div className="text-center space-y-1">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      Bagian II: Catatan Bukti Investigasi
                    </span>
                    <h2 className="text-2xl md:text-3xl font-black text-white">
                      Petunjuk Kunci dari "Saksi Mata Digital" (AI)
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Clue 1 */}
                    <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-5 shadow-xl flex flex-col">
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
                        <span className="text-xl">🔍</span>
                        <div>
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Petunjuk #1</span>
                          <h4 className="text-xs font-bold text-white">Pelaku & Tindakan</h4>
                        </div>
                      </div>
                      <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-medium whitespace-pre-wrap flex-1 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                        {presBukti.p1 || "(Belum ada catatan petunjuk pelaku)"}
                      </p>
                    </div>

                    {/* Clue 2 */}
                    <div className="bg-slate-900 border border-teal-500/40 rounded-2xl p-5 shadow-xl flex flex-col">
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
                        <span className="text-xl">📦</span>
                        <div>
                          <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block">Petunjuk #2</span>
                          <h4 className="text-xs font-bold text-white">Aset / Karya Dirugikan</h4>
                        </div>
                      </div>
                      <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-medium whitespace-pre-wrap flex-1 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                        {presBukti.p2 || "(Belum ada catatan aset karya)"}
                      </p>
                    </div>

                    {/* Clue 3 */}
                    <div className="bg-slate-900 border border-blue-500/40 rounded-2xl p-5 shadow-xl flex flex-col">
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
                        <span className="text-xl">📜</span>
                        <div>
                          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">Petunjuk #3</span>
                          <h4 className="text-xs font-bold text-white">Lisensi & Status Hukum</h4>
                        </div>
                      </div>
                      <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-medium whitespace-pre-wrap flex-1 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                        {presBukti.p3 || "(Belum ada catatan status hukum)"}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Buka Transkrip Chat Asli */}
                  <div className="pt-2">
                    <button
                      onClick={() => setShowChatInPresentation(!showChatInPresentation)}
                      className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-blue-400 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                    >
                      <span>💬</span>
                      <span>{showChatInPresentation ? "Sembunyikan Transkrip Chat AI" : `Lihat Bukti Dialog Interogasi dengan Saksi AI (${presGroupData.messages.length} Pesan)`}</span>
                    </button>

                    {showChatInPresentation && (
                      <div className="mt-3 p-4 bg-slate-950 border border-slate-800 rounded-2xl max-h-56 overflow-y-auto space-y-2 [scrollbar-width:thin]">
                        {presGroupData.messages.length === 0 ? (
                          <p className="text-xs text-slate-500 italic text-center py-2">Belum ada riwayat pesan chat tercatat.</p>
                        ) : (
                          presGroupData.messages.map((m, idx) => (
                            <div key={idx} className={`p-2.5 rounded-xl text-xs ${
                              m.role === "user" 
                                ? "bg-blue-600/30 border border-blue-500/30 text-blue-200 ml-6" 
                                : "bg-slate-900 border border-slate-800 text-slate-300 mr-6"
                            }`}>
                              <span className="font-bold text-[10px] block mb-0.5 text-slate-400">
                                {m.role === "user" ? "🕵️ Detektif (Interregator):" : "🤖 Saksi Mata Digital (AI):"}
                              </span>
                              {m.content}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SLIDE 3: ANALISIS HAKI (HOTS - C4) */}
              {currentSlide === 3 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300 my-auto">
                  <div className="text-center space-y-1">
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                      Bagian III: Lembar Analisis HAKI (HOTS - C4)
                    </span>
                    <h2 className="text-2xl md:text-3xl font-black text-white">
                      Analisis Pelanggaran Hukum & UU Hak Cipta No. 28/2014
                    </h2>
                  </div>

                  <div className="space-y-4">
                    {/* Analisis 1: Tindakan */}
                    <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-5 shadow-xl">
                      <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-slate-800">
                        <span className="text-lg">❌</span>
                        <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                          1. Tindakan Konkret Pelaku yang Melanggar Hukum / Etika Digital:
                        </h4>
                      </div>
                      <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-medium bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 whitespace-pre-wrap">
                        {presAnalisis.tindakan || "(Belum ada uraian tindakan spesifik)"}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Analisis 2: Jenis HAKI */}
                      <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-5 shadow-xl">
                        <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-slate-800">
                          <span className="text-lg">⚖️</span>
                          <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                            2. Jenis HAKI & Lisensi yang Dilanggar:
                          </h4>
                        </div>
                        <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-medium bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 whitespace-pre-wrap">
                          {presAnalisis.jenis || "(Belum ada catatan jenis HAKI / lisensi)"}
                        </p>
                      </div>

                      {/* Analisis 3: Pihak Dirugikan */}
                      <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-5 shadow-xl">
                        <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-slate-800">
                          <span className="text-lg">📉</span>
                          <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider">
                            3. Pihak yang Paling Dirugikan & Kerugian:
                          </h4>
                        </div>
                        <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-medium bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 whitespace-pre-wrap">
                          {presAnalisis.kerugian || "(Belum ada uraian kerugian moral / ekonomi)"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SLIDE 4: SOLUSI & MITIGASI (HOTS - C5) */}
              {currentSlide === 4 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300 my-auto">
                  <div className="text-center space-y-1">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                      Bagian IV: Rekomendasi Solusi & Mitigasi (HOTS - C5)
                    </span>
                    <h2 className="text-2xl md:text-3xl font-black text-white">
                      Rekomendasi Pemecahan Masalah Secara Adil & Etis
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Solusi 1: Adil untuk Korban */}
                    <div className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2.5 mb-3 pb-2 border-b border-slate-800">
                          <span className="text-2xl">⚖️</span>
                          <div>
                            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Pilar Penyelesaian 1</span>
                            <h4 className="text-sm font-extrabold text-white">Langkah Adil untuk Korban Saat Ini</h4>
                          </div>
                        </div>
                        <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-medium bg-slate-950/70 p-4 rounded-2xl border border-slate-800 whitespace-pre-wrap">
                          {presSolusi.solusi || "(Belum ada rekomendasi langkah penyelesaian korban)"}
                        </p>
                      </div>
                      <span className="text-[10px] text-amber-400/80 font-bold mt-3 block">
                        Fokus: Pemulihan hak moral, royalti/ganti rugi, dan permohonan maaf.
                      </span>
                    </div>

                    {/* Solusi 2: Aturan Etis Masa Depan */}
                    <div className="bg-slate-900 border-2 border-teal-500/40 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2.5 mb-3 pb-2 border-b border-slate-800">
                          <span className="text-2xl">🛡️</span>
                          <div>
                            <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block">Pilar Penyelesaian 2</span>
                            <h4 className="text-sm font-extrabold text-white">Aturan Etis Digital di Masa Depan</h4>
                          </div>
                        </div>
                        <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-medium bg-slate-950/70 p-4 rounded-2xl border border-slate-800 whitespace-pre-wrap">
                          {presSolusi.aturan || "(Belum ada rumusan aturan etis masa depan)"}
                        </p>
                      </div>
                      <span className="text-[10px] text-teal-400/80 font-bold mt-3 block">
                        Fokus: Edukasi lisensi legal, atribusi sumber karya, dan integritas digital.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* SLIDE 5: REFLEKSI DIRI & SESI DISKUSI KELAS (Nilai Disembunyikan untuk Presentasi Siswa) */}
              {currentSlide === 5 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300 my-auto">
                  <div className="text-center space-y-1">
                    <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                      Bagian V: Jurnal Refleksi & Sesi Diskusi Kelas
                    </span>
                    <h2 className="text-2xl md:text-3xl font-black text-white">
                      Refleksi Pembelajaran & Sesi Diskusi Kelas
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Refleksi Siswa */}
                    <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
                          <span className="text-2xl">💭</span>
                          <div>
                            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">Jurnal Refleksi Tim</span>
                            <h4 className="text-sm font-bold text-white">Pelajaran Berharga tentang Hak Cipta</h4>
                          </div>
                        </div>
                        <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-medium bg-slate-950/70 p-4 rounded-2xl border border-slate-800 italic whitespace-pre-wrap">
                          "{presSolusi.refleksi || "(Belum ada refleksi yang dicatat kelompok)"}"
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-3 block">
                        Refleksi autentik siswa mengenai pentingnya menghargai karya cipta orang lain di era digital.
                      </span>
                    </div>

                    {/* Sesi Diskusi Kelas & Validasi Investigasi (Nilai disembunyikan untuk privasi & objektivitas guru) */}
                    <div className="bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">💬</span>
                            <div>
                              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">Forum Diskusi Kelas</span>
                              <h4 className="text-sm font-bold text-white">Sesi Tanya Jawab & Tanggapan</h4>
                            </div>
                          </div>
                          {presGroupData.is_submitted ? (
                            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-xs rounded-full flex items-center gap-1 shadow">
                              <span>✓</span> Berkas Terverifikasi
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-xs rounded-full">
                              Draft Investigasi
                            </span>
                          )}
                        </div>

                        <div className="space-y-3 bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
                          <div>
                            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                              <span>💡</span> Panduan Diskusi untuk Kelompok Penanggap di Kelas:
                            </span>
                            <ul className="text-xs text-slate-200 space-y-1.5 list-disc list-inside leading-relaxed">
                              <li>Apakah analisis jenis HAKI dan pasal UU yang dipaparkan sudah tepat?</li>
                              <li>Bagaimana pandangan kelompok Anda terhadap langkah adil bagi korban?</li>
                              <li>Adakah ide atau alternatif aturan etis lain yang bisa ditambahkan?</li>
                            </ul>
                          </div>

                          <div className="border-t border-slate-800/80 pt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                            <span className="flex items-center gap-1.5 text-slate-400">
                              <span>🔒</span> Nilai & rubrik evaluasi tersimpan khusus di sistem Dasbor Guru.
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 p-2.5 bg-indigo-950/40 border border-indigo-500/20 rounded-xl flex items-center gap-2 text-[11px] text-indigo-200">
                        <span className="text-base">🎤</span>
                        <span>Juru Bicara dipersilakan memandu sesi tanya jawab dengan audiens kelas.</span>
                      </div>
                    </div>
                  </div>

                  {/* Banner Penutup & Ajakan Tanya Jawab */}
                  <div className="bg-gradient-to-r from-blue-950/70 via-slate-900 to-indigo-950/70 border border-blue-500/40 rounded-2xl p-4 text-center shadow-lg">
                    <p className="text-sm md:text-base font-extrabold text-white">
                      👏 Sekian paparan hasil investigasi dari <span className="text-amber-400 font-black">Kelompok {presentationKelompok}</span>!
                    </p>
                    <p className="text-xs text-slate-300 mt-1">
                      Silakan bagi rekan-rekan tim detektif lain atau Bapak/Ibu Guru jika ada tanggapan, sanggahan, atau pertanyaan. 🎤
                    </p>
                  </div>
                </div>
              )}

            </div>

            {/* Bottom Navigation Controls Bar */}
            <div className="h-16 bg-slate-900 border-t border-slate-800 px-4 md:px-8 flex items-center justify-between shrink-0 gap-4">
              {/* Tombol Slide Sebelumnya */}
              <button
                disabled={currentSlide <= 1}
                onClick={() => {
                  setCurrentSlide((prev) => Math.max(1, prev - 1));
                  setShowChatInPresentation(false);
                }}
                className="px-4 md:px-5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-white rounded-xl text-xs md:text-sm font-bold border border-slate-700 transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed shadow"
              >
                <span>←</span>
                <span className="hidden sm:inline">Slide Sebelumnya</span>
              </button>

              {/* Indikator Slide & Hotkey Hint */}
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setCurrentSlide(s);
                        setShowChatInPresentation(false);
                      }}
                      className={`h-2.5 rounded-full transition-all cursor-pointer ${
                        currentSlide === s ? "w-8 bg-amber-400" : "w-2.5 bg-slate-700 hover:bg-slate-500"
                      }`}
                      title={`Ke Slide ${s}`}
                    />
                  ))}
                </div>
                <span className="text-[11px] text-slate-400 mt-1 font-mono hidden sm:inline">
                  Slide {currentSlide} dari {totalSlides} • Tekan [Spasi] atau [Panah Kanan] untuk lanjut
                </span>
              </div>

              {/* Tombol Slide Selanjutnya */}
              <button
                disabled={currentSlide >= totalSlides}
                onClick={() => {
                  setCurrentSlide((prev) => Math.min(totalSlides, prev + 1));
                  setShowChatInPresentation(false);
                }}
                className="px-4 md:px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:hover:bg-blue-600 text-white rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed shadow-md"
              >
                <span className="hidden sm:inline">Slide Selanjutnya</span>
                <span>→</span>
              </button>
            </div>
          </div>
        );
      })()}
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

          {/* PETUNJUK & LANGKAH PENGERJAAN INVESTIGASI */}
          <div className="border border-black rounded p-2.5 mb-2.5 text-[10px] bg-gray-50/50">
            <div className="border-b border-gray-300 pb-1 mb-1 font-bold uppercase text-[10px] flex justify-between">
              <span>PETUNJUK & LANGKAH PENGERJAAN INVESTIGASI</span>
              <span className="text-gray-500 font-normal">Alur Kolaborasi Tim (PBL)</span>
            </div>
            <ol className="list-decimal pl-4 space-y-0.5 text-gray-800 leading-tight">
              <li><strong>Pelajari Kasus & Bagi Peran:</strong> Cermati skenario kasus dan pastikan peran Interrogator (Laptop), Pencatat Bukti (HP 1), dan Analis HAKI (HP 2) aktif.</li>
              <li><strong>Interogasi Saksi AI:</strong> Interrogator mengajukan pertanyaan di chat untuk membongkar kronologi, motif pelaku, dan status lisensi karya.</li>
              <li><strong>Catat Bukti (Bagian II):</strong> Pencatat merangkum minimal 3 petunjuk penting hasil interogasi ke dalam Log Bukti secara realtime.</li>
              <li><strong>Analisis Hukum HAKI (Bagian III):</strong> Analis mengkaji pasal UU No. 28/2014, hak moral/ekonomi, dan pihak dirugikan.</li>
              <li><strong>Solusi, Refleksi & Kirim Final (Bagian IV & V):</strong> Rumuskan mitigasi adil, isi refleksi diri, lalu klik tombol Kirim Final sebelum waktu habis.</li>
            </ol>
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
                    <p className="font-bold underline">(M. KHOIRUL IBAD, S.Kom.)</p>
                    <p className="text-[9px] text-gray-600">NIM: 253153744038</p>
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
