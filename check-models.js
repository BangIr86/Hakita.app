const fs = require('fs');
const https = require('https');

// Baca API key dari .env.local
const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/GEMINI_API_KEY=(.+)/);
if (!match) {
  console.log("API Key tidak ditemukan di .env.local");
  process.exit(1);
}
const apiKey = match[1].trim();

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.models) {
        console.log("Model Tersedia:");
        parsed.models.forEach(m => {
          if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')) {
            console.log(m.name);
          }
        });
      } else {
        console.log("Respon tidak wajar:", data);
      }
    } catch (e) {
      console.log("Error parse:", data);
    }
  });
}).on('error', err => {
  console.log("Error koneksi:", err.message);
});
