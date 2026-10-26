/**
 * Bagian interaktif halaman publik: "Anatomi satu saran akomodasi".
 *
 * Ini ILUSTRASI tampilan — bukan data siswa dan bukan hasil perhitungan. Nilai,
 * kutipan, dan nama di bawah disalin dari tabel aturan demo di
 * supabase/seed.sql supaya bentuknya jujur, lalu diberi label apa adanya.
 *
 * Tiga lapis yang selalu tampil bersama di PPI-Link (PRD §11):
 *   1. nama + deskripsi akomodasi
 *   2. alasan + tingkat bukti + sumber
 *   3. peninjau + tanggal tinjau (kolom `ditinjau_oleh`)
 *
 * Gerak yang dipakai:
 *   - gulir (layar lebar): panggung menempel dan langkah maju mengikuti posisi
 *     baca lewat ScrollTrigger scrub — tanpa pin dan tanpa scroll-jack, jadi
 *     PgDn, spasi, panah, dan Ctrl+F tetap bekerja seperti biasa
 *   - penunjuk presisi: tiap lapis bergeser dengan faktor berbeda (paralaks tipis)
 *   - hover/fokus: satu kontrol tiga guna — pratinjau lapis, kunci langkah,
 *     sekaligus sasaran keyboard
 *
 * Tanpa gerak (prefers-reduced-motion) atau di layar sempit, ketiga lapis
 * ditampilkan sekaligus: tidak ada isi yang disembunyikan hanya karena
 * animasinya tidak dijalankan. Kontrolnya tetap menyorot lapisan.
 */
import { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

gsap.registerPlugin(useGSAP, ScrollTrigger);

interface Langkah {
  nomor: string;
  judul: string;
  isi: string;
}

const LANGKAH: Langkah[] = [
  {
    nomor: '01',
    judul: 'Nama akomodasi',
    isi: 'Tindakan yang akan dilakukan guru — bukan label pada siswa. Contoh: “Jadwal visual berurutan”, “Kalimat dipecah menjadi pendek”.',
  },
  {
    nomor: '02',
    judul: 'Alasan dan tingkat bukti',
    isi: 'Setiap saran membawa alasan beserta sumbernya dan tingkat bukti, sehingga guru dapat menilai dasar sarannya, bukan menerimanya begitu saja.',
  },
  {
    nomor: '03',
    judul: 'Peninjau dan tanggal tinjau',
    isi: 'Kolom ditinjau_oleh harus berisi nama GPK atau dosen PLB yang benar-benar meninjau tabel aturan. Guru selalu boleh menolak atau mengubah saran.',
  },
];

/** Gerak bergulir hanya di layar lebar dan bila pengguna tidak meminta gerak minimal. */
function useGulirBerjenjang() {
  const [pakai, setPakai] = useState(false);

  useEffect(() => {
    const lebar = window.matchMedia('(min-width: 64rem)');
    const redup = window.matchMedia('(prefers-reduced-motion: reduce)');
    const periksa = () => setPakai(lebar.matches && !redup.matches);
    periksa();
    lebar.addEventListener('change', periksa);
    redup.addEventListener('change', periksa);
    return () => {
      lebar.removeEventListener('change', periksa);
      redup.removeEventListener('change', periksa);
    };
  }, []);

  return pakai;
}

export default function AnatomiSaran() {
  const ref = useRef<HTMLDivElement>(null);
  const [langkah, setLangkah] = useState(0);
  const [sorot, setSorot] = useState<number | null>(null);
  const pakaiGulir = useGulirBerjenjang();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      const panggung = ref.current?.querySelector('.panggung');

      // Paralaks tipis pada pembungkus lapis. Transform di elemen pembungkus
      // dipegang GSAP; pembukaan berjenjang memakai transform di elemen lain.
      mm.add('(prefers-reduced-motion: no-preference) and (pointer: fine)', () => {
        if (!(panggung instanceof HTMLElement)) return;
        const pembungkus = Array.from(panggung.querySelectorAll<HTMLElement>('.lapisan-bungkus'));
        if (pembungkus.length === 0) return;

        const geser = pembungkus.map((el) =>
          gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' }),
        );
        const ikuti = (e: PointerEvent) => {
          const r = panggung.getBoundingClientRect();
          const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
          geser.forEach((g, i) => g(dx * (i + 1) * 7));
        };
        const pulih = () => geser.forEach((g) => g(0));

        panggung.addEventListener('pointermove', ikuti);
        panggung.addEventListener('pointerleave', pulih);
        return () => {
          panggung.removeEventListener('pointermove', ikuti);
          panggung.removeEventListener('pointerleave', pulih);
        };
      });

      // Langkah mengikuti posisi baca. setState hanya saat indeks benar-benar
      // berubah: gulir tidak boleh memicu render di tiap bingkai.
      let terakhir = -1;
      mm.add('(prefers-reduced-motion: no-preference) and (min-width: 64rem)', () => {
        const bagian = ref.current;
        if (!bagian) return;
        const pemicu = ScrollTrigger.create({
          trigger: bagian,
          start: 'top 55%',
          end: 'bottom 75%',
          onUpdate: (self) => {
            const indeks = Math.min(LANGKAH.length - 1, Math.floor(self.progress * LANGKAH.length));
            if (indeks !== terakhir) {
              terakhir = indeks;
              setLangkah(indeks);
            }
          },
        });
        return () => {
          terakhir = -1;
          pemicu.kill();
        };
      });
    },
    { scope: ref },
  );

  const tampilSampai = pakaiGulir ? langkah : LANGKAH.length - 1;

  return (
    <TooltipProvider delayDuration={150}>
      <div ref={ref} className="grid gap-8 lg:grid-cols-2 lg:gap-16">
        {/* Panggung menempel saat bagian ini digulir, supaya lapis demi lapis
            muncul di tempat yang sama. */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="meta mb-4">Ilustrasi tampilan · bukan data siswa</p>

          <div className="panggung" role="group" aria-label="Tiga lapisan satu saran akomodasi">
            <div className="lapisan-bungkus" data-tampil="true">
              <Card className={cn('lapisan ring-garis transition-all duration-300', (sorot === 0 || langkah === 0) && 'ring-2 ring-aksen bg-latar-lembut/40')}>
                <CardHeader>
                  <CardTitle className="font-display text-lg">Jadwal visual berurutan</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-tinta-lembut">
                  Urutan kegiatan ditampilkan sebagai langkah berikon yang dapat dicentang. Tampil
                  juga di Mode siswa, sehingga siswa melihat langkah yang sama dengan yang disusun
                  guru.
                </CardContent>
              </Card>
            </div>

            <div className="lapisan-bungkus" data-tampil={tampilSampai >= 1 ? 'true' : 'false'}>
              <Card className={cn('lapisan ring-garis transition-all duration-300', (sorot === 1 || langkah === 1) && 'ring-2 ring-aksen bg-latar-lembut/40')}>
                <CardHeader>
                  <CardTitle className="font-display text-lg">Alasan dan tingkat bukti</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <p className="text-sm text-tinta-lembut">
                    Jadwal visual disimpulkan sebagai praktik berbasis bukti untuk individu dengan
                    autisme, terutama bila disertai instruksi sistematis. [S8]
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="cursor-help">
                          <Badge variant="outline">Tingkat bukti: sedang sampai kuat</Badge>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Tingkat bukti diringkas dari penilaian tim atas sumber di PRD §11, bukan
                        diagnosis untuk siswa tertentu.
                      </TooltipContent>
                    </Tooltip>
                    <span className="meta">Sumber: Knight dkk. (2015)</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lapisan-bungkus" data-tampil={tampilSampai >= 2 ? 'true' : 'false'}>
              <Card className={cn('lapisan ring-garis transition-all duration-300', (sorot === 2 || langkah === 2) && 'ring-2 ring-aksen bg-latar-lembut/40')}>
                <CardHeader>
                  <CardTitle className="font-display text-lg">Peninjau dan tanggal tinjau</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <Separator />
                  <p className="text-sm text-tinta-lembut">
                    Setiap baris aturan menyimpan siapa yang meninjau dan kapan. Nilai di demo masih
                    placeholder sampai GPK atau dosen PLB mitra mengisi kolomnya.
                  </p>
                  <span className="meta">
                    Ditinjau oleh: menunggu peninjau · ditinjau pada: hari ini
                  </span>
                </CardContent>
              </Card>
            </div>
          </div>

          <p className="hint mt-4">
            Angka, kutipan, dan nama di atas adalah contoh dari tabel aturan demo. Pada aplikasi,
            saran dihitung dari asesmen hambatan terakhir siswa, dan setiap saran boleh ditolak guru.
          </p>
        </div>

        {/* Kontrol: satu baris per lapis. Berfungsi dengan tetikus, sentuh, dan
            papan tuts karena setiap baris adalah tombol asli. */}
        <div>
          <h3 className="mt-0">Apa yang selalu tampil bersama</h3>
          <p className="hint">
            {pakaiGulir
              ? 'Gulir bagian ini atau pilih salah satu langkah; tiap langkah menyorot lapisan yang bersangkutan di panggung.'
              : 'Pilih salah satu langkah untuk menyorot lapisan yang bersangkutan di panggung.'}
          </p>

          <div className="mt-6">
            {LANGKAH.map((l, i) => (
              <button
                key={l.nomor}
                type="button"
                className="langkah-pilih"
                aria-current={pakaiGulir && langkah === i ? 'step' : undefined}
                onClick={() => setLangkah(i)}
                onPointerEnter={() => setSorot(i)}
                onPointerLeave={() => setSorot(null)}
                onFocus={() => setSorot(i)}
                onBlur={() => setSorot(null)}
              >
                <span className="alur-nomor" aria-hidden="true">{l.nomor}</span>
                <span>
                  <strong className="block font-display text-lg font-semibold tracking-[-0.02em]">
                    {l.judul}
                  </strong>
                  <span className="mt-1 block text-sm text-tinta-lembut">{l.isi}</span>
                  <span className="meta mt-2 block">
                    {sorot === i ? 'Lapisan tersorot' : 'Sorot lapisan ini'}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}