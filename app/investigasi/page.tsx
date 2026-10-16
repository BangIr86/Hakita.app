"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { DEFAULT_KELAS_LIST } from "@/lib/constants";

// Data Studi Kasus
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
  // Sesi Kelas
  const [kodeKelasInput, setKodeKelasInput] = useState("");
  const [kodeKelasAktif, setKodeKelasAktif] = useState<string | null>(null);
  const [namaKelas, setNamaKelas] = useState("");
  const [errorKelas, setErrorKelas] = useState("");
  const [isValidatingKelas, setIsValidatingKelas] = useState(false);

  // Sesi Kelompok & Anggota
  const [kelompokAktif, setKelompokAktif] = useState<number | null>(null);
  const [isIdentitasLengkap, setIsIdentitasLengkap] = useState(false);

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

  // Status Form LKPD
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [activeTabMobile, setActiveTabMobile] = useState<"chat" | "lembar">("chat");
  const [showKasusModal, setShowKasusModal] = useState(false);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [pesan, isLoading]);

  // Validasi Kode Kelas
  const handleVerifikasiKelas = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKode = kodeKelasInput.trim().toUpperCase();
    if (!cleanKode) return;

    setIsValidatingKelas(true);
    setErrorKelas("");

    try {
      let matchedKelas: string | null = null;
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("url_proyek_supabase_anda")) {
        const { data } = await supabase
          .from("kelas_sesi")
          .select("kode_kelas, nama_kelas")
          .ilike("kode_kelas", cleanKode)
          .maybeSingle();

        if (data) matchedKelas = data.nama_kelas;
      }

      if (!matchedKelas) {
        const fallback = DEFAULT_KELAS_LIST.find(
          (k) => k.kode_kelas.toUpperCase() === cleanKode || k.nama_kelas.toUpperCase() === cleanKode
        );
        if (fallback) matchedKelas = fallback.nama_kelas;
      }

      if (matchedKelas) {
        setNamaKelas(matchedKelas);
        setKodeKelasAktif(cleanKode);
        setErrorKelas("");
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

  // Muat Laporan LKPD yang ada
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
          // Parse Bagian II (bukti_petunjuk)
          if (data.bukti_petunjuk) {
            try {
              const parsed = JSON.parse(data.bukti_petunjuk);
              setPetunjuk1(parsed.p1 || "");
              setPetunjuk2(parsed.p2 || "");
              setPetunjuk3(parsed.p3 || "");
            } catch {
              setPetunjuk1(data.bukti_petunjuk);
            }
          }

          // Parse Bagian III (analisis_pelanggaran)
          if (data.analisis_pelanggaran) {
            try {
              const parsed = JSON.parse(data.analisis_pelanggaran);
              setAnalisisTindakan(parsed.tindakan || "");
              setJenisHaki(parsed.jenis || "");
              setAnalisisKerugian(parsed.kerugian || "");
            } catch {
              setAnalisisTindakan(data.analisis_pelanggaran);
            }
          }

          // Parse Bagian IV & V (solusi_rekomendasi)
          if (data.solusi_rekomendasi) {
            try {
              const parsed = JSON.parse(data.solusi_rekomendasi);
              setSolusiAdil(parsed.solusi || "");
              setAturanEtis(parsed.aturan || "");
              setRefleksiDiri(parsed.refleksi || "");
            } catch {
              setSolusiAdil(data.solusi_rekomendasi);
            }
          }

          if (typeof data.is_submitted === "boolean") {
            setIsSubmitted(data.is_submitted);
          }
        }
      } catch (err) {
        console.error("Gagal muat LKPD:", err);
      }
    };

    muatLkpd();
  }, [kelompokAktif, isIdentitasLengkap, namaKelas]);

  // Simpan LKPD ke Supabase
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
      nama_anggota: getGabunganNamaAnggota()
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

      setSaveStatus("saved");
    } catch (err) {
      console.error("Gagal simpan LKPD:", err);
      setSaveStatus("error");
    }
  };

  // Debounce Auto-Save
  useEffect(() => {
    if (!isIdentitasLengkap) return;
    setSaveStatus("saving");
    const timer = setTimeout(() => {
      simpanKeDatabase(isSubmitted);
    }, 1200);

    return () => clearTimeout(timer);
  }, [petunjuk1, petunjuk2, petunjuk3, analisisTindakan, jenisHaki, analisisKerugian, solusiAdil, aturanEtis, refleksiDiri]);

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

  // TAHAP 1: INPUT KODE KELAS
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
              {isValidatingKelas ? "Memverifikasi..." : "Lanjut ke Pemilihan Kelompok →"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // TAHAP 2: PEMILIHAN KELOMPOK
  if (!kelompokAktif) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white relative">
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
          <p className="text-slate-400 text-sm md:text-base">Pilih nomor kelompok Anda untuk menerima berkas kasus spesifik.</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-3xl w-full">
          {[1, 2, 3, 4, 5, 6].map((num) => (
            <button 
              key={num}
              onClick={() => {
                setKelompokAktif(num);
                const kasusAssigned = daftarKasus.find(k => k.kelompok.includes(num));
                if (kasusAssigned) {
                  setKasusAktif(kasusAssigned);
                  setPesan([]);
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

  // TAHAP 3: REGISTRASI TIM (BAGIAN I: IDENTITAS & PERAN ANGGOTA)
  if (kelompokAktif && !isIdentitasLengkap) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white relative">
        <button 
          onClick={() => setKelompokAktif(null)}
          className="absolute top-6 left-6 md:top-8 md:left-8 flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold"
        >
          <span>←</span> Kembali Pilih Kelompok
        </button>

        <div className="bg-slate-800 p-6 md:p-8 rounded-3xl shadow-xl border border-slate-700 max-w-lg w-full max-h-[90vh] overflow-y-auto [scrollbar-width:thin]">
          <div className="text-center mb-5">
            <div className="inline-block px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold rounded-full mb-2 uppercase tracking-wider">
              Kelas {namaKelas} • Kelompok {kelompokAktif} (5–6 Anak/Kelompok)
            </div>
            <div className="text-4xl mb-1.5">👥</div>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-1">BAGIAN I: IDENTITAS TIM DETEKTIF</h2>
            <p className="text-slate-400 text-xs">Masukkan nama anggota tim sesuai peran detektif masing-masing.</p>
          </div>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            if (anggotaInterregator.trim()) {
              setIsIdentitasLengkap(true);
            }
          }} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-blue-300 mb-1">
                1. Anggota 1 (Interregator Chat AI) <span className="text-red-400">*</span>
              </label>
              <input 
                type="text"
                required
                value={anggotaInterregator}
                onChange={(e) => setAnggotaInterregator(e.target.value)}
                placeholder="Nama siswa yang bertugas chat interogasi dengan AI"
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3.5 py-2 text-white text-xs md:text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-300 mb-1">
                2. Anggota 2 (Pencatat Bukti 1)
              </label>
              <input 
                type="text"
                value={anggotaPencatat1}
                onChange={(e) => setAnggotaPencatat1(e.target.value)}
                placeholder="Nama siswa pencatat petunjuk kunci 1"
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3.5 py-2 text-white text-xs md:text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-teal-300 mb-1">
                3. Anggota 3 (Pencatat Bukti 2)
              </label>
              <input 
                type="text"
                value={anggotaPencatat2}
                onChange={(e) => setAnggotaPencatat2(e.target.value)}
                placeholder="Nama siswa pencatat petunjuk kunci 2"
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3.5 py-2 text-white text-xs md:text-sm focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-purple-300 mb-1">
                4. Anggota 4 (Analis HAKI 1)
              </label>
              <input 
                type="text"
                value={anggotaAnalis1}
                onChange={(e) => setAnggotaAnalis1(e.target.value)}
                placeholder="Nama siswa analis pelanggaran hukum/etika 1"
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3.5 py-2 text-white text-xs md:text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-indigo-300 mb-1">
                5. Anggota 5 (Analis HAKI 2)
              </label>
              <input 
                type="text"
                value={anggotaAnalis2}
                onChange={(e) => setAnggotaAnalis2(e.target.value)}
                placeholder="Nama siswa analis pelanggaran hukum/etika 2"
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3.5 py-2 text-white text-xs md:text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-amber-300 mb-1">
                6. Anggota 6 (Juru Bicara Presentasi / Opsional jika 5 anak)
              </label>
              <input 
                type="text"
                value={anggotaJuruBicara}
                onChange={(e) => setAnggotaJuruBicara(e.target.value)}
                placeholder="Nama siswa juru bicara saat presentasi kelas"
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3.5 py-2 text-white text-xs md:text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all hover:-translate-y-0.5 shadow-lg mt-3 text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              Mulai Investigasi & Buka Berkas 🔍
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Kirim Pesan Interogasi Chat ke AI
  const kirimPesan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUser.trim() || isLoading) return;

    const pesanBaru = { role: "user", content: inputUser.trim() };
    const riwayatBaru = [...pesan, pesanBaru];
    setPesan(riwayatBaru);
    setInputUser("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
    } catch (err) {
      console.error(err);
      setPesan(prev => [...prev, { role: "assistant", content: "Koneksi ke Saksi Mata Digital terputus. Silakan coba ajukan pertanyaan lagi." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100 overflow-hidden">
      {/* Top Navbar */}
      <header className="h-14 bg-slate-800 border-b border-slate-700 px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              BERKAS INVESTIGASI TIM DETEKTIF
              <span className="hidden sm:inline-block px-2 py-0.5 bg-blue-600/30 text-blue-400 text-[10px] rounded-full border border-blue-500/30 font-mono">
                {namaKelas} • Kelompok {kelompokAktif}
              </span>
            </h1>
          </div>
        </div>

        {/* Tab Toggle Mobile & Tombol Kasus */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowKasusModal(true)}
            className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-600 flex items-center gap-1 font-semibold"
            title="Lihat Rincian Berkas Kasus"
          >
            <span>📁</span> <span className="hidden sm:inline">Kasus #{kasusAktif.id}</span>
          </button>

          {/* Tab Switcher Mobile */}
          <div className="flex lg:hidden bg-slate-900 p-0.5 rounded-lg border border-slate-700 text-xs font-semibold">
            <button
              onClick={() => setActiveTabMobile("chat")}
              className={`px-3 py-1 rounded-md transition-all ${
                activeTabMobile === "chat" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              💬 Interogasi
            </button>
            <button
              onClick={() => setActiveTabMobile("lembar")}
              className={`px-3 py-1 rounded-md transition-all ${
                activeTabMobile === "lembar" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              📝 Lembar LKPD
            </button>
          </div>

          <button
            onClick={() => setKelompokAktif(null)}
            className="text-xs text-slate-400 hover:text-white px-2 py-1"
            title="Ganti Kelompok"
          >
            Keluar
          </button>
        </div>
      </header>

      {/* Main Container Dual Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* PANEL KIRI: INTEROGASI AI (CHAT) */}
        <div className={`w-full lg:w-1/2 flex flex-col bg-slate-900 border-r border-slate-800 h-full ${
          activeTabMobile === "chat" ? "flex" : "hidden lg:flex"
        }`}>
          {/* Chat Header Status */}
          <div className="p-3 bg-slate-850 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-semibold text-slate-300">Saksi Mata Digital (AI) Terhubung</span>
            </div>
            <span className="text-[11px] text-slate-500">Ajukan pertanyaan analitis untuk menggali clues</span>
          </div>

          {/* Chat Bubble Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 [scrollbar-width:thin]">
            {pesan.length === 0 && (
              <div className="p-6 text-center text-slate-400 max-w-md mx-auto my-auto space-y-3">
                <div className="text-4xl">🕵️‍♀️💬</div>
                <h3 className="font-bold text-white text-base">Mulai Interogasi Saksi Mata Digital</h3>
                <p className="text-xs leading-relaxed">
                  Saksi ini memegang petunjuk rahasia mengenai kasus <strong>"{kasusAktif.judul}"</strong>. Tanyakan siapa pelakunya, bukti apa yang ditemukan, atau lisensi apa yang dilanggar!
                </p>
                <div className="text-left text-xs bg-slate-800 p-3 rounded-xl border border-slate-700 space-y-1 text-slate-300">
                  <p className="font-bold text-blue-400 mb-1">💡 Contoh pertanyaan pemantik:</p>
                  <p>• "Apa yang kamu lihat ketika pelaku menyebarkan karya korban?"</p>
                  <p>• "Apakah korban memiliki lisensi resmi atas karya tersebut?"</p>
                  <p>• "Mengapa tindakan pelaku dikategorikan melanggar hukum?"</p>
                </div>
              </div>
            )}

            {pesan.map((p, idx) => (
              <div key={idx} className={`flex gap-3 ${p.role === "user" ? "justify-end" : "justify-start"}`}>
                {p.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center shrink-0 text-base">
                    🤖
                  </div>
                )}
                <div className={`p-3.5 rounded-2xl max-w-[85%] text-xs md:text-sm leading-relaxed whitespace-pre-wrap ${
                  p.role === "user" 
                    ? "bg-blue-600 text-white rounded-br-none shadow-md" 
                    : "bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none shadow"
                }`}>
                  {p.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2 items-center text-slate-400 text-xs italic pl-11">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
                Saksi Mata Digital sedang mengetik petunjuk...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form Chat Input */}
          <form onSubmit={kirimPesan} className="p-3 bg-slate-800 border-t border-slate-700 flex gap-2 shrink-0">
            <input
              type="text"
              value={inputUser}
              onChange={(e) => setInputUser(e.target.value)}
              placeholder="Ketik pertanyaan investigasi kepada saksi di sini..."
              disabled={isLoading}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-xs md:text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !inputUser.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl transition-all text-xs md:text-sm shrink-0 flex items-center gap-1.5"
            >
              <span>Tanya</span> 🔍
            </button>
          </form>
        </div>

        {/* PANEL KANAN: LEMBAR INVESTIGASI (LKPD FORM) */}
        <div className={`w-full lg:w-1/2 flex flex-col bg-slate-950 h-full overflow-hidden ${
          activeTabMobile === "lembar" ? "flex" : "hidden lg:flex"
        }`}>
          {/* Header Lembar Investigasi & Auto Save */}
          <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-base">📝</span>
              <span className="font-bold text-xs uppercase tracking-wider text-slate-200">
                Lembar Kerja Investigasi (LKPD)
              </span>
            </div>
            <div className="flex items-center gap-2">
              {saveStatus === "saving" && (
                <span className="text-[11px] text-amber-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span> Menyimpan...
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <span>✓</span> Tersimpan otomatis
                </span>
              )}
              {isSubmitted && (
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold rounded-full">
                  FINAL TERKIRIM
                </span>
              )}
            </div>
          </div>

          {/* Form Konten LKPD (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 [scrollbar-width:thin] text-slate-200 text-xs">
            
            {/* Judul Berkas */}
            <div className="border-b border-slate-800 pb-3 text-center">
              <h2 className="text-base font-extrabold text-white tracking-wide">
                BERKAS INVESTIGASI TIM DETEKTIF HAKI
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Isi lembar kerja ini berdasarkan hasil interogasi saksi digital dan diskusi bersama tim.
              </p>
            </div>

            {/* BAGIAN I: IDENTITAS TIM DETEKTIF */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🏷️</span> BAGIAN I: IDENTITAS TIM DETEKTIF
                </h3>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-medium">
                  5–6 Anak/Kelompok
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-[10px] text-slate-400 block">Kelas:</span>
                  <span className="font-bold text-white text-xs">{namaKelas}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Nomor Kelompok:</span>
                  <span className="font-bold text-white text-xs">Kelompok {kelompokAktif}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Kasus yang Diteliti:</span>
                  <span className="font-bold text-blue-300 text-xs">Kasus #{kasusAktif.id} ({kasusAktif.judul})</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-300 block mb-1.5">Nama Anggota & Peran:</span>
                <div className="space-y-1.5 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <p>1. <strong className="text-white">{anggotaInterregator || "(Belum diisi)"}</strong> <span className="text-blue-400 text-[11px] font-medium">(Interregator Chat AI)</span></p>
                  <p>2. <strong className="text-white">{anggotaPencatat1 || "(Belum diisi)"}</strong> <span className="text-emerald-400 text-[11px] font-medium">(Pencatat Bukti 1)</span></p>
                  <p>3. <strong className="text-white">{anggotaPencatat2 || "(Belum diisi)"}</strong> <span className="text-teal-400 text-[11px] font-medium">(Pencatat Bukti 2)</span></p>
                  <p>4. <strong className="text-white">{anggotaAnalis1 || "(Belum diisi)"}</strong> <span className="text-purple-400 text-[11px] font-medium">(Analis HAKI 1)</span></p>
                  <p>5. <strong className="text-white">{anggotaAnalis2 || "(Belum diisi)"}</strong> <span className="text-indigo-400 text-[11px] font-medium">(Analis HAKI 2)</span></p>
                  <p>6. <strong className="text-white">{anggotaJuruBicara || "(Belum diisi / Opsional jika 5 anak)"}</strong> <span className="text-amber-400 text-[11px] font-medium">(Juru Bicara Presentasi)</span></p>
                </div>
              </div>
            </div>

            {/* BAGIAN II: CATATAN BUKTI INVESTIGASI */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3.5">
              <div>
                <h3 className="font-bold text-xs text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🔍</span> BAGIAN II: CATATAN BUKTI INVESTIGASI (EVIDENCE LOG)
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Instruksi: Tuliskan petunjuk-petunjuk kunci (clues) yang kamu dapatkan setelah menginterogasi "Saksi Mata Digital" (AI) pada Tab Interogasi!
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    1. Petunjuk #1 (Mengenai Pelaku / Tindakan yang Dilakukan):
                  </label>
                  <textarea
                    rows={2}
                    value={petunjuk1}
                    onChange={(e) => setPetunjuk1(e.target.value)}
                    placeholder="Contoh: Saksi menyebutkan pelaku mengunduh video lalu memotong watermark..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-emerald-500 transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    2. Petunjuk #2 (Mengenai Aset / Karya yang Dirugikan):
                  </label>
                  <textarea
                    rows={2}
                    value={petunjuk2}
                    onChange={(e) => setPetunjuk2(e.target.value)}
                    placeholder="Contoh: Karya berupa konten video sains eksperimen milik channel YouTube sekolah..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-emerald-500 transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    3. Petunjuk #3 (Mengenai Lisensi / Status Hukum Karya):
                  </label>
                  <textarea
                    rows={2}
                    value={petunjuk3}
                    onChange={(e) => setPetunjuk3(e.target.value)}
                    placeholder="Contoh: Karya asli memiliki hak cipta terdaftar dan tidak diizinkan untuk dikomersialkan tanpa izin..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-emerald-500 transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            {/* BAGIAN III: LEMBAR ANALISIS HAKI (HOTS - C4) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3.5">
              <div>
                <h3 className="font-bold text-xs text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>⚖️</span> BAGIAN III: LEMBAR ANALISIS HAKI (HOTS - C4)
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Jawablah pertanyaan analisis berikut berdasarkan bukti-bukti yang telah kalian himpun:
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    1. Tindakan spesifik apa dari pelaku yang melanggar etika digital / hukum?
                  </label>
                  <textarea
                    rows={2}
                    value={analisisTindakan}
                    onChange={(e) => setAnalisisTindakan(e.target.value)}
                    placeholder="Jelaskan tindakan konkrit pelaku yang melanggar aturan..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-purple-500 transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
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
                        className="text-[10px] bg-slate-800 hover:bg-purple-900/40 text-purple-300 border border-purple-500/30 px-2.5 py-1 rounded-lg transition-all"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={2}
                    value={jenisHaki}
                    onChange={(e) => setJenisHaki(e.target.value)}
                    placeholder="Pilih & Jelaskan: Hak Cipta, Lisensi CC, Hak Moral, atau Hak Ekonomi yang dilanggar..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-purple-500 transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    3. Siapa pihak yang paling dirugikan dan apa dampak kerugiannya (moral / ekonomi)?
                  </label>
                  <textarea
                    rows={2}
                    value={analisisKerugian}
                    onChange={(e) => setAnalisisKerugian(e.target.value)}
                    placeholder="Uraikan siapa yang dirugikan serta bentuk kerugian materil/imateril yang dialami..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-purple-500 transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            {/* BAGIAN IV: REKOMENDASI SOLUSI & MITIGASI (HOTS - C5) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3.5">
              <div>
                <h3 className="font-bold text-xs text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🛡️</span> BAGIAN IV: REKOMENDASI SOLUSI & MITIGASI KASUS (HOTS - C5)
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Bagaimana cara menyelesaikan masalah ini secara adil dan etis?
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    1. Langkah penyelesaian adil untuk korban saat ini:
                  </label>
                  <textarea
                    rows={2}
                    value={solusiAdil}
                    onChange={(e) => setSolusiAdil(e.target.value)}
                    placeholder="Contoh: Takedown konten bajakan, kompensasi ganti rugi, permohonan maaf terbuka..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-amber-500 transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    2. Aturan etis yang harus dipatuhi agar kita tidak menjadi pelaku pelanggaran HAKI di masa depan:
                  </label>
                  <textarea
                    rows={2}
                    value={aturanEtis}
                    onChange={(e) => setAturanEtis(e.target.value)}
                    placeholder="Contoh: Selalu mencantumkan atribusi sumber, membeli lisensi legal, meminta izin tertulis..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-amber-500 transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            {/* BAGIAN V: JURNAL REFLEKSI DIRI */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h3 className="font-bold text-xs text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>💭</span> BAGIAN V: JURNAL REFLEKSI DIRI
              </h3>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  • Hal paling berharga yang saya pelajari hari ini tentang Hak Cipta:
                </label>
                <textarea
                  rows={2}
                  value={refleksiDiri}
                  onChange={(e) => setRefleksiDiri(e.target.value)}
                  placeholder="Tuliskan pemahaman atau kesadaran baru yang kamu peroleh dari misi investigasi ini..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-rose-500 transition-all resize-none"
                />
              </div>
            </div>

            {/* Action Submit Final */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleFinalSubmit}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl transition-all shadow-lg hover:-translate-y-0.5 text-xs md:text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>🚀</span> {isSubmitted ? "Kirim Ulang Pembaruan LKPD" : "Kirim Final Berkas Investigasi ke Guru"}
              </button>
              <p className="text-[10px] text-slate-500 text-center mt-2 italic">
                Setiap ketikan Anda tersimpan otomatis di database. Klik tombol di atas jika sudah yakin untuk mengirim laporan akhir.
              </p>
            </div>

          </div>
        </div>

      </div>

      {/* Modal Rincian Kasus */}
      {showKasusModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-3xl max-w-lg w-full shadow-2xl p-6 border border-slate-700">
            <div className="flex justify-between items-center mb-3">
              <span className="px-2.5 py-1 bg-blue-600/20 text-blue-400 rounded-full text-xs font-bold border border-blue-500/30">
                Kasus #{kasusAktif.id}
              </span>
              <button onClick={() => setShowKasusModal(false)} className="text-slate-400 hover:text-white text-lg font-bold">
                ✕
              </button>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{kasusAktif.judul}</h3>
            <p className="text-xs text-slate-300 leading-relaxed bg-slate-900 p-4 rounded-xl border border-slate-700/80 mb-4">
              {kasusAktif.deskripsi}
            </p>
            <button
              onClick={() => setShowKasusModal(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all"
            >
              Lanjutkan Investigasi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
