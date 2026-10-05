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

export default function AdminDashboard() {
  const [chats, setChats] = useState<ChatRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedKelompok, setSelectedKelompok] = useState<number | null>(null);

  useEffect(() => {
    const fetchChats = async () => {
      // Cek apakah supabase url valid
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("url_proyek_supabase_anda")) {
        setError("Supabase belum dikonfigurasi. Silakan lengkapi .env.local dan jalankan script SQL.");
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("chat_history")
          .select("*")
          .order("created_at", { ascending: true });

        if (error) throw error;
        setChats(data || []);
      } catch (err: any) {
        console.error("Error fetching chats:", err);
        setError("Gagal mengambil data dari Supabase. Pastikan tabel chat_history sudah dibuat.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchChats();
  }, []);

  // Kelompokkan chat berdasarkan nomor kelompok
  const groupedChats = chats.reduce((acc, chat) => {
    if (!acc[chat.kelompok]) {
      acc[chat.kelompok] = {
        kelas: chat.kelas,
        nama_anggota: chat.nama_anggota,
        kasus_id: chat.kasus_id,
        messages: []
      };
    }
    acc[chat.kelompok].messages.push(chat);
    return acc;
  }, {} as Record<number, { kelas: string; nama_anggota: string; kasus_id: number; messages: ChatRecord[] }>);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* Sidebar - Daftar Kelompok */}
      <div className="w-full md:w-1/4 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-200 bg-slate-900 text-white">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">👨‍🏫</span>
            <h1 className="text-xl font-bold">Dasbor Guru</h1>
          </div>
          <p className="text-slate-400 text-sm">Pantau investigasi siswa.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 px-2">Kelompok Aktif</h2>
          {Object.keys(groupedChats).length === 0 && !isLoading && !error && (
            <p className="text-sm text-slate-500 px-2">Belum ada data kelompok.</p>
          )}
          {Object.keys(groupedChats).map((k) => (
            <button
              key={k}
              onClick={() => setSelectedKelompok(Number(k))}
              className={`w-full text-left p-4 rounded-xl transition-all border ${
                selectedKelompok === Number(k) 
                  ? "bg-blue-50 border-blue-200 shadow-sm" 
                  : "bg-white border-slate-100 hover:border-blue-200 hover:bg-slate-50"
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-slate-800">Kelompok {k}</span>
                <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-md font-semibold">
                  Kasus #{groupedChats[Number(k)].kasus_id}
                </span>
              </div>
              <p className="text-sm text-slate-600 font-medium">Kelas: {groupedChats[Number(k)].kelas}</p>
              <p className="text-xs text-slate-400 truncate">{groupedChats[Number(k)].nama_anggota}</p>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-slate-200">
          <Link href="/" className="flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
            ← Kembali ke Beranda
          </Link>
        </div>
      </div>

      {/* Main Content - Chat Monitor */}
      <div className="flex-1 bg-slate-50 p-6 overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-pulse flex flex-col items-center">
              <div className="w-12 h-12 bg-blue-200 rounded-full mb-4"></div>
              <p className="text-slate-500 font-medium">Memuat data investigasi...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="max-w-md p-6 bg-red-50 border border-red-200 rounded-2xl text-center">
              <span className="text-4xl mb-4 block">⚠️</span>
              <h3 className="text-lg font-bold text-red-800 mb-2">Gagal Memuat Data</h3>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        ) : !selectedKelompok ? (
          <div className="flex-1 flex items-center justify-center text-center p-6">
            <div>
              <div className="text-6xl mb-6 grayscale opacity-20">🗂️</div>
              <h2 className="text-xl font-bold text-slate-700 mb-2">Pilih Kelompok</h2>
              <p className="text-slate-500">Klik salah satu kelompok di panel kiri untuk memantau riwayat obrolan investigasi mereka.</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-white flex justify-between items-center">
              <div>
                <h2 className="font-bold text-lg text-slate-800">Log Investigasi: Kelompok {selectedKelompok}</h2>
                <p className="text-sm text-slate-500 font-medium">
                  Anggota: {groupedChats[selectedKelompok].nama_anggota}
                </p>
              </div>
              <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-sm font-bold">
                Kasus #{groupedChats[selectedKelompok].kasus_id}
              </div>
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50/50">
              {groupedChats[selectedKelompok].messages.map((msg, i) => (
                <div key={msg.id || i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] md:max-w-[75%] p-4 rounded-2xl shadow-sm ${
                    msg.role === "user" 
                      ? "bg-blue-600 text-white rounded-br-sm" 
                      : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"
                  }`}>
                    {msg.role === "user" && (
                      <span className="block text-xs text-blue-200 font-bold mb-1">Siswa</span>
                    )}
                    {msg.role === "assistant" && (
                      <span className="block text-xs text-slate-400 font-bold mb-1">Saksi Mata AI</span>
                    )}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    <span className="block text-[10px] opacity-50 mt-2 text-right">
                      {new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
