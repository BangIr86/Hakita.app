import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const CANDIDATE_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest"
];

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "API Key Gemini tidak ditemukan." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { kasus, kelas, kelompok, namaAnggota, bukti, analisis, solusi } = body;

    const kasusJudul = kasus?.judul || `Kasus #${kasus?.id || 1}`;
    const kasusDeskripsi = kasus?.deskripsi || "";

    const prompt = `Kamu adalah Asesor Ahli Evaluasi Pembelajaran PPG dan Pakar Hukum Hak Cipta Indonesia (UU No. 28 Tahun 2014).
Tugasmu adalah melakukan penilaian objektif dan mendalam terhadap Lembar Kerja Peserta Didik (LKPD) Digital yang dikerjakan oleh siswa Kelas 9 SMP.

DATA KELOMPOK:
- Kelas: ${kelas || "9"}
- Kelompok: Kelompok ${kelompok}
- Kasus yang Diteliti: ${kasusJudul} - ${kasusDeskripsi}
- Nama Anggota & Peran: ${namaAnggota || "-"}

LEMBAR JAWABAN ASLI SISWA:
[BAGIAN II: CATATAN BUKTI INVESTIGASI (EVIDENCE LOG)]
1. Petunjuk #1 (Mengenai Pelaku/Tindakan): ${bukti?.p1 || "(Kosong)"}
2. Petunjuk #2 (Mengenai Aset/Karya yang Dirugikan): ${bukti?.p2 || "(Kosong)"}
3. Petunjuk #3 (Mengenai Lisensi/Status Hukum Karya): ${bukti?.p3 || "(Kosong)"}

[BAGIAN III: LEMBAR ANALISIS HAKI (HOTS - C4)]
1. Tindakan Spesifik Pelanggaran Hukum/Etika: ${analisis?.tindakan || "(Kosong)"}
2. Jenis Hak Kekayaan Intelektual atau Lisensi yang Dilanggar: ${analisis?.jenis || "(Kosong)"}
3. Pihak yang Paling Dirugikan dan Dampak Kerugiannya: ${analisis?.kerugian || "(Kosong)"}

[BAGIAN IV: REKOMENDASI SOLUSI & MITIGASI (HOTS - C5)]
1. Langkah Penyelesaian Adil untuk Korban Saat Ini: ${solusi?.solusi || "(Kosong)"}
2. Aturan Etis Masa Depan agar Tidak Melanggar HAKI: ${solusi?.aturan || "(Kosong)"}

[BAGIAN V: JURNAL REFLEKSI DIRI]
- Hal paling berharga yang dipelajari tentang Hak Cipta: ${solusi?.refleksi || "(Kosong)"}

INSTRUKSI EVALUASI:
1. Berikan skor total antara 0 - 100 dengan pembagian:
   - Bukti & Petunjuk (Maks 25)
   - Analisis Pelanggaran HOTS C4 (Maks 35)
   - Rekomendasi Solusi & Mitigasi HOTS C5 (Maks 25)
   - Jurnal Refleksi Diri (Maks 15)
2. Tentukan predikat: "Sangat Baik (A)" [85-100], "Baik (B)" [70-84], "Cukup (C)" [55-69], atau "Perlu Bimbingan (D)" [<55].
3. Berikan analisis kesesuaian hukum dengan merujuk pada prinsip UU No. 28 Tahun 2014 tentang Hak Cipta (misalnya hak moral, hak ekonomi, atau pasal terkait).
4. Berikan daftar kelebihan jawaban siswa (minimal 2 poin).
5. Berikan daftar kekurangan / hal yang perlu disempurnakan (minimal 2 poin).
6. Berikan rekomendasi umpan balik konstruktif yang hangat dan memotivasi untuk guru sampaikan kepada siswa.

OUTPUT WAJIB: Balas HANYA dengan format JSON murni tanpa markdown wrapper \`\`\`json atau teks pembuka lainnya:
{
  "skorTotal": 85,
  "predikat": "Sangat Baik (A)",
  "kategori": {
    "kelengkapanBukti": { "skor": 22, "max": 25, "catatan": "..." },
    "analisisPelanggaranC4": { "skor": 32, "max": 35, "catatan": "..." },
    "solusiMitigasiC5": { "skor": 21, "max": 25, "catatan": "..." },
    "refleksiDiri": { "skor": 10, "max": 15, "catatan": "..." }
  },
  "analisisHukum": "...",
  "kelebihan": ["...", "..."],
  "kekurangan": ["...", "..."],
  "rekomendasiGuru": "...",
  "waktuEvaluasi": "${new Date().toISOString()}"
}`;

    let responseText = "";
    let lastError: any = null;

    for (const modelName of CANDIDATE_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json"
          }
        });

        const result = await model.generateContent(prompt);
        responseText = result.response.text();
        if (responseText) break;
      } catch (err: any) {
        console.warn(`Evaluasi dengan model ${modelName} gagal: ${err.message}. Mencoba fallback...`);
        lastError = err;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    if (!responseText) {
      throw lastError || new Error("Gagal mendapatkan respons evaluasi AI.");
    }

    // Bersihkan kemungkinan markdown jika model tetap menyertakan backticks
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```/, "").replace(/```$/, "").trim();
    }

    const evaluationResult = JSON.parse(cleanJson);

    return new Response(JSON.stringify(evaluationResult), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("Gagal menjalankan evaluasi AI:", error);
    return new Response(
      JSON.stringify({
        error: "Gagal memproses evaluasi AI.",
        detail: error.message
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

