import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl text-center space-y-8">
        <div className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-semibold tracking-widest text-sm mb-4">
          MISI PEMBELAJARAN INTERAKTIF
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400">
          DETEKTIF HAKI
        </h1>
        <p className="text-xl md:text-2xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Halo Agen! Siap mengungkap misteri pelanggaran Hak Kekayaan Intelektual? 
          Misi kamu adalah menyelidiki kasus-kasus digital, mewawancarai saksi AI, dan menemukan kebenaran.
        </p>
        <div className="pt-8">
          <Link 
            href="/investigasi" 
            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full text-xl transition-all shadow-lg hover:shadow-blue-500/50 hover:-translate-y-1"
          >
            Mulai Investigasi 🔍
          </Link>
        </div>
      </div>
    </main>
  );
}

