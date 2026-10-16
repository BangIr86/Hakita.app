"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DEFAULT_KELAS_LIST } from "@/lib/constants";
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

type KelasItem = {
  kode_kelas: string;
  nama_kelas: string;
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

  // State Modals
  const [showKelasModal, setShowKelasModal] = useState(false);
  const [inputNamaKelasBaru, setInputNamaKelasBaru] = useState("");
  const [inputKodeKelasBaru, setInputKodeKelasBaru] = useState("");
  const [isSavingKelas, setIsSavingKelas] = useState(false);
  const [pesanSuksesKelas, setPesanSuksesKelas] = useState("");

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
        .select("kode_kelas, nama_kelas")
        .order("created_at", { ascending: true });

      if (!sesiError && sesiData && sesiData.length > 0) {
        setKelasList(sesiData);
      }

    } catch (err: any) {
      console.error("Error fetching admin data:", err);
      setError("Gagal mengambil data dari Supabase. Pastikan tabel chat_history, lkpd_reports, dan kelas_sesi sudah dibuat.");
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

  // Handler Generate Kode Kelas Baru
  const handleSimpanKelasBaru = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputNamaKelasBaru.trim()) return;

    const cleanNama = inputNamaKelasBaru.trim().toUpperCase();
    const cleanKode = (inputKodeKelasBaru.trim() || `HAKI-${cleanNama}`).toUpperCase();

    setIsSavingKelas(true);
    setPesanSuksesKelas("");

    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("url_proyek_supabase_anda")) {
        const { error: insertError } = await supabase
          .from("kelas_sesi")
          .insert({
            kode_kelas: cleanKode,
            nama_kelas: cleanNama
          });

        if (insertError) {
          console.warn("Gagal simpan ke DB kelas_sesi, menambahkan ke state lokal:", insertError);
        }
      }

      // Update state lokal
      setKelasList((prev) => {
        const filtered = prev.filter((k) => k.kode_kelas !== cleanKode);
        return [...filtered, { kode_kelas: cleanKode, nama_kelas: cleanNama }];
      });

      setPesanSuksesKelas(`✅ Berhasil membuat kelas ${cleanNama} dengan Kode: ${cleanKode}`);
      setInputNamaKelasBaru("");
      setInputKodeKelasBaru("");
    } catch (err) {
      console.error("Error creating class session:", err);
    } finally {
      setIsSavingKelas(false);
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

  // Helper untuk mendapatkan data kelompok
  const getGroupMetadata = (k: number) => {
    const lkpd = filteredLkpd.find((l) => l.kelompok === k);
    const chat = filteredChats.find((c) => c.kelompok === k);
    return {
      kelas: lkpd?.kelas || chat?.kelas || selectedKelasFilter !== "ALL" ? selectedKelasFilter : "9",
      nama_anggota: chat?.nama_anggota || "Belum ada nama",
      kasus_id: lkpd?.kasus_id || chat?.kasus_id || 1,
      bukti_petunjuk: lkpd?.bukti_petunjuk || "",
      analisis_pelanggaran: lkpd?.analisis_pelanggaran || "",
      solusi_rekomendasi: lkpd?.solusi_rekomendasi || "",
      is_submitted: lkpd?.is_submitted || false,
      updated_at: lkpd?.updated_at || null,
      messages: filteredChats.filter((c) => c.kelompok === k)
    };
  };

  const selectedGroupData = selectedKelompok ? getGroupMetadata(selectedKelompok) : null;

  return (
    <div className="h-screen md:h-[100dvh] bg-slate-100 flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar - Daftar Kelompok & Filter Kelas (Scrollbar Terpisah) */}
      <div className="w-full md:w-80 lg:w-96 bg-white border-r border-slate-200 flex flex-col shrink-0 max-h-[42vh] md:max-h-none md:h-full overflow-hidden">
        
        {/* Header Dasbor Guru */}
        <div className="p-4 border-b border-slate-200 bg-slate-900 text-white shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
              <h1 className="text-base font-bold">Dasbor Guru</h1>
            </div>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={fetchData} 
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-all flex items-center gap-1 font-medium"
                title="Refresh Data"
              >
                <span>🔄</span> Refresh
              </button>
            </div>
          </div>

          {/* Filter Kelas & Tombol Tambah Kelas */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[11px] text-slate-400 font-medium">
              <span>Filter Sesi Kelas:</span>
              <button
                onClick={() => setShowKelasModal(true)}
                className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
              >
                <span>➕</span> Generate Kelas
              </button>
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


      {/* Modal Generate Kode Kelas Baru */}
      {showKelasModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 border border-slate-200 relative">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎓</span>
                <h3 className="text-lg font-bold text-slate-800">Generate Sesi Kelas Baru</h3>
              </div>
              <button 
                onClick={() => {
                  setShowKelasModal(false);
                  setPesanSuksesKelas("");
                }}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Buat kode kelas baru untuk sesi pembelajaran kelas tertentu agar data investigasi dan LKPD siswa terpisah rapi per kelas.
            </p>

            <form onSubmit={handleSimpanKelasBaru} className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Kelas
                </label>
                <input
                  type="text"
                  required
                  value={inputNamaKelasBaru}
                  onChange={(e) => {
                    setInputNamaKelasBaru(e.target.value);
                    if (!inputKodeKelasBaru || inputKodeKelasBaru.startsWith("HAKI-")) {
                      setInputKodeKelasBaru(`HAKI-${e.target.value.trim().toUpperCase()}`);
                    }
                  }}
                  placeholder="Contoh: 9D atau IX-B"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Kode Akses Kelas
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomKodeKelas}
                    className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <span>🎲</span> Acak / Random
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={inputKodeKelasBaru}
                    onChange={(e) => setInputKodeKelasBaru(e.target.value.toUpperCase())}
                    placeholder="Contoh: HAKI-9D atau 9D-4K2X"
                    className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 font-mono uppercase tracking-wider focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={generateRandomKodeKelas}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-300 flex items-center gap-1 shrink-0 active:scale-95"
                    title="Generate Kode Acak"
                  >
                    <span>🎲</span> Acak
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Klik <strong>"🎲 Acak"</strong> untuk menghasilkan kode unik otomatis, atau ketik kode manual.
                </span>
              </div>

              {pesanSuksesKelas && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-medium">
                  {pesanSuksesKelas}
                </div>
              )}

              <button
                type="submit"
                disabled={isSavingKelas || !inputNamaKelasBaru.trim()}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-md"
              >
                {isSavingKelas ? "Menyimpan..." : "Simpan & Aktifkan Kelas"}
              </button>
            </form>

            <div className="border-t border-slate-100 pt-3">
              <h4 className="text-xs font-bold text-slate-600 mb-2">Daftar Kode Kelas Aktif:</h4>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {kelasList.map((k) => (
                  <div key={k.kode_kelas} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="font-semibold text-slate-700">Kelas {k.nama_kelas}</span>
                    <span className="font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[11px]">
                      {k.kode_kelas}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                setShowKelasModal(false);
                setPesanSuksesKelas("");
              }}
              className="w-full mt-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
