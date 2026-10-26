import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useAuth } from '../auth/AuthContext';
import RevealText from '../components/RevealText';
import Magnetik from '../components/Magnetik';

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Alur A-E dari PRD §5, ditulis apa adanya: yang dijanjikan halaman ini harus
 *  sama dengan yang dijanjikan dokumen. */
const ALUR = [
  {
    nomor: 'A',
    judul: 'Susun PPI',
    isi: 'Pilih siswa, centang hambatan yang teramati, tinjau akomodasi beserta alasan dan tingkat buktinya, lalu susun tujuan dan indikator. Simpan sebagai versi 1 — GPK dapat meninjau dan membuat versi 2 tanpa menghapus versi 1.',
  },
  {
    nomor: 'B',
    judul: 'Mengajar dengan materi aksesibel',
    isi: 'Buka Mode siswa di perangkat kelas, pilih materi dan profil hambatan. Siswa melihat jadwal visual berikon, atau bacaan dengan mode teks besar, kontras tinggi, kalimat pendek, dan tombol bacakan.',
  },
  {
    nomor: 'C',
    judul: 'Catat sesi',
    isi: 'Setelah pendampingan, isi capaian per indikator (belum, sebagian, tercapai) dan catatan singkat. Sesi yang gagal terkirim tetap tersimpan di perangkat dan dikirim ulang tanpa tercatat dua kali.',
  },
  {
    nomor: 'D',
    judul: 'Orang tua membaca',
    isi: 'Tautan baca-saja berisi ringkasan PPI dan sepuluh sesi terakhir, dapat dibaca di ponsel, beserta tombol persetujuan berbagi rekam.',
  },
  {
    nomor: 'E',
    judul: 'Transfer rekam',
    isi: 'Koordinator mengajukan pengiriman rekam ke sekolah tujuan. Setelah orang tua menyetujui, sistem membuat token sekali pakai berbatas waktu; sekolah tujuan mengambil rekam lewat API. Semua akses tercatat di audit log.',
  },
];

/** Beranda per peran: hanya menampilkan langkah yang memang boleh dibuka. */
export default function Beranda() {
  const { profil, siap } = useAuth();
  const ref = useRef<HTMLDivElement>(null);

  // Gerak yang bergantung gulir: baris alur masuk berjenjang, dan kolom
  // metadata bergeser sedikit lebih lambat dari tajuk (paralaks tipis).
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const baris = gsap.utils.toArray<HTMLElement>('.alur li', ref.current);
        if (baris.length > 0) {
          gsap.from(baris, {
            yPercent: 12,
            autoAlpha: 0,
            duration: 0.7,
            ease: 'power3.out',
            stagger: 0.08,
            scrollTrigger: { trigger: '.alur', start: 'top 85%', once: true },
          });
        }
        const rail = ref.current?.querySelector('.hero-rail');
        if (rail) {
          gsap.to(rail, {
            y: -28,
            ease: 'none',
            scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
          });
        }
      });
    },
    { scope: ref, dependencies: [profil?.role] },
  );

  if (!siap) return <p className="hint">Memuat sesi...</p>;
  if (!profil) {
    return (
      <p className="pesan">
        Sesi belum aktif. <Link to="/login">Masuk</Link> untuk membuka halaman peran Anda.
      </p>
    );
  }

  const tautan: Record<string, { ke: string; judul: string; isi: string }[]> = {
    guru: [
      { ke: '/siswa', judul: 'Siswa', isi: 'Pilih siswa, isi asesmen hambatan, susun draf PPI.' },
      { ke: '/materi', judul: 'Materi aksesibel', isi: 'Sajikan bacaan dalam mode teks besar, kalimat pendek, atau bacakan.' },
    ],
    gpk: [
      { ke: '/siswa', judul: 'Siswa', isi: 'Tinjau draf PPI guru dan buat versi baru.' },
      { ke: '/materi', judul: 'Materi aksesibel', isi: 'Kelola materi dan varian aksesibelnya.' },
    ],
    koordinator: [
      { ke: '/siswa', judul: 'Data siswa', isi: 'Ringkasan seluruh siswa sekolah dan penghapusan data atas permintaan.' },
      { ke: '/koordinator', judul: 'Transfer rekam', isi: 'Ajukan pengiriman rekam ke sekolah lain setelah persetujuan orang tua.' },
      { ke: '/audit', judul: 'Audit log', isi: 'Telusuri siapa mengakses dan mengubah data siswa.' },
    ],
    orang_tua: [
      { ke: '/orangtua', judul: 'Ringkasan anak', isi: 'Baca ringkasan PPI, sesi terakhir, dan beri persetujuan berbagi rekam.' },
    ],
    admin: [
      { ke: '/audit', judul: 'Audit log', isi: 'Seluruh akses data siswa tercatat.' },
      { ke: '/siswa', judul: 'Siswa', isi: 'Seluruh sekolah.' },
    ],
  };

  const tindakan = tautan[profil.role] ?? [];
  const utama = tindakan[0];

  return (
    <div ref={ref}>
      <section className="hero" aria-labelledby="judul-beranda">
        <p className="meta mb-6">PPI-Link · UINIC 8.0 · data demo sintetis</p>
        <div className="hero-kisi">
          <div>
            <RevealText
              id="judul-beranda"
              kelas="judul-hero"
              baris={['Selamat datang,', profil.nama]}
            />
            <p className="lede">
              Peran Anda <strong>{profil.role.replace('_', ' ')}</strong>. Alur PPI-Link: asesmen
              hambatan → saran akomodasi beserta alasannya → draf PPI berversi → catat sesi →
              bagikan ke orang tua atau sekolah lain.
            </p>
            {utama && (
              <Magnetik>
                <Link className="tombol inline-flex items-center gap-2" to={utama.ke}>
                  {utama.judul}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </Magnetik>
            )}
          </div>

          <div className="hero-rail">
            <h2 className="meta mt-0 border-t-0 pt-0">Posisi sesi</h2>
            <ul className="hero-meta">
              <li>
                <span className="meta">Peran</span>
                <strong>{profil.role.replace('_', ' ')}</strong>
              </li>
              <li>
                <span className="meta">Langkah tersedia</span>
                <strong>{tindakan.length}</strong>
              </li>
              <li>
                <span className="meta">Sumber data</span>
                <strong>demo sintetis</strong>
              </li>
              <li>
                <span className="meta">Identitas siswa</span>
                <strong>kode pseudonim</strong>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <h2>Tindakan yang boleh dibuka</h2>
      <nav aria-label="Tindakan sesuai peran">
        <div className="kisi-swiss">
          {tindakan.map((t, i) => (
            <Link key={t.ke} className="kartu-tautan flex flex-col gap-3" to={t.ke}>
              <span className="meta flex items-center justify-between">
                {String(i + 1).padStart(2, '0')}
                <ArrowRight size={16} aria-hidden="true" />
              </span>
              <span className="font-display text-xl font-semibold tracking-[-0.02em]">{t.judul}</span>
              <span className="text-sm text-tinta-lembut">{t.isi}</span>
            </Link>
          ))}
        </div>
      </nav>

      <h2>Alur kerja</h2>
      <p className="hint">
        Lima alur yang menjadi inti nilai PPI-Link. Tiap baris menautkan ke halaman pelaksananya
        bila peran Anda membukanya.
      </p>
      <ol className="alur">
        {ALUR.map((a) => (
          <li key={a.nomor}>
            <span className="alur-nomor" aria-hidden="true">{a.nomor}</span>
            <div>
              <h3>
                <span className="sr-only">{a.nomor}. </span>
                {a.judul}
              </h3>
              <p className="text-tinta-lembut">{a.isi}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="hint mt-8">
        Tingkat bukti setiap saran akomodasi tampil bersama sumbernya, dan setiap saran boleh
        ditolak guru. PPI-Link mencatat fungsi, bukan klaim peningkatan hasil belajar.
      </p>
    </div>
  );
}