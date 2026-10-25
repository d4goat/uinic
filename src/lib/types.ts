// Tipe yang mencerminkan supabase/schema.sql. Satu tempat; halaman mengimpornya.

export type Role = 'guru' | 'gpk' | 'koordinator' | 'orang_tua' | 'admin';
export type Tingkat = 'ringan' | 'sedang' | 'berat';
export type Capaian = 'belum' | 'sebagian' | 'tercapai';
export type TingkatBukti = 'lemah' | 'lemah-sedang' | 'sedang' | 'sedang-kuat' | 'kuat';
export type ConsentStatus = 'menunggu' | 'disetujui' | 'ditolak' | 'dicabut';
export type VarianJenis = 'teks_besar' | 'kalimat_pendek' | 'bacakan';

export interface Profil {
  id: string;
  school_id: string | null;
  nama: string;
  email: string;
  role: Role;
}

export interface Sekolah {
  id: string;
  nama: string;
  kode_instansi: string;
}

export interface Siswa {
  id: string;
  school_id: string;
  kode: string;
  inisial: string;
  tahun_lahir: number;
  kelas: string;
  dibuat_pada: string;
}

export interface HambatanRef {
  id: string;
  kode: string;
  nama: string;
  deskripsi: string | null;
}

export interface AkomodasiRef {
  id: string;
  kode: string;
  nama: string;
  deskripsi: string | null;
  tingkat_bukti: TingkatBukti;
  sumber: string | null;
}

export interface HambatanTerpilih {
  barrier_id: string;
  kode: string;
  nama: string;
  tingkat: Tingkat;
}

/** Bentuk balikan rpc_ppi_suggest() — alasan + kekuatan bukti wajib ikut tampil. */
export interface SaranAkomodasi {
  accommodation_id: string;
  kode: string;
  nama: string;
  deskripsi: string | null;
  tingkat_bukti: TingkatBukti;
  sumber: string | null;
  alasan: string;
  ditinjau_oleh: string;
  tanggal_tinjau: string;
  dari_hambatan: string;
}

export interface PpiSaran {
  student: Pick<Siswa, 'id' | 'kode' | 'inisial' | 'kelas' | 'tahun_lahir'>;
  assessment: { id: string; tanggal: string; catatan: string | null } | null;
  hambatan: HambatanTerpilih[];
  akomodasi: SaranAkomodasi[];
}

export interface PpiVersi {
  id: string;
  ppi_id: string;
  nomor_versi: number;
  ringkasan: string | null;
  dibuat_pada: string;
  ppi_goals: { id: string; tujuan: string; indikator: string }[];
  ppi_accommodations: {
    accommodation_id: string;
    disetujui: boolean;
    catatan: string | null;
    accommodations: { nama: string; tingkat_bukti: TingkatBukti } | null;
  }[];
}

export interface Ppi {
  id: string;
  student_id: string;
  status: 'draf' | 'aktif' | 'diarsipkan';
  versi_aktif: number;
}

export interface Sesi {
  id: string;
  ppi_id: string;
  goal_id: string | null;
  tanggal: string;
  status_capaian: Capaian;
  catatan_enc: string | null;
  client_uuid: string;
  catatan?: string | null; // diisi setelah dekripsi klien (fn_dec)
}

export interface Materi {
  id: string;
  school_id: string;
  judul: string;
  teks_sumber: string;
}

export interface VarianMateri {
  id: string;
  material_id: string;
  jenis: VarianJenis;
  teks: string | null;
}

export interface TransferHasil {
  transfer_id: string;
  token: string;
  kedaluwarsa: string;
}

/** Satu butir antrean offline (F6): dikirim ulang sampai server mengakuinya. */
export interface SesiAntrean {
  client_uuid: string;
  ppi_id: string;
  goal_id: string | null;
  tanggal: string;
  status_capaian: Capaian;
  catatan: string;
}
