// Menjalankan berkas SQL ke project Supabase langsung dari terminal.
// Dua jalan masuk, pilih salah satu di .env.local:
//   1) SUPABASE_ACCESS_TOKEN=sbp_...        (Account -> Access Tokens). Tanpa dependency tambahan.
//   2) SUPABASE_DB_URL=postgresql://...     (Dashboard -> Connect -> Session pooler). Butuh `npm i -D pg`.
//
// Pakai: node scripts/db-run.mjs            -> reset.sql, schema.sql, seed.sql
//        node scripts/db-run.mjs schema    -> hanya schema.sql
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);

const ref = (env.VITE_SUPABASE_URL ?? '').match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
if (!ref) throw new Error('VITE_SUPABASE_URL tidak terbaca/aneh di .env.local');

const urutanDefault = ['reset', 'schema', 'seed'];
const diminta = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const urutan = diminta.length ? diminta : urutanDefault;

const baca = (nama) => readFileSync(`supabase/${nama}.sql`, 'utf8');

async function lewatManagementApi(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  const teks = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${teks.slice(0, 500)}`);
  return teks;
}

async function lewatKoneksiLangsung(sql) {
  let pg;
  try {
    pg = await import('pg');
  } catch {
    throw new Error('SUPABASE_DB_URL dipakai tapi paket `pg` belum ada. Jalankan: npm i -D pg');
  }
  const klien = new pg.default.Client({ connectionString: env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await klien.connect();
  try {
    return JSON.stringify(await klien.query(sql));
  } finally {
    await klien.end();
  }
}

const jalankan = env.SUPABASE_ACCESS_TOKEN ? lewatManagementApi : lewatKoneksiLangsung;
if (!env.SUPABASE_ACCESS_TOKEN && !env.SUPABASE_DB_URL) {
  throw new Error('Isi SUPABASE_ACCESS_TOKEN atau SUPABASE_DB_URL di .env.local dulu.');
}

for (const nama of urutan) {
  const sql = baca(nama);
  process.stdout.write(`${nama}.sql (${sql.length} char) … `);
  try {
    await jalankan(sql);
    console.log('OK');
  } catch (e) {
    console.log('GAGAL');
    console.error(`  ${e.message}`);
    process.exit(1);
  }
}

// Bukti nyata dari database, bukan asumsi dari exit code.
const cek = `select
  (select count(*) from barriers) as hambatan,
  (select count(*) from accommodations) as akomodasi,
  (select count(*) from barrier_accommodation_rules) as aturan,
  (select count(*) from schools) as sekolah,
  (select count(*) from students) as siswa,
  (select count(*) from pg_policies where schemaname = 'public') as policy_rls`;
console.log('\nVerifikasi:', await jalankan(cek));
