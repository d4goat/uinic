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

## Pending / butuh dari user

- Project Supabase (URL + anon key) → `.env.local`. Belum ada; skema tetap bisa ditulis tanpa itu.
- Repo dijadikan **publik** sebelum submit.
