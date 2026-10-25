// Memastikan kelima akun demo benar-benar bisa login (sandi dari .env.local).
// Berguna sebelum demo: kalau ada yang gagal, jawabannya langsung terlihat —
// akun belum di-seed, sandi beda, atau email belum dikonfirmasi.
//
// Pakai: npm run cek:akun
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);

if (!env.DEMO_PASSWORD) throw new Error('DEMO_PASSWORD kosong di .env.local');

const AKUN = [
  'rina@demo.test', 'dimas@demo.test', 'koordinator@demo.test',
  'sari@demo.test', 'admin@demo.test',
];

const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

let gagal = 0;
for (const email of AKUN) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password: env.DEMO_PASSWORD });
  if (error) {
    gagal++;
    console.log(`GAGAL ${email.padEnd(24)} ${error.message}`);
    continue;
  }
  const { data: profil } = await sb.from('profiles').select('role, nama').eq('id', data.user.id).single();
  console.log(`OK    ${email.padEnd(24)} peran=${profil?.role ?? 'PROFIL HILANG'} nama=${profil?.nama ?? '-'}`);
  await sb.auth.signOut();
}

console.log(gagal
  ? `\n${gagal} akun gagal. Kalau pesannya "Invalid login credentials", sandi di .env.local berubah setelah seed terakhir — jalankan: npm run seed`
  : '\nKelima akun bisa login dengan DEMO_PASSWORD di .env.local.');
process.exit(gagal ? 1 : 0);
