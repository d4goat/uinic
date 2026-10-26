# Cheatsheet demo & penjurian

Satu halaman untuk hari-H: akun, perintah, urutan klik, pertanyaan juri beserta jawabannya, dan
angka bukti yang boleh diklaim. Latar belakang lengkap ada di [`PANDUAN.md`](./PANDUAN.md).

---

## Sebelum mulai (5 menit sebelum tampil)

```bash
cd C:/Users/prafasta/Documents/uinic
npm run cek:akun        # kelima akun harus OK
npm run uji:rls         # harus "14 lulus, 0 gagal"
npm run verifikasi:deploy -- https://uinic.vercel.app/ "Masuk ke" --routes=/,/login,/siswa
```

Kalau `cek:akun` gagal: jalankan `npm run seed` (akun disegarkan ke sandi di `.env.local`).
Buka dua tab: aplikasi (https://uinic.vercel.app) dan `/api-docs`. Siapkan sandi demo dari
`.env.local` di papan ketik — jangan ditampilkan di layar saat mengetik.

---

## Akun demo

| Email | Peran | Untuk menunjukkan |
|---|---|---|
| `rina@demo.test` | guru | alur utama: asesmen → saran → PPI → sesi |
| `dimas@demo.test` | gpk | versi PPI kedua (riwayat versi) |
| `koordinator@demo.test` | koordinator | transfer rekam + audit log |
| `sari@demo.test` | orang tua | tampilan wali (ponsel) + persetujuan |
| `admin@demo.test` | admin | seluruh sekolah |

Semua pakai sandi yang sama: nilai `DEMO_PASSWORD` di `.env.local`.

---

## Urutan demo 6 menit

1. **Masuk sebagai Bu Rina (guru).** Sebut: "otorisasi tidak di klien — ditegakkan RLS di basis
   data."
2. **`/siswa`** → perhatikan hanya siswa sekolahnya yang terlihat. Tambah satu siswa bila
   ingin menunjukkan validasi (coba kode `abc` → ditolak; kode `SIA-009` → diterima).
3. **`/siswa/:id/asesmen`** → centang *Kesulitan membaca* dan *Kebutuhan struktur dan transisi*,
   isi catatan singkat, simpan.
4. **`/siswa/:id/ppi`** → tunjukkan setiap saran membawa **alasan, tingkat bukti, dan peninjau**.
   Tolak satu saran (mis. "Tambahan waktu") untuk membuktikan guru tidak dipaksa menerima.
   Tulis dua tujuan + indikator, simpan → "tersimpan sebagai versi 1".
5. **`/ppi/:id/sesi`** → catat satu sesi (status *sebagian*). Matikan wifi, catat sesi lagi →
   muncul pesan "tersimpan di perangkat". Nyalakan wifi → "Kirim sekarang" → masuk tanpa dobel.
6. **Masuk sebagai Bu Wulan (koordinator)** → `/koordinator`:
   - pilih siswa, sekolah tujuan otomatis tersedia (Sekolah B), masa berlaku 72 jam
   - **sebutkan**: tombol aktif hanya karena persetujuan wali yang terbaru masih disetujui
   - buat token → **token tampil sekali**; unduh rekam JSON
   - tempel token sekali lagi → "token sudah dipakai" (sekali pakai terbukti live)
7. **`/audit`** → tunjukkan perubahan tercatat otomatis (insert/update/delete) dan pembacaan
   sensitif tercatat sebagai aksi `select`.
8. **/(opsional) `/orangtua`** sebagai Ibu Sari di ponsel, lalu **`/materi`** + **`/mode-siswa/:id`**
   untuk dua profil hambatan (bacakan/teks besar; jadwal visual).
9. **`/api-docs`** → sebut OpenAPI PostgREST bisa dibuka/diimpor ke Swagger UI.

---

## Pertanyaan juri yang paling mungkin, dan jawabannya

| Pertanyaan | Jawaban singkat |
|---|---|
| "Kalau saya panggil API langsung, apakah aturannya hilang?" | Tidak. Klien bukan penjaga aturan; RLS + RPC memeriksa di server. Buktinya `npm run uji:rls`: guru ditolak menghapus siswa, orang tua ditolak membaca catatan asesmen. |
| "Sama seperti aplikasi asesmen ABK?" | Tiga pembeda: rekam portabel lintas sekolah, tampilan orang tua, tahan offline. Bukan alat diagnosis. |
| "Integrasi Dapodik?" | Tidak ada; ini demonstrasi dua instansi. Kami tidak mengklaim integrasi resmi. |
| "Datanya anak-anak nyata?" | Tidak. Semua sintetis, pseudonim (kode + inisial, tanpa nama/NIK). |
| "Bagaimana kalau orang tua mencabut izin?" | Transfer yang belum jalan langsung tidak bisa dibuat; yang sudah terkirim tidak bisa ditarik, dan persetujuan tercatat di audit log. |
| "Catatan guru sensitif — bagaimana?" | Terenkripsi `pgcrypto`; kuncinya di tabel tanpa policy dan tanpa grant, hanya bisa dibaca fungsi server. |
| "Offline-nya bagaimana?" | Antrean `localStorage` + `client_uuid` unik → kirim ulang berkali-kali tetap satu baris. |
| "Kotak centangnya bisa dipakai tanpa mata?" | Target WCAG 2.1 AA: kontras ≥ 4,5:1 (dijaga `npm run cek:kontras`), seluruh fungsi bisa keyboard, fokus tidak pernah disembunyikan. |
| "Siapa yang meninjau aturan akomodasinya?" | Kolom `ditinjau_oleh` + `sumber` ada di tabel aturan. *(Isi nama peninjau sebelum submit!)* |

---

## Angka bukti yang aman diklaim

| Bukti | Nilai |
|---|---|
| Tabel / policy RLS / fungsi DB | 20 / 40 / 21 |
| Tabel ber-audit otomatis | 13 |
| Uji penolakan peran (`npm run uji:rls`) | 14 lulus, 0 gagal |
| Alur bahagia (`npm run seed`) | asesmen, 8 saran dari 2 hambatan, PPI versi 1, sesi idempoten, ringkasan wali, token sekali pakai |
| Referensi aturan | 2 hambatan, 8 akomodasi, 9 aturan dengan tingkat bukti & sumber |
| Data demo | 2 sekolah, 6 siswa sintetis |

Jangan mengklaim: peningkatan hasil belajar, dampak klinis, jumlah pengguna, atau integrasi
sistem sekolah — belum diukur, dan PRD melarangnya.

---

## Kalau ada yang rusak saat demo

| Gejala | Tindakan cepat |
|---|---|
| "Email atau kata sandi tidak cocok" | `npm run seed` lalu `npm run cek:akun`; login ulang. Sandi akun hanya berubah saat seed dijalankan. |
| Halaman berhenti di "Memuat…" | Sudah dibatasi 8 detik dan akan mengalihkan ke `/login` dengan pesan. Hard refresh (Ctrl+Shift+R). |
| "Masuk berhasil, tetapi profil tidak dapat dimuat" | Catat pesannya; ini kegagalan baca profil, bukan kredensial. |
| Produksi tampak lama | `npm run verifikasi:deploy …`: bila hash aset tak berubah, build terbaru belum jadi — cek tab Deployments Vercel. |
| Token transfer hilang | Tidak bisa dipulihkan (memang sekali tampil). Buat token baru; yang lama tidak bisa dipakai lagi. |