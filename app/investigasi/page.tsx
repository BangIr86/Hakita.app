"use client";

import { useState } from "react";

const daftarKasus = [
  { id: 1, judul: "Pembajakan Game 'CyberQuest'", deskripsi: "Sebuah game indie populer tiba-tiba muncul di situs bajakan." },
  { id: 2, judul: "Plagiarisme Desain Logo", deskripsi: "Logo kafe lokal diduga menjiplak karya seniman digital secara ilegal." }
];

export default function InvestigasiPage() {
  const [kasusAktif, setKasusAktif] = useState(daftarKasus[0]);
  const [pesan, setPesan] = useState<{ role: string; content: string }[]>([]);
  const [inputUser, setInputUser] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const kirimPesan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUser.trim() || isLoading) return;

    const historiBaru = [...pesan, { role: "user", content: inputUser }];
    setPesan(historiBaru);
    setInputUser("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pesan: historiBaru, kasus: kasusAktif.judul }),
      });

      if (!response.body) throw new Error("Tidak ada stream respons");

      // Menyiapkan slot kosong untuk diisi teks dari AI secara streaming
      setPesan((prev) => [...prev, { role: "assistant", content: "" }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          
          for (const line of lines) {
            // Memparsing protokol format SSE: data: {...}
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6).trim();
              if (dataStr === "[DONE]") break;
              
              try {
                const data = JSON.parse(dataStr);
                const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  setPesan((prev) => {
                    const pesanBaru = [...prev];
                    pesanBaru[pesanBaru.length - 1].content += text;
                    return pesanBaru;
                  });
                }
              } catch (err) {
                // Abaikan error saat memparsing chunk JSON yang tidak lengkap
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Gagal interogasi:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row p-4 gap-6">
      {/* Sidebar Daftar Kasus */}
      <div className="w-full md:w-1/3 lg:w-1/4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Pilih Kasus 📂</h2>
        <div className="space-y-4">
          {daftarKasus.map((kasus) => (
            <div 
              key={kasus.id}
              onClick={() => { setKasusAktif(kasus); setPesan([]); }}
              className={`p-4 rounded-2xl cursor-pointer transition-all border-2 ${
                kasusAktif.id === kasus.id ? "border-blue-500 bg-blue-50" : "border-slate-100 hover:border-blue-200"
              }`}
            >
              <h3 className="font-bold text-slate-800">{kasus.judul}</h3>
              <p className="text-sm text-slate-500 mt-2">{kasus.deskripsi}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area (Saksi Mata AI) */}
      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-5 bg-slate-900 text-white flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center font-bold">AI</div>
          <div>
            <h2 className="font-bold text-lg">Saksi Mata AI</h2>
            <p className="text-sm text-slate-400">Kasus: {kasusAktif.judul}</p>
          </div>
        </div>
        
        <div className="flex-1 p-6 overflow-y-auto space-y-6 h-[500px]">
          {pesan.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <span className="text-4xl mb-4">🕵️‍♂️</span>
              <p className="font-medium text-lg">Mulai interogasi Saksi Mata AI sekarang!</p>
            </div>
          ) : (
            pesan.map((p, i) => (
              <div key={i} className={`flex ${p.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] md:max-w-[75%] p-4 rounded-2xl ${
                  p.role === "user" 
                    ? "bg-blue-600 text-white rounded-br-sm" 
                    : "bg-slate-100 text-slate-800 rounded-bl-sm"
                }`}>
                  {p.content}
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={kirimPesan} className="p-4 border-t border-slate-100 bg-white flex gap-3">
          <input
            type="text"
            value={inputUser}
            onChange={(e) => setInputUser(e.target.value)}
            placeholder="Tanyakan petunjuk dari saksi..."
            className="flex-1 px-5 py-3 rounded-full border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 bg-slate-50"
          />
          <button 
            type="submit" 
            disabled={isLoading || !inputUser.trim()}
            className="px-6 py-3 bg-slate-900 text-white font-bold rounded-full hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            Tanya
          </button>
        </form>
      </div>
    </div>
  );
}
