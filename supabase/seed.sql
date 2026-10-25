-- ============================================================================
-- PPI-Link — data referensi + tenant demo. Jalankan setelah schema.sql.
--
-- Isi: dua sekolah demo (§10), tabel referensi hambatan/akomodasi/aturan (§11),
-- dan siswa sintetis pseudonim (§F2). TIDAK ada data siswa nyata di sini.
--
-- PENTING untuk proposal: kolom `ditinjau_oleh` di tabel aturan harus diisi nama
-- GPK atau dosen PLB yang benar-benar meninjau (PRD §8). Ganti placeholder di
-- bawah setelah peninjauan selesai.
-- ============================================================================

-- ---------------------------------------------------- dua instansi demo ----
insert into schools(nama, kode_instansi) values
  ('SMP Inklusif Nusantara (Sekolah A)', 'SIA'),
  ('SMP Harapan Bina (Sekolah B)',      'SHB')
on conflict (kode_instansi) do update set nama = excluded.nama;

-- ------------------------------------------------ hambatan (2 profil) ------
insert into barriers(kode, nama, deskripsi) values
  ('kesulitan_membaca', 'Kesulitan membaca',
   'Hambatan mengenali kata dan memahami teks bacaan pada level kelas.'),
  ('kebutuhan_struktur_transisi', 'Kebutuhan struktur dan transisi (autisme)',
   'Memerlukan urutan kegiatan yang dapat diprediksi dan peringatan sebelum berpindah kegiatan.')
on conflict (kode) do update set nama = excluded.nama, deskripsi = excluded.deskripsi;

-- ------------------------------------------------------------ akomodasi ----
insert into accommodations(kode, nama, deskripsi, tingkat_bukti, sumber) values
  ('bacakan_materi', 'Bacakan materi',
   'Teks dibacakan dengan sintesis suara peramban sambil siswa mengikuti teksnya.',
   'sedang', '[S7] Wood dkk. (2017), meta-analisis text-to-speech'),
  ('huruf_besar_spasi_lega', 'Huruf besar dan spasi lega',
   'Ukuran huruf dinaikkan dan jarak antarkata/baris dilebarkan.',
   'sedang', '[S7]; [S9] UDL systematic review'),
  ('kalimat_pendek', 'Kalimat dipecah menjadi pendek',
   'Satu kalimat panjang dipecah menjadi beberapa kalimat atau butir.',
   'lemah-sedang', '[S9] UDL systematic review'),
  ('tambahan_waktu', 'Tambahan waktu',
   'Waktu pengerjaan tugas ditambah tanpa mengurangi target.',
   'sedang', '[S7]'),
  ('jadwal_visual', 'Jadwal visual berurutan',
   'Urutan kegiatan ditampilkan sebagai langkah berikon yang dapat dicentang.',
   'sedang-kuat', '[S8] Knight dkk. (2015), visual schedules untuk autisme'),
  ('peringatan_transisi', 'Peringatan sebelum transisi',
   'Pemberitahuan lebih awal sebelum berpindah kegiatan atau ruang.',
   'sedang', '[S8]'),
  ('instruksi_satu_langkah', 'Instruksi satu langkah',
   'Perintah diberikan satu langkah per waktu, bukan rangkaian sekaligus.',
   'sedang', '[S8]'),
  ('multi_format_udl', 'Satu materi dalam beberapa bentuk',
   'Materi disediakan sebagai teks, audio, dan gambar dengan pilihan mode tampilan.',
   'lemah-sedang', '[S9] UDL systematic review')
on conflict (kode) do update set
  nama = excluded.nama, deskripsi = excluded.deskripsi,
  tingkat_bukti = excluded.tingkat_bukti, sumber = excluded.sumber;

-- ------------------------------------------------- tabel aturan (§11) ------
-- Setiap baris = satu saran yang akan muncul beserta alasannya ke guru.
insert into barrier_accommodation_rules(barrier_id, accommodation_id, alasan, ditinjau_oleh, tanggal_tinjau)
select b.id, a.id, v.alasan, v.peninjau, current_date
from (values
  ('kesulitan_membaca', 'bacakan_materi',
   'Text-to-speech memberi efek positif tetapi kecil-sedang pada pemahaman bacaan (d = 0,35; 0,24 setelah koreksi bias). [S7]',
   'GANTI: nama GPK/dosen PLB peninjau'),
  ('kesulitan_membaca', 'huruf_besar_spasi_lega',
   'Menyajikan teks dalam bentuk yang lebih mudah dipersepsi mengurangi beban membaca awal. [S7]; [S9]',
   'GANTI: nama GPK/dosen PLB peninjau'),
  ('kesulitan_membaca', 'kalimat_pendek',
   'Kalimat pendek menurunkan beban kerja memori saat memahami bacaan. [S9]',
   'GANTI: nama GPK/dosen PLB peninjau'),
  ('kesulitan_membaca', 'tambahan_waktu',
   'Tambahan waktu mengurangi tekanan waktu, yang sering memperburuk performa pembaca lemah. [S7]',
   'GANTI: nama GPK/dosen PLB peninjau'),
  ('kesulitan_membaca', 'multi_format_udl',
   'Prinsip UDL: satu materi dalam beberapa bentuk; bukti hasil campuran pada 13 studi. [S9]',
   'GANTI: nama GPK/dosen PLB peninjau'),
  ('kebutuhan_struktur_transisi', 'jadwal_visual',
   'Jadwal visual disimpulkan sebagai praktik berbasis bukti untuk individu dengan autisme, terutama bila disertai instruksi sistematis. [S8]',
   'GANTI: nama GPK/dosen PLB peninjau'),
  ('kebutuhan_struktur_transisi', 'peringatan_transisi',
   'Peringatan sebelum transisi menurunkan masalah perilaku saat berpindah kegiatan. [S8]',
   'GANTI: nama GPK/dosen PLB peninjau'),
  ('kebutuhan_struktur_transisi', 'instruksi_satu_langkah',
   'Instruksi satu langkah mengurangi beban pemrosesan dan meningkatkan penyelesaian tugas. [S8]',
   'GANTI: nama GPK/dosen PLB peninjau'),
  ('kebutuhan_struktur_transisi', 'multi_format_udl',
   'Prinsip UDL: pilihan mode tampilan; bukti hasil campuran. [S9]',
   'GANTI: nama GPK/dosen PLB peninjau')
) as v(barrier_kode, acc_kode, alasan, peninjau)
join barriers b on b.kode = v.barrier_kode
join accommodations a on a.kode = v.acc_kode
on conflict (barrier_id, accommodation_id) do update set
  alasan = excluded.alasan, ditinjau_oleh = excluded.ditinjau_oleh;

-- ------------------------------------------------ siswa sintetis (F2) ------
-- Pseudonim: hanya kode + inisial. Tidak ada nama, NIK, atau tanggal lahir.
insert into students(school_id, kode, inisial, tahun_lahir, kelas)
select s.id, v.kode, v.inisial, v.tahun, v.kelas
from (values
  ('SIA', 'SIA-001', 'AN', 2012, '7A'),
  ('SIA', 'SIA-002', 'BR', 2011, '8B'),
  ('SIA', 'SIA-003', 'CS', 2012, '7A'),
  ('SIA', 'SIA-004', 'DP', 2010, '9C'),
  ('SHB', 'SHB-001', 'EK', 2011, '8A'),
  ('SHB', 'SHB-002', 'FR', 2012, '7B')
) as v(instansi, kode, inisial, tahun, kelas)
join schools s on s.kode_instansi = v.instansi
on conflict (school_id, kode) do nothing;
