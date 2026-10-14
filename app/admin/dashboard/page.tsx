"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
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

export default function AdminDashboard() {
  const [chats, setChats] = useState<ChatRecord[]>([]);
  const [lkpdList, setLkpdList] = useState<LkpdReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedKelompok, setSelectedKelompok] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"lkpd" | "chat">("lkpd");

  const fetchData = async () => {
    // Cek apakah supabase url valid
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

      if (lkpdError) {
        console.warn("Tabel lkpd_reports mungkin belum dibuat di Supabase:", lkpdError);
      } else {
        setLkpdList(lkpdData || []);
      }

    } catch (err: any) {
      console.error("Error fetching admin data:", err);
      setError("Gagal mengambil data dari Supabase. Pastikan tabel chat_history dan lkpd_reports sudah dibuat.");
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

  // Kumpulkan semua nomor kelompok yang ada (baik dari chat maupun dari lkpd_reports)
  const allKelompokKeys = Array.from(
    new Set([
      ...chats.map((c) => c.kelompok),
      ...lkpdList.map((l) => l.kelompok)
    ])
  ).sort((a, b) => a - b);

  // Helper untuk mendapatkan data kelompok
  const getGroupMetadata = (k: number) => {
    const lkpd = lkpdList.find((l) => l.kelompok === k);
    const chat = chats.find((c) => c.kelompok === k);
    return {
      kelas: lkpd?.kelas || chat?.kelas || "9",
      nama_anggota: chat?.nama_anggota || "Belum ada nama",
      kasus_id: lkpd?.kasus_id || chat?.kasus_id || 1,
      bukti_petunjuk: lkpd?.bukti_petunjuk || "",
      analisis_pelanggaran: lkpd?.analisis_pelanggaran || "",
      solusi_rekomendasi: lkpd?.solusi_rekomendasi || "",
      is_submitted: lkpd?.is_submitted || false,
      updated_at: lkpd?.updated_at || null,
      messages: chats.filter((c) => c.kelompok === k)
    };
  };

  const selectedGroupData = selectedKelompok ? getGroupMetadata(selectedKelompok) : null;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* Sidebar - Daftar Kelompok */}
      <div className="w-full md:w-80 lg:w-96 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-200 bg-slate-900 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
              <h1 className="text-lg font-bold">Dasbor Guru</h1>
            </div>
            <button 
              onClick={fetchData} 
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 transition-all flex items-center gap-1"
              title="Refresh Data"
            >
              🔄 Refresh
            </button>
          </div>
          <p className="text-slate-400 text-xs">Pantau interogasi & LKPD Digital siswa.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          <div className="flex justify-between items-center px-1 mb-2">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kelompok Aktif</h2>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
              {allKelompokKeys.length} Tim
            </span>
          </div>

          {allKelompokKeys.length === 0 && !isLoading && !error && (
            <div className="text-center py-8 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
              <span className="text-3xl block mb-2">⏳</span>
              <p className="text-xs text-slate-500 font-medium">Belum ada kelompok yang mengisi identitas atau interogasi.</p>
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

      {/* Main Content: Monitor LKPD Digital & Chat */}
      <div className="flex-1 bg-slate-50 p-4 md:p-6 overflow-hidden flex flex-col">
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
                Klik salah satu kelompok di panel samping untuk memeriksa <strong>LKPD Digital (bukti petunjuk, analisis pelanggaran C4, dan rekomendasi solusi C5)</strong> serta transkrip chat mereka.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col overflow-hidden">
            {/* Header Detail Kelompok Terpilih */}
            <div className="p-5 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-extrabold text-lg text-slate-800">Kelompok {selectedKelompok}</h2>
                  <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2.5 py-0.5 rounded-full">
                    Kelas {selectedGroupData.kelas}
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
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
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

            {/* Content Area Berdasarkan Tab */}
            <div className="flex-1 p-5 overflow-y-auto bg-slate-50/60">
              
              {/* TAB 1: LAPORAN LKPD DIGITAL (lkpd_reports) */}
              {activeTab === "lkpd" && (
                <div className="space-y-5 max-w-4xl mx-auto">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                        <span>📋</span> Laporan LKPD Digital
                      </h3>
                      {selectedGroupData.is_submitted ? (
                        <span className="text-xs bg-emerald-500 text-white font-bold px-2 py-0.5 rounded-full">
                          Final
                        </span>
                      ) : (
                        <span className="text-xs bg-amber-500 text-white font-bold px-2 py-0.5 rounded-full">
                          Draft
                        </span>
                      )}
                    </div>
                    {selectedGroupData.updated_at && (
                      <span className="text-[11px] text-slate-400">
                        Terakhir diupdate: {new Date(selectedGroupData.updated_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                      </span>
                    )}
                  </div>

                  {/* 1. bukti_petunjuk */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">1</span>
                      <h4 className="font-bold text-slate-800 text-sm">Bukti & Petunjuk dari AI (Log Clues)</h4>
                    </div>
                    {selectedGroupData.bukti_petunjuk ? (
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100">
                        {selectedGroupData.bukti_petunjuk}
                      </p>
                    ) : (
                      <div className="p-4 bg-slate-50 rounded-xl text-center border border-dashed border-slate-200">
                        <p className="text-xs text-slate-400 italic">Siswa belum mengisi bukti & petunjuk.</p>
                      </div>
                    )}
                  </div>

                  {/* 2. analisis_pelanggaran (C4) */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-bold">2</span>
                      <h4 className="font-bold text-slate-800 text-sm">Analisis Pelanggaran: Jenis HAKI & UU yang Dilanggar (C4)</h4>
                    </div>
                    {selectedGroupData.analisis_pelanggaran ? (
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100">
                        {selectedGroupData.analisis_pelanggaran}
                      </p>
                    ) : (
                      <div className="p-4 bg-slate-50 rounded-xl text-center border border-dashed border-slate-200">
                        <p className="text-xs text-slate-400 italic">Siswa belum mengisi analisis pelanggaran.</p>
                      </div>
                    )}
                  </div>

                  {/* 3. solusi_rekomendasi (C5) */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">3</span>
                      <h4 className="font-bold text-slate-800 text-sm">Solusi Etis & Rekomendasi Mitigasi (C5)</h4>
                    </div>
                    {selectedGroupData.solusi_rekomendasi ? (
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100">
                        {selectedGroupData.solusi_rekomendasi}
                      </p>
                    ) : (
                      <div className="p-4 bg-slate-50 rounded-xl text-center border border-dashed border-slate-200">
                        <p className="text-xs text-slate-400 italic">Siswa belum mengisi solusi & rekomendasi mitigasi.</p>
                      </div>
                    )}
                  </div>

                </div>
              )}

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
    </div>
  );
}
