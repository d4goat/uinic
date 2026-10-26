/**
 * cek-kontras.mjs — penjaga WCAG 2.1 AA untuk palet PPI-Link (PRD §7).
 *
 * Membaca token dari src/styles/theme.css (blok @theme dan tiap penimpa mode
 * <html data-mode>), lalu menguji seluruh pasangan teks/latar yang dipakai
 * halaman. Gagal = keluar dengan kode 1, jadi bisa dipakai di CI.
 *
 * Ambang: 4,5:1 untuk teks normal, 3:1 untuk batas kontrol antarmuka (WCAG 1.4.11).
 *
 * Jalankan: npm run cek:kontras
 */
import { readFileSync } from 'node:fs';

const AMBANG_TEKS = 4.5;
const AMBANG_KONTROL = 3;

/** Luminansi relatif WCAG. */
function luminansi(hex) {
  const kanal = hex
    .replace('#', '')
    .match(/../g)
    .map((x) => parseInt(x, 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * kanal[0] + 0.7152 * kanal[1] + 0.0722 * kanal[2];
}

function rasio(a, b) {
  const [terang, gelap] = [luminansi(a), luminansi(b)].sort((p, q) => q - p);
  return (terang + 0.05) / (gelap + 0.05);
}

const css = readFileSync(new URL('../src/styles/theme.css', import.meta.url), 'utf8');

/** Ambil pasangan --color-*: #hex dari satu blok CSS yang cocok. */
function tokenDari(blok) {
  const isi = new RegExp(blok + '\\s*\\{([\\s\\S]*?)\\}', 'm').exec(css);
  if (!isi) return {};
  return Object.fromEntries(
    [...isi[1].matchAll(/--color-([a-z-]+)\s*:\s*(#[0-9a-fA-F]{3,6})\s*;/g)].map((m) => [
      m[1],
      m[2].toLowerCase(),
    ]),
  );
}

const dasar = { ...tokenDari('@theme') };
if (Object.keys(dasar).length === 0) {
  console.error('GAGAL: tidak ada token --color-* di blok @theme src/styles/theme.css.');
  process.exit(1);
}

const mode = {
  'normal': dasar,
  'kontras-tinggi': { ...dasar, ...tokenDari("html\\[data-mode='kontras-tinggi'\\]") },
};

/* Pasangan yang benar-benar dipakai halaman: teks di atas latar/kartu. */
const TEKS = [
  ['tinta', 'latar'],
  ['tinta', 'latar-lembut'],
  ['tinta', 'kartu'],
  ['tinta-lembut', 'latar'],
  ['tinta-lembut', 'latar-lembut'],
  ['tinta-lembut', 'kartu'],
  ['aksi', 'latar'],
  ['aksi', 'latar-lembut'],
  ['aksi', 'kartu'],
  ['aksen', 'latar'],
  ['berhasil', 'latar'],
  ['berhasil', 'latar-lembut'],
  ['peringatan', 'latar'],
  ['peringatan', 'latar-lembut'],
  ['galat', 'latar'],
  ['galat', 'latar-lembut'],
];

/* Teks putih di atas bidang berwarna (tombol utama, lompati-ke-konten, dsb). */
const PUTIH = [
  ['aksi', 'tombol utama'],
  ['aksi-gelap', 'tombol utama saat hover'],
  ['aksen', 'bidang aksen'],
  ['berhasil', 'bidang berhasil'],
  ['peringatan', 'bidang peringatan'],
  ['galat', 'tombol hapus saat hover'],
];

/* Batas kontrol antarmuka (WCAG 1.4.11) — bukan teks, ambangnya 3:1. */
const KONTROL = [
  ['garis-kuat', 'latar'],
  ['garis-kuat', 'kartu'],
];

let gagal = 0;

for (const [namaMode, token] of Object.entries(mode)) {
  console.log(`\nMode: ${namaMode}`);

  const uji = (a, b, ambang, label) => {
    // Nama token ditulis tanpa tanda '#'; nilai literal dipakai apa adanya.
    const warnaA = a.startsWith('#') ? a : token[a];
    const warnaB = b.startsWith('#') ? b : token[b];
    if (!warnaA || !warnaB) {
      console.log(`  LEWAT  ${a} / ${b} — token tidak ada di mode ini`);
      return;
    }
    const r = rasio(warnaA, warnaB);
    const ok = r >= ambang;
    if (!ok) gagal += 1;
    console.log(
      `  ${ok ? 'LULUS' : 'GAGAL'}  ${a.padEnd(13)} ${warnaA} di atas ${b.padEnd(13)} ${warnaB} = ${r.toFixed(2)}:1 (min ${ambang})${label ? ` — ${label}` : ''}`,
    );
  };

  for (const [a, b] of TEKS) uji(a, b, AMBANG_TEKS);
  for (const [latar, label] of PUTIH) uji('#ffffff', latar, AMBANG_TEKS, label);
  for (const [a, b] of KONTROL) uji(a, b, AMBANG_KONTROL, 'batas kontrol');
}

console.log(
  gagal === 0
    ? '\nSELESAI: semua pasangan warna memenuhi ambangnya.'
    : `\nGAGAL: ${gagal} pasangan warna di bawah ambang.`,
);
process.exit(gagal === 0 ? 0 : 1);