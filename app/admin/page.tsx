"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full p-8 rounded-3xl shadow-xl border border-slate-200">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800">Dasbor Guru</h1>
          <p className="text-slate-500 mt-2">Masuk ke panel kontrol aktivitas kelas.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="courseCode" className="block text-sm font-bold text-slate-700 mb-2">
              Kode Akses Kelas
            </label>
            <input
              id="courseCode"
              type="text"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              placeholder="Contoh: PPG-12345"
              className={`w-full px-5 py-4 rounded-xl border-2 ${
                error ? "border-red-500 focus:ring-red-500 bg-red-50" : "border-slate-200 focus:ring-blue-500 bg-slate-50"
              } focus:outline-none focus:bg-white transition-all text-slate-800 font-medium`}
            />
            {error && (
              <p className="text-red-500 text-sm mt-3 font-semibold">{error}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-4 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            Masuk Dasbor
          </button>
        </form>

        {isSuccess && (
          <div className="mt-6 p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 flex gap-3 items-center">
            <span className="text-xl">✅</span>
            <p className="font-semibold text-sm">Kode valid. Memuat dasbor pemantauan...</p>
          </div>
        )}
      </div>
    </div>
  );
}
