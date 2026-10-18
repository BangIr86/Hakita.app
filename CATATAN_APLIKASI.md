# 📂 DOSSIER PROYEK: DETEKTIF HAKI (MEDIA INOVASI PEMBELAJARAN PPG)

Dokumen ini berisi rangkuman arsitektur, kode, keputusan teknis, alur pedagogis, hingga riwayat troubleshooting untuk aplikasi **DETEKTIF HAKI**. Dokumen ini siap digunakan sebagai basis konteks diskusi dengan LLM/Gemini.

---

## 1. LATAR BELAKANG & TUJUAN PRODUK

* **Nama Proyek**: DETEKTIF HAKI (`hakita-app`)
* **Konteks**: Karya Inovasi Pembelajaran PPG (Pendidikan Profesi Guru).
* **Sasaran Pengguna**: Siswa Kelas 9 SMP (rentang usia 14–15 tahun) & Guru Pembimbing.
* **Topik Pembelajaran**: Hak Kekayaan Intelektual (HAKI), Hak Cipta, Plagiarisme Digital, Pembajakan Perangkat Lunak, dan Etika AI.
* **Pendekatan Pedagogis**: *Game-based Inquiry Learning* & *Problem-Based Learning (PBL)*. Siswa berperan sebagai Tim Detektif yang harus memecahkan kasus pelanggaran hak cipta digital dengan cara menginterogasi sebuah AI yang berperan sebagai **"Saksi Mata Digital"**.

---

## 2. SPESIFIKASI TEKNOLOGI (TECH STACK)

1. **Framework Utama**: Next.js 16 (App Router, Turbopack, React 19).
2. **Bahasa**: TypeScript.
3. **Styling UI**: Tailwind CSS (Desain modern, dark mode aksen detektif dengan palet Slate & Blue, fully responsive).
4. **Kecerdasan Buatan (AI Engine)**:
   * SDK: `@google/generative-ai`
   * Model: `gemini-flash-lite-latest`
   * Mekanisme Respon: Server-Sent Events (SSE) Streaming (efek mengetik *real-time*).
5. **Database**: Supabase (PostgreSQL) untuk penyimpanan log interogasi siswa.
6. **Aset Visual**: Logo lokal tersimpan di `/public/logo.png`.

---

## 3. PEMBAGIAN KELOMPOK & STUDI KASUS

Dalam 1 kelas diatur memiliki **6 Kelompok**, di mana kelas dibagi menjadi **2 Studi Kasus Utama** (Kasus #1 dan Kasus #2) berbasis isu aktual kecerdasan buatan (*AI Generatif* & *Deepfake Voice Cloning*) untuk menciptakan dinamika komparasi analitis saat presentasi kelas:

| No. Kasus | Judul Kasus | Sasaran Kelompok | Ringkasan Skenario Masalah |
| :---: | :--- | :---: | :--- |
| **Kasus #1** | Misteri Maskot AI 'Elang Digital' & Penjualan Stiker Ilegal | Kelompok 1, 2, 3 | Tim A (Siswa Kelas IX) membuat maskot 'Elang Digital' via prompt AI + diedit & dislogan di Canva untuk Classmeeting. Seorang *freelancer* (Budi) mengunduh, menghapus nama Tim A, lalu menjualnya sebagai stiker & kaos komersial di marketplace dengan dalih karya AI bebas hak cipta. |
| **Kasus #2** | Skandal 'Voice Cloning' Guru & Iklan Bimbel Palsu | Kelompok 4, 5, 6 | Suara Pak Heru (Guru MTK) dari YouTube dicuri akun anonim menggunakan teknologi AI Voice Cloning & Deepfake untuk membuat rekaman suara palsu promosi modul bimbel berbayar di TikTok demi meraup komisi affiliate, merugikan reputasi guru. |

---


## 4. DESIGN PROMPT & PERSONA AI ("SAKSI MATA DIGITAL")

Prompt sistem (disetel di `app/api/chat/route.ts`) dirancang dengan aturan pedagogis yang ketat:

* **Persona**: Saksi Mata Digital yang misterius, cerdas, namun ramah dan suportif terhadap anak SMP. Memanggil siswa dengan sebutan **"Detektif"**.
* **Aturan Emas (Crucial Rule)**: 
  * AI **DILARANG** memberikan jawaban langsung atau definisi mentah dari pelanggaran HAKI.
  * AI **WAJIB** memberikan petunjuk (*clues*) berupa pertanyaan pancingan analitis agar siswa yang menyimpulkan sendiri.
* **Guardrail**: Jika siswa menanyakan hal di luar konteks HAKI atau kasus digital, AI menolak secara halus dengan alasan bahwa ia hanya memiliki data terkait kasus pelanggaran digital tersebut.
* **Penguatan Positif**: Memberikan pujian antusias jika siswa berhasil mengidentifikasi unsur pelanggaran atau pasal/hak yang dilanggar.

---

## 5. STRUKTUR APLIKASI & ALUR KERJA (USER FLOW)

### A. Alur Siswa (Student Journey)
1. **Beranda (`/`)**:
   * Menampilkan judul misi, logo detektif, dan tombol *"Mulai Investigasi 🔍"*.
2. **Pemilihan Kelompok (`/investigasi` - Layar 1)**:
   * Menampilkan kartu Kelompok 1 sampai 6. Siswa mengklik kelompok mereka.
3. **Form Registrasi Tim (`/investigasi` - Layar 2 / Bagian I LKPD)**:
   * Siswa membagi 6 peran detektif (5–6 anak/kelompok):
     1. Interregator Chat AI
     2. Pencatat Bukti 1
     3. Pencatat Bukti 2
     4. Analis HAKI 1
     5. Analis HAKI 2
     6. Juru Bicara Presentasi (opsional jika 5 anak).
4. **Ruang Investigasi Dual Layout (`/investigasi` - Layar 3)**:
   * **Panel Kiri (Interogasi AI)**: Chat interogasi real-time dengan Saksi Mata Digital (AI) untuk menggali bukti dan kronologi pelanggaran.
   * **Panel Kanan (Berkas Investigasi LKPD)**: Terdiri dari 5 bagian:
     - **BAGIAN I**: Identitas Tim Detektif & Pembagian Peran.
     - **BAGIAN II**: Catatan Bukti Investigasi (Evidence Log from AI: Petunjuk 1, 2, 3).
     - **BAGIAN III**: Lembar Analisis HAKI (HOTS - C4: Tindakan pelanggaran, Jenis HAKI/Lisensi, Pihak yang dirugikan & kerugian).
     - **BAGIAN IV**: Rekomendasi Solusi & Mitigasi Kasus (HOTS - C5: Solusi adil untuk korban, Aturan etis masa depan).
     - **BAGIAN V**: Jurnal Refleksi Diri (Pelajaran berharga tentang Hak Cipta).
   * Fitur: Auto-save otomatis ke database Supabase tabel `lkpd_reports` dan tombol Kirim Final Laporan ke Guru.

### B. Alur Guru / Admin (Teacher Journey)
1. **Login Dasbor Guru (`/admin`)**:
   * Memasukkan Kode Akses Kelas dengan pengaman ekspresi reguler (Regex): `^PPG-\d+$`.
   * *Password yang sah*: Diawali `PPG-` diikuti angka, contoh: `PPG-123`, `PPG-2026`, `PPG-99`.
   * Setelah sukses, otomatis dialihkan ke halaman dashboard.
2. **Dasbor Pemantauan (`/admin/dashboard`)**:
   * **Panel Kiri**: Daftar kelompok yang sedang/sudah aktif mengirim pesan (lengkap dengan data Kelas & Nama Anggota).
   * **Panel Kanan**: Log riwayat chat interogasi siswa dan respons AI yang ditampilkan per kelompok secara kronologis lengkap dengan waktu kirim (*timestamp*).

---

## 6. SKEMA DATABASE & KONFIGURASI SUPABASE

Tabel yang digunakan pada Supabase: `chat_history`.

```sql
-- DDL Tabel
CREATE TABLE chat_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  kelompok integer NOT NULL,
  kelas text NOT NULL,
  nama_anggota text NOT NULL,
  kasus_id integer NOT NULL,
  role text NOT NULL, -- 'user' (siswa) atau 'assistant' (AI)
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Kebijakan Keamanan (RLS)
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- 1. Izin Insert untuk siswa (anonim tanpa akun login)
CREATE POLICY "Enable insert for anonymous users" 
ON chat_history FOR INSERT WITH CHECK (true);

-- 2. Izin Baca untuk dasbor guru
CREATE POLICY "Enable read access for all users" 
ON chat_history FOR SELECT USING (true);

-- Tabel Laporan LKPD Digital Siswa
CREATE TABLE lkpd_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  kelompok integer NOT NULL,
  kelas text NOT NULL,
  kasus_id integer NOT NULL,
  bukti_petunjuk text DEFAULT '', -- Log catatan clues dari AI
  analisis_pelanggaran text DEFAULT '', -- Jenis HAKI & UU yang dilanggar (C4)
  solusi_rekomendasi text DEFAULT '', -- Solusi etis & mitigasi (C5)
  is_submitted boolean DEFAULT false, -- Status final pengiriman
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Kebijakan Keamanan RLS lkpd_reports
ALTER TABLE lkpd_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable insert and update for anonymous users" 
ON lkpd_reports FOR ALL USING (true) WITH CHECK (true);

-- Tabel Sesi Kelas (Untuk Generate Kode Akses per Kelas & Setting Durasi Timer)
CREATE TABLE kelas_sesi (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  kode_kelas text UNIQUE NOT NULL,
  nama_kelas text NOT NULL,
  durasi_menit integer DEFAULT 30, -- Batas waktu investigasi siswa (menit)
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Migrasi jika tabel kelas_sesi sudah ada sebelumnya:
-- ALTER TABLE kelas_sesi ADD COLUMN IF NOT EXISTS durasi_menit integer DEFAULT 30;

ALTER TABLE kelas_sesi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for anonymous users" 
ON kelas_sesi FOR ALL USING (true) WITH CHECK (true);

-- Data Default (Opsional)
INSERT INTO kelas_sesi (kode_kelas, nama_kelas, durasi_menit) VALUES 
  ('HAKI-9A', '9A', 30),
  ('HAKI-9B', '9B', 30),
  ('HAKI-9C', '9C', 30)
ON CONFLICT (kode_kelas) DO NOTHING;

```

### File Variabel Lingkungan (`.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=https://[ID_PROYEK].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[KUNCI_ANON_PUBLIC]
GEMINI_API_KEY=[API_KEY_GOOGLE_AI_STUDIO]
```

---

## 7. RIWAYAT TROUBLESHOOTING & KEPUTUSAN TEKNIS KRUSIAL

Jika berdiskusi tentang pengembangan lanjutan, berikut masalah yang pernah dihadapi dan sudah diselesaikan:

1. **Pemilihan Model Gemini (`gemini-flash-lite-latest`)**:
   * *Problem*: Model `gemini-1.5-flash` dan `gemini-2.5-flash` sudah dihentikan/deprecated (Error 404). Model `gemini-3.1-pro` memiliki limit 0 token untuk free tier (Error 429). Model `gemini-3.5/3.8-flash` sering mengalami kelebihan beban sementara (Error 503 Service Unavailable).
   * *Solusi*: Menggunakan model `gemini-flash-lite-latest` yang super ringan, cepat, dan kuota gratisnya sangat stabil untuk demonstrasi pembelajaran.
2. **React 18/19 Strict Mode & Stream Duplication**:
   * *Problem*: Teks jawaban AI terduplikasi (misal: "HaloHalo") saat menerima chunk streaming.
   * *Solusi*: Memastikan pembaruan state pesan dilakukan dengan *deep copy* (`[...prev]`) pada index pesan terakhir, bukan mutasi langsung.
3. **Supabase JS Client v2 API**:
   * *Problem*: Muncul error `insert(...).catch is not a function` karena method chaining `.catch()` ditiadakan di PostgREST builder v2.
   * *Solusi*: Menggunakan destrukturisasi objek modern: `const { error } = await supabase.from(...).insert(...)`.
4. **Mobile Responsiveness & Virtual Keyboard**:
   * *Problem*: Saat keyboard smartphone terbuka, kolom input chat terdorong atau tertutup.
   * *Solusi*: Menggunakan satuan `h-[100dvh]` pada kontainer utama, membungkus sidebar ke batas maksimal `max-h-[25vh]` di layar mobile, form input diposisikan `sticky bottom-0`, serta menambahkan `useRef` + `scrollIntoView({ behavior: 'smooth' })` untuk auto-scroll.

---

## 8. STRUKTUR FILE REPOSITORI

```
hakita-app/
├── app/
│   ├── admin/
│   │   ├── dashboard/
│   │   │   └── page.tsx         # Dasbor pemantauan LKPD & Chat (Dual View Asli/AI, Cetak PDF, Excel)
│   │   └── page.tsx             # Halaman login guru (Validasi regex PPG-angka)
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.ts         # Endpoint integrasi Saksi Mata AI Gemini (SSE Stream + multi-model fallback)
│   │   └── evaluasi/
│   │       └── route.ts         # Endpoint Asesor AI PPG (Evaluasi LKPD, UU No. 28/2014 & Rubrik HOTS)
│   ├── investigasi/
│   │   └── page.tsx             # Halaman inti siswa (6 Peran Detektif, 5 Bagian LKPD, Chat Saksi AI)
│   ├── layout.tsx               # Root layout aplikasi
│   └── page.tsx                 # Landing page / Halaman beranda
├── lib/
│   ├── constants.ts             # Data statis daftar kasus investigasi & kode kelas default
│   └── supabase.ts              # Inisialisasi Supabase client
├── public/
│   └── logo.png                 # File logo resmi aplikasi
├── .env.local                   # Kunci API Gemini & URL/Key Supabase
├── package.json
├── CATATAN_APLIKASI.md          # Dokumen catatan lengkap proyek
└── README.md
```

---

## 9. STATUS PENGEMBANGAN & TAHAP BERIKUTNYA

### ✅ Tahap 1: Fitur Pengunduhan Laporan (Export PDF & Excel) [SELESAI]
* **Cetak Dokumen Resmi LKPD (PDF)**: Tombol *"🖨️ Cetak / PDF"* di Dasbor Guru dengan layout kop resmi PPG, tabel 5 bagian berkas investigasi, rubrik evaluasi, dan tanda tangan penilai.
* **Ekspor Excel (CSV UTF-8 BOM)**:
  * Tombol *"📊 Unduh Excel"* per kelompok (mengunduh berkas lengkap kelompok aktif).
  * Tombol *"📊 Ekspor Excel (Semua Tim)"* di sidebar guru untuk merekap seluruh kelompok dalam satu kelas sekaligus.

### ✅ Tahap 2: Rubrik Evaluasi Berbasis AI (Dual View Guru: Hasil Asli & Evaluasi AI) [SELESAI]
* **Endpoint API Evaluasi (`/api/evaluasi`)**:
  * Menggunakan SDK Google Generative AI dengan arsitektur multi-model fallback cerdas (`gemini-3.5-flash-lite` -> `gemini-flash-lite-latest`).
  * Mengevaluasi berkas investigasi siswa secara objektif berdasarkan **UU No. 28 Tahun 2014 tentang Hak Cipta** dan Rubrik HOTS PPG:
    1. Kelengkapan Bukti Investigasi (Maks 25)
    2. Analisis Pelanggaran HOTS C4 (Maks 35)
    3. Rekomendasi Solusi & Mitigasi HOTS C5 (Maks 25)
    4. Jurnal Refleksi Diri (Maks 15)
  * Menghasilkan Skor Total (0-100), Predikat (Sangat Baik / Baik / Cukup / Perlu Bimbingan), Ulasan Kesesuaian Hukum, Poin Kelebihan, Poin Catatan Kritis, dan Rekomendasi Umpan Balik Guru.
* **Dual View & Split View di Dasbor Guru (`/admin/dashboard`)**:
  * **1. Hasil Asli Siswa**: Menampilkan lembar kerja murni yang diisi siswa (Bagian I hingga V) tanpa intervensi.
  * **2. Hasil Evaluasi AI**: Menampilkan *scorecard*, visualisasi progress bar 4 rubrik, ulasan hukum hak cipta, dan kartu umpan balik guru dengan tombol aksi *"✨ Jalankan Evaluasi AI"* / *"🔄 Evaluasi Ulang"*.
  * **3. Tampilan Berdampingan (Split View)**: Guru dapat menyandingkan berkas asli siswa dan hasil asesmen AI secara horizontal berdampingan untuk validasi cepat.
* **Integrasi PDF Cetak & Rekap Excel**:
  * Dokumen cetak PDF menyertakan bagian resmi evaluasi AI serta otomatis mengisi skor pada kotak pengesahan guru.
  * Rekap Excel memuat 4 kolom tambahan: Skor AI, Predikat AI, Ulasan Hukum UU 28/2014, dan Rekomendasi Umpan Balik.

### ✅ Tahap 3: Timer & Batas Waktu Investigasi (Konfigurasi Guru) [SELESAI]
* **Konfigurasi Timer oleh Guru Saat Pembuatan Kode Kelas (`/admin/dashboard`)**:
  * Guru dapat menentukan durasi investigasi secara fleksibel (Preset tombol cepat: 15, 20, 30, 45, 60 Menit, atau input angka bebas).
  * Durasi tersimpan otomatis ke tabel `kelas_sesi.durasi_menit` (dengan fallback otomatis jika kolom database belum dimigrasikan).
  * Badge durasi tertera di daftar kode kelas aktif dan di header kelompok terpilih di Dasbor Guru.
* **Countdown Timer Interaktif Siswa (`/investigasi`)**:
  * Menampilkan informasi batas waktu pada layar Pemilihan Kelompok dan Registrasi Peran.
  * Timer hitung mundur aktif otomatis saat siswa memasuki ruang investigasi dan interogasi.
  * **Persistensi Waktu via `localStorage`**: Sisa waktu tidak ter-reset meskipun browser siswa di-refresh atau koneksi terputus.
  * **Indikator Visual Dinamis**:
    * ⏱️ *Normal (> 5 menit)*: Tampilan gelap berpadu font digital monospaced.
    * ⏳ *Warning (≤ 5 menit)*: Indikator amber berkedip (pulsing alert).
    * 🚨 *Critical (≤ 2 menit)*: Indikator merah intensif berkedip.
    * 🚨 *Waktu Habis (00:00)*: Tampilan *"WAKTU HABIS"* dengan banner peringatan *sticky* dan pop-up modal pengingat untuk segera mengirimkan berkas final LKPD.
    * ✅ *Terkirim*: Indikator berubah menjadi hijau dengan status *"SELESAI"*.

### ✅ Tahap 4: Kolaborasi Multi-Device ("Multi-Device Room") [SELESAI]
* **Skenario Riil Pembelajaran Kolaboratif di Kelas**:
  * Dirancang spesifik untuk pembagian kerja nyata di kelas:
    * **1 Laptop**: Digunakan oleh siswa peran **Interregator** untuk chat interaktif menggali petunjuk dari Saksi Mata Digital (AI).
    * **1 Smartphone**: Digunakan oleh siswa peran **Pencatat Bukti (1 & 2)** untuk mencatat petunjuk kunci (Evidence Log) pada Bagian II LKPD.
    * **1 Smartphone**: Digunakan oleh siswa peran **Analis HAKI (1 & 2)** untuk menganalisis pasal UU Hak Cipta & etika digital pada Bagian III LKPD.
    * Siswa peran **Juru Bicara** dapat mengawasi solusi, mitigasi, dan refleksi dari perangkat mana pun.
* **Shared Team Identity & Auto-Join Room**:
  * Ketika 1 siswa (misal di laptop) mendaftarkan nama anggota tim di Kelompok X, seluruh perangkat rekan tim lainnya (HP) yang memilih Kelompok X otomatis mendeteksi room aktif dan langsung masuk ke ruang investigasi tanpa perlu mengetik ulang 6 nama anggota.
  * Terdapat indikator `🟢 Room Aktif` pada grid pemilihan kelompok sehingga siswa tahu room kelompoknya telah dibuka rekan tim.
* **Non-destructive Granular Auto-Sync**:
  * Pemisahan penyimpanan ke database Supabase dilakukan secara independen per kolom:
    * `simpanBukti`: Hanya memperbarui kolom `bukti_petunjuk` (tidak menimpa analisis atau solusi).
    * `simpanAnalisis`: Hanya memperbarui kolom `analisis_pelanggaran` (tidak menimpa bukti atau solusi).
    * `simpanSolusi`: Hanya memperbarui kolom `solusi_rekomendasi` (tetap mempertahankan susunan anggota dan waktu mulai).
  * Mekanisme debounced saving (1000ms) mandiri per bagian dan pencegahan save-loop dengan cache referensi nilai lokal (`lastSaved...Ref`).
* **Focus Conflict Protection (`activeFieldRef`)**:
  * Menggunakan sistem pelacak kursor fokus aktif (`activeFieldRef`).
  * Ketika update remote datang dari perangkat lain, teks pada kolom input/textarea yang sedang diketik siswa lokal TIDAK AKAN ditimpa (menghilangkan stutter, lag kursor, atau tulisan terhapus).
* **Streaming Chat & Realtime Broadcast**:
  * Hasil tanya jawab antara interregator laptop dengan Saksi AI otomatis ter-broadcast ke semua layar HP anggota tim secara *real-time* via Supabase Realtime Channel (`postgres_changes` pada `chat_history`).
  * Dilengkapi **Smart Polling Fallback (setiap 3 detik)** untuk menjamin sinkronisasi tetap 100% lancar di jaringan Wi-Fi sekolah yang memblokir protokol WebSocket.
* **Synchronized Group Countdown Timer**:
  * Timestamp mulai (`timer_start`) dicatat secara terpusat pada data kelompok di database.
  * Semua perangkat (laptop maupun HP) menampilkan detik countdown timer yang sama persis secara harmonis.
* **Mobile Quick-Jump Navigation Bar**:
  * Toolbar sticky navigasi cepat di atas formulir LKPD:
    * `[🔍 Bukti (Pencatat)]`
    * `[⚖️ Analisis UU (Analis)]`
    * `[💡 Solusi & Mitigasi]`
    * `[💭 Refleksi]`
### ✅ Tahap 5: Mode Proyektor / Slide Presentasi Kelas (Laptop Guru) [SELESAI]
* **Skenario Riil Presentasi Kelas**:
  * Laptop guru tersambung ke kabel HDMI / wireless display proyektor LCD atau Smart TV kelas.
  * Ketika giliran kelompok maju ke depan kelas, guru tidak perlu meminta siswa membuka flashdisk atau login slide Canva/PowerPoint terpisah.
  * Guru cukup mengklik tombol **"📽️ Tayangkan ke Proyektor"** (di panel kelompok terpilih) atau tombol **"📽️ Proyektor"** (di sidebar) pada Dasbor Guru (`/admin/dashboard`).
* **Fitur & Arsitektur Mode Proyektor**:
  * **5 Slide Presentasi Interaktif Otomatis**:
    1. **Slide 1: Identitas Tim & Skenario Kasus**:
       * Menampilkan judul kasus besar, ringkasan skenario masalah (*Problem Context*), dan kartu 6 peran anggota dengan badge sorotan khusus pada peran **"6. Juru Bicara (Presenter Utama 🎤)"**.
    2. **Slide 2: Catatan Bukti Investigasi (Evidence Log)**:
       * Menampilkan 3 kartu petunjuk kunci (Jejak pelaku, aset yang dirugikan, status lisensi/hak cipta) serta tombol opsional untuk membuka bukti transkrip chat asli interogator dengan Saksi AI.
    3. **Slide 3: Lembar Analisis HAKI (HOTS - C4)**:
       * Menguraikan tindakan konkret pelanggaran hukum, jenis HAKI/lisensi yang dilanggar (Hak Cipta, Hak Moral, Hak Ekonomi, CC), dan pihak yang dirugikan beserta kerugian moral/ekonomi.
    4. **Slide 4: Rekomendasi Solusi & Mitigasi (HOTS - C5)**:
       * Menyajikan 2 pilar penyelesaian: Langkah adil bagi korban saat ini (takedown, ganti rugi, maaf terbuka) dan Aturan etis masa depan.
    5. **Slide 5: Jurnal Refleksi Tim & Pengesahan Asesor AI**:
       * Menampilkan catatan refleksi autentik siswa mengenai nilai menghargai karya cipta, skor & ulasan kepatuhan UU No. 28/2014 dari Asesor AI, serta banner ajakan tanya jawab untuk kelompok penanggap.
  * **Kelompok Switcher Cepat Tanpa Menutup Modal**:
    * Guru dapat langsung berpindah dari Kelompok 1 ke Kelompok 2, 3, dst., hanya dengan 1 kali klik pada tab tim di atas layar presentasi.
  * **Dukungan Wireless Presenter / Pointer & Keyboard Navigation**:
    * Tombol keyboard: `[Spasi]` atau `[Panah Kanan]` atau `[PageDown]` untuk slide berikutnya; `[Panah Kiri]` atau `[PageUp]` untuk slide sebelumnya; `[Esc]` untuk keluar.
  * **Mode Layar Penuh (Fullscreen)**:
    * Tombol bawaan untuk beralih ke Fullscreen (`⛶ Layar Penuh`) guna menyembunyikan taskbar dan tab browser guru saat ditayangkan ke siswa.

---

## 10. KESIMPULAN FITUR UNGGULAN APLIKASI
Hakita App telah mengintegrasikan siklus Problem-Based Learning (PBL) dan kolaborasi digital secara utuh:
1. **Siswa**: Menjalankan investigasi interaktif dengan Saksi AI dalam ruangan kolaboratif multi-perangkat (*Multi-Device Room*), mengisi lembar LKPD digital 5 bagian secara terdistribusi (1 laptop interogasi, 1 HP catat bukti, 1 HP analisis pasal), dengan sinkronisasi waktu dan data tanpa konflik.
2. **Guru**: Memantau aktivitas interogasi real-time, menayangkan presentasi hasil karya siswa ke proyektor kelas dengan 1 klik (*Mode Proyektor 5 Slide*), melihat pengerjaan asli siswa berdampingan dengan evaluasi AI berbasis UU Hak Cipta No. 28/2014 & rubrik HOTS, mengatur batas waktu per sesi kelas, mencetak berkas resmi PPG ber-kop, dan mengekspor rekap spreadsheet Excel.



