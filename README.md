# PPI-Link

Platform web untuk guru kelas dan guru pendamping khusus (GPK) di sekolah inklusif.
Guru mencentang hambatan yang diamati, sistem menyarankan akomodasi berdasarkan tabel aturan
yang transparan (setiap saran membawa alasan, tingkat bukti, dan siapa yang meninjau), lalu
menyusun draf Program Pembelajaran Individual (PPI) yang dapat diedit dan berversi. Kemajuan
dicatat per sesi, orang tua dapat membacanya, dan rekam PPI dapat dikirim ke sekolah lain lewat
API dengan persetujuan orang tua.

Proyek untuk Web Development Competition UINIC 8.0 (subtema Pendidikan).

## Yang tidak dilakukan produk ini

Bukan alat diagnosis, tidak menggantikan asesmen psikolog/GPK, tidak mengklaim peningkatan hasil
belajar, dan tidak terintegrasi dengan Dapodik. Transfer rekam hanya demonstrasi dua instansi
(Sekolah A dan Sekolah B) dengan data sintetis.

## Arsitektur

```
React 19 + Vite + TypeScript  →  supabase-js  →  Supabase Postgres
                                                 ├─ Auth (auth.users) + tabel profiles
                                                 ├─ Row Level Security → RBAC per peran & sekolah
                                                 ├─ trigger → audit_logs (setiap perubahan)
                                                 └─ RPC security definer → draf PPI, sesi, transfer
/api-docs  → spesifikasi OpenAPI PostgREST
```

Tidak ada server aplikasi terpisah. Otorisasi ditegakkan di basis data (RLS), bukan di klien,
jadi tidak bisa dilewati dengan memanggil API langsung. Catatan asesmen dan catatan sesi disimpan
terenkripsi (`pgcrypto`), kuncinya hanya dapat dibaca oleh fungsi `security definer`.

## Menjalankan

```bash
npm install
cp .env.example .env.local     # isi dari Supabase → Project Settings → API
```

Lalu di Supabase SQL Editor, jalankan berurutan:

1. `supabase/schema.sql` — tabel, RLS, trigger audit, RPC
2. `supabase/seed.sql` — dua sekolah demo, tabel referensi hambatan/akomodasi/aturan, siswa sintetis

```bash
npm run seed      # membuat akun demo + menjalankan alur nyata (jadwal, sesi, transfer)
npm run dev
```

`npm run seed` bukan sekadar isi data: ia masuk sebagai tiap akun demo lalu menjalankan
asesmen → saran akomodasi → draf PPI → log sesi → persetujuan wali → transfer token →
pengambilan rekam. Kalau RLS atau RPC salah, skrip gagal di langkah itu.

## Peran

| Peran | Bisa |
|---|---|
| `guru` | Data siswa sekolahnya, asesmen, draf PPI, log sesi, materi |
| `gpk` | Sama seperti guru; meninjau dan membuat versi PPI baru |
| `koordinator` | Ringkasan sekolah, transfer rekam, audit log, hapus data atas permintaan |
| `orang_tua` | Baca-saja ringkasan PPI + 10 sesi terakhir anak yang tertaut, beri/tarik persetujuan |
| `admin` | Seluruh sekolah |

## Pemeriksaan

```bash
npm run check:sql   # sintaks SQL dengan parser Postgres asli (libpg-query)
npm run build       # tsc -b + vite build
npm run lint
```

## Struktur

```
supabase/schema.sql      tabel, RLS, trigger audit, RPC (satu sumber otorisasi)
supabase/seed.sql        data referensi + dua instansi demo
scripts/seed-demo.mjs    akun demo + uji alur end-to-end
scripts/check-sql.mjs    cek sintaks SQL
src/lib/api.ts           satu-satunya lapisan akses data
src/lib/offline.ts       antrean sesi offline (F6)
src/styles/theme.css     token desain + utilitas aksesibilitas
src/pages/               halaman per alur
PLAN.md                  rencana kerja dan pemetaan fitur → halaman
```

Tingkat bukti pada tabel aturan (`tingkat_bukti`, `sumber`) mengikuti sumber di PRD §11.
Kolom `ditinjau_oleh` harus diisi nama GPK atau dosen PLB peninjau sebelum demo — bukan
placeholder.
