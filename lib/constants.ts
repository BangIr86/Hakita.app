// KODE AKSES RAHASIA TIAP KELOMPOK
export const KODE_AKSES_KELOMPOK: Record<number, string> = {
  1: "HAKI-01",
  2: "HAKI-02",
  3: "HAKI-03",
  4: "HAKI-04",
  5: "HAKI-05",
  6: "HAKI-06",
};

// DAFTAR KELAS & KODE KELAS DEFAULT (Cadangan jika Supabase offline/belum disetup)
export const DEFAULT_KELAS_LIST = [
  { kode_kelas: "HAKI-9A", nama_kelas: "9A" },
  { kode_kelas: "HAKI-9B", nama_kelas: "9B" },
  { kode_kelas: "HAKI-9C", nama_kelas: "9C" },
];
