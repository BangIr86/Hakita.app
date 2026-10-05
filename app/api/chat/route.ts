import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Menggunakan SDK Resmi Google
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "API Key hilang dari .env.local" }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { pesan, kasus } = await req.json();

    const systemInstruction = `Kamu adalah 'Saksi Mata Digital', seorang asisten investigasi misterius namun suportif di dalam game edukasi DETEKTIF HAKI. Tugasmu adalah membimbing siswa kelas 9 SMP memecahkan kasus pelanggaran Hak Kekayaan Intelektual (HAKI) seperti plagiarisme desain, pembajakan perangkat lunak, dan etika AI. Konteks kasus saat ini: ${kasus || 'Umum'}.

ATURAN UTAMA:
- Jangan pernah memberikan jawaban langsung atau definisi mentah. Berikan petunjuk (*clue*) berupa pertanyaan pancingan yang membuat siswa berpikir.
- Gunakan bahasa yang santai, ala detektif, mudah dipahami anak usia 14-15 tahun, dan gunakan panggilan 'Detektif' untuk menyapa siswa.
- Jika siswa bertanya di luar topik HAKI atau teknologi digital, tolak dengan sopan dan katakan bahwa kamu hanya memiliki informasi terkait kasus pelanggaran digital saat ini.
- Berikan pujian saat siswa berhasil mengidentifikasi pelanggaran HAKI.`;

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: systemInstruction,
    });

    const history = pesan.slice(0, -1).map((msg: any) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    const latestMessage = pesan[pesan.length - 1].content;
    const chat = model.startChat({ history });

    // Mulai streaming respons via SDK
    const result = await chat.sendMessageStream(latestMessage);

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            
            // Format SSE yang kompatibel dengan UI kita
            const payload = {
              candidates: [{ content: { parts: [{ text: chunkText }] } }]
            };
            
            const dataStr = `data: ${JSON.stringify(payload)}\n\n`;
            controller.enqueue(new TextEncoder().encode(dataStr));
          }
          controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
          controller.close();
        } catch (streamError) {
          console.error("Stream Gemini terputus:", streamError);
          controller.error(streamError);
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error: any) {
    console.error("Gagal terhubung ke Gemini:", error);
    return new Response(
      JSON.stringify({ 
        error: "Gagal memproses respons. Pastikan API Key valid dan koneksi internet stabil.", 
        detail: error.message 
      }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}