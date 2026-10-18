export type KelasItem = {
  kode_kelas: string;
  nama_kelas: string;
  durasi_menit?: number;
};

// DAFTAR KELAS & KODE KELAS DEFAULT (Cadangan jika Supabase offline/belum disetup)
export const DEFAULT_KELAS_LIST: KelasItem[] = [
  { kode_kelas: "HAKI-9A", nama_kelas: "9A", durasi_menit: 30 },
  { kode_kelas: "HAKI-9B", nama_kelas: "9B", durasi_menit: 30 },
  { kode_kelas: "HAKI-9C", nama_kelas: "9C", durasi_menit: 30 },
];


// DAFTAR STUDI KASUS DETEKTIF HAKI
export const DAFTAR_KASUS = [
  { 
    id: 1, 
    judul: "Pembajakan Game 'CyberQuest'", 
    deskripsi: "Game indie buatan siswa SMK lokal mendadak viral, namun sayangnya muncul di situs download bajakan luar negeri hanya dalam waktu seminggu setelah rilis. Modus operandi pelaku belum diketahui, namun ada jejak digital ke sebuah forum hacker anonim.",
    kelompok: [1, 2] 
  },
  { 
    id: 2, 
    judul: "Plagiarisme Desain Maskot", 
    deskripsi: "Sebuah kafe boba hits di kota diduga keras menggunakan desain maskot yang menjiplak karya seniman digital dari platform DeviantArt. Pemilik kafe mengklaim ia membeli desain tersebut dari seorang 'freelancer' murah di internet.",
    kelompok: [3, 4] 
  },
  { 
    id: 3, 
    judul: "Pencurian Konten Video (Re-uploader)", 
    deskripsi: "Video eksperimen sains edukasi milik channel YouTube sekolah diunduh, dipotong sedikit untuk menghilangkan watermark, lalu diunggah ulang ke TikTok dan mendapat jutaan views serta cuan (monetisasi). Siapa pelakunya?",
    kelompok: [5, 6] 
  }
];

