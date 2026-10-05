"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";

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
  const [kelompokAktif, setKelompokAktif] = useState<number | null>(null);
  const [kelas, setKelas] = useState("");
  const [namaAnggota, setNamaAnggota] = useState("");
  const [isIdentitasLengkap, setIsIdentitasLengkap] = useState(false);
  
  const [kasusAktif, setKasusAktif] = useState(daftarKasus[0]);
  const [pesan, setPesan] = useState<{ role: string; content: string }[]>([]);
  const [inputUser, setInputUser] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll ke pesan terbaru
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [pesan, isLoading]);

  // Jika kelompok belum dipilih, tampilkan layar pemilihan kelompok
  if (!kelompokAktif) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white relative">
        {/* Tombol Kembali ke Beranda */}
        <button 
          onClick={() => window.location.href = '/'}
          className="absolute top-6 left-6 md:top-8 md:left-8 flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold"
        >
          <span>←</span> Kembali ke Beranda
        </button>

        <div className="text-center mb-10 mt-12 md:mt-0">
          <div className="flex justify-center mb-4">
            <img src="/logo.png" alt="Logo" className="w-20 h-20 object-contain drop-shadow-lg" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            Identifikasi Tim Detektif
          </h1>
          <p className="text-slate-400 text-lg">Silakan pilih kelompok Anda untuk menerima berkas kasus spesifik.</p>
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

  // Jika kelompok sudah dipilih tapi identitas belum lengkap
  if (kelompokAktif && !isIdentitasLengkap) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white relative">
        <button 
          onClick={() => setKelompokAktif(null)}
          className="absolute top-6 left-6 md:top-8 md:left-8 flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold"
        >
          <span>←</span> Kembali Pilih Kelompok
        </button>

        <div className="bg-slate-800 p-8 rounded-3xl shadow-xl border border-slate-700 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">📝</div>
            <h2 className="text-2xl font-bold text-white mb-2">Registrasi Tim {kelompokAktif}</h2>
            <p className="text-slate-400 text-sm">Masukkan identitas anggota tim sebelum memulai investigasi.</p>
          </div>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            if(kelas.trim() && namaAnggota.trim()) setIsIdentitasLengkap(true);
          }} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Kelas</label>
              <input 
                type="text" 
                required
                value={kelas}
                onChange={(e) => setKelas(e.target.value)}
                placeholder="Contoh: 9A" 
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Nama Anggota (Pisahkan dengan koma)</label>
              <textarea 
                required
                value={namaAnggota}
                onChange={(e) => setNamaAnggota(e.target.value)}
                placeholder="Contoh: Budi, Andi, Siska" 
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-24 resize-none transition-all"
              ></textarea>
            </div>
            <button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all hover:-translate-y-1 shadow-lg mt-4"
            >
              Mulai Investigasi
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
      // 1. Simpan pesan user ke Supabase (jika sudah dikonfigurasi)
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("url_proyek_supabase_anda")) {
        const { error: insertError } = await supabase.from("chat_history").insert({
          kelompok: kelompokAktif,
          kelas: kelas,
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

      // 2. Simpan pesan AI ke Supabase setelah selesai stream
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("url_proyek_supabase_anda")) {
        const { error: aiInsertError } = await supabase.from("chat_history").insert({
          kelompok: kelompokAktif,
          kelas: kelas,
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
    <div className="h-[100dvh] bg-slate-50 flex flex-col md:flex-row p-2 md:p-4 gap-4 md:gap-6 overflow-hidden">
      {/* Sidebar Informasi Kasus Khusus Kelompok */}
      <div className="w-full md:w-1/3 lg:w-1/4 bg-slate-900 p-4 md:p-6 rounded-3xl shadow-lg border border-slate-800 text-white flex flex-col relative overflow-y-auto shrink-0 max-h-[25vh] md:max-h-none">
        {/* Dekorasi Background */}
        <div className="absolute top-0 right-0 p-8 opacity-5 text-9xl">📁</div>

        <div className="relative z-10">
          <div className="inline-block px-3 py-1 bg-blue-600 rounded-full text-xs font-bold tracking-widest mb-6">
            KOTAK MASUK KELOMPOK {kelompokAktif}
          </div>
          <h2 className="text-2xl font-black mb-2 leading-tight">
            Kasus #{kasusAktif.id}
          </h2>
          <h3 className="text-xl text-blue-400 font-bold mb-6">
            {kasusAktif.judul}
          </h3>
          
          <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700 mb-6">
            <h4 className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-wide">Ringkasan Laporan</h4>
            <p className="text-slate-300 leading-relaxed text-sm">
              {kasusAktif.deskripsi}
            </p>
          </div>

          <button 
            onClick={() => setKelompokAktif(null)}
            className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all font-semibold text-sm border border-slate-700"
          >
            ← Ganti Kelompok
          </button>
        </div>
      </div>

      {/* Chat Area (Saksi Mata AI) */}
      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-4 bg-white">
          <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
            <img src="/logo.png" alt="AI" className="w-full h-full object-contain" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-slate-800">Saksi Mata AI</h2>
            <p className="text-sm text-slate-500">
              Merespons untuk Kelompok {kelompokAktif}
            </p>
          </div>
        </div>
        
        <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6 bg-slate-50/50">
          {pesan.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-6 max-w-md mx-auto text-center px-4">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center text-5xl shadow-inner shadow-blue-200/50">
                🔎
              </div>
              <div>
                <h3 className="font-bold text-xl text-slate-700 mb-2">Siap Memulai Interogasi?</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Saksi Mata AI siap membantu Tim Detektif {kelompokAktif}. Namun ingat, dia hanya akan memberikan petunjuk, bukan jawaban langsung!
                </p>
                <div className="bg-white border border-slate-200 rounded-xl p-4 text-left shadow-sm">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tips Bertanya:</h4>
                  <ul className="text-sm text-slate-600 space-y-2 list-disc list-inside">
                    <li>Tanyakan kronologi kejadian.</li>
                    <li>Tanyakan bukti digital yang ditemukan.</li>
                    <li>Cari tahu hukum HAKI apa yang dilanggar.</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            pesan.map((p, i) => (
              <div key={i} className={`flex ${p.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] md:max-w-[75%] p-4 rounded-2xl shadow-sm ${
                  p.role === "user" 
                    ? "bg-blue-600 text-white rounded-br-sm" 
                    : "bg-white border border-slate-100 text-slate-800 rounded-bl-sm"
                }`}>
                  {p.content}
                </div>
              </div>
            ))
          )}
          {isLoading && pesan[pesan.length - 1]?.role !== 'assistant' && (
             <div className="flex justify-start">
               <div className="bg-white border border-slate-100 text-slate-500 p-4 rounded-2xl rounded-bl-sm animate-pulse shadow-sm">
                 Sedang mencari petunjuk...
               </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={kirimPesan} className="sticky bottom-0 p-4 border-t border-slate-200 bg-white flex gap-3 z-20 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)]">
          <input
            type="text"
            value={inputUser}
            onChange={(e) => setInputUser(e.target.value)}
            placeholder="Tanyakan sesuatu terkait kasus ini..."
            className="flex-1 px-5 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 bg-slate-50 transition-all"
          />
          <button 
            type="submit" 
            disabled={isLoading || !inputUser.trim()}
            className="px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md active:scale-[0.98]"
          >
            Kirim
          </button>
        </form>
      </div>
    </div>
  );
}
