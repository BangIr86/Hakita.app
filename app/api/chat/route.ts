import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { pesan, kasus } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API Key tidak ditemukan" }), { status: 500 });
    }

    // Format array pesan untuk Gemini API 
    const contents = pesan.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    // Konfigurasi request menggunakan pendekatan System Instructions (Gemini 1.5)
    const requestBody = {
      systemInstruction: {
        parts: [{ 
          text: `Kamu adalah Saksi Mata AI untuk kasus HAKI berjudul "${kasus}". Berperanlah sebagai saksi yang agak misterius tapi informatif. Audiensmu adalah siswa kelas 9 SMP. Jawab dengan kalimat pendek, interaktif, dan jangan berikan jawaban akhir, biarkan siswa menebak sendiri.` 
        }]
      },
      contents: contents,
      generationConfig: {
        maxOutputTokens: 600,
      }
    };

    // Panggilan REST API murni menuju Gemini dengan parameter alt=sse (Streaming)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`;
    
    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(`Gemini API Error: ${errorText}`, { status: response.status });
    }

    // Proxikan stream SSE murni langsung dari Gemini menuju Client
    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error) {
    console.error("Chatbot Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
