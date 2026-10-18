"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { DEFAULT_KELAS_LIST, DAFTAR_KASUS } from "@/lib/constants";
import { ThemeMode, THEMES } from "@/lib/theme";
import ThemeSwitcher from "@/components/ThemeSwitcher";

const daftarKasus = DAFTAR_KASUS;

// Helper untuk mengekstrak peranan anggota jika disimpan dalam format string gabungan
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

const STORAGE_KEY_SESSION = "hakita_investigasi_session";

export default function InvestigasiPage() {
  // Mode Tema Interaktif (Cyber, Ceria, Arcade)
  const [tema, setTema] = useState<ThemeMode>("cyber");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("hakita_theme") as ThemeMode;
      if (saved && THEMES[saved]) {
        setTema(saved);
      }
    } catch {}
  }, []);

  const handleGantiTema = (newTheme: ThemeMode) => {
    setTema(newTheme);
    try {
      localStorage.setItem("hakita_theme", newTheme);
    } catch {}
  };

  const currentTheme = THEMES[tema];

  // Sesi Kelas
  const [kodeKelasInput, setKodeKelasInput] = useState("");
  const [kodeKelasAktif, setKodeKelasAktif] = useState<string | null>(null);
  const [namaKelas, setNamaKelas] = useState("");
  const [errorKelas, setErrorKelas] = useState("");
  const [isValidatingKelas, setIsValidatingKelas] = useState(false);

  // Sesi Kelompok & Anggota
  const [kelompokAktif, setKelompokAktif] = useState<number | null>(null);
  const [isIdentitasLengkap, setIsIdentitasLengkap] = useState(false);
  const [activeGroups, setActiveGroups] = useState<number[]>([]);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [roomToast, setRoomToast] = useState<string | null>(null);

  // Bagian I: Anggota Tim & Peran (5–6 Anak/Kelompok)
  const [anggotaInterregator, setAnggotaInterregator] = useState("");
  const [anggotaPencatat1, setAnggotaPencatat1] = useState("");
  const [anggotaPencatat2, setAnggotaPencatat2] = useState("");
  const [anggotaAnalis1, setAnggotaAnalis1] = useState("");
  const [anggotaAnalis2, setAnggotaAnalis2] = useState("");
  const [anggotaJuruBicara, setAnggotaJuruBicara] = useState("");

  // Kasus Aktif & Chat
  const [kasusAktif, setKasusAktif] = useState(daftarKasus[0]);
  const [pesan, setPesan] = useState<{ role: string; content: string }[]>([]);
  const [inputUser, setInputUser] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Bagian II: Catatan Bukti Investigasi
  const [petunjuk1, setPetunjuk1] = useState("");
  const [petunjuk2, setPetunjuk2] = useState("");
  const [petunjuk3, setPetunjuk3] = useState("");

  // Bagian III: Lembar Analisis HAKI (HOTS - C4)
  const [analisisTindakan, setAnalisisTindakan] = useState("");
  const [jenisHaki, setJenisHaki] = useState("");
  const [analisisKerugian, setAnalisisKerugian] = useState("");

  // Bagian IV: Solusi & Mitigasi (HOTS - C5)
  const [solusiAdil, setSolusiAdil] = useState("");
  const [aturanEtis, setAturanEtis] = useState("");

  // Bagian V: Refleksi Diri
  const [refleksiDiri, setRefleksiDiri] = useState("");
  const [evaluasiAi, setEvaluasiAi] = useState<any>(null);

  // Sesi Timer Investigasi (Tahap 3 & Sinkronisasi Multi-Device)
  const [durasiMenit, setDurasiMenit] = useState<number>(30);
  const [sisaDetik, setSisaDetik] = useState<number>(30 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [showTimeUpModal, setShowTimeUpModal] = useState<boolean>(false);
  const [hasAlertedTimeUp, setHasAlertedTimeUp] = useState<boolean>(false);
  const [sesiHabisAlert, setSesiHabisAlert] = useState<string | null>(null);

  // Status Form LKPD & Koneksi
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [activeTabMobile, setActiveTabMobile] = useState<"chat" | "lembar">("chat");
  const [showKasusModal, setShowKasusModal] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  // Focus & Conflict Prevention Ref
  // Mencegah overwrite remote ke input/textarea yang sedang diketik siswa lokal
  const activeFieldRef = useRef<string | null>(null);
  const timerStartRef = useRef<number | null>(null);
  const isLoadingRef = useRef<boolean>(false);

  // Simpan referensi data terakhir yang tersimpan untuk mencegah duplicate writes / save loop
  const lastSavedBuktiRef = useRef<{ p1: string; p2: string; p3: string }>({ p1: "", p2: "", p3: "" });
  const lastSavedAnalisisRef = useRef<{ tindakan: string; jenis: string; kerugian: string }>({ tindakan: "", jenis: "", kerugian: "" });
  const lastSavedSolusiRef = useRef<{ solusi: string; aturan: string; refleksi: string }>({ solusi: "", aturan: "", refleksi: "" });

  // Refs untuk anggota & AI evaluasi agar update granular tidak menimpa data
  const anggotaInterregatorRef = useRef(anggotaInterregator);
  const anggotaPencatat1Ref = useRef(anggotaPencatat1);
  const anggotaPencatat2Ref = useRef(anggotaPencatat2);
  const anggotaAnalis1Ref = useRef(anggotaAnalis1);
  const anggotaAnalis2Ref = useRef(anggotaAnalis2);
  const anggotaJuruBicaraRef = useRef(anggotaJuruBicara);
  const evaluasiAiRef = useRef(evaluasiAi);

  // Section Refs untuk Quick Jump Navigation di LKPD
  const sectionBuktiRef = useRef<HTMLDivElement>(null);
  const sectionAnalisisRef = useRef<HTMLDivElement>(null);
  const sectionSolusiRef = useRef<HTMLDivElement>(null);
  const sectionRefleksiRef = useRef<HTMLDivElement>(null);

  // Selalu sinkronkan refs dengan state
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    anggotaInterregatorRef.current = anggotaInterregator;
    anggotaPencatat1Ref.current = anggotaPencatat1;
    anggotaPencatat2Ref.current = anggotaPencatat2;
    anggotaAnalis1Ref.current = anggotaAnalis1;
    anggotaAnalis2Ref.current = anggotaAnalis2;
    anggotaJuruBicaraRef.current = anggotaJuruBicara;
    evaluasiAiRef.current = evaluasiAi;
  }, [anggotaInterregator, anggotaPencatat1, anggotaPencatat2, anggotaAnalis1, anggotaAnalis2, anggotaJuruBicara, evaluasiAi]);

  // Format Detik ke MM:SS
  const formatWaktu = (totalDetik: number) => {
    const m = Math.floor(Math.max(0, totalDetik) / 60);
    const s = Math.max(0, totalDetik) % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // String nama anggota gabungan (5–6 Anak/Kelompok)
  const getGabunganNamaAnggota = () => {
    const list: string[] = [];
    if (anggotaInterregator.trim()) list.push(`1. ${anggotaInterregator.trim()} (Interregator Chat AI)`);
    if (anggotaPencatat1.trim()) list.push(`2. ${anggotaPencatat1.trim()} (Pencatat Bukti 1)`);
    if (anggotaPencatat2.trim()) list.push(`3. ${anggotaPencatat2.trim()} (Pencatat Bukti 2)`);
    if (anggotaAnalis1.trim()) list.push(`4. ${anggotaAnalis1.trim()} (Analis HAKI 1)`);
    if (anggotaAnalis2.trim()) list.push(`5. ${anggotaAnalis2.trim()} (Analis HAKI 2)`);
    if (anggotaJuruBicara.trim()) list.push(`6. ${anggotaJuruBicara.trim()} (Juru Bicara Presentasi)`);
    return list.join(", ");
  };

  // Inisialisasi dan Sinkronisasi Timer Investigasi Terpusat
  useEffect(() => {
    if (!isIdentitasLengkap || !kodeKelasAktif || !kelompokAktif) return;

    const timerStorageKey = `hakita_timer_${kodeKelasAktif}_kelompok_${kelompokAktif}`;
    let startTime = timerStartRef.current;

    if (!startTime) {
      const storedStart = localStorage.getItem(timerStorageKey);
      startTime = storedStart ? parseInt(storedStart, 10) : 0;
    }

    if (!startTime || isNaN(startTime)) {
      startTime = Date.now();
      timerStartRef.current = startTime;
      localStorage.setItem(timerStorageKey, startTime.toString());
    } else {
      timerStartRef.current = startTime;
    }

    const totalDetik = durasiMenit * 60;
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const remaining = Math.max(0, totalDetik - elapsed);

    setSisaDetik(remaining);
    setIsTimerRunning(true);

    if (remaining <= 0) {
      try {
        localStorage.removeItem(STORAGE_KEY_SESSION);
        sessionStorage.setItem(
          "hakita_expired_message",
          `Sesi investigasi untuk Kelas ${namaKelas || kodeKelasAktif} (Kelompok ${kelompokAktif}) telah berakhir karena batas waktu (${durasiMenit} menit) telah habis. Seluruh catatan Anda telah tersimpan aman di sistem.`
        );
      } catch {}
      if (!hasAlertedTimeUp) {
        setShowTimeUpModal(true);
        setHasAlertedTimeUp(true);
      }
    }
  }, [isIdentitasLengkap, kodeKelasAktif, kelompokAktif, durasiMenit, hasAlertedTimeUp]);

  // Loop Interval Timer (Berjalan Tiap 1 Detik)
  useEffect(() => {
    if (!isTimerRunning || isSubmitted || !kodeKelasAktif || !kelompokAktif) return;

    const timerStorageKey = `hakita_timer_${kodeKelasAktif}_kelompok_${kelompokAktif}`;
    const interval = setInterval(() => {
      let startTime = timerStartRef.current;
      if (!startTime) {
        const storedStart = localStorage.getItem(timerStorageKey);
        if (storedStart) startTime = parseInt(storedStart, 10);
      }
      if (!startTime) return;

      const totalDetik = durasiMenit * 60;
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, totalDetik - elapsed);

      setSisaDetik(remaining);

      if (remaining <= 0) {
        try {
          localStorage.removeItem(STORAGE_KEY_SESSION);
          sessionStorage.setItem(
            "hakita_expired_message",
            `Sesi investigasi untuk Kelas ${namaKelas || kodeKelasAktif} (Kelompok ${kelompokAktif}) telah berakhir karena batas waktu (${durasiMenit} menit) telah habis. Seluruh catatan Anda telah tersimpan aman di sistem.`
          );
        } catch {}
        if (!hasAlertedTimeUp) {
          setShowTimeUpModal(true);
          setHasAlertedTimeUp(true);
        }
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, isSubmitted, kodeKelasAktif, kelompokAktif, durasiMenit, hasAlertedTimeUp]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [pesan, isLoading]);

  // Validasi Kode Kelas dengan Membaca Durasi Timer Settingan Guru
  const handleVerifikasiKelas = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKode = kodeKelasInput.trim().toUpperCase();
    if (!cleanKode) return;

    setIsValidatingKelas(true);
    setErrorKelas("");

    try {
      let matchedKelas: string | null = null;
      let matchedDurasi = 30;

      if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("url_proyek_supabase_anda")) {
        const { data } = await supabase
          .from("kelas_sesi")
          .select("*")
          .ilike("kode_kelas", cleanKode)
          .maybeSingle();

        if (data) {
          matchedKelas = data.nama_kelas;
          if (data.durasi_menit) {
            matchedDurasi = Number(data.durasi_menit);
          }
        }
      }

      if (!matchedKelas) {
        const fallback = DEFAULT_KELAS_LIST.find(
          (k) => k.kode_kelas.toUpperCase() === cleanKode || k.nama_kelas.toUpperCase() === cleanKode
        );
        if (fallback) {
          matchedKelas = fallback.nama_kelas;
          if (fallback.durasi_menit) {
            matchedDurasi = fallback.durasi_menit;
          }
        }
      }

      if (matchedKelas) {
        setNamaKelas(matchedKelas);
        setKodeKelasAktif(cleanKode);
        setDurasiMenit(matchedDurasi);
        setSisaDetik(matchedDurasi * 60);
        setErrorKelas("");

        // Simpan sesi kelas ke localStorage agar tidak hilang saat di-refresh (F5)
        try {
          localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify({
            kodeKelas: cleanKode,
            namaKelas: matchedKelas,
            durasiMenit: matchedDurasi,
            kelompok: null
          }));
        } catch {}

        // Cek room kelompok mana saja yang sudah aktif untuk kelas ini
        if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("url_proyek_supabase_anda")) {
          const { data: existingReports } = await supabase
            .from("lkpd_reports")
            .select("kelompok")
            .eq("kelas", matchedKelas);

          if (existingReports && existingReports.length > 0) {
            setActiveGroups(existingReports.map(r => r.kelompok));
          }
        }
      } else {
        setErrorKelas("Kode Kelas tidak ditemukan! Minta kode aktif dari Guru Anda.");
      }
    } catch (err) {
      console.error(err);
      setErrorKelas("Gagal memverifikasi kode kelas.");
    } finally {
      setIsValidatingKelas(false);
    }
  };

  // MULTI-DEVICE: Handler Remote Update LKPD dengan Proteksi Focus Input
  const handleRemoteLkpdUpdate = (data: {
    bukti_petunjuk?: string;
    analisis_pelanggaran?: string;
    solusi_rekomendasi?: string;
    is_submitted?: boolean;
  }) => {
    // 1. Sinkronisasi Bagian II (Bukti)
    if (data.bukti_petunjuk) {
      try {
        const parsed = JSON.parse(data.bukti_petunjuk);
        const p1 = parsed.p1 ?? "";
        const p2 = parsed.p2 ?? "";
        const p3 = parsed.p3 ?? "";

        lastSavedBuktiRef.current = { p1, p2, p3 };

        if (activeFieldRef.current !== "petunjuk1") setPetunjuk1(p1);
        if (activeFieldRef.current !== "petunjuk2") setPetunjuk2(p2);
        if (activeFieldRef.current !== "petunjuk3") setPetunjuk3(p3);
      } catch {
        if (activeFieldRef.current !== "petunjuk1") setPetunjuk1(data.bukti_petunjuk);
      }
    }

    // 2. Sinkronisasi Bagian III (Analisis)
    if (data.analisis_pelanggaran) {
      try {
        const parsed = JSON.parse(data.analisis_pelanggaran);
        const tindakan = parsed.tindakan ?? "";
        const jenis = parsed.jenis ?? "";
        const kerugian = parsed.kerugian ?? "";

        lastSavedAnalisisRef.current = { tindakan, jenis, kerugian };

        if (activeFieldRef.current !== "analisisTindakan") setAnalisisTindakan(tindakan);
        if (activeFieldRef.current !== "jenisHaki") setJenisHaki(jenis);
        if (activeFieldRef.current !== "analisisKerugian") setAnalisisKerugian(kerugian);
      } catch {
        if (activeFieldRef.current !== "analisisTindakan") setAnalisisTindakan(data.analisis_pelanggaran);
      }
    }

    // 3. Sinkronisasi Bagian IV & V (Solusi, Mitigasi, Refleksi, Timer & Anggota)
    if (data.solusi_rekomendasi) {
      try {
        const parsed = JSON.parse(data.solusi_rekomendasi);
        const solusi = parsed.solusi ?? "";
        const aturan = parsed.aturan ?? "";
        const refleksi = parsed.refleksi ?? "";

        lastSavedSolusiRef.current = { solusi, aturan, refleksi };

        if (activeFieldRef.current !== "solusiAdil") setSolusiAdil(solusi);
        if (activeFieldRef.current !== "aturanEtis") setAturanEtis(aturan);
        if (activeFieldRef.current !== "refleksiDiri") setRefleksiDiri(refleksi);
        if (parsed.evaluasi_ai) setEvaluasiAi(parsed.evaluasi_ai);

        if (parsed.timer_start && (!timerStartRef.current || timerStartRef.current !== parsed.timer_start)) {
          timerStartRef.current = parsed.timer_start;
          if (kodeKelasAktif && kelompokAktif) {
            localStorage.setItem(`hakita_timer_${kodeKelasAktif}_kelompok_${kelompokAktif}`, parsed.timer_start.toString());
          }
        }

        if (parsed.anggota_detail) {
          setAnggotaInterregator(prev => prev || parsed.anggota_detail.interregator || "");
          setAnggotaPencatat1(prev => prev || parsed.anggota_detail.pencatat1 || "");
          setAnggotaPencatat2(prev => prev || parsed.anggota_detail.pencatat2 || "");
          setAnggotaAnalis1(prev => prev || parsed.anggota_detail.analis1 || "");
          setAnggotaAnalis2(prev => prev || parsed.anggota_detail.analis2 || "");
          setAnggotaJuruBicara(prev => prev || parsed.anggota_detail.jurubicara || "");
        }
      } catch {
        if (activeFieldRef.current !== "solusiAdil") setSolusiAdil(data.solusi_rekomendasi);
      }
    }

    // 4. Sinkronisasi Status Final Submit
    if (typeof data.is_submitted === "boolean") {
      setIsSubmitted(data.is_submitted);
    }
  };

  // MULTI-DEVICE: Pemilihan Kelompok & Pengecekan Room Aktif Otomatis
  const handlePilihKelompok = async (num: number, overrideKelas?: string, overrideKode?: string) => {
    setIsJoiningRoom(true);
    setKelompokAktif(num);

    const targetKelas = overrideKelas || namaKelas;
    const targetKode = overrideKode || kodeKelasAktif;

    // Simpan status kelompok ke local session agar siswa tidak perlu input ulang saat refresh
    try {
      const sess = localStorage.getItem(STORAGE_KEY_SESSION);
      const parsed = sess ? JSON.parse(sess) : {};
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify({
        ...parsed,
        kodeKelas: targetKode || parsed.kodeKelas,
        namaKelas: targetKelas || parsed.namaKelas,
        durasiMenit: durasiMenit || parsed.durasiMenit || 30,
        kelompok: num
      }));
    } catch {}

    const kasusAssigned = daftarKasus.find(k => k.kelompok.includes(num)) || daftarKasus[0];
    setKasusAktif(kasusAssigned);

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("url_proyek_supabase_anda")) {
      setIsJoiningRoom(false);
      return;
    }

    try {
      // 1. Cek apakah LKPD kelompok ini sudah ada di database (sudah didaftarkan device rekan tim)
      const { data: lkpdData } = await supabase
        .from("lkpd_reports")
        .select("*")
        .eq("kelompok", num)
        .eq("kelas", targetKelas)
        .maybeSingle();

      let sudahAdaIdentitas = false;

      if (lkpdData) {
        // Parse bukti
        if (lkpdData.bukti_petunjuk) {
          try {
            const parsed = JSON.parse(lkpdData.bukti_petunjuk);
            setPetunjuk1(parsed.p1 || "");
            setPetunjuk2(parsed.p2 || "");
            setPetunjuk3(parsed.p3 || "");
            lastSavedBuktiRef.current = { p1: parsed.p1 || "", p2: parsed.p2 || "", p3: parsed.p3 || "" };
          } catch {
            setPetunjuk1(lkpdData.bukti_petunjuk);
          }
        }

        // Parse analisis
        if (lkpdData.analisis_pelanggaran) {
          try {
            const parsed = JSON.parse(lkpdData.analisis_pelanggaran);
            setAnalisisTindakan(parsed.tindakan || "");
            setJenisHaki(parsed.jenis || "");
            setAnalisisKerugian(parsed.kerugian || "");
            lastSavedAnalisisRef.current = { tindakan: parsed.tindakan || "", jenis: parsed.jenis || "", kerugian: parsed.kerugian || "" };
          } catch {
            setAnalisisTindakan(lkpdData.analisis_pelanggaran);
          }
        }

        // Parse solusi & anggota tim
        if (lkpdData.solusi_rekomendasi) {
          try {
            const parsed = JSON.parse(lkpdData.solusi_rekomendasi);
            setSolusiAdil(parsed.solusi || "");
            setAturanEtis(parsed.aturan || "");
            setRefleksiDiri(parsed.refleksi || "");
            if (parsed.evaluasi_ai) setEvaluasiAi(parsed.evaluasi_ai);
            lastSavedSolusiRef.current = { solusi: parsed.solusi || "", aturan: parsed.aturan || "", refleksi: parsed.refleksi || "" };

            if (parsed.timer_start) {
              timerStartRef.current = parsed.timer_start;
              const timerStorageKey = `hakita_timer_${targetKode}_kelompok_${num}`;
              localStorage.setItem(timerStorageKey, parsed.timer_start.toString());
            }

            if (parsed.anggota_detail) {
              setAnggotaInterregator(parsed.anggota_detail.interregator || "");
              setAnggotaPencatat1(parsed.anggota_detail.pencatat1 || "");
              setAnggotaPencatat2(parsed.anggota_detail.pencatat2 || "");
              setAnggotaAnalis1(parsed.anggota_detail.analis1 || "");
              setAnggotaAnalis2(parsed.anggota_detail.analis2 || "");
              setAnggotaJuruBicara(parsed.anggota_detail.jurubicara || "");
              if (parsed.anggota_detail.interregator) sudahAdaIdentitas = true;
            } else if (parsed.nama_anggota) {
              const parsedRoles = parseNamaAnggotaString(parsed.nama_anggota);
              setAnggotaInterregator(parsedRoles.interregator);
              setAnggotaPencatat1(parsedRoles.pencatat1);
              setAnggotaPencatat2(parsedRoles.pencatat2);
              setAnggotaAnalis1(parsedRoles.analis1);
              setAnggotaAnalis2(parsedRoles.analis2);
              setAnggotaJuruBicara(parsedRoles.jurubicara);
              if (parsedRoles.interregator || parsed.nama_anggota.length > 5) sudahAdaIdentitas = true;
            }
          } catch {
            setSolusiAdil(lkpdData.solusi_rekomendasi);
          }
        }

        if (typeof lkpdData.is_submitted === "boolean") {
          setIsSubmitted(lkpdData.is_submitted);
          if (lkpdData.is_submitted) sudahAdaIdentitas = true;
        }

        // Jika identitas sudah didaftarkan oleh laptop/perangkat lain, langsung buka room!
        if (sudahAdaIdentitas) {
          setIsIdentitasLengkap(true);
          setRoomToast(`🎉 Terhubung ke Room Kelompok ${num}! Kolaborasi aktif.`);
          setTimeout(() => setRoomToast(null), 4000);
        }
      }

      // 2. Muat Chat History yang sudah ada dari database
      const { data: chatData } = await supabase
        .from("chat_history")
        .select("role, content")
        .eq("kelompok", num)
        .eq("kelas", targetKelas)
        .order("created_at", { ascending: true });

      if (chatData && chatData.length > 0) {
        setPesan(chatData.map(c => ({ role: c.role, content: c.content })));
      } else {
        setPesan([]);
      }
    } catch (err) {
      console.error("Gagal menghubungkan ke room kelompok:", err);
    } finally {
      setIsJoiningRoom(false);
    }
  };

  // Auto-restore sesi kelas & kelompok jika halaman di-refresh (F5) oleh siswa
  useEffect(() => {
    try {
      // 1. Cek apakah ada notifikasi sesi berakhir karena waktu habis saat di-refresh
      const expiredMsg = sessionStorage.getItem("hakita_expired_message");
      if (expiredMsg) {
        setSesiHabisAlert(expiredMsg);
        sessionStorage.removeItem("hakita_expired_message");
        try {
          localStorage.removeItem(STORAGE_KEY_SESSION);
        } catch {}
        return; // Sesi diakhiri, siswa tetap berada di halaman awal
      }

      const saved = localStorage.getItem(STORAGE_KEY_SESSION);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.kodeKelas && parsed.namaKelas) {
          // 2. Cek apakah batas waktu investigasi kelompok ini telah habis saat ditinggalkan/di-refresh
          if (parsed.kelompok) {
            const timerStorageKey = `hakita_timer_${parsed.kodeKelas}_kelompok_${parsed.kelompok}`;
            const storedStart = localStorage.getItem(timerStorageKey);
            if (storedStart) {
              const startTime = parseInt(storedStart, 10);
              const durasi = parsed.durasiMenit || 30;
              const totalDetik = durasi * 60;
              const elapsed = Math.floor((Date.now() - startTime) / 1000);
              if (elapsed >= totalDetik) {
                // Waktu telah habis! Otomatis akhiri sesi investigasi
                localStorage.removeItem(STORAGE_KEY_SESSION);
                setSesiHabisAlert(
                  `Sesi investigasi untuk Kelas ${parsed.namaKelas} (Kelompok ${parsed.kelompok}) telah berakhir karena batas waktu (${durasi} menit) telah habis. Seluruh catatan Anda telah tersimpan aman di dashboard guru.`
                );
                return;
              }
            }
          }

          setKodeKelasAktif(parsed.kodeKelas);
          setNamaKelas(parsed.namaKelas);
          setKodeKelasInput(parsed.kodeKelas);
          if (parsed.durasiMenit) {
            setDurasiMenit(parsed.durasiMenit);
            setSisaDetik(parsed.durasiMenit * 60);
          }

          // Cek room kelompok mana saja yang sudah aktif untuk kelas ini
          if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("url_proyek_supabase_anda")) {
            supabase
              .from("lkpd_reports")
              .select("kelompok")
              .eq("kelas", parsed.namaKelas)
              .then(({ data }) => {
                if (data && data.length > 0) {
                  setActiveGroups(data.map(r => r.kelompok));
                }
              });
          }

          // Jika kelompok sebelumnya sudah dipilih, otomatis masuk kembali ke kelompok tsb
          if (parsed.kelompok && typeof parsed.kelompok === "number") {
            handlePilihKelompok(parsed.kelompok, parsed.namaKelas, parsed.kodeKelas);
          }
        }
      }
    } catch (err) {
      console.error("Gagal memulihkan sesi investigasi:", err);
    }
  }, []);

  // MULTI-DEVICE: Inisialisasi Room saat Perangkat Pertama Mendaftarkan Anggota
  const handleMulaiInvestigasi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!anggotaInterregator.trim()) return;

    const now = Date.now();
    if (!timerStartRef.current) {
      timerStartRef.current = now;
      const timerStorageKey = `hakita_timer_${kodeKelasAktif}_kelompok_${kelompokAktif}`;
      localStorage.setItem(timerStorageKey, now.toString());
    }

    setIsIdentitasLengkap(true);

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("url_proyek_supabase_anda")) {
      try {
        const payloadBukti = JSON.stringify({ p1: petunjuk1, p2: petunjuk2, p3: petunjuk3 });
        const payloadAnalisis = JSON.stringify({ tindakan: analisisTindakan, jenis: jenisHaki, kerugian: analisisKerugian });
        const payloadSolusi = JSON.stringify({
          solusi: solusiAdil,
          aturan: aturanEtis,
          refleksi: refleksiDiri,
          nama_anggota: getGabunganNamaAnggota(),
          anggota_detail: {
            interregator: anggotaInterregator,
            pencatat1: anggotaPencatat1,
            pencatat2: anggotaPencatat2,
            analis1: anggotaAnalis1,
            analis2: anggotaAnalis2,
            jurubicara: anggotaJuruBicara,
          },
          timer_start: timerStartRef.current,
        });

        const { data: existing } = await supabase
          .from("lkpd_reports")
          .select("id")
          .eq("kelompok", kelompokAktif)
          .eq("kelas", namaKelas)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("lkpd_reports")
            .update({
              kasus_id: kasusAktif.id,
              solusi_rekomendasi: payloadSolusi,
              updated_at: new Date().toISOString()
            })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("lkpd_reports")
            .insert({
              kelompok: kelompokAktif,
              kelas: namaKelas,
              kasus_id: kasusAktif.id,
              bukti_petunjuk: payloadBukti,
              analisis_pelanggaran: payloadAnalisis,
              solusi_rekomendasi: payloadSolusi,
              is_submitted: false
            });
        }
      } catch (err) {
        console.error("Gagal inisialisasi room kelompok:", err);
      }
    }
  };

  // MULTI-DEVICE: Granular Non-destructive Savers (Masing-masing bagian tersimpan mandiri)
  const simpanBukti = async (p1: string, p2: string, p3: string) => {
    if (!kelompokAktif || !namaKelas) return;
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("url_proyek_supabase_anda")) {
      lastSavedBuktiRef.current = { p1, p2, p3 };
      setSaveStatus("saved");
      return;
    }

    try {
      const payloadBukti = JSON.stringify({ p1, p2, p3 });
      const { error } = await supabase
        .from("lkpd_reports")
        .update({
          bukti_petunjuk: payloadBukti,
          updated_at: new Date().toISOString()
        })
        .eq("kelompok", kelompokAktif)
        .eq("kelas", namaKelas);

      if (error) throw error;
      lastSavedBuktiRef.current = { p1, p2, p3 };
      setSaveStatus("saved");
    } catch (err) {
      console.error("Gagal simpan bukti:", err);
      setSaveStatus("error");
    }
  };

  const simpanAnalisis = async (tindakan: string, jenis: string, kerugian: string) => {
    if (!kelompokAktif || !namaKelas) return;
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("url_proyek_supabase_anda")) {
      lastSavedAnalisisRef.current = { tindakan, jenis, kerugian };
      setSaveStatus("saved");
      return;
    }

    try {
      const payloadAnalisis = JSON.stringify({ tindakan, jenis, kerugian });
      const { error } = await supabase
        .from("lkpd_reports")
        .update({
          analisis_pelanggaran: payloadAnalisis,
          updated_at: new Date().toISOString()
        })
        .eq("kelompok", kelompokAktif)
        .eq("kelas", namaKelas);

      if (error) throw error;
      lastSavedAnalisisRef.current = { tindakan, jenis, kerugian };
      setSaveStatus("saved");
    } catch (err) {
      console.error("Gagal simpan analisis:", err);
      setSaveStatus("error");
    }
  };

  const simpanSolusi = async (solusi: string, aturan: string, refleksi: string) => {
    if (!kelompokAktif || !namaKelas) return;
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("url_proyek_supabase_anda")) {
      lastSavedSolusiRef.current = { solusi, aturan, refleksi };
      setSaveStatus("saved");
      return;
    }

    try {
      const payloadSolusi = JSON.stringify({
        solusi,
        aturan,
        refleksi,
        nama_anggota: getGabunganNamaAnggota(),
        anggota_detail: {
          interregator: anggotaInterregatorRef.current,
          pencatat1: anggotaPencatat1Ref.current,
          pencatat2: anggotaPencatat2Ref.current,
          analis1: anggotaAnalis1Ref.current,
          analis2: anggotaAnalis2Ref.current,
          jurubicara: anggotaJuruBicaraRef.current,
        },
        timer_start: timerStartRef.current,
        ...(evaluasiAiRef.current ? { evaluasi_ai: evaluasiAiRef.current } : {})
      });

      const { error } = await supabase
        .from("lkpd_reports")
        .update({
          solusi_rekomendasi: payloadSolusi,
          updated_at: new Date().toISOString()
        })
        .eq("kelompok", kelompokAktif)
        .eq("kelas", namaKelas);

      if (error) throw error;
      lastSavedSolusiRef.current = { solusi, aturan, refleksi };
      setSaveStatus("saved");
    } catch (err) {
      console.error("Gagal simpan solusi:", err);
      setSaveStatus("error");
    }
  };

  // Simpan Master (Dipanggil saat Final Submit)
  const simpanKeDatabase = async (submitted: boolean = isSubmitted) => {
    if (!kelompokAktif || !namaKelas) return;
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("url_proyek_supabase_anda")) {
      setSaveStatus("saved");
      return;
    }

    setSaveStatus("saving");

    const payloadBukti = JSON.stringify({
      p1: petunjuk1,
      p2: petunjuk2,
      p3: petunjuk3
    });

    const payloadAnalisis = JSON.stringify({
      tindakan: analisisTindakan,
      jenis: jenisHaki,
      kerugian: analisisKerugian
    });

    const payloadSolusi = JSON.stringify({
      solusi: solusiAdil,
      aturan: aturanEtis,
      refleksi: refleksiDiri,
      nama_anggota: getGabunganNamaAnggota(),
      anggota_detail: {
        interregator: anggotaInterregatorRef.current,
        pencatat1: anggotaPencatat1Ref.current,
        pencatat2: anggotaPencatat2Ref.current,
        analis1: anggotaAnalis1Ref.current,
        analis2: anggotaAnalis2Ref.current,
        jurubicara: anggotaJuruBicaraRef.current,
      },
      timer_start: timerStartRef.current,
      ...(evaluasiAiRef.current ? { evaluasi_ai: evaluasiAiRef.current } : {})
    });

    try {
      const { data: existing } = await supabase
        .from("lkpd_reports")
        .select("id")
        .eq("kelompok", kelompokAktif)
        .eq("kelas", namaKelas)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("lkpd_reports")
          .update({
            bukti_petunjuk: payloadBukti,
            analisis_pelanggaran: payloadAnalisis,
            solusi_rekomendasi: payloadSolusi,
            is_submitted: submitted,
            kasus_id: kasusAktif.id,
            updated_at: new Date().toISOString()
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("lkpd_reports")
          .insert({
            kelompok: kelompokAktif,
            kelas: namaKelas,
            kasus_id: kasusAktif.id,
            bukti_petunjuk: payloadBukti,
            analisis_pelanggaran: payloadAnalisis,
            solusi_rekomendasi: payloadSolusi,
            is_submitted: submitted
          });

        if (error) throw error;
      }

      lastSavedBuktiRef.current = { p1: petunjuk1, p2: petunjuk2, p3: petunjuk3 };
      lastSavedAnalisisRef.current = { tindakan: analisisTindakan, jenis: jenisHaki, kerugian: analisisKerugian };
      lastSavedSolusiRef.current = { solusi: solusiAdil, aturan: aturanEtis, refleksi: refleksiDiri };
      setSaveStatus("saved");
    } catch (err) {
      console.error("Gagal simpan LKPD:", err);
      setSaveStatus("error");
    }
  };

  // MULTI-DEVICE: Granular Debounce Auto-Saves (Hanya simpan bagian yang berubah secara lokal)
  // 1. Debounce Bagian II (Bukti)
  useEffect(() => {
    if (!isIdentitasLengkap || !kelompokAktif || !namaKelas) return;
    if (
      petunjuk1 === lastSavedBuktiRef.current.p1 &&
      petunjuk2 === lastSavedBuktiRef.current.p2 &&
      petunjuk3 === lastSavedBuktiRef.current.p3
    ) {
      return;
    }

    setSaveStatus("saving");
    const timer = setTimeout(() => {
      simpanBukti(petunjuk1, petunjuk2, petunjuk3);
    }, 1000);

    return () => clearTimeout(timer);
  }, [petunjuk1, petunjuk2, petunjuk3, isIdentitasLengkap, kelompokAktif, namaKelas]);

  // 2. Debounce Bagian III (Analisis)
  useEffect(() => {
    if (!isIdentitasLengkap || !kelompokAktif || !namaKelas) return;
    if (
      analisisTindakan === lastSavedAnalisisRef.current.tindakan &&
      jenisHaki === lastSavedAnalisisRef.current.jenis &&
      analisisKerugian === lastSavedAnalisisRef.current.kerugian
    ) {
      return;
    }

    setSaveStatus("saving");
    const timer = setTimeout(() => {
      simpanAnalisis(analisisTindakan, jenisHaki, analisisKerugian);
    }, 1000);

    return () => clearTimeout(timer);
  }, [analisisTindakan, jenisHaki, analisisKerugian, isIdentitasLengkap, kelompokAktif, namaKelas]);

  // 3. Debounce Bagian IV & V (Solusi & Refleksi)
  useEffect(() => {
    if (!isIdentitasLengkap || !kelompokAktif || !namaKelas) return;
    if (
      solusiAdil === lastSavedSolusiRef.current.solusi &&
      aturanEtis === lastSavedSolusiRef.current.aturan &&
      refleksiDiri === lastSavedSolusiRef.current.refleksi
    ) {
      return;
    }

    setSaveStatus("saving");
    const timer = setTimeout(() => {
      simpanSolusi(solusiAdil, aturanEtis, refleksiDiri);
    }, 1000);

    return () => clearTimeout(timer);
  }, [solusiAdil, aturanEtis, refleksiDiri, isIdentitasLengkap, kelompokAktif, namaKelas]);

  // MULTI-DEVICE: Hybrid Realtime + Polling Fallback Subscription
  // Menjamin 100% sinkronisasi di jaringan sekolah yang memblokir WebSocket
  useEffect(() => {
    if (!isIdentitasLengkap || !kodeKelasAktif || !kelompokAktif || !namaKelas) return;

    const isSupabaseConfigured = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && 
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("url_proyek_supabase_anda")
    );
    if (!isSupabaseConfigured) return;

    // 1. Setup Supabase Realtime Channel
    const channelName = `room_${namaKelas}_kel_${kelompokAktif}_${Date.now()}`;
    const channel = supabase.channel(channelName);

    channel
      // Listener pembaruan isi LKPD dari anggota tim lain
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "lkpd_reports",
          filter: `kelompok=eq.${kelompokAktif}`
        },
        (payload) => {
          const updated = payload.new as any;
          if (updated && updated.kelas === namaKelas) {
            handleRemoteLkpdUpdate(updated);
          }
        }
      )
      // Listener chat interogasi baru dari laptop interregator
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_history",
          filter: `kelompok=eq.${kelompokAktif}`
        },
        (payload) => {
          const newMsg = payload.new as any;
          if (newMsg && newMsg.kelas === namaKelas) {
            setPesan((prev) => {
              // Hindari duplikasi jika pesan sudah ada
              const exists = prev.some(
                (p, idx) => idx >= prev.length - 2 && p.role === newMsg.role && p.content === newMsg.content
              );
              if (exists) return prev;
              return [...prev, { role: newMsg.role, content: newMsg.content }];
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsRealtimeConnected(true);
        }
      });

    // 2. Setup Smart Polling Fallback (setiap 3 detik)
    const pollInterval = setInterval(async () => {
      try {
        // Poll LKPD changes
        const { data: lkpdData } = await supabase
          .from("lkpd_reports")
          .select("bukti_petunjuk, analisis_pelanggaran, solusi_rekomendasi, is_submitted")
          .eq("kelompok", kelompokAktif)
          .eq("kelas", namaKelas)
          .maybeSingle();

        if (lkpdData) {
          handleRemoteLkpdUpdate(lkpdData);
        }

        // Poll Chat changes (hanya jika AI saksi sedang tidak mengetik secara streaming di perangkat lokal)
        if (!isLoadingRef.current) {
          const { data: chatData } = await supabase
            .from("chat_history")
            .select("role, content")
            .eq("kelompok", kelompokAktif)
            .eq("kelas", namaKelas)
            .order("created_at", { ascending: true });

          if (chatData && chatData.length > 0) {
            setPesan((prev) => {
              if (prev.length !== chatData.length) {
                return chatData.map((c) => ({ role: c.role, content: c.content }));
              }
              return prev;
            });
          }
        }
      } catch (err) {
        console.warn("Polling fallback notice:", err);
      }
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [isIdentitasLengkap, kodeKelasAktif, kelompokAktif, namaKelas]);

  // Submit Final
  const handleFinalSubmit = async () => {
    const konfirmasi = window.confirm(
      "Apakah Anda yakin ingin MENGIRIM FINAL Berkas Investigasi LKPD ini?\nGuru Anda akan langsung menerima laporan akhir kelompok Anda."
    );
    if (!konfirmasi) return;

    setIsSubmitted(true);
    await simpanKeDatabase(true);
    alert("🎉 Berkas Investigasi Tim Detektif berhasil dikirim ke Guru!");
  };

  // Kirim Pesan Interogasi Chat ke AI
  const kirimPesan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUser.trim() || isLoading) return;

    const userText = inputUser.trim();
    const pesanBaru = { role: "user", content: userText };
    const riwayatBaru = [...pesan, pesanBaru];
    setPesan(riwayatBaru);
    setInputUser("");
    setIsLoading(true);

    // Simpan pesan siswa ke Supabase chat_history jika terhubung
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("url_proyek_supabase_anda")) {
      supabase.from("chat_history").insert({
        kelompok: kelompokAktif,
        kelas: namaKelas,
        nama_anggota: getGabunganNamaAnggota(),
        kasus_id: kasusAktif.id,
        role: "user",
        content: userText
      }).then();
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pesan: riwayatBaru,
          messages: riwayatBaru,
          kasus: kasusAktif,
          kelompok: kelompokAktif,
          kelas: namaKelas,
          namaAnggota: getGabunganNamaAnggota()
        })
      });

      if (!response.body) throw new Error("Tidak ada respon body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantResponse = "";

      setPesan(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        assistantResponse += text;

        setPesan(prev => {
          const update = [...prev];
          update[update.length - 1].content = assistantResponse;
          return update;
        });
      }

      // Simpan respons asisten AI ke Supabase chat_history jika selesai
      if (assistantResponse && process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("url_proyek_supabase_anda")) {
        supabase.from("chat_history").insert({
          kelompok: kelompokAktif,
          kelas: namaKelas,
          nama_anggota: getGabunganNamaAnggota(),
          kasus_id: kasusAktif.id,
          role: "assistant",
          content: assistantResponse
        }).then();
      }
    } catch (err) {
      console.error(err);
      setPesan(prev => [...prev, { role: "assistant", content: "Koneksi ke Saksi Mata Digital terputus. Silakan coba ajukan pertanyaan lagi." }]);
    } finally {
      setIsLoading(false);
    }
  };

  // TAHAP 1: INPUT KODE KELAS
  if (!kodeKelasAktif) {
    return (
      <div className={`min-h-screen ${currentTheme.pageBg} flex flex-col items-center justify-center p-4 sm:p-6 ${currentTheme.textColor} relative overflow-hidden transition-colors duration-300`}>
        {/* Background Ambient Orbs */}
        <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 ${currentTheme.orb1} rounded-full blur-3xl pointer-events-none`}></div>
        <div className={`absolute -bottom-10 -right-10 w-80 h-80 ${currentTheme.orb2} rounded-full blur-3xl pointer-events-none`}></div>

        {/* Top Controls: Kembali & Theme Switcher */}
        <div className="absolute top-6 left-6 right-6 md:top-8 md:left-8 md:right-8 flex items-center justify-between z-20">
          <button 
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-2 opacity-75 hover:opacity-100 transition-opacity text-xs sm:text-sm font-bold"
          >
            <span>←</span> Kembali ke Beranda
          </button>
          <ThemeSwitcher currentTheme={tema} onThemeChange={handleGantiTema} />
        </div>

        <div className={`${currentTheme.cardBg} p-6 sm:p-8 rounded-3xl shadow-2xl border ${currentTheme.cardBorder} max-w-md w-full text-center relative z-10 mt-14 sm:mt-0 transition-all`}>
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 relative">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain drop-shadow-xl" />
            <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-cyan-400 animate-ping"></span>
          </div>
          
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 border text-[11px] font-bold rounded-full mb-3 ${
            currentTheme.isLight 
              ? "bg-blue-100 border-blue-300 text-blue-800" 
              : currentTheme.id === "arcade"
              ? "bg-fuchsia-950/60 border-fuchsia-500/40 text-pink-300"
              : "bg-blue-500/15 border-blue-500/30 text-cyan-300"
          }`}>
            <span>🕵️‍♂️</span> Portal Investigasi Siswa
          </div>

          <h1 className={`text-2xl sm:text-3xl font-black mb-2 ${currentTheme.cardTitle}`}>
            DETEKTIF HAKI
          </h1>
          <p className={`${currentTheme.cardSubtext} text-xs sm:text-sm mb-6 leading-relaxed`}>
            Masukkan Kode Akses Kelas yang dibagikan oleh Guru Anda untuk membuka ruang investigasi digital kelompok.
          </p>

          {sesiHabisAlert && (
            <div className="mb-5 p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-300 text-xs text-left animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-start gap-2.5">
                <span className="text-2xl shrink-0">⏰</span>
                <div>
                  <h4 className="font-bold text-amber-400 text-sm mb-1">Sesi Investigasi Telah Berakhir</h4>
                  <p className="text-amber-200/90 leading-relaxed">{sesiHabisAlert}</p>
                  <p className="text-[11px] text-amber-400/80 mt-2 font-medium">
                    Semua progres dan berkas jawaban LKPD telah tersimpan di dashboard guru. Hubungi guru Anda jika sesi kelas diperpanjang.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleVerifikasiKelas} className="space-y-4 text-left">
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${currentTheme.isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                <span>🎓</span> Kode Akses Kelas
              </label>
              <input
                type="text"
                required
                value={kodeKelasInput}
                onChange={(e) => {
                  setKodeKelasInput(e.target.value);
                  if (errorKelas) setErrorKelas("");
                }}
                placeholder="Contoh: HAKI-9A"
                className={`w-full ${currentTheme.inputBg} border rounded-2xl px-4 py-3.5 ${currentTheme.inputText} font-mono uppercase tracking-widest text-center text-lg font-bold focus:outline-none transition-all ${
                  errorKelas 
                    ? "border-red-500 bg-red-950/20 focus:ring-2 focus:ring-red-500" 
                    : currentTheme.inputBorder
                }`}
              />
              {errorKelas && (
                <p className="text-red-400 text-xs mt-2 font-medium flex items-center gap-1">
                  <span>⚠️</span> {errorKelas}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isValidatingKelas || !kodeKelasInput.trim()}
              className={`w-full ${currentTheme.primaryBtn} disabled:opacity-50 font-black py-3.5 px-4 rounded-2xl transition-all shadow-lg active:scale-95 text-sm flex items-center justify-center gap-2 cursor-pointer`}
            >
              {isValidatingKelas ? "Memverifikasi..." : "Lanjut ke Pemilihan Kelompok →"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // TAHAP 2: PEMILIHAN KELOMPOK (DENGAN INDIKATOR MULTI-DEVICE ROOM AKTIF)
  if (!kelompokAktif) {
    return (
      <div className={`min-h-screen ${currentTheme.pageBg} flex flex-col items-center justify-center p-4 sm:p-6 ${currentTheme.textColor} relative overflow-hidden transition-colors duration-300`}>
        {/* Background Ambient Orbs */}
        <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] ${currentTheme.orb1} rounded-full blur-3xl pointer-events-none`}></div>
        <div className={`absolute -bottom-10 -left-10 w-80 h-80 ${currentTheme.orb2} rounded-full blur-3xl pointer-events-none`}></div>

        {/* Top Controls */}
        <div className="absolute top-6 left-6 right-6 md:top-8 md:left-8 md:right-8 flex items-center justify-between z-20">
          <button 
            onClick={() => {
              setKodeKelasAktif(null);
              setNamaKelas("");
              setKodeKelasInput("");
              setActiveGroups([]);
              setKelompokAktif(null);
              setIsIdentitasLengkap(false);
              try {
                localStorage.removeItem(STORAGE_KEY_SESSION);
              } catch {}
            }}
            className="flex items-center gap-2 opacity-75 hover:opacity-100 transition-opacity text-xs sm:text-sm font-bold"
          >
            <span>←</span> Ganti Kelas
          </button>
          <ThemeSwitcher currentTheme={tema} onThemeChange={handleGantiTema} />
        </div>

        <div className="text-center mb-8 mt-16 md:mt-0 z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-emerald-500/20 border border-blue-500/30 text-blue-400 text-xs font-bold rounded-full mb-3 uppercase tracking-wider shadow-inner">
            <span>Sesi Kelas: {namaKelas} ({kodeKelasAktif})</span>
            <span>•</span>
            <span className="text-amber-500 font-extrabold flex items-center gap-1">
              <span>⏱️</span> {durasiMenit} Menit
            </span>
          </div>
          <h1 className={`text-3xl md:text-5xl font-black mb-2 ${currentTheme.cardTitle}`}>
            Identifikasi Tim Detektif
          </h1>
          <p className={`${currentTheme.cardSubtext} text-xs sm:text-sm md:text-base max-w-md mx-auto leading-relaxed`}>
            Pilih nomor kelompok Anda. Jika rekan tim sudah membuka room di laptop/HP, Anda akan otomatis bergabung ke room yang sama!
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 max-w-3xl w-full z-10">
          {[1, 2, 3, 4, 5, 6].map((num) => {
            const isRoomActive = activeGroups.includes(num);
            return (
              <button 
                key={num}
                onClick={() => handlePilihKelompok(num)}
                disabled={isJoiningRoom}
                className={`relative py-6 sm:py-7 px-4 sm:px-5 rounded-3xl shadow-xl transition-all duration-300 flex flex-col items-center gap-2 group cursor-pointer border ${
                  isRoomActive
                    ? "bg-gradient-to-b from-emerald-500/15 to-teal-500/25 border-emerald-500/50 hover:border-emerald-400 shadow-emerald-500/10 ring-1 ring-emerald-500/30"
                    : `${currentTheme.cardBg} ${currentTheme.cardBorder} hover:border-cyan-400`
                } hover:-translate-y-2 active:scale-95 disabled:opacity-50`}
              >
                {isRoomActive && (
                  <span className="absolute top-3 right-3 px-2 py-0.5 bg-emerald-500/20 text-emerald-500 border border-emerald-500/40 text-[10px] font-bold rounded-full flex items-center gap-1 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Room Aktif
                  </span>
                )}
                <span className="text-4xl drop-shadow-md group-hover:scale-110 transition-transform">
                  {num === 1 ? "🕵️‍♂️" : num === 2 ? "🎧" : num === 3 ? "💻" : num === 4 ? "🎨" : num === 5 ? "📸" : "📱"}
                </span>
                <span className={`text-lg md:text-xl font-black ${currentTheme.isLight ? 'text-slate-900' : 'text-white'}`}>Kelompok {num}</span>
                <span className={`text-[11px] font-medium ${currentTheme.cardSubtext} text-center`}>
                  {isRoomActive ? "Rekan tim di dalam → Gabung" : "Klik untuk buka room"}
                </span>
              </button>
            );
          })}
        </div>

        {isJoiningRoom && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl flex items-center gap-3 shadow-2xl">
              <span className="w-5 h-5 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin"></span>
              <span className="text-sm font-bold text-white">Menghubungkan ke Room Kelompok...</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // TAHAP 3: REGISTRASI TIM (BAGIAN I: IDENTITAS & PERAN ANGGOTA - JIKA BELUM DIDAFTARKAN DEVICE PERTAMA)
  if (kelompokAktif && !isIdentitasLengkap) {
    return (
      <div className={`min-h-screen ${currentTheme.pageBg} flex flex-col items-center justify-center p-4 sm:p-6 ${currentTheme.textColor} relative overflow-hidden transition-colors duration-300`}>
        {/* Background Ambient Orbs */}
        <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 ${currentTheme.orb1} rounded-full blur-3xl pointer-events-none`}></div>

        {/* Top Controls */}
        <div className="absolute top-6 left-6 right-6 md:top-8 md:left-8 md:right-8 flex items-center justify-between z-20">
          <button 
            onClick={() => {
              setKelompokAktif(null);
              try {
                const sess = localStorage.getItem(STORAGE_KEY_SESSION);
                if (sess) {
                  const parsed = JSON.parse(sess);
                  parsed.kelompok = null;
                  localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(parsed));
                }
              } catch {}
            }}
            className="flex items-center gap-2 opacity-75 hover:opacity-100 transition-opacity text-xs sm:text-sm font-bold"
          >
            <span>←</span> Kembali Pilih Kelompok
          </button>
          <ThemeSwitcher currentTheme={tema} onThemeChange={handleGantiTema} />
        </div>

        <div className={`${currentTheme.cardBg} p-6 sm:p-8 rounded-3xl shadow-2xl border ${currentTheme.cardBorder} max-w-lg w-full max-h-[90vh] overflow-y-auto [scrollbar-width:thin] relative z-10 mt-14 sm:mt-0 transition-all`}>
          <div className="text-center mb-5">
            <div className={`inline-flex items-center gap-2 px-3 py-1 border text-xs font-bold rounded-full mb-2 uppercase tracking-wider ${
              currentTheme.isLight
                ? "bg-blue-100 border-blue-300 text-blue-800"
                : "bg-blue-500/15 border-blue-500/30 text-blue-300"
            }`}>
              <span>Kelas {namaKelas} • Kelompok {kelompokAktif}</span>
              <span>•</span>
              <span className="text-amber-500 flex items-center gap-1 font-bold">
                <span>⏱️</span> {durasiMenit} Menit
              </span>
            </div>
            <div className="text-4xl mb-1.5">👥</div>
            <h2 className={`text-xl md:text-2xl font-black mb-1 ${currentTheme.isLight ? 'text-slate-900' : 'text-white'}`}>BAGIAN I: IDENTITAS TIM DETEKTIF</h2>
            <p className={`${currentTheme.cardSubtext} text-xs`}>Masukkan nama anggota tim sesuai peran detektif masing-masing.</p>
          </div>

          {/* Card Studi Kasus (Stukas) Kelompok */}
          <div className={`mb-4 p-4 ${currentTheme.stukasBoxBg} border-2 ${currentTheme.stukasBoxBorder} rounded-2xl shadow-xl relative overflow-hidden transition-all`}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 border text-[10px] font-bold rounded-full uppercase tracking-wider ${currentTheme.stukasBadge}`}>
                <span>📁</span> Studi Kasus (Stukas) Kelompok #{kasusAktif.id}
              </span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                currentTheme.isLight ? "bg-blue-100 text-blue-800 border-blue-200" : "bg-cyan-950/60 text-cyan-400 border-cyan-500/30"
              }`}>
                Fokus Kasus
              </span>
            </div>
            <h3 className={`text-sm sm:text-base font-black mb-2 flex items-center gap-1.5 ${currentTheme.stukasTitleText}`}>
              <span>🔎</span> {kasusAktif.judul}
            </h3>
            <p className={`text-xs sm:text-sm leading-relaxed p-3 rounded-xl border ${currentTheme.stukasDescBg} ${currentTheme.stukasDescText} ${currentTheme.cardBorder}`}>
              {kasusAktif.deskripsi}
            </p>
          </div>

          {/* Banner Tips Multi-Device */}
          <div className={`mb-4 p-3.5 rounded-2xl text-[11px] flex items-start gap-2 shadow-inner border ${
            currentTheme.isLight
              ? "bg-blue-50 border-blue-200 text-blue-900"
              : "bg-blue-950/50 border-blue-500/30 text-blue-200"
          }`}>
            <span className="text-base shrink-0">💡</span>
            <span>
              <strong>Tips Multi-Device:</strong> Cukup 1 siswa di laptop mendaftarkan nama tim ini. Perangkat rekan tim lain (HP Pencatat & HP Analis) akan otomatis terhubung ke room ini!
            </span>
          </div>
          
          <form onSubmit={handleMulaiInvestigasi} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-blue-500 mb-1 flex items-center gap-1.5">
                <span>💻</span> 1. Anggota 1 (Interregator Chat AI) <span className="text-red-400">*</span>
              </label>
              <input 
                type="text"
                required
                value={anggotaInterregator}
                onChange={(e) => setAnggotaInterregator(e.target.value)}
                placeholder="Nama siswa yang bertugas interogasi saksi AI di laptop"
                className={`w-full ${currentTheme.inputBg} border ${currentTheme.inputBorder} rounded-xl px-3.5 py-2.5 ${currentTheme.inputText} text-xs md:text-sm focus:outline-none transition-all`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-emerald-500 mb-1 flex items-center gap-1.5">
                <span>🔍</span> 2. Anggota 2 (Pencatat Bukti 1)
              </label>
              <input 
                type="text"
                value={anggotaPencatat1}
                onChange={(e) => setAnggotaPencatat1(e.target.value)}
                placeholder="Nama siswa pencatat petunjuk kunci 1 (di HP/Laptop)"
                className={`w-full ${currentTheme.inputBg} border ${currentTheme.inputBorder} rounded-xl px-3.5 py-2.5 ${currentTheme.inputText} text-xs md:text-sm focus:outline-none transition-all`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-teal-500 mb-1 flex items-center gap-1.5">
                <span>🔍</span> 3. Anggota 3 (Pencatat Bukti 2)
              </label>
              <input 
                type="text"
                value={anggotaPencatat2}
                onChange={(e) => setAnggotaPencatat2(e.target.value)}
                placeholder="Nama siswa pencatat petunjuk kunci 2"
                className={`w-full ${currentTheme.inputBg} border ${currentTheme.inputBorder} rounded-xl px-3.5 py-2.5 ${currentTheme.inputText} text-xs md:text-sm focus:outline-none transition-all`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-purple-500 mb-1 flex items-center gap-1.5">
                <span>⚖️</span> 4. Anggota 4 (Analis HAKI 1)
              </label>
              <input 
                type="text"
                value={anggotaAnalis1}
                onChange={(e) => setAnggotaAnalis1(e.target.value)}
                placeholder="Nama siswa analis pelanggaran hukum/etika 1 (di HP/Laptop)"
                className={`w-full ${currentTheme.inputBg} border ${currentTheme.inputBorder} rounded-xl px-3.5 py-2.5 ${currentTheme.inputText} text-xs md:text-sm focus:outline-none transition-all`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-indigo-500 mb-1 flex items-center gap-1.5">
                <span>⚖️</span> 5. Anggota 5 (Analis HAKI 2)
              </label>
              <input 
                type="text"
                value={anggotaAnalis2}
                onChange={(e) => setAnggotaAnalis2(e.target.value)}
                placeholder="Nama siswa analis pelanggaran hukum/etika 2"
                className={`w-full ${currentTheme.inputBg} border ${currentTheme.inputBorder} rounded-xl px-3.5 py-2.5 ${currentTheme.inputText} text-xs md:text-sm focus:outline-none transition-all`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-500 mb-1 flex items-center gap-1.5">
                <span>📢</span> 6. Anggota 6 (Juru Bicara Presentasi)
              </label>
              <input 
                type="text"
                value={anggotaJuruBicara}
                onChange={(e) => setAnggotaJuruBicara(e.target.value)}
                placeholder="Nama siswa juru bicara saat presentasi kelas"
                className={`w-full ${currentTheme.inputBg} border ${currentTheme.inputBorder} rounded-xl px-3.5 py-2.5 ${currentTheme.inputText} text-xs md:text-sm focus:outline-none transition-all`}
              />
            </div>

            <button 
              type="submit" 
              className={`w-full ${currentTheme.primaryBtn} font-black py-3.5 px-4 rounded-2xl transition-all hover:-translate-y-0.5 shadow-xl active:scale-95 mt-4 text-sm flex items-center justify-center gap-2 cursor-pointer`}
            >
              <span>Mulai Investigasi & Buka Room Kolaborasi</span>
              <span>🔍</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen h-[100dvh] ${currentTheme.pageBg} ${currentTheme.textColor} overflow-hidden transition-colors duration-300`}>
      {/* Toast Notifikasi Multi-Device Room */}
      {roomToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
          <span>🟢</span>
          <span>{roomToast}</span>
        </div>
      )}

      {/* Top Navbar Responsif & Energik */}
      <header className={`h-14 ${currentTheme.navBg} border-b ${currentTheme.navBorder} px-3 sm:px-4 flex items-center justify-between shrink-0 z-20 gap-2 shadow-md`}>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="relative">
            <img src="/logo.png" alt="Logo" className="w-7 h-7 sm:w-8 sm:h-8 object-contain drop-shadow" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          </div>
          <div>
            <h1 className={`text-xs sm:text-sm font-black flex items-center gap-1.5 sm:gap-2 ${currentTheme.isLight ? 'text-slate-900' : 'text-white'}`}>
              <span className="hidden sm:inline tracking-wider">BERKAS INVESTIGASI</span>
              <span className={`px-2 py-0.5 rounded-full border font-mono font-bold text-[10px] ${currentTheme.navBadgeBg} ${currentTheme.navBadgeBorder} ${currentTheme.navBadgeText}`}>
                {namaKelas} • Kel {kelompokAktif}
              </span>
              {/* Badge Multi-Device Room */}
              <span 
                className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-[10px] font-bold rounded-full shadow-sm" 
                title={isRealtimeConnected ? "Realtime WebSocket Terhubung: Kolaborasi Multi-Device Aktif" : "Kolaborasi Multi-Device Aktif (Auto-Sync Polling)"}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Multi-Device Room
              </span>
            </h1>
          </div>
        </div>

        {/* Countdown Timer Badge Interaktif Terpusat */}
        <div 
          className={`px-2.5 sm:px-3 py-1 rounded-xl border flex items-center gap-1.5 sm:gap-2 text-xs font-mono font-bold transition-all shadow-sm shrink-0 ${
            isSubmitted
              ? "bg-gradient-to-r from-emerald-950/90 to-teal-950/90 border-emerald-500/50 text-emerald-300 shadow-emerald-500/10"
              : sisaDetik <= 0
              ? "bg-rose-950 border-rose-500 text-rose-300 animate-pulse ring-1 ring-rose-500 shadow-rose-500/20"
              : sisaDetik <= 300
              ? "bg-gradient-to-r from-amber-950/90 to-orange-950/90 border-amber-500 text-amber-300 animate-pulse shadow-md shadow-amber-500/20"
              : currentTheme.isLight
              ? "bg-indigo-50 border-indigo-200 text-indigo-900"
              : "bg-gradient-to-r from-slate-900 to-indigo-950 border-indigo-500/40 text-cyan-300"
          }`} 
          title={`Batas waktu investigasi kelas: ${durasiMenit} menit (Tersinkronisasi ke seluruh perangkat tim)`}
        >
          <span className="text-sm">
            {isSubmitted ? "✅" : sisaDetik <= 0 ? "🚨" : sisaDetik <= 300 ? "⏳" : "⏱️"}
          </span>
          <div className="flex flex-col text-left leading-none">
            <span className="text-[9px] uppercase tracking-wider opacity-70 font-sans font-medium hidden xs:inline">
              {isSubmitted ? "Terkirim" : sisaDetik <= 0 ? "Waktu Habis" : "Sisa Waktu"}
            </span>
            <span className="text-xs sm:text-sm font-black tracking-wider mt-0.5">
              {isSubmitted ? "SELESAI" : formatWaktu(sisaDetik)}
            </span>
          </div>
        </div>

        {/* Tombol Tema, Kasus & Keluar */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <ThemeSwitcher currentTheme={tema} onThemeChange={handleGantiTema} compact={true} />

          <button
            onClick={() => setShowKasusModal(true)}
            className={`text-[11px] sm:text-xs px-2.5 py-1.5 rounded-xl border flex items-center gap-1 font-bold cursor-pointer transition-all shadow-sm ${currentTheme.secondaryBtn}`}
            title="Lihat Rincian Berkas Kasus"
          >
            <span>📁</span> <span className="hidden xs:inline">Kasus #{kasusAktif.id}</span>
          </button>

          <button
            onClick={() => {
              setKelompokAktif(null);
              setIsIdentitasLengkap(false);
              try {
                const sess = localStorage.getItem(STORAGE_KEY_SESSION);
                if (sess) {
                  const parsed = JSON.parse(sess);
                  parsed.kelompok = null;
                  localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(parsed));
                }
              } catch {}
            }}
            className="text-xs opacity-75 hover:opacity-100 px-2 py-1 cursor-pointer font-medium"
            title="Ganti Kelompok"
          >
            Keluar
          </button>
        </div>
      </header>

      {/* MOBILE SEGMENTED TAB SWITCHER - 100% Terlihat Jelas & Nyaman Diklik di Layar HP */}
      <div className={`lg:hidden ${currentTheme.navBg} border-b ${currentTheme.navBorder} p-2 shrink-0 z-20 flex gap-2 shadow-md`}>
        <button
          type="button"
          onClick={() => setActiveTabMobile("chat")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTabMobile === "chat"
              ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25 ring-2 ring-cyan-400"
              : "bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/80"
          }`}
        >
          <span className="text-sm">💬</span>
          <span>Interogasi AI (Chat)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTabMobile("lembar")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${
            activeTabMobile === "lembar"
              ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-400"
              : "bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/80"
          }`}
        >
          <span className="text-sm">📝</span>
          <span>Lembar LKPD</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        </button>
      </div>

      {/* Sticky Alert Waktu Investigasi Habis */}
      {sisaDetik <= 0 && !isSubmitted && (
        <div className="bg-rose-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shrink-0 shadow-md z-10 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <span className="text-base animate-bounce">⏰</span>
            <span>Waktu Investigasi Telah Habis ({durasiMenit} Menit)! Segera periksa lembar LKPD dan kirimkan berkas final kalian.</span>
          </div>
          <button
            onClick={() => setActiveTabMobile("lembar")}
            className="px-3 py-1 bg-white text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-black shadow-sm shrink-0 cursor-pointer"
          >
            Buka LKPD & Kirim Final →
          </button>
        </div>
      )}

      {/* Main Container Dual Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* PANEL KIRI: INTEROGASI AI (CHAT) - Ideal untuk Siswa Berperan Interregator di Laptop */}
        <div className={`w-full lg:w-1/2 flex flex-col ${currentTheme.chatPanelBg} border-r ${currentTheme.chatBubbleAiBorder} h-full ${
          activeTabMobile === "chat" ? "flex" : "hidden lg:flex"
        }`}>
          {/* Chat Header Status */}
          <div className={`p-3 ${currentTheme.navBg} border-b ${currentTheme.navBorder} flex items-center justify-between text-xs shrink-0`}>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
              <span className={`font-bold ${currentTheme.isLight ? 'text-slate-800' : 'text-slate-200'}`}>Saksi Mata Digital (AI)</span>
              <span className="text-[10px] bg-blue-500/20 text-cyan-400 px-2 py-0.5 rounded-full border border-blue-500/30 hidden sm:inline font-mono font-bold">
                Laptop Interregator
              </span>
            </div>
            <span className={`text-[11px] ${currentTheme.cardSubtext}`}>Hasil chat tersinkron otomatis ke HP tim</span>
          </div>

          {/* Chat Bubble Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 [scrollbar-width:thin]">
            {pesan.length === 0 && (
              <div className={`p-6 text-center ${currentTheme.cardSubtext} max-w-md mx-auto my-auto space-y-3`}>
                <div className="text-4xl">🕵️‍♀️💬</div>
                <h3 className={`font-black text-base ${currentTheme.isLight ? 'text-slate-900' : 'text-white'}`}>Mulai Interogasi Saksi Mata Digital</h3>
                <p className="text-xs leading-relaxed">
                  Saksi ini memegang petunjuk rahasia mengenai kasus <strong>"{kasusAktif.judul}"</strong>. Tanyakan siapa pelakunya, bukti apa yang ditemukan, atau lisensi apa yang dilanggar!
                </p>
                <div className={`text-left text-xs ${currentTheme.cardInnerBg} p-3.5 rounded-2xl border ${currentTheme.cardInnerBorder} space-y-1.5 shadow-inner`}>
                  <p className="font-bold text-cyan-500 mb-1 flex items-center gap-1">
                    <span>💡</span> Contoh pertanyaan pemantik:
                  </p>
                  <p>• "Apa yang kamu lihat ketika pelaku menyebarkan karya korban?"</p>
                  <p>• "Apakah korban memiliki lisensi resmi atas karya tersebut?"</p>
                  <p>• "Mengapa tindakan pelaku dikategorikan melanggar hukum?"</p>
                </div>
              </div>
            )}

            {pesan.map((p, idx) => (
              <div key={idx} className={`flex gap-3 ${p.role === "user" ? "justify-end" : "justify-start"}`}>
                {p.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 border border-blue-400/50 flex items-center justify-center shrink-0 text-base shadow-md shadow-blue-500/20">
                    🤖
                  </div>
                )}
                <div className={`p-3.5 rounded-2xl max-w-[85%] text-xs md:text-sm leading-relaxed whitespace-pre-wrap ${
                  p.role === "user" 
                    ? `${currentTheme.chatBubbleUserBg} ${currentTheme.chatBubbleUserText} rounded-br-none shadow-md font-medium` 
                    : `${currentTheme.chatBubbleAiBg} ${currentTheme.chatBubbleAiText} border ${currentTheme.chatBubbleAiBorder} rounded-bl-none shadow-sm`
                }`}>
                  {p.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2 items-center text-slate-400 text-xs italic pl-11">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                Saksi Mata Digital sedang mengetik petunjuk...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form Chat Input */}
          <form onSubmit={kirimPesan} className={`p-3 ${currentTheme.navBg} border-t ${currentTheme.navBorder} flex gap-2 shrink-0 pb-16 lg:pb-3`}>
            <input
              type="text"
              value={inputUser}
              onChange={(e) => setInputUser(e.target.value)}
              placeholder="Ketik pertanyaan investigasi kepada saksi di sini..."
              disabled={isLoading}
              className={`flex-1 ${currentTheme.chatInputBg} border ${currentTheme.chatInputBorder} rounded-xl px-4 py-2.5 ${currentTheme.chatInputText} text-xs md:text-sm focus:outline-none disabled:opacity-50`}
            />
            <button
              type="submit"
              disabled={isLoading || !inputUser.trim()}
              className={`${currentTheme.primaryBtn} disabled:opacity-50 text-white font-black px-4 py-2.5 rounded-xl transition-all text-xs md:text-sm shrink-0 flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95`}
            >
              <span>Tanya</span> 🔍
            </button>
          </form>
        </div>

        {/* PANEL KANAN: LEMBAR INVESTIGASI (LKPD FORM) - Multi-Device Friendly dengan Quick Jump Navigation */}
        <div className={`w-full lg:w-1/2 flex flex-col ${currentTheme.lkpdPanelBg} h-full overflow-hidden ${
          activeTabMobile === "lembar" ? "flex" : "hidden lg:flex"
        }`}>
          {/* Header Lembar Investigasi & Auto Save */}
          <div className={`p-3 ${currentTheme.lkpdHeaderBg} flex items-center justify-between shrink-0`}>
            <div className="flex items-center gap-2">
              <span className="text-base">📝</span>
              <span className={`font-bold text-xs uppercase tracking-wider ${currentTheme.lkpdHeaderText}`}>
                Lembar Kerja Investigasi (LKPD)
              </span>
            </div>
            <div className="flex items-center gap-2">
              {saveStatus === "saving" && (
                <span className="text-[11px] text-amber-500 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span> Menyimpan...
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="text-[11px] text-emerald-500 flex items-center gap-1">
                  <span>✓</span> Tersimpan otomatis
                </span>
              )}
              {isSubmitted && (
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 text-[10px] font-bold rounded-full">
                  FINAL TERKIRIM
                </span>
              )}
            </div>
          </div>

          {/* Quick-Jump Navigation Bar (Memudahkan Siswa di HP Melompat Langsung ke Tugasnya) */}
          <div className={`${currentTheme.navBg} border-b ${currentTheme.navBorder} px-3 py-2 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] shrink-0`}>
            <span className={`text-[10px] ${currentTheme.cardSubtext} font-bold shrink-0 hidden sm:inline`}>Lompat Cepat:</span>
            <button 
              type="button"
              onClick={() => sectionBuktiRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 text-[10px] font-bold shrink-0 flex items-center gap-1 transition-all cursor-pointer"
            >
              <span>🔍</span> Bukti (Pencatat)
            </button>
            <button 
              type="button"
              onClick={() => sectionAnalisisRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-500 border border-purple-500/20 text-[10px] font-bold shrink-0 flex items-center gap-1 transition-all cursor-pointer"
            >
              <span>⚖️</span> Analisis UU (Analis)
            </button>
            <button 
              type="button"
              onClick={() => sectionSolusiRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 text-[10px] font-bold shrink-0 flex items-center gap-1 transition-all cursor-pointer"
            >
              <span>💡</span> Solusi & Mitigasi
            </button>
            <button 
              type="button"
              onClick={() => sectionRefleksiRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 text-[10px] font-bold shrink-0 flex items-center gap-1 transition-all cursor-pointer"
            >
              <span>💭</span> Refleksi
            </button>
          </div>

          {/* Form Konten LKPD (Scrollable) */}
          <div className={`flex-1 overflow-y-auto p-4 md:p-6 space-y-6 [scrollbar-width:thin] ${currentTheme.textColor} text-xs pb-28 lg:pb-6`}>
            
            {/* Judul Berkas */}
            <div className={`border-b ${currentTheme.cardBorder} pb-3 text-center`}>
              <h2 className={`text-base font-extrabold tracking-wide ${currentTheme.isLight ? 'text-slate-900' : 'text-white'}`}>
                BERKAS INVESTIGASI TIM DETEKTIF HAKI
              </h2>
              <p className={`text-[11px] ${currentTheme.cardSubtext} mt-0.5`}>
                Kolaborasi multi-device aktif: Setiap catatan dan analisis tersimpan otomatis tanpa saling menimpa.
              </p>
            </div>

            {/* BAGIAN I: IDENTITAS TIM DETEKTIF */}
            <div className={`${currentTheme.lkpdCardBg} border ${currentTheme.lkpdCardBorder} rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-lg`}>
              <div className="flex items-center justify-between">
                <h3 className={`font-black text-xs uppercase tracking-wider flex items-center gap-1.5 ${currentTheme.isLight ? 'text-blue-700' : 'text-cyan-300'}`}>
                  <span>🏷️</span> BAGIAN I: IDENTITAS TIM DETEKTIF
                </h3>
                <span className={`text-[10px] border px-2.5 py-0.5 rounded-full font-bold ${
                  currentTheme.isLight ? "bg-blue-100 text-blue-800 border-blue-200" : "bg-blue-500/20 text-cyan-300 border-blue-500/40"
                }`}>
                  5–6 Anak/Kelompok
                </span>
              </div>
              <div className={`grid grid-cols-1 sm:grid-cols-3 gap-2.5 ${currentTheme.cardInnerBg} p-3.5 rounded-xl border ${currentTheme.cardInnerBorder}`}>
                <div>
                  <span className={`text-[10px] ${currentTheme.cardSubtext} block font-medium`}>Kelas:</span>
                  <span className={`font-black text-xs ${currentTheme.isLight ? 'text-slate-900' : 'text-white'}`}>{namaKelas}</span>
                </div>
                <div>
                  <span className={`text-[10px] ${currentTheme.cardSubtext} block font-medium`}>Nomor Kelompok:</span>
                  <span className="font-black text-cyan-400 text-xs">Kelompok {kelompokAktif}</span>
                </div>
                <div>
                  <span className={`text-[10px] ${currentTheme.cardSubtext} block font-medium`}>Kasus yang Diteliti:</span>
                  <span className="font-bold text-amber-500 text-xs">Kasus #{kasusAktif.id} ({kasusAktif.judul})</span>
                </div>
              </div>

              {/* Skenario Studi Kasus (Stukas) Lengkap */}
              <div className={`${currentTheme.stukasBoxBg} border ${currentTheme.stukasBoxBorder} p-3.5 rounded-xl space-y-1.5 shadow-inner`}>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${currentTheme.stukasTitleText}`}>
                    <span>📑</span> Studi Kasus (Stukas) yang Diteliti:
                  </span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase ${currentTheme.stukasBadge}`}>
                    Kasus #{kasusAktif.id}
                  </span>
                </div>
                <h4 className={`font-bold text-xs sm:text-sm ${currentTheme.stukasTitleText}`}>
                  {kasusAktif.judul}
                </h4>
                <p className={`text-[11px] sm:text-xs leading-relaxed p-2.5 rounded-lg border ${currentTheme.stukasDescBg} ${currentTheme.stukasDescText} ${currentTheme.cardBorder}`}>
                  {kasusAktif.deskripsi}
                </p>
              </div>

              <div>
                <span className={`text-[11px] font-bold block mb-1.5 ${currentTheme.isLight ? 'text-slate-700' : 'text-slate-300'}`}>Nama Anggota & Peran:</span>
                <div className={`space-y-1.5 text-xs ${currentTheme.cardInnerBg} p-3 rounded-xl border ${currentTheme.cardInnerBorder}`}>
                  <p>1. <strong className={currentTheme.isLight ? 'text-slate-900' : 'text-white'}>{anggotaInterregator || "(Belum diisi)"}</strong> <span className="text-blue-500 text-[11px] font-semibold">(Interregator Chat AI)</span></p>
                  <p>2. <strong className={currentTheme.isLight ? 'text-slate-900' : 'text-white'}>{anggotaPencatat1 || "(Belum diisi)"}</strong> <span className="text-emerald-500 text-[11px] font-semibold">(Pencatat Bukti 1)</span></p>
                  <p>3. <strong className={currentTheme.isLight ? 'text-slate-900' : 'text-white'}>{anggotaPencatat2 || "(Belum diisi)"}</strong> <span className="text-teal-500 text-[11px] font-semibold">(Pencatat Bukti 2)</span></p>
                  <p>4. <strong className={currentTheme.isLight ? 'text-slate-900' : 'text-white'}>{anggotaAnalis1 || "(Belum diisi)"}</strong> <span className="text-purple-500 text-[11px] font-semibold">(Analis HAKI 1)</span></p>
                  <p>5. <strong className={currentTheme.isLight ? 'text-slate-900' : 'text-white'}>{anggotaAnalis2 || "(Belum diisi)"}</strong> <span className="text-indigo-500 text-[11px] font-semibold">(Analis HAKI 2)</span></p>
                  <p>6. <strong className={currentTheme.isLight ? 'text-slate-900' : 'text-white'}>{anggotaJuruBicara || "(Belum diisi / Opsional)"}</strong> <span className="text-amber-500 text-[11px] font-semibold">(Juru Bicara Presentasi)</span></p>
                </div>
              </div>
            </div>

            {/* BAGIAN II: CATATAN BUKTI INVESTIGASI (Ideal untuk HP Pencatat Bukti 1 & 2) */}
            <div ref={sectionBuktiRef} className={`border border-emerald-500/30 rounded-2xl p-4 sm:p-5 space-y-3.5 scroll-mt-14 shadow-lg ${
              currentTheme.isLight 
                ? "bg-white/95 shadow-sm" 
                : currentTheme.id === "arcade"
                ? "bg-[#180a30]/90"
                : "bg-gradient-to-b from-emerald-950/20 via-slate-900/90 to-slate-900/90"
            }`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className={`font-black text-xs uppercase tracking-wider flex items-center gap-1.5 ${currentTheme.isLight ? 'text-emerald-700' : 'text-emerald-300'}`}>
                    <span>🔍</span> BAGIAN II: CATATAN BUKTI INVESTIGASI (EVIDENCE LOG)
                  </h3>
                  <p className={`text-[11px] ${currentTheme.cardSubtext} mt-0.5`}>
                    Instruksi: Tuliskan petunjuk kunci yang didapatkan dari Saksi AI.
                  </p>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-500 border border-emerald-500/40 px-2.5 py-0.5 rounded-full font-bold shrink-0">
                  HP Pencatat Bukti
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${currentTheme.isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    1. Petunjuk #1 (Mengenai Pelaku / Tindakan yang Dilakukan):
                  </label>
                  <textarea
                    rows={2}
                    value={petunjuk1}
                    onFocus={() => { activeFieldRef.current = "petunjuk1"; }}
                    onBlur={() => { if (activeFieldRef.current === "petunjuk1") activeFieldRef.current = null; }}
                    onChange={(e) => setPetunjuk1(e.target.value)}
                    placeholder="Contoh: Saksi menyebutkan pelaku mengunduh video lalu memotong watermark..."
                    className={`w-full ${currentTheme.lkpdInputBg} border ${currentTheme.lkpdInputBorder} rounded-xl p-2.5 ${currentTheme.lkpdInputText} text-xs focus:outline-none transition-all resize-none`}
                  />
                </div>

                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${currentTheme.isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    2. Petunjuk #2 (Mengenai Aset / Karya yang Dirugikan):
                  </label>
                  <textarea
                    rows={2}
                    value={petunjuk2}
                    onFocus={() => { activeFieldRef.current = "petunjuk2"; }}
                    onBlur={() => { if (activeFieldRef.current === "petunjuk2") activeFieldRef.current = null; }}
                    onChange={(e) => setPetunjuk2(e.target.value)}
                    placeholder="Contoh: Karya berupa konten video sains eksperimen milik channel YouTube sekolah..."
                    className={`w-full ${currentTheme.lkpdInputBg} border ${currentTheme.lkpdInputBorder} rounded-xl p-2.5 ${currentTheme.lkpdInputText} text-xs focus:outline-none transition-all resize-none`}
                  />
                </div>

                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${currentTheme.isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    3. Petunjuk #3 (Mengenai Lisensi / Status Hukum Karya):
                  </label>
                  <textarea
                    rows={2}
                    value={petunjuk3}
                    onFocus={() => { activeFieldRef.current = "petunjuk3"; }}
                    onBlur={() => { if (activeFieldRef.current === "petunjuk3") activeFieldRef.current = null; }}
                    onChange={(e) => setPetunjuk3(e.target.value)}
                    placeholder="Contoh: Karya asli memiliki hak cipta terdaftar dan tidak diizinkan untuk dikomersialkan tanpa izin..."
                    className={`w-full ${currentTheme.lkpdInputBg} border ${currentTheme.lkpdInputBorder} rounded-xl p-2.5 ${currentTheme.lkpdInputText} text-xs focus:outline-none transition-all resize-none`}
                  />
                </div>
              </div>
            </div>

            {/* BAGIAN III: LEMBAR ANALISIS HAKI (Ideal untuk HP Analis HAKI 1 & 2) */}
            <div ref={sectionAnalisisRef} className={`border border-purple-500/30 rounded-2xl p-4 sm:p-5 space-y-3.5 scroll-mt-14 shadow-lg ${
              currentTheme.isLight 
                ? "bg-white/95 shadow-sm" 
                : currentTheme.id === "arcade"
                ? "bg-[#180a30]/90"
                : "bg-gradient-to-b from-purple-950/20 via-slate-900/90 to-slate-900/90"
            }`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className={`font-black text-xs uppercase tracking-wider flex items-center gap-1.5 ${currentTheme.isLight ? 'text-purple-700' : 'text-purple-300'}`}>
                    <span>⚖️</span> BAGIAN III: LEMBAR ANALISIS HAKI (HOTS - C4)
                  </h3>
                  <p className={`text-[11px] ${currentTheme.cardSubtext} mt-0.5`}>
                    Jawablah pertanyaan analisis pasal dan jenis pelanggaran etika/hukum berdasarkan bukti.
                  </p>
                </div>
                <span className="text-[10px] bg-purple-500/20 text-purple-500 border border-purple-500/40 px-2.5 py-0.5 rounded-full font-bold shrink-0">
                  HP Analis HAKI
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${currentTheme.isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    1. Tindakan spesifik apa dari pelaku yang melanggar etika digital / hukum?
                  </label>
                  <textarea
                    rows={2}
                    value={analisisTindakan}
                    onFocus={() => { activeFieldRef.current = "analisisTindakan"; }}
                    onBlur={() => { if (activeFieldRef.current === "analisisTindakan") activeFieldRef.current = null; }}
                    onChange={(e) => setAnalisisTindakan(e.target.value)}
                    placeholder="Jelaskan tindakan konkrit pelaku yang melanggar aturan..."
                    className={`w-full ${currentTheme.lkpdInputBg} border ${currentTheme.lkpdInputBorder} rounded-xl p-3 ${currentTheme.lkpdInputText} text-xs focus:outline-none transition-all resize-none`}
                  />
                </div>

                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${currentTheme.isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    2. Jenis Hak Kekayaan Intelektual atau Lisensi apa yang telah dilanggar?
                  </label>
                  {/* Selector Cepat */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {["Hak Cipta (Copyright)", "Lisensi Creative Commons", "Hak Moral (Nama Pencipta)", "Hak Ekonomi (Monetisasi)"].map((tag) => (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => {
                          if (!jenisHaki.includes(tag)) {
                            setJenisHaki(prev => prev ? `${prev}, ${tag}` : tag);
                          }
                        }}
                        className={`text-[10px] border px-2.5 py-1 rounded-xl transition-all cursor-pointer font-medium hover:scale-105 active:scale-95 ${
                          currentTheme.isLight
                            ? "bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
                            : "bg-slate-800/90 hover:bg-purple-900/50 text-purple-300 border-purple-500/30"
                        }`}
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={2}
                    value={jenisHaki}
                    onFocus={() => { activeFieldRef.current = "jenisHaki"; }}
                    onBlur={() => { if (activeFieldRef.current === "jenisHaki") activeFieldRef.current = null; }}
                    onChange={(e) => setJenisHaki(e.target.value)}
                    placeholder="Pilih & Jelaskan: Hak Cipta, Lisensi CC, Hak Moral, atau Hak Ekonomi yang dilanggar..."
                    className={`w-full ${currentTheme.lkpdInputBg} border ${currentTheme.lkpdInputBorder} rounded-xl p-3 ${currentTheme.lkpdInputText} text-xs focus:outline-none transition-all resize-none`}
                  />
                </div>

                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${currentTheme.isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    3. Siapa pihak yang paling dirugikan dan apa dampak kerugiannya (moral / ekonomi)?
                  </label>
                  <textarea
                    rows={2}
                    value={analisisKerugian}
                    onFocus={() => { activeFieldRef.current = "analisisKerugian"; }}
                    onBlur={() => { if (activeFieldRef.current === "analisisKerugian") activeFieldRef.current = null; }}
                    onChange={(e) => setAnalisisKerugian(e.target.value)}
                    placeholder="Uraikan siapa yang dirugikan serta bentuk kerugian materil/imateril yang dialami..."
                    className={`w-full ${currentTheme.lkpdInputBg} border ${currentTheme.lkpdInputBorder} rounded-xl p-3 ${currentTheme.lkpdInputText} text-xs focus:outline-none transition-all resize-none`}
                  />
                </div>
              </div>
            </div>

            {/* BAGIAN IV: REKOMENDASI SOLUSI & MITIGASI (HOTS - C5) */}
            <div ref={sectionSolusiRef} className={`border border-amber-500/30 rounded-2xl p-4 sm:p-5 space-y-3.5 scroll-mt-14 shadow-lg ${
              currentTheme.isLight 
                ? "bg-white/95 shadow-sm" 
                : currentTheme.id === "arcade"
                ? "bg-[#180a30]/90"
                : "bg-gradient-to-b from-amber-950/20 via-slate-900/90 to-slate-900/90"
            }`}>
              <div>
                <h3 className={`font-black text-xs uppercase tracking-wider flex items-center gap-1.5 ${currentTheme.isLight ? 'text-amber-700' : 'text-amber-300'}`}>
                  <span>🛡️</span> BAGIAN IV: REKOMENDASI SOLUSI & MITIGASI KASUS (HOTS - C5)
                </h3>
                <p className={`text-[11px] ${currentTheme.cardSubtext} mt-0.5`}>
                  Bagaimana cara menyelesaikan masalah ini secara adil dan etis?
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${currentTheme.isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    1. Langkah penyelesaian adil untuk korban saat ini:
                  </label>
                  <textarea
                    rows={2}
                    value={solusiAdil}
                    onFocus={() => { activeFieldRef.current = "solusiAdil"; }}
                    onBlur={() => { if (activeFieldRef.current === "solusiAdil") activeFieldRef.current = null; }}
                    onChange={(e) => setSolusiAdil(e.target.value)}
                    placeholder="Contoh: Takedown konten bajakan, kompensasi ganti rugi, permohonan maaf terbuka..."
                    className={`w-full ${currentTheme.lkpdInputBg} border ${currentTheme.lkpdInputBorder} rounded-xl p-3 ${currentTheme.lkpdInputText} text-xs focus:outline-none transition-all resize-none`}
                  />
                </div>

                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${currentTheme.isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    2. Aturan etis yang harus dipatuhi agar kita tidak menjadi pelaku pelanggaran HAKI di masa depan:
                  </label>
                  <textarea
                    rows={2}
                    value={aturanEtis}
                    onFocus={() => { activeFieldRef.current = "aturanEtis"; }}
                    onBlur={() => { if (activeFieldRef.current === "aturanEtis") activeFieldRef.current = null; }}
                    onChange={(e) => setAturanEtis(e.target.value)}
                    placeholder="Contoh: Selalu mencantumkan atribusi sumber, membeli lisensi legal, meminta izin tertulis..."
                    className={`w-full ${currentTheme.lkpdInputBg} border ${currentTheme.lkpdInputBorder} rounded-xl p-3 ${currentTheme.lkpdInputText} text-xs focus:outline-none transition-all resize-none`}
                  />
                </div>
              </div>
            </div>

            {/* BAGIAN V: JURNAL REFLEKSI DIRI */}
            <div ref={sectionRefleksiRef} className={`border border-rose-500/30 rounded-2xl p-4 sm:p-5 space-y-3 scroll-mt-14 shadow-lg ${
              currentTheme.isLight 
                ? "bg-white/95 shadow-sm" 
                : currentTheme.id === "arcade"
                ? "bg-[#180a30]/90"
                : "bg-gradient-to-b from-rose-950/20 via-slate-900/90 to-slate-900/90"
            }`}>
              <h3 className={`font-black text-xs uppercase tracking-wider flex items-center gap-1.5 ${currentTheme.isLight ? 'text-rose-700' : 'text-rose-300'}`}>
                <span>💭</span> BAGIAN V: JURNAL REFLEKSI DIRI
              </h3>
              <div>
                <label className={`block text-[11px] font-semibold mb-1 ${currentTheme.isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  • Hal paling berharga yang saya pelajari hari ini tentang Hak Cipta:
                </label>
                <textarea
                  rows={2}
                  value={refleksiDiri}
                  onFocus={() => { activeFieldRef.current = "refleksiDiri"; }}
                  onBlur={() => { if (activeFieldRef.current === "refleksiDiri") activeFieldRef.current = null; }}
                  onChange={(e) => setRefleksiDiri(e.target.value)}
                  placeholder="Tuliskan pemahaman atau kesadaran baru yang kamu peroleh dari misi investigasi ini..."
                  className={`w-full ${currentTheme.lkpdInputBg} border ${currentTheme.lkpdInputBorder} rounded-xl p-3 ${currentTheme.lkpdInputText} text-xs focus:outline-none transition-all resize-none`}
                />
              </div>
            </div>

            {/* Action Submit Final */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleFinalSubmit}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:via-teal-400 hover:to-cyan-400 text-white font-black rounded-2xl transition-all shadow-xl shadow-emerald-500/25 hover:shadow-cyan-500/30 hover:-translate-y-0.5 active:scale-95 text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>🚀</span> {isSubmitted ? "Kirim Ulang Pembaruan LKPD" : "Kirim Final Berkas Investigasi ke Guru"}
              </button>
              <p className={`text-[10px] ${currentTheme.cardSubtext} text-center mt-2 font-medium`}>
                Setiap ketikan Anda tersimpan otomatis di database room kelompok. Klik tombol di atas jika sudah yakin untuk mengirim laporan akhir.
              </p>
            </div>

          </div>
        </div>

      </div>

      {/* FIXED BOTTOM NAVIGATION BAR KHUSUS SMARTPHONE - Sangat Nyaman & Selalu Terjangkau */}
      <div className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 ${currentTheme.mobileNavBg} backdrop-blur-xl border-t ${currentTheme.mobileNavBorder} px-3 py-2 flex items-center justify-around shadow-2xl`}>
        <button
          type="button"
          onClick={() => setActiveTabMobile("chat")}
          className={`flex-1 py-2 px-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTabMobile === "chat"
              ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/30 font-black"
              : "text-slate-400 hover:text-white font-semibold"
          }`}
        >
          <span className="text-base">💬</span>
          <span>Tanya Saksi AI</span>
        </button>
        <div className="w-px h-5 bg-slate-700 mx-1"></div>
        <button
          type="button"
          onClick={() => setActiveTabMobile("lembar")}
          className={`flex-1 py-2 px-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${
            activeTabMobile === "lembar"
              ? "bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/30 font-black"
              : "text-slate-400 hover:text-white font-semibold"
          }`}
        >
          <span className="text-base">📝</span>
          <span>Lembar LKPD</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        </button>
      </div>

      {/* Modal Rincian Kasus */}
      {showKasusModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`${currentTheme.cardBg} rounded-3xl max-w-lg w-full shadow-2xl p-6 border ${currentTheme.cardBorder}`}>
            <div className="flex justify-between items-center mb-3">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${currentTheme.stukasBadge}`}>
                Kasus #{kasusAktif.id}
              </span>
              <button onClick={() => setShowKasusModal(false)} className="opacity-70 hover:opacity-100 text-lg font-bold cursor-pointer">
                ✕
              </button>
            </div>
            <h3 className={`text-lg font-black mb-2 ${currentTheme.isLight ? 'text-slate-900' : 'text-white'}`}>{kasusAktif.judul}</h3>
            <p className={`text-xs leading-relaxed p-4 rounded-xl border mb-4 ${currentTheme.stukasDescBg} ${currentTheme.stukasDescText} ${currentTheme.cardBorder}`}>
              {kasusAktif.deskripsi}
            </p>
            <button
              onClick={() => setShowKasusModal(false)}
              className={`w-full py-2.5 ${currentTheme.primaryBtn} font-bold rounded-xl text-xs transition-all cursor-pointer`}
            >
              Lanjutkan Investigasi
            </button>
          </div>
        </div>
      )}

      {/* Modal Peringatan Waktu Habis (Tahap 3) */}
      {showTimeUpModal && !isSubmitted && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-800 border-2 border-rose-500 rounded-3xl max-w-md w-full p-6 text-center shadow-2xl relative">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-3xl mx-auto mb-3 animate-bounce">
              ⏰
            </div>
            <h3 className="text-xl font-extrabold text-white mb-2">
              Waktu Investigasi Telah Habis!
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Batas waktu investigasi <strong>{durasiMenit} menit</strong> yang telah diatur oleh Guru untuk sesi kelas ini telah selesai. Semua catatan dan analisis yang Anda ketik telah tersimpan aman.
            </p>
            <div className="bg-slate-900 p-3 rounded-2xl border border-slate-700 text-xs text-slate-300 mb-4 text-left space-y-1.5">
              <p className="font-bold text-amber-400 flex items-center gap-1.5">
                <span>📢</span> Langkah Selanjutnya:
              </p>
              <p>1. Periksa kembali jawaban Anda pada Bagian I hingga V di lembar LKPD.</p>
              <p>2. Segera klik tombol <strong>"Kirim Final Berkas Investigasi"</strong> agar dapat dievaluasi oleh Guru dan AI Asesor.</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-left text-[11px] text-amber-300 mb-5 flex items-start gap-2">
              <span className="text-base shrink-0">⚠️</span>
              <span><strong>Perhatian:</strong> Sesi waktu Anda telah habis. Jika halaman ini dimuat ulang (refresh/F5), sesi investigasi akan otomatis berakhir demi ketertiban ujian.</span>
            </div>
            <button
              onClick={() => {
                setShowTimeUpModal(false);
                setActiveTabMobile("lembar");
              }}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer"
            >
              Buka Lembar LKPD & Kirim Final Sekarang 🚀
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
