# PPI-Link — panduan lengkap

Dokumen ini untuk siapa pun yang harus **memahami** proyek ini: apa tujuannya, siapa
penggunanya, bagaimana satu alur berjalan dari klik pertama sampai data tersimpan, dan bagian
kode mana yang mengerjakan apa. Semua klaim di sini bisa diperiksa di repo; kalau ada yang
tidak cocok, kode dan `supabase/schema.sql` yang benar.

Urutan baca yang disarankan: bagian 1–3 untuk paham produk, 4–8 untuk paham mesinnya, 11–12
untuk paham cara kerja sehari-hari, 15 untuk pelajaran dari bug yang sudah pernah terjadi.

---

## 1. Tujuan dan masalah

Sekolah inklusif menempatkan siswa berkebutuhan khusus di kelas reguler. Dua orang mengurus
mereka: **guru kelas** (tidak berlatar Pendidikan Luar Biasa) dan **GPK** (guru pendamping
khusus, jumlahnya sedikit). Yang wajib ada untuk setiap siswa berkebutuhan khusus adalah
**PPI (Program Pembelajaran Individual)** — dokumen berisi tujuan, indikator, dan akomodasi
yang disepakati.

Yang PPI-Link kerjakan:

1. **Mempercepat penyusunan PPI.** Guru mencentang hambatan yang diamati; sistem menyodorkan
   akomodasi dari tabel aturan, masing-masing dengan alasan, tingkat bukti, dan nama peninjau.
   Guru boleh menerima atau menolak saran.
2. **Menyajikan materi dalam bentuk yang lebih mudah diakses** siswa dengan hambatan tertentu
   (bacakan, teks besar, kalimat pendek, jadwal visual).
3. **Menjaga kesinambungan catatan** ketika siswa berpindah guru atau sekolah: rekam PPI bisa
   dikirim ke sekolah lain lewat API, dengan persetujuan orang tua.

Dari riset awal (PRD bagian 2) datang empat alasan: guru sulit menyusun PPI; jumlah GPK
terbatas; perpindahan antar sekolah rawan kehilangan catatan; koneksi internet sekolah tidak
stabil sehingga aplikasi harus tahan offline.

### Tiga pembeda

Kalau ditanya "apa bedanya dengan aplikasi asesmen ABK?", jawabannya ada tiga:

| Pembeda | Diwujudkan oleh |
|---|---|
| Rekam portabel lintas sekolah (bukan terkunci di satu sekolah) | `transfers` + `rpc_transfer_create` + `rpc_record_fetch`, token sekali pakai |
| Tampilan orang tua yang bisa dibaca di ponsel | `rpc_wali_ringkasan` + halaman `/orangtua` |
| Aturan akomodasi yang transparan dan bisa diperiksa | tabel `barrier_accommodation_rules` dengan `alasan`, `tingkat_bukti`, `sumber`, `ditinjau_oleh` |

### Yang TIDAK dilakukan (non-goal, jangan pernah diklaim)

- Bukan alat diagnosis; tidak menggantikan asesmen psikolog, terapis, atau GPK.
- Tidak mengklaim peningkatan hasil belajar atau dampak klinis.
- **Tidak terintegrasi Dapodik.** Yang ada hanya demonstrasi dua instansi (Sekolah A & B).
- Tidak ada akun siswa; Mode siswa dijalankan guru di perangkat kelas.
- Profil hambatan lain (tunanetra, tunarungu, tunadaksa) di luar lingkup, kecuali aksesibilitas
  dasar yang berlaku untuk semua.

---

## 2. Pengguna dan peran

Peran disimpan di tabel `profiles.role` (enum `user_role`). Ini **satu-satunya** sumber
kewenangan; klien hanya menyesuaikan tampilan.

| Peran | Nama demo | Boleh |
|---|---|---|
| `guru` | Bu Rina | siswa sekolahnya, asesmen, draf PPI, sesi, materi |
| `gpk` | Pak Dimas | sama seperti guru; meninjau & membuat versi PPI berikutnya |
| `koordinator` | Bu Wulan | ringkasan sekolah, transfer rekam, audit log, hapus data atas permintaan |
| `orang_tua` | Ibu Sari | baca-saja ringkasan PPI + 10 sesi terakhir anak tertaut; beri/tarik persetujuan |
| `admin` | Admin Sistem | seluruh sekolah, mengelola tabel referensi |

Orang tua **juga** punya `school_id` (mereka bagian dari sekolah itu), tetapi helper
`fn_boleh_student()` bercabang per peran supaya mereka tidak melihat siswa se-sekolah. Ini
bukan detail kecil — tanpa cabang itu, seorang wali bisa membaca seluruh sekolah (lihat §15.3).

---

## 3. Fitur dan alur end-to-end

### A. Menyusun PPI (F2, F3, F4, F5)

```
/login ──> /siswa ──> /siswa/:id/asesmen ──> /siswa/:id/ppi ──> /ppi/:id/sesi
  masuk     pilih      centang hambatan        saran + tulis      catat sesi
           siswa      + catatan               tujuan, simpan
```

1. **Masuk** (`/login` → `src/pages/Login.tsx`). `login()` memanggil Supabase Auth. Sesudah itu
   `AuthContext` mengambil profil pengguna dengan `ambilProfil(userId)`.
2. **Pilih siswa** (`/siswa`). `daftarSiswa()` membaca tabel `students`; RLS membatasi ke
   sekolah sendiri. Koordinator/admin bisa menambah dan menghapus (hapus = `rpc_student_delete`,
   menyapu seluruh turunannya lewat `on delete cascade`).
3. **Asesmen hambatan** (`/siswa/:id/asesmen`). `referensiHambatan()` mengisi daftar centang.
   Menyimpan = satu panggilan `rpc_assessment_save(student, hambatan[], catatan)`, yang menulis
   satu baris `assessments` **plus** baris `assessment_barriers`, dalam satu transaksi. Catatan
   disimpan terenkripsi (`catatan_enc`).
4. **Saran akomodasi** (`/siswa/:id/ppi`). `rpc_ppi_suggest(student)` membaca asesmen terakhir,
   menelusuri `barrier_accommodation_rules`, dan mengembalikan **satu baris per akomodasi**
   dengan `alasan`, `tingkat_bukti`, `sumber`, `ditinjau_oleh`, dan `dari_hambatan` (nama
   hambatan digabung bila akomodasi sama muncul dari dua hambatan).
5. **Draf PPI berversi.** Menyimpan = `rpc_ppi_save(student, ppi, ringkasan, tujuan[],
   akomodasi[])`. Setiap penyimpanan membuat `ppi_versions` bernomor baru dengan tujuan
   (`ppi_goals`) dan akomodasi yang disetujui (`ppi_accommodations`). Riwayat tidak pernah
   ditimpa; `ppis.versi_aktif` menunjuk versi terakhir.
6. **Catat sesi** (`/ppi/:id/sesi`). `rpc_session_log(...)` menulis satu baris `sessions`.
   Idempoten lewat `client_uuid` (lihat §10).

### B. Mengajar dengan materi aksesibel (F10, F11)

1. `/materi` — guru memilih materi, menyalakan **teks besar**, **kontras tinggi**, atau
   **kalimat pendek**; tombol **Bacakan** memakai `speechSynthesis` peramban (`lang='id-ID'`).
   Bisa juga menambah materi baru beserta variannya.
2. `/mode-siswa/:id` — layar besar berisi jadwal visual: satu langkah per baris, berikon, bisa
   dicentang. Tanpa akun anak; status centang disimpan di `localStorage` per materi.

### C. Mencatat sesi (F6)

Formulir memilih indikator dari PPI aktif, tanggal, status capaian (belum/sebagian/tercapai),
dan catatan. Sesi tersimpan terenkripsi; riwayat menampilkan rekap ("12 sesi: 3 belum, …").

### D. Orang tua (F7)

`/orangtua` memuat `rpc_wali_ringkasan(student)` — identitas anak, sekolah, PPI versi aktif,
tujuan + indikator, akomodasi beserta status disetujui, **10 sesi terakhir**, dan riwayat
persetujuan. Halaman ini baca-saja dan **tidak** menampilkan catatan asesmen mentah. Dari sini
orang tua memberi atau menarik persetujuan berbagi rekam (`rpc_consent_save`).

### E. Transfer rekam antar sekolah (F8, F9)

```
/orangtua  (wali: persetujuan "berbagi_rekam")
      │
      ▼
/koordinator (koordinator sekolah asal)
   1. pilih siswa  2. pilih sekolah tujuan (rpc_sekolah_tujuan)  3. masa berlaku 24/72/168 jam
   4. tombol aktif hanya bila persetujuan wali terbaru = "disetujui" dan belum kedaluwarsa
   5. rpc_transfer_create(...) ─> token PLAINTEXT muncul SEKALI (yang disimpan sha256-nya)
      │
      ▼
sekolah tujuan (tanpa akun PPI-Link)
   tempel token ─> rpc_record_fetch(token) ─> JSON rekam (PPI + 20 sesi terakhir)
   token langsung hangus: sekali pakai, ada kedaluwarsa, setiap pengambilan masuk audit log
```

---

## 4. Arsitektur

```
React 19 + Vite + TypeScript  ─┐
Tailwind v4 + shadcn/radix     ├─ supabase-js (URL + anon key, ter-bundle saat build)
GSAP + Lenis (landing)         ┘        │
                                        ▼
                       Supabase Postgres  (project: hvykeauvtwnwefrnnzln)
                       ├─ Auth            auth.users + tabel profiles (role, school_id)
                       ├─ RLS             40 policy = RBAC sebenarnya
                       ├─ trigger         13 tabel diaudit otomatis
                       ├─ RPC             11 rpc_* security definer (aksi multi-tabel)
                       └─ pgcrypto        catatan asesmen & sesi terenkripsi
Hosting: Vercel (VITE_* di-inline saat build)  ·  OpenAPI: /rest/v1/ (PostgREST) → halaman /api-docs
```

**Kenapa tanpa server aplikasi sendiri.** Yang dibutuhkan (auth, isolasi data per sekolah,
audit, dokumentasi API) semuanya bisa ditegakkan basis data. Konsekuensinya penting dan sering
ditanya juri: *"kalau saya panggil API langsung, apakah aturannya hilang?"* — tidak. Klien bukan
penjaga aturan; RLS dan RPC yang menjaga, dan keduanya berjalan di server.

---

## 5. Model data

20 tabel di `supabase/schema.sql`. Dikelompokkan supaya mudah diingat:

| Kelompok | Tabel | Catatan |
|---|---|---|
| Instansi & orang | `schools`, `profiles`, `students`, `guardian_links` | identitas asli ada di `auth.users`; `profiles` yang menyimpan peran |
| Referensi (jarang berubah) | `barriers`, `accommodations`, `barrier_accommodation_rules` | inilah "aturan" yang ditinjau manusia |
| Asesmen | `assessments`, `assessment_barriers` | `catatan_enc` terenkripsi |
| PPI | `ppis`, `ppi_versions`, `ppi_goals`, `ppi_accommodations` | satu `ppis` per siswa; versi bertambah, tidak ditimpa |
| Sesi & materi | `sessions`, `materials`, `material_variants` | `sessions.client_uuid` unik → idempoten |
| Persetujuan & transfer | `consents`, `transfers` | `transfers.token_hash` = sha256, bukan token asli |
| Audit & rahasia | `audit_logs`, `app_secrets` | `app_secrets` tanpa policy & tanpa grant |

Tiga aturan yang dipegang seluruh skema:

- **Pseudonim (F2).** `students` tidak punya kolom nama/NIK. Hanya `kode` (pola
  `^[A-Z0-9-]{3,12}$`), `inisial` (maks 3 huruf), `tahun_lahir`, `kelas`. Divalidasi `CHECK`,
  bukan hanya di klien.
- **Integritas di basis data.** Relasi lewat foreign key; `on delete cascade` dari `students`
  membuat penghapusan atas permintaan (F2) benar-benar menyapu semuanya.
- **Data sensitif terenkripsi.** `assessments.catatan_enc` dan `sessions.catatan_enc` bertipe
  `bytea`, diisi `pgp_sym_encrypt`. Kuncinya hidup di `app_secrets` — tabel tanpa policy RLS
  dan tanpa grant, jadi hanya fungsi `security definer` yang bisa membacanya.

---

## 6. Otorisasi: RLS dan helper

Pola yang dipakai berulang: setiap "boleh atau tidak" ditulis sebagai **fungsi helper** yang
dipanggil policy.

| Helper | Menjawab |
|---|---|
| `fn_role()` | peran pemanggil |
| `fn_school()` | sekolah pemanggil (null untuk admin) |
| `fn_boleh_student(uuid)` | admin semua; guru/gpk/koordinator sekolah sendiri; **orang tua hanya anak yang tertaut** |
| `fn_boleh_wali(uuid)` | apakah pemanggil wali siswa ini (cek `guardian_links`) |
| `fn_dec(bytea)` / `fn_enc(text)` | dekripsi/enkripsi catatan (aman karena RLS tetap menjaga barisnya) |

Aturan implementasi yang tidak boleh dilanggar:

1. Helper `security definer` + `set search_path`, **dan didefinisikan sebelum** policy/RPC yang
   memanggilnya. Fungsi `language sql` divalidasi saat dibuat — memanggil yang belum ada akan
   menggagalkan seluruh skrip.
2. Dua fungsi yang saling memanggil harus urut: `fn_boleh_wali` sebelum `fn_boleh_student`.
3. Setiap tabel yang dibaca klien punya RLS aktif dan policy eksplisit. Bila perlu, ada file
   `supabase/reset.sql` untuk membangun ulang dari nol.

Pembagiannya: `guru`/`gpk` menulis asesmen & PPI; `koordinator` membuat transfer dan menghapus
data; orang tua memberi persetujuan; admin mengubah tabel referensi. Semua penolakan diuji —
lihat `npm run uji:rls` (§11).

---

## 7. Audit (F12)

- **Perubahan** (insert/update/delete) dicatat otomatis oleh trigger `fn_audit()` pada 13 tabel
  berisi data siswa. Kode aplikasi tidak perlu ingat mencatat; trigger tidak pernah lupa.
- **Pembacaan** tidak bisa ditangkap trigger (Postgres tidak punya SELECT trigger). Karena itu
  pembacaan yang sensitif dipanggil eksplisit: `rpc_log_read(...)` (dipakai saat membuka daftar
  siswa, log sesi, halaman wali), dan RPC lain menulis audit sendiri
  (`rpc:transfer_create`, `rpc:record_fetch`, `rpc:session_log`, `rpc:consent`).
- Yang tercatat: pengguna, aksi, tabel, id objek, waktu, dan alamat IP dari header
  `x-forwarded-for` bila tersedia. Akses lewat token punya `user_id` null — itu menandakan
  "diambil tanpa akun, memakai token".
- Halaman `/audit` (koordinator/admin) menampilkan 50 kejadian terakhir.

Jujur soal batasnya: pembacaan langsung ke tabel (mis. `GET /rest/v1/students`) **tidak**
tercatat per baris. Yang tercatat adalah perubahan, pembacaan lewat RPC bernama, dan pembacaan
yang aplikasi tandai sendiri. Jangan klaim lebih dari itu.

---

## 8. Katalog RPC

Semua `security definer` dan memeriksa peran di dalam badannya, jadi tidak bisa dipakai di luar
hak meski RLS dilewati.

| Fungsi | Argumen | Boleh | Efek |
|---|---|---|---|
| `rpc_assessment_save` | `student, hambatan[], catatan` | guru, gpk | satu asesmen + hambatan terpilih, catatan dienkripsi |
| `rpc_ppi_suggest` | `student` | staf & wali tertaut | baca: hambatan + saran akomodasi (tanpa menulis) |
| `rpc_ppi_save` | `student, ppi, ringkasan, tujuan[], akomodasi[]` | guru, gpk | versi PPI baru; akomodasi kembar dirapikan `distinct on` |
| `rpc_session_log` | `ppi, goal, tanggal, status, catatan, client_uuid` | guru, gpk | satu sesi; idempoten lewat `client_uuid` |
| `rpc_consent_save` | `student, jenis, status, berlaku_hingga` | wali siswa itu | baris persetujuan baru (keputusan terbaru yang berlaku) |
| `rpc_transfer_create` | `student, ke_school, jam` | koordinator, admin | token sekali pakai; **butuh persetujuan wali terbaru = disetujui** |
| `rpc_record_fetch` | `token` | anon + authenticated | mengambil rekam; menandai token terpakai (`for update`) |
| `rpc_wali_ringkasan` | `student` | wali tertaut | ringkasan baca-saja + 10 sesi terakhir |
| `rpc_sekolah_tujuan` | — | koordinator, admin | direktori sekolah lain (id, nama, kode) |
| `rpc_student_delete` | `student` | koordinator, admin | hapus data siswa atas permintaan (cascade) |
| `rpc_log_read` | `objek, objek_id, keterangan` | authenticated | mencatat pembacaan sensitif |

Dua hal yang mudah tertukar: `rpc_ppi_suggest` boleh dipanggil wali (untuk ringkasan), tetapi
**halaman wali memakai `rpc_wali_ringkasan`** supaya catatan asesmen mentah tidak pernah ikut
terkirim. Dan `rpc_record_fetch` sengaja bisa dipanggil `anon` — token itu sendiri yang menjadi
hak akses, seperti tautan undangan sekali pakai.

---

## 9. Aksesibilitas

- Target WCAG 2.1 AA untuk layar guru dan orang tua: kontras ≥ 4,5:1, seluruh fungsi bisa
  dipakai keyboard, fokus keyboard selalu terlihat (tidak ada `outline` yang dihapus).
- Dua warna teks saja (tinta & tinta-lembut) dijaga skrip, bukan ingatan: `npm run cek:kontras`
  menghitung rasio tiap pasangan warna dan gagal bila di bawah ambang.
- Font dibundel dari `node_modules` (tanpa jaringan) karena CSP hanya mengizinkan `font-src
  'self'` dan perangkat sekolah sering luring.
- **Mode siswa** memakai teks besar berikon dan tombol besar; **materi aksesibel** menyediakan
  mode teks besar, kontras tinggi, kalimat pendek, dan bacakan (TTS) dengan pesan jelas bila
  peramban tidak punya suara Bahasa Indonesia.
- Gerak (GSAP/Lenis) hanya berjalan bila `prefers-reduced-motion: no-preference`.

---

## 10. Offline dan idempotensi (F6)

Koneksi sekolah tidak stabil, jadi sesi bisa dicatat tanpa jaringan:

1. Menyimpan sesi membuat `client_uuid = crypto.randomUUID()` di peramban.
2. Bila pengiriman gagal, isi sesi masuk antrean `localStorage` (`src/lib/offline.ts`) dan
   pengguna diberi tahu "tersimpan di perangkat, akan terkirim otomatis" — bukan galat keras.
3. Saat jaringan kembali, `kirimAntrean()` mengirim ulang. Server menulis dengan
   `on conflict (client_uuid) do nothing`, lalu membaca kembali id-nya. **Kirim berapa kali pun,
   satu sesi tetap satu baris.** Ini alasan `sessions.client_uuid` unik — bukan sekadar kolom
   tambahan.

---

## 11. Menjalankan, menguji, mendemokan

```bash
npm install
cp .env.example .env.local        # isi dari Supabase -> Project Settings -> API

npm run db                        # reset.sql -> schema.sql -> seed.sql (butuh SUPABASE_ACCESS_TOKEN atau SUPABASE_DB_URL)
npm run seed                      # akun demo + menjalankan seluruh alur nyata sebagai tiap peran
npm run uji:rls                   # 14 asersi PENOLAKAN: apa yang tidak boleh dilakukan tiap peran
npm run cek:akun                  # pastikan kelima akun demo bisa login
npm run check                     # check:sql + tsc + eslint
npm run cek:kontras               # rasio kontras token warna (WCAG AA)
npm run build                     # tsc -b && vite build
npm run dev                       # jalankan lokal
npm run verifikasi:deploy -- https://uinic.vercel.app/ "Masuk ke" --routes=/,/login,/siswa
```

Arti perintah yang mudah disalahpahami: **`npm run seed` bukan sekadar mengisi data.** Ia masuk
sebagai tiap akun demo lalu menjalankan asesmen → saran → draf PPI → log sesi → persetujuan wali
→ transfer token → pengambilan rekam. Kalau RLS atau RPC salah, ia gagal di langkah itu. Pasangan
`npm run uji:rls` menyerang dari sisi sebaliknya.

---

## 12. Peta kode: kalau mau mengubah X, sentuh Y

| Ingin mengubah… | Berkas |
|---|---|
| Rute/halaman baru | `src/App.tsx` |
| Nama kolom atau fungsi akses data | `src/lib/api.ts` (satu-satunya lapisan data; halaman tidak memanggil klien langsung) |
| Tipe data bersama | `src/lib/types.ts` |
| Aturan kewenangan | `supabase/schema.sql` (policy & helper) — **bukan** di klien |
| Perilaku login/sesi | `src/auth/AuthContext.tsx`, `src/auth/ProtectedRoute.tsx` |
| Tampilan/penanda desain | `src/styles/theme.css` (Tailwind `@theme`) |
| Teks saran akomodasi & peninjau | `supabase/seed.sql` (kolom `ditinjau_oleh`) |
| Antrean offline | `src/lib/offline.ts` |
| Isi data demo | `scripts/seed-demo.mjs` |

Struktur lapisan yang dipegang: **halaman → `src/lib/api.ts` → Supabase**. Halaman tidak pernah
memanggil `supabase` langsung; mengganti nama kolom atau RPC cukup satu suntingan.

---

## 13. Batasan dan hal yang belum diverifikasi

Jujur di sini lebih baik daripada dikritik juri:

- RLS/RPC **sudah** dibuktikan terhadap database nyata (bukan asumsi): `npm run seed` dan
  `npm run uji:rls` lulus pada project `hvykeauvtwnwefrnnzln`.
- **Belum** diuji: lintas peramban penuh (uji manual keyboard & Lighthouse masih perlu
  dikerjakan), uji beban 50 pengguna bersamaan, dan kualitas suara Indonesia di berbagai
  perangkat.
- Kolom `ditinjau_oleh` masih placeholder `GANTI: nama GPK/dosen PLB peninjau` sampai benar-benar
  ditinjau manusia. Jangan menulis nama tanpa persetujuan orangnya.
- Penghapusan data berjalan (cascade), tetapi belum ada alur "unduh data sebelum hapus".
- Belum ada rate limit pada `rpc_record_fetch` di luar sekali-pakai + kedaluwarsa.

---

## 14. Glosarium

| Istilah | Arti |
|---|---|
| ABK | Anak Berkebutuhan Khusus |
| GPK | Guru Pendamping Khusus |
| PPI | Program Pembelajaran Individual — dokumen tujuan, indikator, akomodasi untuk satu siswa |
| Akomodasi | Penyesuaian cara belajar/mengajar, bukan perubahan target |
| Hambatan | Kondisi yang diamati guru dan menghambat belajar (mis. kesulitan membaca) |
| UDL | Universal Design for Learning — satu materi dalam beberapa bentuk |
| TTS | Text-to-speech, dibacakan peramban |
| RLS | Row Level Security: Postgres menyaring baris per pengguna |
| RPC | Fungsi basis data yang dipanggil klien sebagai satu transaksi |
| Idempoten | Dijalankan berkali-kali memberi hasil sama (di sini: `client_uuid`) |

---

## 15. Pelajaran dari bug nyata (semuanya pernah terjadi di proyek ini)

Bagian ini bukan riwayat keluhan; masing-masing adalah mekanisme yang perlu diketahui siapa pun
yang menyentuh kode ini.

**15.1 Fungsi SQL divalidasi saat dibuat.** `fn_boleh_student` memanggil `fn_boleh_wali` yang
didefinisikan *setelahnya* → seluruh `schema.sql` gagal di tengah, tabel-tabel sebelumnya sudah
ter-commit. Urutkan definisi helper dari yang paling dasar.

**15.2 Parameter pgcrypto bertipe `text`, bukan `bytea`.** `pgp_sym_decrypt(bytea, text)`; kunci
disimpan sebagai hex 64 karakter. Kesalahan tipe ini hanya muncul saat skrip dijalankan pada
database nyata, tidak oleh pemeriksa sintaks.

**15.3 Orang tua punya `school_id`.** Helper yang hanya berbunyi `role = 'admin' or school_id =
fn_school()` memberi setiap wali akses seluruh sekolah. Kewenangan harus bercabang per peran di
dalam helper, dan catatan asesmen mentah tetap tertutup untuk wali.

**15.4 RLS menyaring baris, tidak menjamin tepat satu.** `select('*').maybeSingle()` tanpa
filter bekerja untuk guru dan **gagal untuk admin** (policy-nya membuka semua profil → 5 baris →
PGRST116). Selalu filter identitas dengan id dari sesi. Ini yang membuat akun admin tidak bisa
masuk, sementara `npm run cek:akun` lulus karena skrip itu memang memfilter id.

**15.5 Kegagalan yang tidak terlihat = pengguna menyalahkan kata sandi.** Login berhasil tetapi
profil gagal dimuat, dan halaman tidak menampilkan apa pun → kesimpulan pengguna: "sandi salah".
Pesan galat harus muncul di tempat pengguna melihat, dan layar tunggu wajib punya batas waktu
(`finally` + timeout), bukan `Memuat…` abadi.

**15.6 Persetujuan yang dicabut tidak boleh hidup kembali.** Membaca "baris mana pun yang
disetujui" akan menghidupkan persetujuan lama. Aturannya: keputusan **terbaru** untuk jenis itu
yang berlaku, di server dan di klien.

**15.7 Perubahan sandi demo butuh seed ulang.** Akun dibuat sekali; mengubah `DEMO_PASSWORD` di
`.env.local` tidak menyentuh hash yang tersimpan sampai `npm run seed` dijalankan lagi. Jalankan
`npm run cek:akun` setelahnya.

**15.8 Deploy bisa gagal tanpa satu baris kode pun dieksekusi.** Konfigurasi host yang tidak
valid (`vercel.json` dengan kunci di luar skema) menghentikan build sebelum install, dan produksi
tetap menyajikan build lama — terlihat "situs hidup" padahal commit-nya tidak pernah sampai. Pada
repo private + tim Hobby, commit juga diblokir bila penulisnya bukan pemilik tim Vercel.