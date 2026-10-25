// Membuat akun + profil demo, lalu menjalankan ALUR NYATA lewat RPC
// (asesmen -> saran -> draf PPI -> sesi -> persetujuan -> transfer -> ambil rekam).
// Karena alur dijalankan dengan akun demo asli, skrip ini sekaligus jadi uji asap:
// kalau RLS atau RPC salah, skrip gagal di langkah itu.
//
// Pakai: isi .env.local dulu (lihat .env.example), lalu `npm run seed`.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);

const { VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: anon, SUPABASE_SERVICE_ROLE_KEY: service, DEMO_PASSWORD: sandi } = env;
for (const [nama, nilai] of Object.entries({ VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: anon, SUPABASE_SERVICE_ROLE_KEY: service, DEMO_PASSWORD: sandi })) {
  if (!nilai) throw new Error(`${nama} belum diisi di .env.local`);
}

const admin = createClient(url, service, { auth: { persistSession: false } });
const sb = createClient(url, anon, { auth: { persistSession: false } });

const db = async (p) => {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data;
};
const rpc = (fn, args) => db(sb.rpc(fn, args));

const AKUN = [
  { email: 'rina@demo.test', nama: 'Bu Rina', role: 'guru', sekolah: 'SIA' },
  { email: 'dimas@demo.test', nama: 'Pak Dimas', role: 'gpk', sekolah: 'SIA' },
  { email: 'koordinator@demo.test', nama: 'Bu Wulan', role: 'koordinator', sekolah: 'SIA' },
  { email: 'sari@demo.test', nama: 'Ibu Sari', role: 'orang_tua', sekolah: 'SIA' },
  { email: 'admin@demo.test', nama: 'Admin Sistem', role: 'admin', sekolah: null },
];

async function akunDemo() {
  const { data: daftar } = await admin.auth.admin.listUsers({ perPage: 200 });
  const ada = new Map(daftar.users.map((u) => [u.email, u.id]));
  const ids = {};

  for (const a of AKUN) {
    let id = ada.get(a.email);
    if (id) {
      await admin.auth.admin.updateUserById(id, { password: sandi, email_confirm: true });
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email: a.email, password: sandi, email_confirm: true,
      });
      if (error) throw new Error(`${a.email}: ${error.message}`);
      id = data.user.id;
    }
    ids[a.email] = id;

    const sekolahId = a.sekolah
      ? (await db(admin.from('schools').select('id, kode_instansi').eq('kode_instansi', a.sekolah).single())).id
      : null;

    await db(admin.from('profiles').upsert({
      id, nama: a.nama, email: a.email, role: a.role, school_id: sekolahId,
    }));
  }
  return ids;
}

async function masuk(email) {
  const { error } = await sb.auth.signInWithPassword({ email, password: sandi });
  if (error) throw new Error(`login ${email}: ${error.message}`);
}

async function alurGuru() {
  await masuk('rina@demo.test');
  const siswa = await db(sb.from('students').select('id, kode').eq('kode', 'SIA-001').single());
  const barrier = await db(sb.from('barriers').select('id, kode'));

  const hambatan = barrier
    .filter((b) => ['kesulitan_membaca', 'kebutuhan_struktur_transisi'].includes(b.kode))
    .map((b) => ({ barrier_id: b.id, tingkat: 'sedang' }));

  const asesmen = await rpc('rpc_assessment_save', {
    p_student: siswa.id, p_hambatan: hambatan,
    p_catatan: 'Bacaan panjang membuatnya berhenti di paragraf kedua; perlu urutan kegiatan tertulis.',
  });
  console.log('  asesmen            ', asesmen);

  const saran = await rpc('rpc_ppi_suggest', { p_student: siswa.id });
  console.log('  saran akomodasi    ', saran.akomodasi.length, 'butir dari', saran.hambatan.length, 'hambatan');

  const versi = await rpc('rpc_ppi_save', {
    p_student: siswa.id,
    p_ppi: null,
    p_ringkasan: 'Fokus semester ini: pemahaman bacaan pendek dan kemandirian mengikuti urutan kegiatan.',
    p_tujuan: [
      { tujuan: 'Membaca dan menjelaskan isi paragraf pendek', indikator: '3 dari 4 pertanyaan pemahaman benar tanpa bantuan' },
      { tujuan: 'Menyelesaikan rangkaian kegiatan sesuai jadwal visual', indikator: 'Mencentang 4 dari 5 langkah tanpa diingatkan' },
    ],
    p_akomodasi: saran.akomodasi.map((a) => ({
      accommodation_id: a.accommodation_id, disetujui: true, catatan: null,
    })),
  });
  console.log('  draf PPI versi 1   ', versi);

  const ppi = await db(sb.from('ppis').select('id').eq('student_id', siswa.id).single());
  const goals = await db(sb.from('ppi_goals').select('id').eq('ppi_version_id', versi));

  for (const [i, status] of ['sebagian', 'tercapai', 'sebagian'].entries()) {
    await rpc('rpc_session_log', {
      p_ppi: ppi.id, p_goal: goals[i % goals.length].id,
      p_tanggal: new Date(Date.now() - i * 86400000).toISOString().slice(0, 10),
      p_status: status, p_catatan: `Sesi pendampingan ke-${i + 1}.`,
      p_client_uuid: crypto.randomUUID(),
    });
  }
  // Uji idempotensi: client_uuid sama dikirim dua kali -> harus tetap satu baris.
  const cu = crypto.randomUUID();
  const args = {
    p_ppi: ppi.id, p_goal: goals[0].id, p_tanggal: new Date().toISOString().slice(0, 10),
    p_status: 'tercapai', p_catatan: 'Uji idempotensi.', p_client_uuid: cu,
  };
  const ulang = await rpc('rpc_session_log', args);
  await rpc('rpc_session_log', args);
  console.log('  sesi tercatat       ', ulang, '(dikirim dua kali, tetap satu baris)');
  await sb.auth.signOut();
  return siswa;
}

async function alurWali(siswa) {
  await masuk('sari@demo.test');
  await rpc('rpc_consent_save', {
    p_student: siswa.id, p_jenis: 'berbagi_rekam', p_status: 'disetujui',
    p_berlaku_hingga: new Date(Date.now() + 90 * 86400000).toISOString(),
  });
  const ringkas = await rpc('rpc_wali_ringkasan', { p_student: siswa.id });
  console.log('  ringkasan wali     ', ringkas.sesi.length, 'sesi, PPI versi', ringkas.ppi?.versi);
  await sb.auth.signOut();
}

async function alurTransfer(siswa) {
  await masuk('koordinator@demo.test');
  const tujuan = await db(sb.from('schools').select('id').eq('kode_instansi', 'SHB').single());
  const { token } = await rpc('rpc_transfer_create', {
    p_student: siswa.id, p_ke_school: tujuan.id, p_berlaku_jam: 72,
  });
  await sb.auth.signOut();

  // Sekolah tujuan: tanpa login, hanya modal token (kapabilitas sekali pakai).
  const rekam = await rpc('rpc_record_fetch', { p_token: token });
  console.log('  rekam diterima     ', rekam.siswa.kode, '| PPI versi', rekam.ppi.versi,
    '|', rekam.ppi.tujuan.length, 'tujuan |', rekam.ppi.sesi.length, 'sesi');

  try {
    await rpc('rpc_record_fetch', { p_token: token });
    throw new Error('GAGAL: token bisa dipakai dua kali');
  } catch (e) {
    if (!/sudah dipakai/.test(e.message)) throw e;
    console.log('  token sekali pakai ', 'OK — percobaan kedua ditolak');
  }
}

console.log('Membuat akun demo…');
const ids = await akunDemo();

const siswa = await db(admin.from('students').select('id').eq('kode', 'SIA-001').single());
await db(admin.from('guardian_links').upsert({ student_id: siswa.id, user_id: ids['sari@demo.test'], hubungan: 'ibu' }));

console.log('Menjalankan alur nyata…');
await alurGuru();
await alurWali(siswa);
await alurTransfer(siswa);

console.log('\nSelesai. Akun demo (kata sandi = DEMO_PASSWORD di .env.local):');
for (const a of AKUN) console.log(` ${a.email.padEnd(24)} ${a.role}`);
