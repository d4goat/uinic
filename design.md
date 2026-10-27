# DESIGN.md — PPI-Link Design System & UI/UX Specification
**Project:** PPI-Link (Web Development Competition UINIC 8.0 — Subtema: Pendidikan)  
**Design Philosophy:** *Warm Inclusive Sanctuary* (Modern, Soft-Tactile, Sensory-Friendly, Anti-AI Slop)  
**Tech Stack:** React + Vite, Tailwind CSS, GSAP (`@gsap/react`), Lenis Smooth Scroll, Lucide Icons  
**Accessibility Target:** WCAG 2.1 Level AA (Mandatory 15% UI/UX Rubric)

---

## 1. Filosofi Desain: "Warm Inclusive Sanctuary"

PPI-Link bukan sekadar aplikasi administrasi sekolah biasa, melainkan ruang kerja kolaboratif untuk **Guru Kelas (Bu Rina)**, **GPK (Pak Dimas)**, **Koordinator Inklusi**, **Orang Tua (Ibu Sari)**, serta layar pendamping untuk **Siswa Berkebutuhan Khusus (Kesulitan Membaca & Autisme)**.

Agar pengguna betah berlama-lama tanpa kelelahan mata (*cognitive & visual fatigue*) dan terhindar dari kesan template AI (*AI Slop*), antarmuka wajib mematuhi prinsip berikut:
1. **Zero Pure White & Zero Pure Black:** Layar putih menyilaukan (`#FFFFFF`) memicu *visual stress* bagi pembaca disleksia/kesulitan membaca dan overstimulasi sensorik bagi siswa autisme. Gunakan latar **Warm Oat / Paper Cream** yang lembut seperti kertas buku premium.
2. **Soft-Tactile Architecture:** Sudut membulat yang ramah (`rounded-2xl` hingga `rounded-3xl`), pemisah garis tipis yang hangat (`1px solid`), dan bayangan berlapis super lembut (*ambient diffused shadows*).
3. **Calm & Purposeful Motion:** Animasi tidak boleh agresif atau berkedip cepat. Gerakan dikoreografikan dengan lembut untuk memandu fokus, menenangkan transisi, dan mengurangi beban kognitif.
4. **Evidence-Transparent & Non-Clinical:** Desain lencana bukti ilmiah (`[SEDANG-KUAT]`, `[SEDANG]`) dan catatan asesmen harus terasa manusiawi, mendukung, dan **bukan seperti vonis medis rumah sakit**.

---

## 2. Aturan Anti-"AI Slop" (Larangan Keras untuk AI Generator)

Ketika men-generate komponen React untuk PPI-Link, **DILARANG KERAS** menggunakan pola berikut:
- ❌ **NO Neon/Cyberpunk Gradients:** Dilarang menggunakan gradasi ungu-ke-biru/cyan atau latar belakang gelap ala landing page kripto/SaaS generik.
- ❌ **NO Harsh Glassmorphism:** Jangan gunakan kartu transparan kabur dengan garis putih menyala yang menurunkan keterbacaan teks (melanggar WCAG 2.1 AA).
- ❌ **NO Cluttered Dashboards:** Jangan menumpuk grafik lingkaran/bar yang tidak ada di PRD. Fokus pada **kejelasan langkah penyusunan PPI, riwayat versi, dan pencatatan sesi**.
- ❌ **NO Sensory Overload pada Mode Siswa:** Pada rute Mode Siswa (`/student-mode`), dilarang menampilkan sidebar navigasi admin, lonceng notifikasi, atau pop-up yang mengganggu fokus anak.

---

## 3. Sistem Warna (Color Tokens — Sensory-Safe & WCAG 2.1 AA)

Semua kombinasi warna teks dan latar belakang di bawah ini telah dikalibrasi untuk memenuhi rasio kontras minimal **4.5:1** (teks normal) dan **7:1** (mode kontras tinggi).

### A. Surface & Background Tokens (Warm & Soft)
| Token CSS / Tailwind | Hex | Penggunaan |
| :--- | :--- | :--- |
| `--bg-canvas` (`bg-[#FBF9F5]`) | `#FBF9F5` | Latar belakang utama aplikasi (Warm Oat Paper — sangat nyaman di mata). |
| `--bg-surface` (`bg-[#FFFFFF]`) | `#FFFFFF` | Permukaan kartu aktif, editor draf PPI, dan modal utama. |
| `--bg-subtle` (`bg-[#F3EFE6]`) | `#F3EFE6` | Latar sidebar, header tabel, container riwayat versi, & kartu non-aktif. |
| `--bg-reading` (`bg-[#FDF8EC]`) | `#FDF8EC` | Latar khusus **Mode Baca Aksesibel** (mengurangi *scotopic sensitivity* pada kesulitan membaca). |
| `--border-soft` (`border-[#E6E0D4]`) | `#E6E0D4` | Garis pembatas antar kartu, tabel, dan pembagi seksi (`1px`). |

### B. Typography & Ink Tokens
| Token CSS / Tailwind | Hex | Rasio Kontras | Penggunaan |
| :--- | :--- | :--- | :--- |
| `--ink-primary` (`text-[#1E2420]`) | `#1E2420` | 14.8 : 1 | Teks utama, judul halaman, isi draf PPI (Deep Forest Charcoal). |
| `--ink-secondary` (`text-[#4A554E]`) | `#4A554E` | 7.2 : 1 | Deskripsi hambatan, alasan akomodasi, label form. |
| `--ink-muted` (`text-[#6E7A72]`) | `#6E7A72` | 4.6 : 1 | Stempel waktu, metadata versi, placeholder. |

### C. Brand & Semantic Accents (Organic & Calming)
| Token | Hex | Penggunaan Spesifik di PRD |
| :--- | :--- | :--- |
| **Primary Sage** (`#2D6A4F`) | `#2D6A4F` | Tombol aksi utama ("Simpan Versi PPI", "Setujui Akomodasi"), indikator aktif. |
| **Sage Soft Fill** (`#E8F3EE`) | `#E8F3EE` | Latar chip hambatan terpilih, highlight baris aktif, badge status `"Tercapai"`. |
| **Warm Terracotta** (`#C86D51`) | `#C86D51` | Aksen sekunder hangat, badge perhatian, status `"Belum Tercapai"` (bukan merah menyala yang mengintimidasi). |
| **Amber Honey** (`#D9822B`) | `#D9822B` | Indikator `"Sebagian Tercapai"`, banner **Offline Queue (PWA)**, & peringatan kedaluwarsa token transfer. |
| **Calm Indigo** (`#3D5A80`) | `#3D5A80` | Badge tingkat kekuatan bukti ilmiah (`[SEDANG-KUAT]`, `[SEDANG]`), tautan referensi jurnal `[S7]`, `[S8]`. |

---

## 4. Sistem Tipografi (Aksesibel & Ramah Disleksia)

Tipografi dirancang untuk memaksimalkan *letter recognition* (pembedaan huruf seperti `b/d`, `p/q`, `I/l/1`) bagi siswa maupun guru yang membaca ratusan baris dokumen.

- **Heading Font (`--font-display`):** `'Plus Jakarta Sans'` atau `'Fraunces'` (untuk sentuhan humanis-editorial pada judul halaman).
  - *Karakter:* Ramah, terbuka, modern, tidak kaku.
  - *Tracking:* `-0.02em`, *Line-height:* `1.2`.
- **Body & Accessible Reading Font (`--font-sans`):** `'Lexend'` atau `'Atkinson Hyperlegible'` (Wajib di-load dari Google Fonts).
  - *Alasan:* **Lexend** terbukti secara riset meningkatkan kelancaran membaca dan sangat selaras dengan profil hambatan **Kesulitan Membaca** di PRD.
  - *Line-height Default:* `1.65` (longgar dan nyaman).
- **Monospace Font (`--font-mono`):** `'JetBrains Mono'`
  - *Penggunaan:* Kode pseudonim siswa (`STD-8821 • Inisial: A.R.`), nomor versi (`v1.0 -> v2.0`), token transfer API sekali pakai, `client_uuid`, dan baris `audit_logs`.

### Aturan Mode Teks Besar & Kalimat Dipecah (Kebutuhan F10)
Saat toggle **"Mode Teks Besar"** atau **"Pecah Kalimat"** diaktifkan:
- Ukuran teks materi naik menjadi `clamp(1.25rem, 2vw, 1.65rem)` (`20px–26px`).
- `line-height` meningkat menjadi `2.0`, `letter-spacing: 0.03em`, `word-spacing: 0.12em`.
- Lebar kolom bacaan dikunci maksimal `60ch` agar mata tidak lelah menyapu layar lebar.
- Setiap kalimat ditampilkan per baris dengan jarak antar-kalimat `1rem` dan highlight warna lembut (`#EFE6D5`) mengikuti kata/kalimat yang sedang dibacakan oleh fitur *Text-to-Speech* (`window.speechSynthesis`).

---

## 5. Tata Letak, Spasi & Komponen Ergonomis

1. **Touch Targets (WCAG & Layar Kelas):**
   - Seluruh tombol, checkbox asesmen, dan kontrol suara minimal berukuran **`48px × 48px`** (atau `min-h-[48px] px-5`).
   - Pada **Mode Siswa (Jadwal Visual)**, kartu langkah memiliki tinggi minimal **`96px`** dengan checkbox besar **`56px × 56px`** agar mudah disentuh anak di layar tablet/laptop kelas.
2. **Border Radius & Shadows:**
   - Kartu utama & container: `rounded-2xl` (`16px`) atau `rounded-3xl` (`24px`).
   - Tombol & input: `rounded-xl` (`12px`).
   - Shadow: Gunakan custom shadow lembut `shadow-[0_4px_24px_-4px_rgba(30,36,32,0.05)]`.
3. **Bento & Split-Pane Workspace:**
   - Hindari halaman panjang satu kolom yang membosankan. Gunakan layout **Split-Pane** yang tenang (contoh: Kiri untuk daftar hambatan & bukti ilmiah, Kanan untuk *live preview* draf PPI yang sedang disusun).

---

## 6. Spesifikasi Desain per Alur Utama PRD (6 Modul Inti)

### Modul 1: Global Shell, Multi-Tenant Switcher & Status PWA
- **Demo Tenant Switcher (Top Bar):** Karena PRD mensyaratkan simulasi 2 instansi (**SDN Inklusi Harapan A** & **SMPN Tumbuh Bersama B**) dan multi-peran (`guru`, `gpk`, `koordinator`, `orang_tua`, `mode_siswa`), sediakan *Floating Demo Switcher Pill* yang elegan di pojok atas agar juri lomba dapat berpindah skenario dalam 1 klik tanpa repot login ulang saat demo.
- **PWA Offline & Sync Pill (Kebutuhan F6 & P1):**
  - Saat *Online*: Badge hijau lembut `"Tersambung • Sinkronisasi Aktif"`.
  - Saat *Offline*: Berubah mulus menjadi kapsul Amber hangat `"Mode Offline • 2 Log Sesi dalam Antrean Lokal (client_uuid)"` disertai tombol simulasi matikan jaringan untuk mempermudah pengujian juri.
- **Pseudonym Privacy Guard (Kebutuhan F2):**
  - Setiap kartu siswa wajib menampilkan avatar inisial warna pastel hangat + kode pseudonim (contoh: `AN-2018 • Inisial: D.P. • Kelas 3B`) disertai tooltip kecil *"Data disamarkan sesuai perlindungan privasi anak"*.

### Modul 2: Alur A — Studio Penyusunan PPI & Rekomendasi Berbasis Aturan (F3, F4, F5)
- **Step 1: Asesmen Hambatan (Checklist Ramah):**
  - Pilihan hambatan dikelompokkan rapi (**Profil Kesulitan Membaca**, **Profil Kebutuhan Struktur & Transisi / Autisme**, **Umum/UDL**) dengan pilihan tingkat dukungan dan kolom catatan terenkripsi (ditandai ikon gembok kecil `"Terenkripsi AES"`).
- **Step 2: Kartu Rekomendasi Akomodasi Transparan:**
  - Setiap saran menampilkan:
    1. **Nama Akomodasi** (misal: *Jadwal Visual Berurutan + Instruksi Satu Langkah*).
    2. **Kotak Alasan & Bukti Ilmiah:** Menampilkan kutipan ringkas alasan aturan + lencana kekuatan bukti (`[SEDANG-KUAT • Knight dkk., 2015 - S8]`) + info `"Ditinjau oleh: Pak Dimas, S.Pd (GPK)"`.
    3. **Kontrol Guru:** Tombol toggle `"Gunakan"`, `"Ubah Catatan"`, atau `"Tolak Saran"` (memastikan sistem membantu, bukan mendikte guru).
  - **Banner Etika Non-Diagnosis:** Banner statis lembut di atas draf: *"Catatan ini merupakan observasi fungsional pembelajaran untuk penyusunan akomodasi, bukan diagnosis medis/psikologis."*
- **Step 3: Editor Tujuan, Indikator & Riwayat Versi (Diff Viewer):**
  - Panel perbandingan versi (`Versi 1 - Guru Kelas` vs `Versi 2 - Tinjauan GPK`) dengan highlight perubahan warna hijau sage lembut pada indikator yang disempurnakan.

### Modul 3: Alur B — Materi Aksesibel & Mode Siswa (F10, F11)
Dirancang sebagai **Zero-Distraction Sanctuary** (tanpa menu navigasi guru):
- **Tab 1: Pembaca Materi Aksesibel (Profil Kesulitan Membaca):**
  - Floating Control Dock di bagian atas:
    - Tombol **Bacakan (TTS Browser)** dengan indikator gelombang suara lembut & fallback informatif jika suara Bahasa Indonesia belum tersedia di perangkat.
    - Toggle **Teks Besar**, **Kalimat Dipecah (Chunking)**, dan **Kontras Tinggi**.
  - Saat kalimat dipecah, setiap kalimat tampil dalam kartu fokus tersendiri sehingga anak tidak kewalahan melihat satu paragraf penuh.
- **Tab 2: Jadwal Visual Berikon (Profil Autisme):**
  - Menampilkan alur kegiatan kelas secara berurutan dari atas ke bawah (misal: `1. Berdoa & Duduk Tenang` $\rightarrow$ `2. Membaca Bersama (10 Menit)` $\rightarrow$ `3. Istirahat Minum` $\rightarrow$ `4. Menggambar`).
  - Setiap kartu memiliki ilustrasi/ikon bersih, instruksi 1 kalimat pendek, timer/peringatan transisi lembut, dan tombol centang besar **"Selesai"** yang memberikan umpan balik visual menenangkan (tanpa suara keras/kejutan).

### Modul 4: Alur C — Pencatatan Sesi Cepat & Antrean Offline (F6)
- Dirancang agar Guru/GPK bisa mencatat sesi di sela mengajar dalam waktu **< 30 detik**.
- Menggunakan pemilih status 3 tombol sentuh besar per indikator PPI:
  - ⚪ **Belum Tercapai**
  - 🟡 **Sebagian Tercapai**
  - 🟢 **Tercapai**
- Dilengkapi input catatan singkat dan indikator `client_uuid` untuk menjamin sifat *idempotent* (anti-ganda saat jaringan kembali stabil).

### Modul 5: Alur D — Portal Orang Tua Baca-Saja & Persetujuan (F7, F8)
- **Mobile-First Card Layout:** Dirancang menyerupai buletin perkembangan anak yang hangat dan menenangkan bagi Ibu Sari di layar ponsel.
- Menggunakan bahasa yang mudah dipahami orang tua (menghindari jargon teknis).
- Menampilkan **Timeline 10 Sesi Terakhir** dengan visualisasi progres yang suportif.
- **Kartu Persetujuan Berbagi Rekam (Consent Card):** Menjelaskan secara transparan data apa yang akan dibagikan ke sekolah tujuan, berlaku hingga tanggal berapa, serta tombol persetujuan aktif dengan konfirmasi satu sentuhan.

### Modul 6: Alur E — Transfer Lintas Sekolah via API & Audit Log (F8, F9, F12)
- **Visualisasi Handshake Dua Instansi:**
  - Menampilkan alur visual 3 kolom: **Sekolah Asal (Sekolah A)** $\rightarrow$ **Gerbang Token Sekali Pakai (Waktu Hitung Mundur & Hash)** $\rightarrow$ **Sekolah Tujuan (Sekolah B)**.
- Dilengkapi panel **Live JSON Record Preview** (sesuai skema OpenAPI `/api/docs`) dan tabel **Audit Log** real-time yang mencatat `Waktu`, `Pengguna/Peran`, `Aksi`, `Objek`, dan `IP` untuk membuktikan pemenuhan rubrik keamanan (20%).

---

## 7. Spesifikasi Motion Design (GSAP + Lenis)

Motion pada PPI-Link harus menganut prinsip **"Gentle Humanist Choreography"**—halus, responsif, dan memberikan rasa tenang.

### 1. Arsitektur Lenis Smooth Scroll + GSAP Ticker
Gunakan konfigurasi Lenis yang lembut (tidak licin berlebihan):
```tsx
// Konfigurasi Lenis: duration 1.05, lerp 0.1 untuk kesan responsif namun lembut
const lenis = new Lenis({
  duration: 1.05,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
});
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```

### 2. Koreografi Animasi Utama (`useGSAP`)
- **Page & Tab Transitions:** Saat berpindah antara Studio PPI, Mode Siswa, dan Portal Orang Tua, gunakan efek *soft fade + micro vertical lift* (`y: 14` ke `0`, `opacity: 0` ke `1`, `duration: 0.55`, `ease: "power3.out"`, `stagger: 0.04`).
- **Auto-Draft Generation Reveal (Alur A):** Saat guru mencentang hambatan, kartu rekomendasi akomodasi di kolom kanan muncul secara bertahap (*staggered card reveal*) dengan animasi *height expansion* yang mulus.
- **Visual Schedule Step Completion (Mode Siswa):** Saat siswa mencentang satu langkah kegiatan, kartu tersebut meredup dengan lembut (`scale: 0.985`, latar berubah menjadi `#E8F3EE`), lalu fokus otomatis bergulir halus (via `lenis.scrollTo`) ke langkah berikutnya.
- **Token Transfer Pipeline Animation (Alur E):** Saat Koordinator men-generate token transfer dan Sekolah B menarik data (`GET /api/v1/records/{token}`), animasikan garis penghubung antar-instansi menggunakan `strokeDashoffset` GSAP untuk memvisualisasikan perpindahan paket JSON secara elegan di hadapan juri.

### 3. Kepatuhan Aksesibilitas Motion (`prefers-reduced-motion` & Mode Autisme)
- Wajib membungkus inisialisasi animasi dengan `gsap.matchMedia()` atau menyediakan toggle **"Kurangi Animasi (Sensory Calm Mode)"** di header.
- Saat berada di **Mode Siswa (Profil Autisme)** atau ketika `prefers-reduced-motion: reduce` aktif, semua animasi dekoratif dan *parallax* dinonaktifkan secara otomatis, menyisakan transisi instan yang tenang dan terprediksi.

---

## 8. Checklist Kualitas UI/UX untuk Rubrik Penilaian UINIC 8.0

Sebelum komponen dinyatakan selesai, pastikan memenuhi poin berikut:
- [ ] **Kontras WCAG 2.1 AA:** Semua teks memiliki rasio kontras $\ge 4.5:1$ terhadap latar belakang hangat `#FBF9F5`.
- [ ] **Navigasi Keyboard Penuh:** Seluruh elemen interaktif memiliki `:focus-visible` berupa `ring-2 ring-[#2D6A4F] ring-offset-2 ring-offset-[#FBF9F5]`.
- [ ] **Tiga Pembeda Utama Terlihat Jelas di UI:**
  1. Indikator & antrean **PWA Offline** untuk log sesi.
  2. **Tampilan Orang Tua** yang ramah ponsel & tombol *Consent*.
  3. Simulasi **Transfer Rekam Portabel Lintas Sekolah** dengan token sekali pakai & pratinjau JSON OpenAPI.