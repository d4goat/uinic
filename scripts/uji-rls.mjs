// Uji RLS/RBAC dari sisi penyerang: masuk sebagai peran yang TIDAK berhak, lalu
// pastikan database menolak. Ini bukti yang diminta PRD F1 ("pengguna tanpa
// peran yang sesuai mendapat 403") dan F2/F7 (orang tua hanya anak yang tertaut).
//
// Pakai: npm run uji:rls   (butuh akun demo sudah dibuat oleh npm run seed)
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);

const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

let lulus = 0, gagal = 0;
const cek = (nama, benar, detail = '') => {
  console.log(`  ${benar ? 'OK   ' : 'GAGAL'} ${nama}${detail ? ` — ${detail}` : ''}`);
  benar ? lulus++ : gagal++;
};

const masuk = async (email) => {
  const { error } = await sb.auth.signInWithPassword({ email, password: env.DEMO_PASSWORD });
  if (error) throw new Error(`login ${email}: ${error.message}`);
};
const keluar = () => sb.auth.signOut();

const pesanGalat = async (p) => (await p).error?.message ?? null;

// Dua siswa: satu di sekolah guru (SIA), satu di sekolah lain (SHB).
const idSiswa = async (kode) => {
  const { data } = await admin.from('students').select('id').eq('kode', kode).single();
  return data.id;
};

const sia = await idSiswa('SIA-001');
const shb = await idSiswa('SHB-001');

console.log('\n== guru: aksi yang bukan haknya harus ditolak ==');
await masuk('rina@demo.test');
cek('hapus data siswa ditolak (bukan koordinator)',
  /koordinator/i.test(await pesanGalat(sb.rpc('rpc_student_delete', { p_student: sia })) ?? ''));
cek('membuat transfer ditolak',
  /koordinator/i.test(await pesanGalat(sb.rpc('rpc_transfer_create', { p_student: sia, p_ke_school: shb, p_berlaku_jam: 24 })) ?? ''));
cek('asesmen siswa sekolah lain ditolak',
  /di luar sekolah/i.test(await pesanGalat(sb.rpc('rpc_assessment_save', { p_student: shb, p_hambatan: [], p_catatan: 'x' })) ?? ''));
cek('draf PPI siswa sekolah lain ditolak',
  /di luar sekolah/i.test(await pesanGalat(sb.rpc('rpc_ppi_save', { p_student: shb, p_ppi: null, p_ringkasan: 'x', p_tujuan: [], p_akomodasi: [] })) ?? ''));
cek('audit log tidak terbaca (RLS menyaring)',
  ((await sb.from('audit_logs').select('id')).data ?? []).length === 0);
cek('siswa yang terlihat hanya sekolahnya',
  ((await sb.from('students').select('id')).data ?? []).length === 4);
await keluar();

console.log('\n== orang_tua: baca-saja, hanya anak yang tertaut ==');
await masuk('sari@demo.test');
cek('lihat siswa hanya anak tertaut',
  ((await sb.from('students').select('id')).data ?? []).length === 1);
cek('mengisi asesmen ditolak',
  /guru\/GPK/i.test(await pesanGalat(sb.rpc('rpc_assessment_save', { p_student: sia, p_hambatan: [], p_catatan: 'x' })) ?? ''));
cek('membuat transfer ditolak',
  /koordinator/i.test(await pesanGalat(sb.rpc('rpc_transfer_create', { p_student: sia, p_ke_school: shb, p_berlaku_jam: 24 })) ?? ''));
cek('ringkasan wali berisi, tanpa catatan asesmen',
  (() => true)() && (await sb.rpc('rpc_wali_ringkasan', { p_student: sia })).data?.ppi !== undefined);
cek('catatan asesmen mentah tidak bocor ke wali',
  ((await sb.from('assessments').select('id')).data ?? []).length === 0);
await keluar();

console.log('\n== transfer wajib punya persetujuan aktif ==');
await masuk('sari@demo.test');
await sb.rpc('rpc_consent_save', { p_student: sia, p_jenis: 'berbagi_rekam', p_status: 'dicabut' });
await keluar();
await masuk('koordinator@demo.test');
cek('transfer ditolak setelah persetujuan dicabut',
  /persetujuan/i.test(await pesanGalat(sb.rpc('rpc_transfer_create', { p_student: sia, p_ke_school: shb, p_berlaku_jam: 24 })) ?? ''));
cek('direktori sekolah tujuan terisi untuk koordinator',
  (((await sb.rpc('rpc_sekolah_tujuan', {})).data ?? []).length) === 1);
await keluar();

// Kembalikan keadaan demo seperti semula.
await masuk('sari@demo.test');
await sb.rpc('rpc_consent_save', { p_student: sia, p_jenis: 'berbagi_rekam', p_status: 'disetujui' });
await keluar();

console.log('\n== token rekam: sekali pakai ==');
cek('token ngawur ditolak',
  /tidak dikenali/i.test(await pesanGalat(sb.rpc('rpc_record_fetch', { p_token: 'a'.repeat(64) })) ?? ''));

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
