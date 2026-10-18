import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white flex flex-col items-center justify-between p-4 sm:p-6 md:p-10 relative overflow-hidden">
      
      {/* Background Ambient Glowing Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 sm:w-[500px] sm:h-[500px] bg-gradient-to-tr from-blue-600/20 via-indigo-500/20 to-emerald-500/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -top-20 -left-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Bar / Branding */}
      <header className="w-full max-w-6xl flex items-center justify-between z-10 py-2">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img src="/logo.png" alt="Logo Detektif HAKI" className="w-9 h-9 sm:w-11 sm:h-11 object-contain drop-shadow-md" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
          </div>
          <div>
            <span className="font-black text-sm sm:text-base tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
              DETEKTIF HAKI
            </span>
            <span className="hidden sm:block text-[10px] text-slate-400 font-medium">
              Laboratorium Investigasi Digital Inovasi PPG
            </span>
          </div>
        </div>

        <Link
          href="/admin"
          className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-amber-300 border border-amber-500/30 transition-all flex items-center gap-1.5 hover:shadow-lg hover:shadow-amber-500/10 active:scale-95 cursor-pointer"
        >
          <span>👨‍🏫</span> <span className="hidden sm:inline">Dasbor Guru & Proyektor</span>
          <span className="sm:hidden">Guru</span>
        </Link>
      </header>

      {/* Hero Section */}
      <div className="max-w-4xl text-center space-y-6 sm:space-y-8 my-auto z-10 py-8">
        
        {/* Animated Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 via-emerald-500/10 to-purple-500/10 border border-blue-500/30 text-blue-300 font-black tracking-widest text-[11px] sm:text-xs shadow-inner">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          MISI PEMBELAJARAN INOVATIF & INTERAKTIF
        </div>

        {/* Main Punchy Title */}
        <div className="space-y-2">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-tight">
            AKADEMI <br className="sm:hidden" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-emerald-400 drop-shadow-sm">
              DETEKTIF HAKI
            </span>
          </h1>
          <p className="text-sm sm:text-lg md:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed font-medium">
            Ungkap misteri pelanggaran Hak Cipta & Lisensi Digital! Wawancarai saksi AI, analisis bukti dengan UU No. 28/2014, dan tuntaskan berkas investigasi bersama tim.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
          <Link 
            href="/investigasi" 
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:via-indigo-500 hover:to-cyan-400 text-white font-black rounded-2xl text-base sm:text-lg transition-all shadow-xl shadow-blue-600/30 hover:shadow-cyan-500/40 hover:-translate-y-1 active:scale-95 cursor-pointer"
          >
            <span className="text-xl">🔍</span>
            <span>Mulai Misi Investigasi</span>
            <span className="text-sm bg-white/20 px-2 py-0.5 rounded-lg ml-1 font-mono">Siswa</span>
          </Link>

          <Link
            href="/admin"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 hover:text-white font-bold rounded-2xl text-sm sm:text-base border border-slate-700 hover:border-slate-500 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <span>📽️</span>
            <span>Mode Layar Proyektor Kelas</span>
          </Link>
        </div>

        {/* Feature Cards Grid (3 Layar Kolaborasi Multi-Device) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-6 text-left">
          
          {/* Card 1 */}
          <div className="bg-slate-900/70 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-800 hover:border-blue-500/40 transition-all shadow-lg hover:-translate-y-0.5 group">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition-transform">
              🤖
            </div>
            <h3 className="font-bold text-sm text-white mb-1 flex items-center gap-1.5">
              <span>Saksi Mata Digital AI</span>
              <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.2 rounded font-mono">Laptop</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Interogasi saksi kunci dengan kecerdasan buatan untuk mengumpulkan alibi dan petunjuk pelanggaran.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-900/70 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-800 hover:border-emerald-500/40 transition-all shadow-lg hover:-translate-y-0.5 group">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition-transform">
              📱
            </div>
            <h3 className="font-bold text-sm text-white mb-1 flex items-center gap-1.5">
              <span>Multi-Device Sync</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-mono">HP Tim</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              1 Laptop interogasi, 1 HP catat bukti, dan 1 HP telaah pasal UU dalam satu room tanpa saling menimpa.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-900/70 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-800 hover:border-purple-500/40 transition-all shadow-lg hover:-translate-y-0.5 group">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition-transform">
              ⚖️
            </div>
            <h3 className="font-bold text-sm text-white mb-1 flex items-center gap-1.5">
              <span>HOTS C4 & C5 + AI</span>
              <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.2 rounded font-mono">LKPD</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Kritisi hukum UU 28/2014, rancang solusi mitigasi adil, serta evaluasi rubrik otomatis berstandar PPG.
            </p>
          </div>

        </div>

      </div>

      {/* Footer */}
      <footer className="w-full max-w-6xl text-center z-10 py-3 border-t border-slate-800/80 text-[11px] sm:text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>© {new Date().getFullYear()} Inovasi Pembelajaran PPG • Media Game Investigasi HAKI</span>
        <div className="flex items-center gap-3 text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Sistem Siap Digunakan
          </span>
          <span>•</span>
          <span>Kurikulum Merdeka Informatika</span>
        </div>
      </footer>

    </main>
  );
}
