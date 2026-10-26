# **PRD: PPI-Link** 

Product Requirements Document | Web Development Competition UINIC 8.0 | Subtema: Pendidikan 

|Versi|v0.1 (draf), 25 Oktober 2026|
|---|---|
|Status|Usulan; menunggu keputusan tim tentang dua profil hambatan dan stack|
|Tenggat|Jumat, 30 Oktober 2026 pukul 23.59 WIB: proposal PDF (maks. 30 hal.), link demo online, repository<br>GitHub publik|
|Asumsi|Tim 2-3 orang; 5 hari kerja (26-30 Okt); dua profil hambatan: kesulitan membaca dan autisme; data<br>demo sintetis|



## **1. Ringkasan** 

PPI-Link adalah platform web untuk guru kelas dan guru pendamping khusus (GPK) di sekolah inklusif. Guru mencentang hambatan yang diamati, sistem menyarankan akomodasi berdasarkan aturan yang transparan, lalu menyusun draf Program Pembelajaran Individual (PPI) yang bisa diedit. Materi belajar dapat disajikan dalam bentuk aksesibel (bacakan, teks besar, jadwal visual), kemajuan dicatat per sesi dan dilihat orang tua, dan rekam PPI dapat dikirim ke sekolah lain lewat API dengan persetujuan orang tua. 

### **Tujuan produk** 

- Mempercepat penyusunan PPI dan membuat akomodasi lebih sesuai dengan hambatan siswa. 

- Menyediakan materi dalam bentuk yang lebih mudah diakses siswa dengan hambatan tertentu. 

- Menjaga kesinambungan catatan dukungan saat siswa berpindah guru atau sekolah. 

### **Bukan tujuan** 

- Mendiagnosis siswa atau menggantikan asesmen ahli (psikolog, terapis, GPK). 

- Mengklaim peningkatan hasil belajar atau dampak klinis. 

- Integrasi dengan Dapodik atau sistem sekolah nyata (butuh akses resmi; hanya disimulasikan dengan dua instansi demo). 

## **2. Masalah dan bukti** 

|**Masalah**|**Bukti**|**Kekuatan**|
|---|---|---|
|Guru sulit menyusun<br>PPI|Kurangnya kompetensi PPI disebut hambatan utama pendidikan inklusif<br>[S1]; di satu SD penyusunan PPI sulit karena 7 siswa berkebutuhan<br>khusus dalam satu kelas [S2]; ada riset otomatisasi penyusunan PPI<br>[S3].|[SEDANG] studi kasus<br>kecil|
|Tenaga pendamping<br>terbatas|Jumlah GPK terbatas; anak disabilitas usia 5-17 tahun sekitar 299.710<br>(BPS, 2020) dan peserta didik disabilitas di sekolah 135.874 [S4].|[SEDANG] beda definisi<br>dan tahun|
|Perpindahan antar<br>konteks sekolah<br>rawan|Studi di Yogyakarta mencatat transisi siswa disabilitas intelektual antar<br>jenis sekolah dan kelas memengaruhi kehidupan belajar dan sosial<br>mereka [S5].|[LEMAH] bukan bukti<br>catatan PPI hilang;<br>harus diuji lewat<br>wawancara|
|Koneksi sekolah<br>tidak stabil|Aplikasi asesmen ABK untuk SLB dibuat sebagai progressive web app<br>karena koneksi tidak stabil dan kadang offline [S6].|[SEDANG]|
|Metode akses yang<br>dipakai fitur|Text-to-speech: efek positif pada pemahaman bacaan, d = 0,35, turun ke<br>0,24 setelah koreksi bias [S7]. Jadwal visual untuk autisme: 16 studi, 56<br>peserta, disimpulkan praktik berbasis bukti [S8]. UDL: hasil campuran<br>dari 13 studi [S9].|[SEDANG] populasi<br>kecil dan efek bervariasi|



PRD PPI-Link - UINIC 8.0 (draf v0.1, 25 Okt 2026) 

Hal. 1 

## **3. Pengguna dan persona** 

|**Persona**|**Kebutuhan utama**|**Peran sistem**|
|---|---|---|
|Guru kelas (Bu Rina)|Menyusun PPI cepat tanpa latar PLB; tahu akomodasi apa yang<br>cocok|guru|
|GPK (Pak Dimas)|Meninjau dan menyempurnakan PPI banyak siswa; mencatat sesi|gpk|
|Koordinator inklusi sekolah|Melihat ringkasan seluruh siswa dan menyetujui transfer rekam|koordinator|
|Orang tua (Ibu Sari)|Memahami rencana dan kemajuan anak; menyetujui berbagi rekam|orang_tua (baca-saja)|
|Admin sistem|Mengelola sekolah, akun, dan tabel referensi|admin|
|Siswa (tanpa akun)|Melihat jadwal visual dan materi aksesibel lewat layar yang<br>dijalankan guru|mode_siswa|



## **4. Ruang lingkup MVP (5 hari)** 

|**Prioritas**|**Fitur**|**Catatan**|
|---|---|---|
|P0 (wajib)|Login dan peran; data siswa pseudonim; asesmen hambatan;<br>rekomendasi akomodasi berbasis aturan; draf PPI dapat diedit dan<br>berversi; log sesi; tampilan orang tua; persetujuan dan transfer rekam via<br>API; audit log|Inti nilai jual|
|P0|Aksesibilitas dasar seluruh UI: kontras, label, navigasi keyboard, ukuran<br>sentuh, teks besar|Rubrik UI/UX 15%|
|P1 (sebaiknya)|Materi aksesibel: mode baca besar, bacakan (text-to-speech peramban),<br>kalimat dipecah; Mode siswa dengan jadwal visual berikon|Dua profil: kesulitan<br>membaca dan autisme|
|P1|PWA: cache dan antrean sinkronisasi offline untuk log sesi|Alasan: koneksi sekolah<br>tidak stabil [S6]|
|P2 (jika sempat)|Ekspor PPI ke PDF; dasbor ringkasan koordinator; impor CSV siswa||
|Di luar lingkup|Profil hambatan lain (tunanetra, tunarungu, tunadaksa) selain<br>aksesibilitas dasar; aplikasi seluler asli; integrasi Dapodik; akun siswa|Disebut sebagai rencana<br>pengembangan|



## **5. Alur utama pengguna** 

- **A. Menyusun PPI:** guru memilih siswa, mengisi asesmen hambatan (centang + catatan), melihat akomodasi yang disarankan beserta alasannya, menyetujui atau mengubah, menyusun tujuan dan indikator, lalu menyimpan sebagai versi 1. GPK dapat meninjau dan membuat versi 2. 

- **B. Mengajar dengan materi aksesibel:** guru membuka Mode siswa pada perangkat kelas, memilih materi dan profil, lalu siswa melihat jadwal visual atau materi dengan bacakan dan teks besar. 

- **C. Mencatat sesi:** setelah pendampingan, guru mengisi capaian per indikator (belum, sebagian, tercapai) dan catatan singkat; bisa offline. 

- **D. Orang tua:** menerima tautan akses baca-saja yang berisi ringkasan PPI dan log sesi, serta tombol persetujuan berbagi rekam. 

- **E. Transfer:** koordinator mengajukan pengiriman rekam ke sekolah tujuan; setelah orang tua menyetujui, sistem membuat token sekali pakai berbatas waktu; sekolah tujuan mengambil rekam lewat API atau mengimpor berkas. 

PRD PPI-Link - UINIC 8.0 (draf v0.1, 25 Okt 2026) 

Hal. 2 

## **6. Kebutuhan fungsional dan kriteria penerimaan** 

|**ID**|**Kebutuhan**|**Kriteria penerimaan (dapat diuji)**|
|---|---|---|
|F1|Autentikasi dan RBAC|Pengguna tanpa peran yang sesuai mendapat 403 pada rute terlarang; orang tua<br>hanya melihat siswa yang ditautkan; kata sandi disimpan dengan hash kuat.|
|F2|Data siswa pseudonim|Tidak ada kolom NIK atau nama lengkap; siswa diidentifikasi kode dan inisial; hapus<br>data atas permintaan berfungsi.|
|F3|Asesmen hambatan|Guru dapat memilih hambatan dari daftar referensi dan menambah catatan; hasil<br>tersimpan dan berstempel waktu.|
|F4|Rekomendasi akomodasi|Untuk setiap hambatan terpilih sistem menampilkan akomodasi dari tabel aturan<br>beserta alasan dan label kekuatan bukti; guru dapat menolak atau mengubah.|
|F5|Draf PPI berversi|Draf terisi otomatis dari asesmen; setiap penyimpanan membuat versi baru; riwayat<br>versi dapat dibuka dan dibandingkan.|
|F6|Log sesi|Satu sesi mencatat tanggal, indikator, status capaian, dan catatan; dapat diisi offline<br>lalu tersinkron saat online tanpa data ganda.|
|F7|Tampilan orang tua|Baca-saja; menampilkan ringkasan PPI dan 10 sesi terakhir; dapat dibaca di ponsel.|
|F8|Persetujuan dan transfer|Transfer tidak dapat dibuat tanpa persetujuan aktif; token kedaluwarsa dalam waktu<br>yang ditetapkan dan hanya dapat dipakai sekali; semua akses tercatat di audit log.|
|F9|API terdokumentasi|Spesifikasi OpenAPI dapat dibuka di /api/docs; ekspor rekam menghasilkan JSON<br>valid terhadap skema.|
|F10|Materi aksesibel|Materi dapat ditampilkan dalam mode teks besar, kontras tinggi, dan bacakan;<br>kalimat panjang dapat dipecah; berfungsi di dua peramban utama.|
|F11|Mode siswa|Layar jadwal visual menampilkan langkah berurutan berikon dan dapat dicentang;<br>tidak memerlukan akun anak.|
|F12|Audit log|Setiap pembacaan atau perubahan data siswa tercatat dengan pengguna, waktu,<br>dan aksi.|



## **7. Kebutuhan non-fungsional** 

|**Aspek**|**Target**|**Cara bukti**|
|---|---|---|
|Keamanan web dasar<br>(rubrik teknis 20%)|Validasi input sisi server; proteksi CSRF dan XSS; header<br>keamanan (CSP); rate limiting pada login dan API; sesi aman<br>(HttpOnly, SameSite); enkripsi kolom catatan sensitif|Daftar periksa OWASP<br>sederhana dan hasil uji manual<br>di proposal|
|Privasi|Minimisasi data; persetujuan orang tua tercatat; penghapusan<br>atas permintaan; tidak ada data nyata di demo|Bagian Batasan Produk dan<br>model ancaman|
|Aksesibilitas|Target WCAG 2.1 AA untuk layar guru dan orang tua; kontras<br>minimal 4,5:1; seluruh fungsi dapat dipakai dengan keyboard|Audit dengan alat otomatis<br>(misalnya Lighthouse)<br>ditambah uji manual dengan<br>keyboard|
|Performa dan<br>skalabilitas|Target internal: respons halaman daftar siswa p95 di bawah<br>500 ms pada 50 pengguna bersamaan pada data sintetis<br>5.000 siswa|Uji beban sederhana; laporkan<br>angka sebenarnya, jangan<br>angka target|
|Ketersediaan|Demo berjalan di hosting gratis; halaman inti tetap terbuka<br>offline (PWA)|Uji mematikan jaringan|
|Kemudahan<br>dikembangkan|Kode modular (lapisan rute, layanan, repositori); README,<br>panduan penggunaan, dan dokumentasi API|Struktur repo dan dokumen di<br>GitHub|



PRD PPI-Link - UINIC 8.0 (draf v0.1, 25 Okt 2026) 

Hal. 3 

## **8. Model data (PostgreSQL relasional)** 

|**Tabel**|**Kolom penting**|**Relasi**|
|---|---|---|
|schools|id, nama, kode_instansi|1-N users, students|
|users|id, school_id, nama, email, password_hash, role|N-1 schools|
|students|id, school_id, kode, inisial, tahun_lahir, kelas|N-1 schools|
|guardian_links|id, student_id, user_id (orang tua)|N-N users-students|
|barriers (referensi)|id, kode, nama, deskripsi|-|
|accommodations (referensi)|id, kode, nama, deskripsi, tingkat_bukti, sumber|-|
|barrier_accommodation_rule<br>s|barrier_id, accommodation_id, alasan, ditinjau_oleh,<br>tanggal_tinjau|N-N barriers-accommod<br>ations|
|assessments|id, student_id, dibuat_oleh, tanggal, catatan (terenkripsi)|N-1 students|
|assessment_barriers|assessment_id, barrier_id, tingkat|N-N|
|ppis|id, student_id, status, versi_aktif|N-1 students|
|ppi_versions|id, ppi_id, nomor_versi, dibuat_oleh, ringkasan, dibuat_pada|N-1 ppis|
|ppi_goals|id, ppi_version_id, tujuan, indikator|N-1 ppi_versions|
|ppi_accommodations|ppi_version_id, accommodation_id, disetujui, catatan|N-N|
|sessions|id, ppi_id, goal_id, tanggal, status_capaian, catatan, client_uuid<br>(anti ganda)|N-1 ppis|
|materials, material_variants|id, judul, teks_sumber, varian (teks_besar, kalimat_pendek,<br>bacakan), dibuat_oleh|N-1 schools|
|consents|id, student_id, jenis, diberikan_oleh, status, berlaku_hingga|N-1 students|
|transfers|id, student_id, dari_school, ke_school, consent_id, token_hash,<br>kedaluwarsa, dipakai_pada|N-1 consents|
|audit_logs|id, user_id, aksi, objek, waktu, ip|-|



Tabel aturan akomodasi diisi dari sumber yang dapat ditelusuri dan ditinjau oleh GPK atau dosen PLB sebelum demo; kolom ditinjau_oleh menjadi bukti validasi di proposal. 

## **9. Endpoint API (ringkas)** 

|**Metode dan jalur**|**Fungsi**|**Akses**|
|---|---|---|
|POST /api/v1/auth/login|Masuk dan membuat sesi|publik (rate limited)|
|GET, POST /api/v1/students|Daftar dan tambah siswa sekolah sendiri|guru, gpk, koordinator|
|POST /api/v1/students/{id}/assessments|Simpan asesmen hambatan|guru, gpk|
|POST /api/v1/students/{id}/ppi/draft|Hasilkan draf PPI dan akomodasi saran dari aturan|guru, gpk|
|PATCH /api/v1/ppi/{id}|Ubah tujuan, indikator, akomodasi; buat versi baru|guru, gpk|
|POST /api/v1/ppi/{id}/sessions|Catat sesi (idempoten lewat client_uuid)|guru, gpk|
|GET /api/v1/parent/students/{id}|Ringkasan baca-saja|orang_tua|
|POST /api/v1/consents|Catat persetujuan berbagi rekam|orang_tua|
|POST /api/v1/transfers|Ajukan transfer; hasilkan token sekali pakai|koordinator|
|GET /api/v1/records/{token}|Ambil rekam PPI (JSON terstruktur) oleh sekolah<br>tujuan|token valid|
|GET /api/docs|Dokumentasi OpenAPI|publik|



PRD PPI-Link - UINIC 8.0 (draf v0.1, 25 Okt 2026) 

Hal. 4 

## **10. Arsitektur dan stack (usulan)** 

- **Usulan default:** aplikasi satu repo dengan lapisan antarmuka, layanan, dan repositori; basis data PostgreSQL; API REST dengan spesifikasi OpenAPI; PWA dengan service worker. Kerangka kerja bebas (guidebook hal. 14 mengizinkan stack apa pun selama berjalan di peramban); pilih yang paling dikuasai timmu. 

- **Hosting gratis:** pilih layanan yang menyediakan PostgreSQL gratis dan URL publik; syarat dan batas layanan gratis belum saya verifikasi, jadi cek sebelum memilih. 

- **Dua instansi demo:** jalankan dua tenant (Sekolah A dan Sekolah B) untuk menunjukkan transfer rekam lewat API. 

- **Text-to-speech:** memakai kemampuan sintesis suara peramban. Ketersediaan dan kualitas suara bahasa Indonesia berbeda antar perangkat dan belum saya verifikasi; uji di beberapa perangkat dan siapkan cadangan (misalnya tombol non-aktif dengan pesan jelas). 

## **11. Aturan rekomendasi akomodasi (contoh awal untuk ditinjau ahli)** 

|**Hambatan**|**Akomodasi yang disarankan**|**Alasan dan kekuatan bukti**|
|---|---|---|
|Kesulitan membaca|Bacakan materi; huruf besar dan spasi lega; kalimat<br>pendek; tambahan waktu|Text-to-speech berefek positif tetapi<br>kecil-sedang pada pemahaman bacaan<br>[S7]. [SEDANG]|
|Kebutuhan struktur<br>dan transisi (autisme)|Jadwal visual berurutan; peringatan transisi; instruksi<br>satu langkah|Jadwal visual disimpulkan praktik<br>berbasis bukti untuk autisme, terutama<br>bila disertai instruksi sistematis [S8].<br>[SEDANG-KUAT]|
|Semua profil|Satu materi dalam beberapa bentuk (teks, audio,<br>gambar); pilihan mode tampilan|Prinsip UDL; bukti campuran [S9].<br>[LEMAH-SEDANG]|



Setiap saran harus bisa ditolak guru, menampilkan alasannya, dan tidak pernah ditulis sebagai diagnosis. 

## **12. Metrik keberhasilan dan rencana pengujian** 

|**Metrik**|**Cara ukur**|**Target (untuk laporan, bukan**<br>**klaim)**|
|---|---|---|
|Waktu menyusun satu PPI|5-8 guru/GPK/mahasiswa PLB menyusun PPI skenario<br>sintetis dengan dan tanpa PPI-Link|Catat selisih median; laporkan<br>apa adanya|
|Kegunaan|Kuesioner SUS setelah tugas|Laporkan skor dan jumlah<br>responden|
|Kecocokan akomodasi|GPK menilai saran akomodasi (cocok, sebagian, tidak)<br>pada 6 skenario|Laporkan persentase<br>kecocokan|
|Penyelesaian tugas|Tingkat berhasil menyelesaikan alur A dan C tanpa bantuan|Laporkan hasil|
|Aksesibilitas|Hasil Lighthouse dan uji keyboard|Lampirkan tangkapan hasil|
|Keamanan dan beban|Daftar periksa OWASP sederhana; uji beban pada data<br>sintetis|Lampirkan hasil dan angka<br>nyata|



Wawancara awal (Senin-Selasa): 5 guru/GPK. Pertanyaan: bagian mana dari penyusunan PPI yang paling lama; apa yang hilang saat siswa pindah; apakah mau berbagi rekam; format PPI apa yang dipakai sekolah. 

PRD PPI-Link - UINIC 8.0 (draf v0.1, 25 Okt 2026) 

Hal. 5 

## **13. Rencana kerja 26-30 Oktober** 

|**Hari**|**Fokus**|**Keluaran**|
|---|---|---|
|Sen 26 Okt|Wawancara guru/GPK; skema database; wireframe; autentikasi dan<br>RBAC; repo GitHub publik dan README awal|Skema, wireframe, login<br>berfungsi, catatan wawancara|
|Sel 27 Okt|Asesmen hambatan; tabel aturan akomodasi (ditinjau ahli); draf PPI<br>berversi; mulai bahan proposal|Alur A berjalan|
|Rab 28 Okt|Log sesi; tampilan orang tua; materi aksesibel dan Mode siswa;<br>aksesibilitas dasar|Alur B-D berjalan|
|Kam 29 Okt|Persetujuan dan transfer via API; dokumentasi OpenAPI; PWA offline;<br>keamanan; deploy; uji beban|Alur E dan demo online|
|Jum 30 Okt|Uji kegunaan; perbaikan akhir; lengkapi proposal; unggah sebelum 23.59<br>(target selesai 18.00)|Proposal PDF, link demo, link<br>GitHub terkirim|



Pembagian peran yang disarankan: satu orang backend dan keamanan, satu orang frontend dan aksesibilitas, satu orang riset, pengujian, dan proposal. 

## **14. Risiko dan mitigasi** 

|**Risiko**|**Dampak**|**Mitigasi**|
|---|---|---|
|Dianggap sama dengan aplikasi<br>asesmen ABK dan riset otomatisasi<br>PPI [S3, S6]|Skor inovasi 30%<br>turun|Tekankan tiga pembeda: rekam portabel lintas sekolah,<br>tampilan orang tua, mode offline; jelaskan di proposal|
|Interoperabilitas dinilai palsu|Skor tema dan inovasi<br>turun|Jangan klaim Dapodik; demokan dua instansi, API<br>OpenAPI, ekspor JSON|
|Tidak sempat menguji ke pengguna|Bagian Hasil<br>Pengujian kosong|Jadwalkan wawancara dan uji sejak Senin; siapkan<br>skenario sintetis|
|Suara bahasa Indonesia tidak<br>tersedia di perangkat uji|Fitur bacakan gagal<br>saat demo|Uji lebih awal; siapkan perangkat demo yang sudah dicek|
|Klaim dampak berlebihan|Dikritik juri saat tanya<br>jawab|Klaim fungsi saja; sertakan batas bukti|
|Data anak bocor|Risiko etika dan nilai<br>teknis|Data sintetis, minimisasi, enkripsi kolom, audit log|
|Ruang lingkup melebar|Fitur setengah jadi|Kunci P0 dulu; P1 hanya dua profil; P2 opsional|



## **15. Pertanyaan terbuka dan hal yang belum diverifikasi** 

- Dua profil hambatan final dan stack yang dikuasai tim. 

- Format PPI yang dipakai sekolah mitra atau pedoman resmi; pencarian saya tidak menemukan dokumen pedomannya sehingga struktur PPI di PRD adalah usulan. 

- Pasal UU PDP tentang data anak dan data kesehatan; syarat persetujuan orang tua. 

- Angka terbaru anak disabilitas yang tidak bersekolah (data UNICEF 2016 sudah berusia 10 tahun). 

- Syarat dan batas layanan hosting gratis untuk demo. 

PRD PPI-Link - UINIC 8.0 (draf v0.1, 25 Okt 2026) 

Hal. 6 

## **16. Pemetaan ke format proposal (guidebook hal. 15)** 

|**Bagian proposal**|**Sumber isi dari PRD**|
|---|---|
|Latar belakang masalah; Tujuan dan manfaat|Bagian 1-2|
|Analisis: target pengguna, batasan produk, platform|Bagian 3, 4, 10|
|Metodologi pengembangan; Arsitektur sistem|Bagian 10, 13 (Agile ringkas dengan<br>sprint harian)|
|Skenario; User flow; Fitur unggulan; UI/UX preview|Bagian 5, 6, 11 dan wireframe|
|Hasil pengujian pengguna|Bagian 12|
|Kesimpulan; Daftar pustaka; Lampiran|Bagian 14-15 dan daftar sumber di<br>bawah; lampirkan OpenAPI dan hasil<br>uji|



## **Daftar sumber** 

|**#**|**Sumber dan tautan**|
|---|---|
|S1|Psikoedukasi dan pelatihan PPI bagi guru SD (UNIMMA)<br>https://journal.unimma.ac.id/index.php/ce/article/download/13386/6021|
|S2|Kolaborasi guru reguler dan GPK, SD Taman Muda Yogyakarta (UNY)<br>https://journal.student.uny.ac.id/plb/article/download/7700/7326|
|S3|Sistem otomatisasi penyusunan PPI (Pendas, UNPAS)<br>https://journal.unpas.ac.id/index.php/pendas/article/download/22416/11417/92031|
|S4|Perpustakaan DPR - Defisit guru pendamping khusus hambat pendidikan inklusi<br>https://perpustakaan.dpr.go.id/epaper/index/detail/id/18386|
|S5|Voices of students with intellectual disabilities: transition in inclusive schools in Indonesia<br>https://ifp.nyu.edu/2021/journal-article-abstracts/bld-12411/|
|S6|Aplikasi asesmen ABK di SLB Rafaha Arjasari berbasis PWA (ULTIMA Computing)<br>https://ejournals.umn.ac.id/index.php/SK/article/download/958/738|
|S7|Wood dkk. (2017), meta-analisis text-to-speech untuk kesulitan membaca (PMC)<br>https://pmc.ncbi.nlm.nih.gov/articles/PMC5494021/|
|S8|Knight dkk. (2015), jadwal visual untuk individu dengan autisme<br>https://cbmt.franciscan.edu/wp-content/uploads/sites/32/2021/07/Knight-et-al.-2015_Visual-Schedules.pdf|
|S9|Universal Design for Learning in Pre-K to Grade 12: A Systematic Review (Meadows Center)<br>https://meadowscenter.org/library/universal-design-for-learning-in-pre-k-to-grade-12-classrooms-a-systematic-review-of-research/|



Dokumen ini bukan nasihat medis atau hukum. Tingkat bukti di atas adalah penilaian saya berdasarkan sumber yang saya baca. 

PRD PPI-Link - UINIC 8.0 (draf v0.1, 25 Okt 2026) 

Hal. 7 

