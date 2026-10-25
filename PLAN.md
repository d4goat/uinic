# PLAN — PPI-Link (UINIC 8.0)

Tenggat: Jum 30 Okt 2026 23.59 WIB → proposal PDF (≤30 hal) + link demo + repo publik.
Repo: https://github.com/d4goat/uinic (React 19 + Vite + TS). Commit langsung ke `main`.

## Stack

| Lapisan | Pilihan |
|---|---|
| Frontend | React 19 + Vite 8 + TypeScript, react-router |
| DB | Supabase Postgres |
| Auth | Supabase Auth (`auth.users`) + tabel `profiles` |
| RBAC | Row Level Security per role + school_id |
| Audit (F12) | trigger Postgres → `audit_logs` |
| Transfer rekam (F8) | RPC `security definer`: `create_transfer`, `fetch_record` |
| API docs (F9) | PostgREST OpenAPI di `/api/docs` |
| Enkripsi catatan | pgcrypto `pgp_sym_encrypt`, kunci di tabel terproteksi |
| Hosting | Vercel (frontend) — Supabase sudah punya URL publik |

Tanpa backend Express. RBAC divalidasi di DB, bukan di app → tidak bisa dilewati dari klien.

## Peran (role)

`guru`, `gpk`, `koordinator`, `orang_tua`, `admin` — disimpan di `profiles.role`, dipakai helper
`current_role()` dan `current_school_id()` di RLS.

## Urutan kerja

1. `supabase/schema.sql` — 20 tabel PRD §8 + RLS + trigger audit + RPC transfer + pgcrypto.
2. `supabase/seed.sql` — tabel referensi (barriers, accommodations, rules) dari PRD §11 +
   tenant demo Sekolah A / Sekolah B + data sintetis.
3. Frontend: client supabase, AuthContext, ProtectedRoute, layout, halaman P0.
4. Aksesibilitas: token CSS kontras ≥4,5:1, fokus keyboard, mode baca besar.
5. Deploy + proposal.

## Peta fitur → halaman

| ID | Fitur | Rute |
|---|---|---|
| F1 | Login + RBAC | `/login` |
| F2 | Data siswa pseudonim | `/guru/siswa` |
| F3 | Asesmen hambatan | `/guru/siswa/:id/asesmen` |
| F4 | Rekomendasi akomodasi | `/guru/siswa/:id/ppi` |
| F5 | Draf PPI berversi | `/guru/siswa/:id/ppi` |
| F6 | Log sesi (idempoten `client_uuid`) | `/guru/ppi/:id/sesi` |
| F7 | Tampilan orang tua (baca-saja) | `/orangtua` |
| F8 | Persetujuan + transfer token | `/koordinator/transfer` |
| F9 | OpenAPI | `/api/docs` (eksternal) |
| F10 | Materi aksesibel | `/materi/:id` |
| F11 | Mode siswa (jadwal visual) | `/mode-siswa/:id` |

## Status & infrastruktur (per 25 Okt)

| Hal | Nilai |
|---|---|
| Repo | https://github.com/d4goat/uinic (publik) |
| Demo | https://uinic.vercel.app/ — akun `d4goats-pro` (milik teman tim) |
| Database | Supabase project `hvykeauvtwnwefrnnzln` |
| RLS/RPC | terbukti di database nyata: `npm run seed` (alur bahagia) + `npm run uji:rls` (14 asersi penolakan) |

Jalankan `npm run verifikasi:deploy -- https://uinic.vercel.app/ "Selamat datang" --routes=/,/login,/siswa`
untuk memastikan produksi benar-benar build terbaru (rute SPA, sidik jari aset, header keamanan).

Catatan deploy: commit yang di-deploy harus ditulis akun yang punya akses ke project Vercel.
Pada repo **private** + tim **Hobby**, hanya commit milik pemilik tim yang di-deploy (build
"blocked", bukan gagal) — inilah yang membuat push dari akun lain tidak pernah muncul di
produksi. Repo sudah publik; kalau muncul blokir serupa, minta pemilik Vercel push satu commit
kosong.

## Pending / butuh dari user

- Nama GPK/dosen PLB peninjau untuk kolom `ditinjau_oleh` di `supabase/seed.sql` (masih placeholder `GANTI:`).
- Hasil wawancara 5 guru/GPK + skor SUS untuk bagian "Hasil Pengujian" proposal.
- Guidebook UINIC 8.0 hal. 14-15 (format PPI sekolah mitra + struktur proposal).
