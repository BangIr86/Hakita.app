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
    judul: "Misteri Maskot AI 'Elang Digital' & Penjualan Stiker Ilegal", 
    deskripsi: "Tim A (Siswa Kelas IX) membuat desain logo maskot 'Elang Digital' untuk Classmeeting sekolah. Mereka tidak menggambar manual, melainkan menyusun prompt detail di aplikasi AI Generatif, memilih 4 variasi hasil, lalu mengedit tata letak dan menambahkan teks slogan di Canva. Setelah logo tersebut diunggah ke akun OSIS, seorang freelancer lokal bernama Budi mengunduh file gambar tersebut, menghapus nama Tim A, lalu mencetak dan menjualnya dalam bentuk stiker & kaos komersial di marketplace online tanpa izin. Saat ditegur, Budi membela diri: 'Gambar ini kan hasil AI, bukan buatan tangan manusia! Menurut internet, karya buatan AI itu tidak punya Hak Cipta dan bebas dipakai/jual oleh siapa saja tanpa izin!'",
    kelompok: [1, 2, 3] 
  },
  { 
    id: 2, 
    judul: "Skandal 'Voice Cloning' Guru & Iklan Bimbel Palsu", 
    deskripsi: "Pak Heru (Guru Matematika) mengunggah video penjelasan materi di YouTube Sekolah untuk bahan belajar murid. Seorang pemilik akun anonim mengambil sampel suara Pak Heru dari YouTube, lalu menggunakan teknologi AI Voice Cloning & Deepfake untuk membuat rekaman suara palsu. Dalam rekaman palsu tersebut, suara buatan AI mirip Pak Heru berkata: 'Anak-anak SMP, kalau mau lulus ujian pakai cara cepat, yuk beli modul bimbel di link bio saya!'. Rekaman suara manipulasi AI itu dipadukan dengan foto Pak Heru dan diunggah ke TikTok dengan menautkan link affiliate bimbel berbayar. Pemilik akun anonim mendapat komisi jutaan rupiah, sementara Pak Heru dipanggil Kepala Sekolah karena dianggap melakukan komersialisasi ilegal kepada muridnya.",
    kelompok: [4, 5, 6] 
  }
];

