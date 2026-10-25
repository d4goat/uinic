#!/usr/bin/env node
// Verifikasi deploy frontend: rute, sidik jari aset, literal aplikasi, header.
// Pakai:
//   node scripts/verify-deploy.mjs <base-url> "<literal1>" ["literal2"] [--routes=/,/login,/siswa]
// Keluar dengan kode bukan-nol bila aset yang dilayani bukan build yang dimaksud.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const base = (args.shift() ?? '').replace(/\/$/, '');
if (!/^https?:\/\//.test(base)) {
  console.error('Pakai: node scripts/verify-deploy.mjs <base-url> "<literal>" [--routes=/,/login]');
  process.exit(2);
}

const literals = [];
let routes = ['/', '/login'];
let expectHost = null;
for (const a of args) {
  if (a.startsWith('--routes=')) routes = a.slice(9).split(',').filter(Boolean);
  else if (a.startsWith('--host=')) expectHost = a.slice(7);
  else if (a.startsWith('--literals-file=')) {
    literals.push(...readFileSync(a.slice(16), 'utf8').split('\n').filter(Boolean));
  } else literals.push(a);
}

let gagal = 0;
const baris = (ok, teks) => { console.log(`${ok ? 'OK   ' : 'GAGAL'} ${teks}`); if (!ok) gagal++; };

// 1. Setiap rute harus 200 (rewrite SPA benar-benar berlaku).
const kepala = new Map();
for (const r of routes) {
  const res = await fetch(base + r, { redirect: 'manual' });
  kepala.set(r, res.headers);
  const body = await res.text();
  const punyaRoot = body.includes('id="root"') || body.includes("id='root'");
  baris(res.status === 200 && punyaRoot, `rute ${r} → ${res.status}${punyaRoot ? '' : ' (tanpa #root: bukan shell SPA)'}`);
}

// 2. Sidik jari aset + timestamp: dua pemeriksaan identik = alias basi.
const html = await (await fetch(base + '/')).text();
const aset = html.match(/\/assets\/[^"']+\.js/)?.[0];
if (!aset) baris(false, 'tidak menemukan berkas /assets/*.js di index.html');
let js = '';
if (aset) {
  const res = await fetch(base + aset);
  js = await res.text();
  const sha = createHash('sha256').update(js).digest('hex').slice(0, 12);
  console.log(`     aset ${aset}  sha256:${sha}  ${js.length} byte  last-modified:${res.headers.get('last-modified') ?? '-'}`);
  baris(res.status === 200, `aset terunduh (${res.status})`);
}

// 3. Literal aplikasi harus ada DI DALAM bundle, bukan hanya di html.
for (const l of literals) baris(js.includes(l), `literal "${l}" ada di bundle`);
if (expectHost) baris(js.includes(expectHost), `host backend ${expectHost} tertanam (env build terbaca)`);

// 4. Header keamanan sebagai header respons nyata.
const h = kepala.get('/') ?? new Headers();
for (const nama of ['content-security-policy', 'x-content-type-options', 'x-frame-options', 'referrer-policy']) {
  const nilai = h.get(nama);
  baris(!!nilai, `header ${nama}${nilai ? `: ${String(nilai).slice(0, 60)}…` : ' tidak ada'}`);
}

console.log(gagal ? `\n${gagal} pemeriksaan GAGAL — ini bukan build yang kamu kira.` : '\nSemua pemeriksaan lulus.');
process.exit(gagal ? 1 : 0);
