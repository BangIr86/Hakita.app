"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminPage() {
  const router = useRouter();
  const [courseCode, setCourseCode] = useState("");
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // ATURAN KRITIS: Harus diawali 'PPG-' dan diakhiri HANYA DENGAN ANGKA.
    const regex = /^PPG-\d+$/;
    
    if (!regex.test(courseCode)) {
      setError("Format kode tidak valid! Harus diawali 'PPG-' dan hanya boleh diikuti angka (Contoh: PPG-1234).");
      setIsSuccess(false);
      return;
    }

    // Lolos validasi
    setError("");
    setIsSuccess(true);
    
    // Redirect ke dashboard admin
    setTimeout(() => {
      router.push("/admin/dashboard");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col items-center justify-center p-4 relative overflow-hidden text-white">
      
      {/* Ambient Glow Orbs */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="bg-slate-900/80 backdrop-blur-xl max-w-md w-full p-6 sm:p-8 rounded-3xl shadow-2xl border border-slate-700/80 relative z-10">
        
        {/* Tombol Kembali ke Beranda */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-6 font-semibold"
        >
          <span>←</span> Kembali ke Beranda
        </Link>

        <div className="text-center mb-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 relative">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain drop-shadow-lg" />
            <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-amber-400 animate-ping"></span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold rounded-full mb-2">
            <span>🛡️</span> Portal Guru & Penguji PPG
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Dasbor Guru</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Pantau investigasi, evaluasi AI, ekspor nilai, & presentasi proyektor.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="courseCode" className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
              Kode Akses Guru
            </label>
            <input
              id="courseCode"
              type="text"
              value={courseCode}
              onChange={(e) => {
                setCourseCode(e.target.value.toUpperCase());
                if (error) setError("");
              }}
              placeholder="Contoh: PPG-1234"
              className={`w-full px-4 py-3.5 rounded-2xl border-2 font-mono text-center tracking-widest text-lg font-bold text-white transition-all focus:outline-none ${
                error 
                  ? "border-red-500 bg-red-950/20 focus:ring-2 focus:ring-red-500" 
                  : "border-slate-700 bg-slate-950/70 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
              }`}
            />
            {error && (
              <p className="text-red-400 text-xs mt-2 font-semibold flex items-center gap-1">
                <span>⚠️</span> {error}
              </p>
            )}
            <p className="text-[11px] text-slate-500 mt-2 text-center">
              Format: <span className="font-mono text-slate-400">PPG-[angka]</span> (misal: PPG-1234)
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Masuk Dasbor Pemantauan</span>
            <span>🚀</span>
          </button>
        </form>

        {isSuccess && (
          <div className="mt-5 p-3.5 bg-emerald-950/50 text-emerald-300 rounded-2xl border border-emerald-500/30 flex gap-2.5 items-center animate-in fade-in slide-in-from-top duration-300">
            <span className="text-lg">✅</span>
            <p className="font-bold text-xs">Akses terverifikasi. Memuat panel kelas...</p>
          </div>
        )}
      </div>
    </div>
  );
}
