"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { KODE_AKSES_KELOMPOK, DEFAULT_KELAS_LIST } from "@/lib/constants";

// Menambahkan Kasus ke-3 agar genap untuk 6 kelompok
const daftarKasus = [
  { 
    id: 1, 
    judul: "Pembajakan Game 'CyberQuest'", 
    deskripsi: "Game indie buatan siswa SMK lokal mendadak viral, namun sayangnya muncul di situs download bajakan luar negeri hanya dalam waktu seminggu setelah rilis. Modus operandi pelaku belum diketahui, namun ada jejak digital ke sebuah forum hacker anonim.",
    kelompok: [1, 2] 
  },
  { 
    id: 2, 
    judul: "Plagiarisme Desain Maskot", 
    deskripsi: "Sebuah kafe boba hits di kota diduga keras menggunakan desain maskot yang menjiplak karya seniman digital dari platform DeviantArt. Pemilik kafe mengklaim ia membeli desain tersebut dari seorang 'freelancer' murah di internet.",
    kelompok: [3, 4] 
  },
  { 
    id: 3, 
    judul: "Pencurian Konten Video (Re-uploader)", 
    deskripsi: "Video eksperimen sains edukasi milik channel YouTube sekolah diunduh, dipotong sedikit untuk menghilangkan watermark, lalu diunggah ulang ke TikTok dan mendapat jutaan views serta cuan (monetisasi). Siapa pelakunya?",
    kelompok: [5, 6] 
  }
];

export default function InvestigasiPage() {
  // State Sesi Kelas
  const [kodeKelasInput, setKodeKelasInput] = useState("");
  const [kodeKelasAktif, setKodeKelasAktif] = useState<string | null>(null);
  const [namaKelas, setNamaKelas] = useState("");
  const [errorKelas, setErrorKelas] = useState("");
  const [isValidatingKelas, setIsValidatingKelas] = useState(false);

  // State Kelompok & Identitas Siswa
  const [kelompokAktif, setKelompokAktif] = useState<number | null>(null);
  const [kodeAkses, setKodeAkses] = useState("");
  const [errorKode, setErrorKode] = useState("");
  const [namaAnggota, setNamaAnggota] = useState("");
  const [isIdentitasLengkap, setIsIdentitasLengkap] = useState(false);
  
  // State Kasus & Chat
  const [kasusAktif, setKasusAktif] = useState(daftarKasus[0]);
  const [pesan, setPesan] = useState<{ role: string; content: string }[]>([]);
  const [inputUser, setInputUser] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // State LKPD Digital (Sesuai skema tabel lkpd_reports)
  const [buktiPetunjuk, setBuktiPetunjuk] = useState("");
  const [analisisPelanggaran, setAnalisisPelanggaran] = useState("");
  const [solusiRekomendasi, setSolusiRekomendasi] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [activeTabMobile, setActiveTabMobile] = useState<"chat" | "lembar">("chat");
  const [showKasusModal, setShowKasusModal] = useState(false);

  // Auto-scroll ke pesan terbaru
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [pesan, isLoading]);

  // Validasi Kode Kelas dari Supabase / Fallback Default
  const handleVerifikasiKelas = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKode = kodeKelasInput.trim().toUpperCase();
    if (!cleanKode) return;

    setIsValidatingKelas(true);
    setErrorKelas("");

    try {
      let matchedKelas: string | null = null;

      // 1. Cek ke Supabase tabel kelas_sesi jika ada
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("url_proyek_supabase_anda")) {
        const { data, error } = await supabase
          .from("kelas_sesi")
          .select("kode_kelas, nama_kelas")
          .ilike("kode_kelas", cleanKode)
          .maybeSingle();

        if (data) {
          matchedKelas = data.nama_kelas;
        }
      }

      // 2. Cek ke fallback default jika belum ditemukan di database
      if (!matchedKelas) {
        const fallback = DEFAULT_KELAS_LIST.find(
          (k) => k.kode_kelas.toUpperCase() === cleanKode || k.nama_kelas.toUpperCase() === cleanKode
        );
        if (fallback) {
          matchedKelas = fallback.nama_kelas;
        }
      }

      if (matchedKelas) {
        setNamaKelas(matchedKelas);
        setKodeKelasAktif(cleanKode);
        setErrorKelas("");
      } else {
        setErrorKelas("Kode Kelas tidak ditemukan! Silakan minta kode kelas aktif dari Guru Anda.");
      }
    } catch (err) {
      console.error("Gagal verifikasi kode kelas:", err);
      // Fallback cek lokal jika koneksi error
      const fallback = DEFAULT_KELAS_LIST.find(
        (k) => k.kode_kelas.toUpperCase() === cleanKode || k.nama_kelas.toUpperCase() === cleanKode
      );
      if (fallback) {
        setNamaKelas(fallback.nama_kelas);
        setKodeKelasAktif(cleanKode);
        setErrorKelas("");
      } else {
        setErrorKelas("Kode Kelas tidak valid atau server tidak merespons.");
      }
    } finally {
      setIsValidatingKelas(false);
    }
  };

  // Load existing laporan LKPD saat masuk kelompok & identitas lengkap
  useEffect(() => {
    if (!kelompokAktif || !isIdentitasLengkap || !namaKelas) return;

    const muatLkpd = async () => {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("url_proyek_supabase_anda")) return;

      try {
        const { data } = await supabase
          .from("lkpd_reports")
          .select("bukti_petunjuk, analisis_pelanggaran, solusi_rekomendasi, is_submitted")
          .eq("kelompok", kelompokAktif)
          .eq("kelas", namaKelas)
          .maybeSingle();

        if (data) {
          if (data.bukti_petunjuk) setBuktiPetunjuk(data.bukti_petunjuk);
          if (data.analisis_pelanggaran) setAnalisisPelanggaran(data.analisis_pelanggaran);
          if (data.solusi_rekomendasi) setSolusiRekomendasi(data.solusi_rekomendasi);
          if (typeof data.is_submitted === "boolean") setIsSubmitted(data.is_submitted);
        }
      } catch (err) {
        console.error("Gagal memuat LKPD sebelumnya:", err);
      }
    };

    muatLkpd();
  }, [kelompokAktif, isIdentitasLengkap, namaKelas]);

  // Fungsi simpan LKPD ke tabel lkpd_reports di Supabase
  const simpanKeDatabase = async (
    bukti: string, 
    analisis: string, 
    solusi: string, 
    submitted: boolean = isSubmitted
  ) => {
    if (!kelompokAktif || !namaKelas) return;
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("url_proyek_supabase_anda")) {
      setSaveStatus("saved");
      return;
    }

    setSaveStatus("saving");
    try {
      const { data: existing } = await supabase
        .from("lkpd_reports")
        .select("id")
        .eq("kelompok", kelompokAktif)
        .eq("kelas", namaKelas)
        .maybeSingle();

      if (existing) {
        const { error: updateError } = await supabase
          .from("lkpd_reports")
          .update({
            bukti_petunjuk: bukti,
            analisis_pelanggaran: analisis,
            solusi_rekomendasi: solusi,
            is_submitted: submitted,
            kasus_id: kasusAktif.id,
            updated_at: new Date().toISOString()
          })
          .eq("id", existing.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("lkpd_reports")
          .insert({
            kelompok: kelompokAktif,
            kelas: namaKelas,
            kasus_id: kasusAktif.id,
            bukti_petunjuk: bukti,
            analisis_pelanggaran: analisis,
            solusi_rekomendasi: solusi,
            is_submitted: submitted
          });

        if (insertError) throw insertError;
      }
      setSaveStatus("saved");
    } catch (err) {
      console.error("Gagal simpan LKPD ke lkpd_reports:", err);
      setSaveStatus("error");
    }
  };

  // Debounce Auto-Save ketika siswa mengetik (1.5 detik)
  useEffect(() => {
    if (!isIdentitasLengkap) return;
    setSaveStatus("saving");
    const timer = setTimeout(() => {
      simpanKeDatabase(buktiPetunjuk, analisisPelanggaran, solusiRekomendasi, isSubmitted);
    }, 1500);

    return () => clearTimeout(timer);
  }, [buktiPetunjuk, analisisPelanggaran, solusiRekomendasi]);

  // Handler kirim final LKPD
  const handleFinalSubmit = async () => {
    const konfirmasi = window.confirm(
      "Apakah Anda yakin ingin MENGIRIM FINAL LKPD ini?\nGuru Anda akan langsung menerima laporan akhir kelompok Anda."
    );
    if (!konfirmasi) return;

    setIsSubmitted(true);
    await simpanKeDatabase(buktiPetunjuk, analisisPelanggaran, solusiRekomendasi, true);
    alert("🎉 Laporan LKPD berhasil dikirim ke Guru!");
  };

  // TAHAP 1: INPUT KODE KELAS (JIKA KELAS BELUM DISETEL)
  if (!kodeKelasAktif) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white relative">
        <button 
          onClick={() => window.location.href = '/'}
          className="absolute top-6 left-6 md:top-8 md:left-8 flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold"
        >
          <span>←</span> Kembali ke Beranda
        </button>

        <div className="bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-700 max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain drop-shadow-lg" />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-2">
            DETEKTIF HAKI
          </h1>
          <p className="text-slate-400 text-xs md:text-sm mb-6">
            Masukkan Kode Akses Kelas yang dibagikan oleh Guru Anda untuk memulai investigasi.
          </p>

          <form onSubmit={handleVerifikasiKelas} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
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
                className={`w-full bg-slate-900 border rounded-2xl px-4 py-3.5 text-white font-mono uppercase tracking-widest text-center text-lg focus:outline-none transition-all ${
                  errorKelas 
                    ? "border-red-500 bg-red-950/20 focus:ring-2 focus:ring-red-500" 
                    : "border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
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
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg hover:-translate-y-0.5 text-sm flex items-center justify-center gap-2"
            >
              {isValidatingKelas ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Memverifikasi Kelas...
                </>
              ) : (
                "Lanjut ke Pemilihan Kelompok →"
              )}
            </button>
          </form>

          <p className="text-[11px] text-slate-500 mt-6 italic">
            Tips: Guru dapat men-generate kode kelas baru melalui Dasbor Guru.
          </p>
        </div>
      </div>
    );
  }

  // TAHAP 2: PEMILIHAN KELOMPOK (1-6)
  if (!kelompokAktif) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white relative">
        {/* Tombol Ganti Kelas */}
        <button 
          onClick={() => {
            setKodeKelasAktif(null);
            setNamaKelas("");
            setKodeKelasInput("");
          }}
          className="absolute top-6 left-6 md:top-8 md:left-8 flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold"
        >
          <span>←</span> Ganti Kelas
        </button>

        <div className="text-center mb-8 mt-12 md:mt-0">
          <div className="inline-block px-4 py-1.5 bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-bold rounded-full mb-3 uppercase tracking-wider">
            Sesi Kelas: {namaKelas} ({kodeKelasAktif})
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            Identifikasi Tim Detektif
          </h1>
          <p className="text-slate-400 text-sm md:text-base">Silakan pilih nomor kelompok Anda untuk menerima berkas kasus spesifik.</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-3xl w-full">
          {[1, 2, 3, 4, 5, 6].map((num) => (
            <button 
              key={num}
              onClick={() => {
                setKelompokAktif(num);
                setKodeAkses("");
                setErrorKode("");
                const kasusAssigned = daftarKasus.find(k => k.kelompok.includes(num));
                if (kasusAssigned) {
                  setKasusAktif(kasusAssigned);
                  setPesan([]); // Reset chat
                }
              }}
              className="py-8 px-6 bg-slate-800 border-2 border-slate-700 rounded-3xl shadow-lg hover:border-blue-500 hover:bg-slate-800/80 hover:-translate-y-2 transition-all duration-300 text-xl font-bold text-slate-200 flex flex-col items-center gap-3"
            >
              <span className="text-4xl drop-shadow-md">🕵️‍♂️</span>
              Kelompok {num}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // TAHAP 3: REGISTRASI TIM (KODE RAHASIA KELOMPOK + NAMA ANGGOTA)
  if (kelompokAktif && !isIdentitasLengkap) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white relative">
        <button 
          onClick={() => {
            setKelompokAktif(null);
            setKodeAkses("");
            setErrorKode("");
          }}
          className="absolute top-6 left-6 md:top-8 md:left-8 flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold"
        >
          <span>←</span> Kembali Pilih Kelompok
        </button>

        <div className="bg-slate-800 p-8 rounded-3xl shadow-xl border border-slate-700 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="inline-block px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold rounded-full mb-3 uppercase tracking-wider">
              Kelas {namaKelas}
            </div>
            <div className="text-5xl mb-2">🔐</div>
            <h2 className="text-2xl font-bold text-white mb-1">Registrasi Tim {kelompokAktif}</h2>
            <p className="text-slate-400 text-xs">Masukkan kode rahasia kelompok dan nama anggota tim Anda.</p>
          </div>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const kodeYangBenar = KODE_AKSES_KELOMPOK[kelompokAktif];
            if (kodeAkses.trim().toUpperCase() !== kodeYangBenar) {
              setErrorKode(`Kode akses untuk Kelompok ${kelompokAktif} salah! Silakan tanyakan kode rahasia kepada Guru.`);
              return;
            }
            setErrorKode("");
            if (namaAnggota.trim()) {
              setIsIdentitasLengkap(true);
            }
          }} className="space-y-4">
            
            {/* Input Kode Rahasia Kelompok */}
            <div>
              <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <span>🔑</span> Kode Masuk Kelompok {kelompokAktif}
              </label>
              <input 
                type="text" 
                required
                value={kodeAkses}
                onChange={(e) => {
                  setKodeAkses(e.target.value);
                  if (errorKode) setErrorKode("");
                }}
                placeholder={`Masukkan kode (Contoh: ${KODE_AKSES_KELOMPOK[kelompokAktif]})`}
                className={`w-full bg-slate-900 border rounded-xl px-4 py-3 text-white font-mono uppercase tracking-widest focus:outline-none transition-all ${
                  errorKode 
                    ? "border-red-500 bg-red-950/20 focus:ring-1 focus:ring-red-500" 
                    : "border-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                }`}
              />
              {errorKode && (
                <p className="text-red-400 text-xs mt-1.5 font-medium flex items-center gap-1">
                  <span>⚠️</span> {errorKode}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Nama Anggota (Pisahkan dengan koma)</label>
              <textarea 
                required
                value={namaAnggota}
                onChange={(e) => setNamaAnggota(e.target.value)}
                placeholder="Contoh: Budi, Andi, Siska" 
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-24 resize-none transition-all"
              ></textarea>
            </div>

            <button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all hover:-translate-y-0.5 shadow-lg mt-2 text-sm"
            >
              Verifikasi & Mulai Investigasi 🔍
            </button>
          </form>
        </div>
      </div>
    );
  }

  const kirimPesan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUser.trim() || isLoading) return;

    const historiBaru = [...pesan, { role: "user", content: inputUser }];
    setPesan(historiBaru);
    const textUser = inputUser;
    setInputUser("");
    setIsLoading(true);

    try {
      // Simpan riwayat chat ke Supabase (jika sudah dikonfigurasi)
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("url_proyek_supabase_anda")) {
        const { error: insertError } = await supabase.from("chat_history").insert({
          kelompok: kelompokAktif,
          kelas: namaKelas,
          nama_anggota: namaAnggota,
          kasus_id: kasusAktif.id,
          role: "user",
          content: textUser
        });
        if (insertError) console.log("Supabase belum disetup atau error:", insertError);
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pesan: historiBaru, kasus: kasusAktif.judul }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        alert("Terjadi kesalahan: " + (errorData.error || response.statusText));
        setPesan(pesan); 
        return;
      }

      if (!response.body) throw new Error("Tidak ada stream respons");

      setPesan((prev) => [...prev, { role: "assistant", content: "" }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = "";
      let fullAssistantText = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6).trim();
              if (dataStr === "[DONE]") break;
              
              try {
                const data = JSON.parse(dataStr);
                const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  fullAssistantText += text;
                  setPesan((prev) => {
                    const pesanBaru = [...prev];
                    const lastIndex = pesanBaru.length - 1;
                    pesanBaru[lastIndex] = {
                      ...pesanBaru[lastIndex],
                      content: pesanBaru[lastIndex].content + text
                    };
                    return pesanBaru;
                  });
                }
              } catch (err) {
                console.error("Gagal parse chunk:", err);
              }
            }
          }
        }
      }

      // Simpan pesan AI ke Supabase setelah selesai stream
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("url_proyek_supabase_anda")) {
        const { error: aiInsertError } = await supabase.from("chat_history").insert({
          kelompok: kelompokAktif,
          kelas: namaKelas,
          nama_anggota: namaAnggota,
          kasus_id: kasusAktif.id,
          role: "assistant",
          content: fullAssistantText
        });
        if (aiInsertError) console.log("Supabase belum disetup atau error:", aiInsertError);
      }

    } catch (error) {
      console.error("Gagal interogasi:", error);
      alert("Koneksi terputus. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] bg-slate-900 flex flex-col overflow-hidden text-slate-100">
      {/* Top Bar Header */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-4 py-3 flex items-center justify-between shrink-0 z-20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-base md:text-lg tracking-wide">DETEKTIF HAKI</span>
              <span className="text-xs bg-blue-600/30 text-blue-400 font-bold px-2 py-0.5 rounded-full border border-blue-500/30">
                Kelompok {kelompokAktif} ({namaKelas})
              </span>
              {isSubmitted && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  ✓ LKPD Final Terkirim
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 truncate max-w-[200px] md:max-w-md">
              Anggota: {namaAnggota}
            </p>
          </div>
        </div>

        {/* Action Buttons Top Bar */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowKasusModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all"
            title="Buka Berkas Kasus"
          >
            <span>📁</span>
            <span className="hidden sm:inline">Berkas Kasus #{kasusAktif.id}</span>
          </button>
          <button 
            onClick={() => setKelompokAktif(null)}
            className="px-3 py-1.5 bg-slate-800/80 hover:bg-red-900/40 hover:text-red-300 text-slate-400 border border-slate-700 rounded-xl text-xs font-semibold transition-all"
          >
            Ganti Kelompok
          </button>
        </div>
      </header>

      {/* Tab Navigasi Mobile (Hanya tampil di layar kecil < md) */}
      <div className="md:hidden flex border-b border-slate-800 bg-slate-800/60 shrink-0">
        <button
          onClick={() => setActiveTabMobile("chat")}
          className={`flex-1 py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5 border-b-2 ${
            activeTabMobile === "chat" 
              ? "border-blue-500 text-blue-400 bg-blue-500/10" 
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <span>💬</span> Ruang Interogasi AI
        </button>
        <button
          onClick={() => setActiveTabMobile("lembar")}
          className={`flex-1 py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5 border-b-2 relative ${
            activeTabMobile === "lembar" 
              ? "border-emerald-500 text-emerald-400 bg-emerald-500/10" 
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <span>📝</span> LKPD Digital
          {isSubmitted ? (
            <span className="text-[10px] bg-emerald-500 text-slate-900 font-bold px-1.5 rounded-full ml-1">✓</span>
          ) : saveStatus === "saving" ? (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute top-2 right-4"></span>
          ) : null}
        </button>
      </div>

      {/* Layout Konten Utama: 2 Kolom di Desktop (Kiri: Chat, Kanan: LKPD Digital) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-2 md:p-4 gap-3 md:gap-4 bg-slate-950">
        
        {/* PANEL KIRI: Ruang Chat Interogasi Saksi AI */}
        <section 
          className={`flex-1 bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col overflow-hidden ${
            activeTabMobile === "lembar" ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Header Chat */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center overflow-hidden">
                <img src="/logo.png" alt="AI" className="w-7 h-7 object-contain" />
              </div>
              <div>
                <h2 className="font-bold text-slate-800 text-sm md:text-base leading-tight">Saksi Mata Digital AI</h2>
                <p className="text-xs text-slate-500">
                  Konteks: {kasusAktif.judul}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowKasusModal(true)}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 md:hidden"
            >
              Lihat Kasus
            </button>
          </div>
          
          {/* Chat Messages Container */}
          <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 bg-slate-50/70">
            {pesan.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 max-w-sm mx-auto text-center px-4">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-4xl shadow-inner shadow-blue-200/50">
                  🔎
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-700 mb-1">Mulai Interogasi Saksi</h3>
                  <p className="text-xs text-slate-500 mb-3">
                    Tanyakan bukti dan alibi digital. Catat temuannya di panel LKPD Digital sebelah kanan!
                  </p>
                  <div className="bg-white border border-slate-200 rounded-xl p-3 text-left shadow-sm">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tips Bertanya:</h4>
                    <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                      <li>"Siapa yang pertama kali menemukan pelanggaran ini?"</li>
                      <li>"Apakah ada bukti forum anonim atau jejak digital?"</li>
                      <li>"Hak ekonomi/moral apa yang dilanggar dari pencipta?"</li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              pesan.map((p, i) => (
                <div key={i} className={`flex ${p.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] md:max-w-[80%] p-3.5 rounded-2xl shadow-sm text-sm ${
                    p.role === "user" 
                      ? "bg-blue-600 text-white rounded-br-sm" 
                      : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm leading-relaxed"
                  }`}>
                    {p.content}
                  </div>
                </div>
              ))
            )}
            {isLoading && pesan[pesan.length - 1]?.role !== 'assistant' && (
               <div className="flex justify-start">
                 <div className="bg-white border border-slate-200 text-slate-500 text-xs px-4 py-3 rounded-2xl rounded-bl-sm animate-pulse shadow-sm flex items-center gap-2">
                   <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
                   Saksi sedang mengingat kembali petunjuk...
                 </div>
               </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form Kirim Pertanyaan */}
          <form onSubmit={kirimPesan} className="sticky bottom-0 p-3 md:p-4 border-t border-slate-200 bg-white flex gap-2 md:gap-3 z-20 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] shrink-0">
            <input
              type="text"
              value={inputUser}
              onChange={(e) => setInputUser(e.target.value)}
              placeholder="Ketik pertanyaan untuk saksi AI..."
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 bg-slate-50 text-sm transition-all"
            />
            <button 
              type="submit" 
              disabled={isLoading || !inputUser.trim()}
              className="px-5 md:px-6 py-3 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md active:scale-[0.98] shrink-0"
            >
              Kirim
            </button>
          </form>
        </section>

        {/* PANEL KANAN: LKPD Digital (bukti_petunjuk, analisis_pelanggaran, solusi_rekomendasi) */}
        <section 
          className={`w-full md:w-[460px] lg:w-[500px] bg-slate-900 border border-slate-800 rounded-3xl shadow-xl flex flex-col overflow-hidden shrink-0 ${
            activeTabMobile === "chat" ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Header LKPD Digital */}
          <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xl">📋</span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-sm md:text-base leading-tight">LKPD Digital</h3>
                  {isSubmitted && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-md border border-emerald-500/30">
                      Final Terkirim
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">Kelas {namaKelas} • Sinkron ke Dasbor Guru</p>
              </div>
            </div>

            {/* Status Penyimpanan */}
            <div className="flex items-center gap-2">
              {saveStatus === "saving" && (
                <span className="text-[11px] text-amber-400 flex items-center gap-1 font-medium bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                  Menyimpan...
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                  ✓ Tersimpan
                </span>
              )}
              {saveStatus === "error" && (
                <span className="text-[11px] text-red-400 font-medium bg-red-950/60 border border-red-800/60 px-2 py-0.5 rounded-full">
                  ⚠️ Gagal Simpan
                </span>
              )}
            </div>
          </div>

          {/* Form Isian LKPD (C4 & C5) */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            
            {/* Field 1: bukti_petunjuk */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🔍</span> 1. Bukti & Petunjuk dari AI
                </label>
                <span className="text-[10px] text-slate-400">Log Clues</span>
              </div>
              <textarea
                value={buktiPetunjuk}
                onChange={(e) => setBuktiPetunjuk(e.target.value)}
                placeholder="Catat fakta-fakta, kronologi, jejak forum/anonim, atau pengakuan saksi AI di sini..."
                rows={4}
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-2xl p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none leading-relaxed"
              ></textarea>
            </div>

            {/* Field 2: analisis_pelanggaran (C4) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>⚖️</span> 2. Analisis Pelanggaran (C4)
                </label>
                <span className="text-[10px] text-slate-400">Jenis HAKI & UU</span>
              </div>
              <textarea
                value={analisisPelanggaran}
                onChange={(e) => setAnalisisPelanggaran(e.target.value)}
                placeholder="Jenis HAKI apa yang dilanggar? Siapa pihak yang bersalah dan aturan hukum/UU apa yang dilanggar?..."
                rows={4}
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-2xl p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all resize-none leading-relaxed"
              ></textarea>
            </div>

            {/* Field 3: solusi_rekomendasi (C5) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>💡</span> 3. Solusi & Rekomendasi Mitigasi (C5)
                </label>
                <span className="text-[10px] text-slate-400">Solusi Etis</span>
              </div>
              <textarea
                value={solusiRekomendasi}
                onChange={(e) => setSolusiRekomendasi(e.target.value)}
                placeholder="Apa rekomendasi tindakan etis dan solusi mitigasi agar pelanggaran ini tidak terulang kembali?..."
                rows={4}
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-2xl p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none leading-relaxed"
              ></textarea>
            </div>

          </div>

          {/* Footer LKPD Digital: Tombol Simpan Draft & Submit Final */}
          <div className="p-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-2 shrink-0">
            <button
              onClick={() => simpanKeDatabase(buktiPetunjuk, analisisPelanggaran, solusiRekomendasi, isSubmitted)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <span>💾</span> Simpan Draft
            </button>
            <button
              onClick={handleFinalSubmit}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 active:scale-95 ${
                isSubmitted 
                  ? "bg-emerald-700 text-white hover:bg-emerald-600" 
                  : "bg-emerald-600 hover:bg-emerald-500 text-white"
              }`}
            >
              <span>🚀</span> {isSubmitted ? "Perbarui Kiriman Final" : "Kirim LKPD Final"}
            </button>
          </div>
        </section>

      </div>

      {/* Modal Berkas Kasus */}
      {showKasusModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-lg w-full shadow-2xl relative">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs bg-blue-600 text-white font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Berkas Kasus #{kasusAktif.id}
              </span>
              <button 
                onClick={() => setShowKasusModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>
            
            <h3 className="text-xl font-bold text-blue-400 mb-3">{kasusAktif.judul}</h3>
            
            <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 text-slate-300 text-sm leading-relaxed mb-6">
              {kasusAktif.deskripsi}
            </div>

            <button
              onClick={() => setShowKasusModal(false)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg"
            >
              Kembali ke Investigasi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
