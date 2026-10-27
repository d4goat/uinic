/**
 * Halaman publik "/" untuk pengunjung tanpa sesi (PRD §3: guru, GPK,
 * koordinator, orang tua — siswa tidak memerlukan akun).
 *
 * Pengguna yang sudah masuk tidak melihat halaman ini: gerbang di App.tsx
 * menampilkan beranda peran di jalur yang sama. Karena itu halaman ini tidak
 * memuat satu pun panggilan data — seluruh isinya pernyataan produk dan satu
 * bagian ilustrasi interaktif (AnatomiSaran).
 *
 * Semua klaim di sini diambil dari PRD, termasuk tingkat kekuatan bukti apa
 * adanya — menyembunyikan "bukti lemah" hanya akan jadi pertanyaan di sesi tanya
 * jawab juri.
 */
import { Link } from 'react-router-dom';
import { Accessibility, ArrowRight, FileJson, ListChecks, ShieldCheck } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import AnatomiSaran from '@/components/AnatomiSaran';
import Magnetik from '@/components/Magnetik';
import RevealText from '@/components/RevealText';
import DemoSwitcher from '@/components/DemoSwitcher';
import PwaStatusPill from '@/components/PwaStatusPill';

/** PRD §2 apa adanya: masalah, sumber, dan seberapa kuat buktinya. */
const MASALAH = [
  {
    judul: 'Guru sulit menyusun PPI',
    isi: 'Kurangnya kompetensi PPI disebut hambatan utama pendidikan inklusif, dan di satu SD penyusunan PPI terhambat tujuh siswa berkebutuhan khusus dalam satu kelas. Sumber [S1] [S2].',
    bukti: 'Bukti: sedang · studi kasus kecil',
  },
  {
    judul: 'Tenaga pendamping terbatas',
    isi: 'Jumlah guru pendamping khusus terbatas, sementara peserta didik disabilitas di sekolah jauh lebih banyak daripada jumlah pendampingnya. Sumber [S4].',
    bukti: 'Bukti: sedang · beda definisi dan tahun',
  },
  {
    judul: 'Perpindahan antar sekolah rawan',
    isi: 'Transisi siswa disabilitas intelektual antar jenis sekolah dan kelas memengaruhi kehidupan belajar dan sosial mereka. Sumber [S5].',
    bukti: 'Bukti: lemah · bukan bukti catatan PPI hilang',
  },
  {
    judul: 'Koneksi sekolah tidak stabil',
    isi: 'Aplikasi asesmen anak berkebutuhan khusus untuk SLB dibangun sebagai progressive web app karena koneksi tidak stabil dan kadang luring. Sumber [S6].',
    bukti: 'Bukti: sedang',
  },
];

export default function Landing() {
  return (
    <>
      <a className="lompati-ke-konten" href="#konten-utama">Lewati ke konten utama</a>

      <header className="border-b border-garis bg-latar/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-aksi flex items-center justify-center text-white shadow-xs">
              <ShieldCheck size={18} className="text-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-display font-bold text-lg leading-tight tracking-tight text-tinta">
                  PPI-Link
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-aksen" aria-hidden="true"></span>
              </div>
              <span className="text-[10px] font-mono text-tinta-lembut uppercase tracking-wider hidden sm:inline">
                Sanctuary Inklusif · UINIC 8.0
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PwaStatusPill />
            <DemoSwitcher />
            <Button asChild variant="outline" className="h-8 text-xs rounded-xl hidden sm:inline-flex">
              <Link to="/api-docs">
                <FileJson size={13} className="mr-1" />
                API Docs
              </Link>
            </Button>
            <Button asChild className="h-8 text-xs font-semibold rounded-xl bg-aksi text-white hover:bg-aksi-gelap shadow-xs">
              <Link to="/login">Masuk</Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="konten-utama" className="wadah wadah-lebar">
        <section className="hero" aria-labelledby="judul-landing">
          <p className="meta mb-6">Platform PPI untuk sekolah inklusif · data demo sintetis</p>
          <div className="hero-kisi">
            <div>
              <RevealText
                id="judul-landing"
                kelas="judul-hero"
                baris={['Program Pembelajaran', 'Individual yang bisa', 'disusun hari itu juga']}
              />
              <p className="lede">
                Guru mencentang hambatan yang diamati, sistem menyarankan akomodasi dari tabel aturan
                yang terbuka dan beralasan, lalu menyusun draf PPI yang dapat diedit dan ber-versi.
                Kemajuan dicatat per sesi, orang tua dapat membacanya, dan rekam PPI dapat dikirim ke
                sekolah lain lewat API dengan persetujuan orang tua.
              </p>
              <div className="baris">
                <Magnetik>
                  <Button asChild className="h-11 px-5 text-base">
                    <Link to="/login">
                      Masuk dengan akun demo
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </Button>
                </Magnetik>
                <Button asChild variant="outline" className="h-11 px-5 text-base">
                  <a href="#anatomi">Lihat cara kerjanya</a>
                </Button>
              </div>
            </div>

            <div className="hero-rail">
              <h2 className="meta mt-0 border-t-0 pt-0">Yang dipegang PPI-Link</h2>
              <ul className="hero-meta">
                <li>
                  <span className="meta">Saran akomodasi</span>
                  <strong>selalu beserta alasan &amp; tingkat bukti</strong>
                </li>
                <li>
                  <span className="meta">Identitas siswa</span>
                  <strong>kode pseudonim, tanpa nama &amp; NIK</strong>
                </li>
                <li>
                  <span className="meta">Aksesibilitas</span>
                  <strong>target WCAG 2.1 AA, seluruh fungsi bisa dipakai keyboard</strong>
                </li>
                <li>
                  <span className="meta">Koneksi</span>
                  <strong>sesi tetap tercatat saat luring</strong>
                </li>
              </ul>
              <Separator className="my-6" />
              <ul className="hero-meta">
                <li>
                  <span className="meta flex items-center gap-2">
                    <ListChecks size={16} aria-hidden="true" /> Lima alur
                  </span>
                  <strong>asesmen → saran → draf → sesi → transfer</strong>
                </li>
                <li>
                  <span className="meta flex items-center gap-2">
                    <Accessibility size={16} aria-hidden="true" /> Dua profil hambatan
                  </span>
                  <strong>kesulitan membaca · kebutuhan struktur &amp; transisi</strong>
                </li>
                <li>
                  <span className="meta flex items-center gap-2">
                    <ShieldCheck size={16} aria-hidden="true" /> Kewenangan
                  </span>
                  <strong>ditegakkan di basis data, bukan di klien</strong>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <h2>Masalah yang dijawab</h2>
        <p className="hint">
          Tingkat kekuatan bukti ditulis apa adanya, termasuk yang lemah. PPI-Link melaporkan
          fungsi, bukan klaim peningkatan hasil belajar.
        </p>
        <ol className="alur">
          {MASALAH.map((m, i) => (
            <li key={m.judul}>
              <span className="alur-nomor" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3 className="mt-0">{m.judul}</h3>
                <p className="text-tinta-lembut">{m.isi}</p>
                <div className="mt-2">
                  <Badge variant="outline" className="font-mono text-xs text-tinta-lembut font-normal">
                    {m.bukti}
                  </Badge>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <section id="anatomi" aria-labelledby="judul-anatomi" className="scroll-mt-24">
          <h2 id="judul-anatomi">Anatomi satu saran akomodasi</h2>
          <p className="hint">
            Tiga lapis ini tidak pernah dipisah: satu saran selalu tampil bersama alasannya, tingkat
            buktinya, dan siapa yang meninjau aturannya.
          </p>
          <div className="mt-8">
            <AnatomiSaran />
          </div>
        </section>

        <h2>Batas produk</h2>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="diagnosis">
            <AccordionTrigger className="font-display text-base">
              Bukan alat diagnosis, dan tidak menggantikan asesmen ahli
            </AccordionTrigger>
            <AccordionContent className="text-tinta-lembut">
              Asesmen di PPI-Link adalah catatan guru tentang hambatan yang teramati di kelas. Saran
              akomodasi berasal dari tabel aturan yang ditinjau manusia, setiap saran menampilkan
              alasannya, dan guru boleh menolak atau mengubahnya. Keputusan guru yang berlaku.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="dapodik">
            <AccordionTrigger className="font-display text-base">
              Tanpa integrasi Dapodik atau sistem sekolah nyata
            </AccordionTrigger>
            <AccordionContent className="text-tinta-lembut">
              Transfer rekam hanya demonstrasi dua instansi demo (Sekolah A dan Sekolah B) dengan
              data sintetis. Yang ditunjukkan adalah mekanismenya: persetujuan orang tua lebih dulu,
              token sekali pakai berbatas waktu, dan setiap akses tercatat di audit log.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="dampak">
            <AccordionTrigger className="font-display text-base">
              Tidak mengklaim peningkatan hasil belajar
            </AccordionTrigger>
            <AccordionContent className="text-tinta-lembut">
              Efek text-to-speech pada pemahaman bacaan dilaporkan kecil sampai sedang (d = 0,35;
              0,24 setelah koreksi bias) [S7], dan jadwal visual disimpulkan sebagai praktik berbasis
              bukti untuk autisme [S8]. Angka-angka itu tercantum pada tiap saran, bukan disamarkan.
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <h2>Mulai dari akun demo</h2>
        <p className="lede">
          Lima peran sudah disiapkan dengan data sintetis: guru, GPK, koordinator inklusi, orang tua,
          dan admin. Alur lengkapnya berjalan di dua sekolah demo.
        </p>
        <div className="baris">
          <Magnetik>
            <Button asChild className="h-11 px-5 text-base">
              <Link to="/login">
                Masuk ke PPI-Link
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </Magnetik>
          <span className="hint mb-0">
            Kata sandi akun demo diatur di <code>.env.local</code>, bukan di dalam repo.
          </span>
        </div>
      </main>

      <footer className="bilah border-t border-b-0 border-garis">
        <p className="meta mb-0">
          Data demo sintetis — PPI-Link bukan alat diagnosis dan tidak menggantikan asesmen ahli.
        </p>
        <p className="meta mb-0 ml-auto">UINIC 8.0 · Subtema pendidikan</p>
      </footer>
    </>
  );
}