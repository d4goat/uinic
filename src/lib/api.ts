// Satu-satunya lapisan akses data. Halaman tidak memanggil supabase langsung,
// supaya nama RPC/kolom hanya berubah di satu tempat.
import { supabase } from './supabase';
import type {
  AkomodasiRef, Capaian, ConsentStatus, HambatanRef, Materi,
  Ppi, PpiSaran, PpiVersi, Profil, Sekolah, Sesi, SesiAntrean, Siswa, TransferHasil,
  VarianMateri, VarianJenis,
} from './types';

type Res<T> = { data: T | null; error: { message: string } | null };

// `any` di sini disengaja: tipe balikan Postgrest berbentuk rumit dan justru
// menolak bentuk yang sudah kita anotasikan. Tipe hasil tetap eksplisit di
// setiap fungsi di bawah.
async function u<T>(p: PromiseLike<unknown>): Promise<T> {
  const { data, error } = (await p) as Res<T>;
  if (error) throw new Error(error.message);
  return data as T;
}

const rpc = <T>(fn: string, args: Record<string, unknown>) =>
  u<T>(supabase.rpc(fn, args) as unknown as PromiseLike<unknown>);

// ------------------------------------------------------------ identitas -----
/**
 * Profil pengguna yang sedang masuk. WAJIB memfilter dengan id: RLS hanya
 * menyaring baris, tidak menjamin tepat satu baris tersisa — policy
 * `profiles_self_read` sengaja membiarkan admin melihat semua profil, sehingga
 * tanpa filter `.maybeSingle()` menerima 5 baris dan gagal dengan
 * "JSON object requested, multiple (or no) rows returned" (PGRST116).
 */
export const ambilProfil = async (id: string): Promise<Profil | null> =>
  u<Profil | null>(supabase.from('profiles').select('*').eq('id', id).maybeSingle());

export const daftarSekolah = (): Promise<Sekolah[]> =>
  u<Sekolah[]>(supabase.from('schools').select('*').order('nama'));

/**
 * F8: sekolah LAIN sebagai tujuan transfer. `schools` sendiri hanya terlihat
 * oleh sekolah sendiri di bawah RLS, jadi daftar tujuan diambil lewat RPC
 * `rpc_sekolah_tujuan()` (kolomnya sengaja cuma id, nama, kode_instansi).
 */
export const daftarSekolahTujuan = () => rpc<Sekolah[]>('rpc_sekolah_tujuan', {});

export const login = async (email: string, password: string) => {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
};

export const logout = () => supabase.auth.signOut();

// --------------------------------------------------------------- siswa ------
export const daftarSiswa = (): Promise<Siswa[]> =>
  u<Siswa[]>(supabase.from('students').select('*').order('kode'));

export const tambahSiswa = (s: Pick<Siswa, 'kode' | 'inisial' | 'tahun_lahir' | 'kelas'>) =>
  u<Siswa>(supabase.from('students').insert(s).select().single());

export const hapusSiswa = (id: string) => rpc<null>('rpc_student_delete', { p_student: id });

export const catatAkses = (objek: string, objekId: string, keterangan = {}) =>
  rpc<null>('rpc_log_read', { p_objek: objek, p_objek_id: objekId, p_keterangan: keterangan });

// ------------------------------------------------- tabel referensi (§11) ----
export const referensiHambatan = (): Promise<HambatanRef[]> =>
  u<HambatanRef[]>(supabase.from('barriers').select('*').order('nama'));

export const referensiAkomodasi = (): Promise<AkomodasiRef[]> =>
  u<AkomodasiRef[]>(supabase.from('accommodations').select('*').order('nama'));

export const aturanAkomodasi = () =>
  u<{ barrier_id: string; accommodation_id: string; alasan: string; ditinjau_oleh: string }[]>(
    supabase.from('barrier_accommodation_rules').select('*'),
  );

// -------------------------------------------------------------- asesmen -----
export const simpanAsesmen = (
  studentId: string,
  hambatan: { barrier_id: string; tingkat: string }[],
  catatan: string,
) => rpc<string>('rpc_assessment_save', { p_student: studentId, p_hambatan: hambatan, p_catatan: catatan });

export const riwayatAsesmen = (studentId: string) =>
  u<{
    id: string; tanggal: string; catatan_enc: string | null;
    assessment_barriers: { tingkat: string; barriers: HambatanRef }[];
  }[]>(
    supabase
      .from('assessments')
      .select('id, tanggal, catatan_enc, assessment_barriers(tingkat, barriers(*))')
      .eq('student_id', studentId)
      .order('tanggal', { ascending: false }),
  );

/** Dekripsi satu nilai catatan (bytea dari PostgREST datang sebagai string hex). */
export const catatanAsesmen = (enc: string) => rpc<string>('fn_dec', { p: enc });

// ------------------------------------------------------------------ PPI -----
export const saranPpi = (studentId: string) => rpc<PpiSaran>('rpc_ppi_suggest', { p_student: studentId });

export const ambilPpi = async (studentId: string): Promise<Ppi | null> =>
  u<Ppi | null>(supabase.from('ppis').select('*').eq('student_id', studentId).maybeSingle());

export const versiPpi = (ppiId: string): Promise<PpiVersi[]> =>
  u<PpiVersi[]>(
    supabase
      .from('ppi_versions')
      .select('*, ppi_goals(*), ppi_accommodations(*, accommodations(nama, tingkat_bukti))')
      .eq('ppi_id', ppiId)
      .order('nomor_versi', { ascending: false }),
  );

export const simpanPpi = (args: {
  studentId: string;
  ppiId?: string | null;
  ringkasan: string;
  tujuan: { tujuan: string; indikator: string }[];
  akomodasi: { accommodation_id: string; disetujui: boolean; catatan?: string | null }[];
}) =>
  rpc<string>('rpc_ppi_save', {
    p_student: args.studentId,
    p_ppi: args.ppiId ?? null,
    p_ringkasan: args.ringkasan,
    p_tujuan: args.tujuan,
    p_akomodasi: args.akomodasi,
  });

// --------------------------------------------------------------- sesi -------
// Idempoten: rpc_session_log memakai client_uuid sebagai kunci -> kirim ulang aman.
export const catatSesi = (s: SesiAntrean) =>
  rpc<string>('rpc_session_log', {
    p_ppi: s.ppi_id,
    p_goal: s.goal_id,
    p_tanggal: s.tanggal,
    p_status: s.status_capaian,
    p_catatan: s.catatan,
    p_client_uuid: s.client_uuid,
  });

export const daftarSesi = (ppiId: string) =>
  u<Sesi[]>(supabase.from('sessions').select('*').eq('ppi_id', ppiId).order('tanggal', { ascending: false }));

export const rekapCapaian = (ppiId: string) =>
  u<{ status_capaian: Capaian }[]>(supabase.from('sessions').select('status_capaian').eq('ppi_id', ppiId));

// ------------------------------------------------------------- materi -------
export const daftarMateri = (): Promise<Materi[]> =>
  u<Materi[]>(supabase.from('materials').select('*').order('judul'));

export const daftarVarian = (materialId: string): Promise<VarianMateri[]> =>
  u<VarianMateri[]>(supabase.from('material_variants').select('*').eq('material_id', materialId));

export const simpanMateri = async (
  m: { judul: string; teks_sumber: string; dibuat_oleh: string },
  varian: { jenis: VarianJenis; teks: string | null }[],
) => {
  const row = await u<Materi>(supabase.from('materials').insert(m).select().single());
  if (varian.length) {
    await u(supabase.from('material_variants').insert(varian.map((v) => ({ ...v, material_id: row.id }))));
  }
  return row;
};

// ------------------------------------------------------- persetujuan --------
export const siswaWali = (): Promise<Siswa[]> =>
  u<{ students: Siswa }[]>(supabase.from('guardian_links').select('students(*)'))
    .then((rows) => rows.map((r) => r.students));

/** F7: satu panggilan, baca-saja, maksimal 10 sesi terakhir — bukan data asesmen. */
export interface RingkasanWali {
  siswa: { id: string; kode: string; inisial: string; kelas: string };
  sekolah: string;
  ppi: {
    ppi_id: string; versi: number; ringkasan: string | null; diperbarui: string;
    tujuan: { tujuan: string; indikator: string }[];
    akomodasi: { nama: string; disetujui: boolean }[];
  } | null;
  sesi: { tanggal: string; capaian: Capaian; catatan: string | null }[];
  persetujuan: {
    id: string; jenis: string; status: ConsentStatus;
    berlaku_hingga: string | null; dibuat_pada: string;
  }[];
}
export const ringkasanWali = (studentId: string) =>
  rpc<RingkasanWali>('rpc_wali_ringkasan', { p_student: studentId });

export const daftarConsent = (studentId: string) =>
  u<{ id: string; jenis: string; status: ConsentStatus; berlaku_hingga: string | null; dibuat_pada: string }[]>(
    supabase.from('consents').select('*').eq('student_id', studentId).order('dibuat_pada', { ascending: false }),
  );

export const simpanConsent = (studentId: string, status: ConsentStatus, berlakuHingga: string | null = null) =>
  rpc<string>('rpc_consent_save', {
    p_student: studentId,
    p_jenis: 'berbagi_rekam',
    p_status: status,
    p_berlaku_hingga: berlakuHingga,
  });

// ------------------------------------------------------------ transfer ------
export const buatTransfer = (studentId: string, keSchoolId: string, jam = 72) =>
  rpc<TransferHasil>('rpc_transfer_create', { p_student: studentId, p_ke_school: keSchoolId, p_berlaku_jam: jam });

/** Diambil sekolah tujuan tanpa login: token itu sendiri yang jadi hak akses. */
export const ambilRekam = (token: string) => rpc<Record<string, unknown>>('rpc_record_fetch', { p_token: token });

export const daftarTransfer = () =>
  u<{ id: string; student_id: string; ke_school: string; kedaluwarsa: string; dipakai_pada: string | null; dibuat_pada: string }[]>(
    supabase.from('transfers').select('*').order('dibuat_pada', { ascending: false }),
  );

// ------------------------------------------------------------- audit --------
export const daftarAudit = (limit = 50) =>
  u<{ id: number; user_id: string | null; aksi: string; objek: string; objek_id: string | null; waktu: string }[]>(
    supabase.from('audit_logs').select('*').order('waktu', { ascending: false }).limit(limit),
  );
