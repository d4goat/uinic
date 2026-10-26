import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  FilePlus,
  ListOrdered,
  Play,
  Sparkles,
  Square,
  Volume2,
} from 'lucide-react';
import { catatAkses, daftarMateri, daftarVarian, simpanMateri } from '../lib/api';
import type { Materi, VarianMateri } from '../lib/types';
import { useAuth } from '../auth/AuthContext';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';

const KUNCI_MODE = 'ppi-link:mode-tampilan';
const PESAN_TANPA_SUARA =
  'Peramban ini belum menyediakan suara Bahasa Indonesia (id-ID); gunakan mode teks besar atau kalimat pendek.';

type Mode = '' | 'teks-besar' | 'kontras-tinggi';
type Laju = 0.7 | 1 | 1.3;
type DukunganSuara = 'memeriksa' | 'ada' | 'tidak';

const pesanGalat = (e: unknown) => (e instanceof Error ? e.message : 'Terjadi galat tak terduga.');

const bagiParagraf = (teks: string): string[] =>
  teks.split(/\n+/).map((s) => s.trim()).filter(Boolean);

const pecahKalimat = (teks: string): string[] =>
  teks
    .split(/(?<=\.)\s+|,\s+dan\s+|\s+yang\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);

const adaSuaraId = () =>
  typeof SpeechSynthesisUtterance !== 'undefined' &&
  !!window.speechSynthesis &&
  window.speechSynthesis
    .getVoices()
    .some((v) => v.lang?.toLowerCase().replace('_', '-').startsWith('id'));

function useDukunganSuara(): DukunganSuara {
  const [dukungan, setDukungan] = useState<DukunganSuara>(() => {
    if (typeof SpeechSynthesisUtterance === 'undefined' || !window.speechSynthesis) return 'tidak';
    return adaSuaraId() ? 'ada' : 'memeriksa';
  });

  useEffect(() => {
    if (dukungan !== 'memeriksa') return;
    const cek = () => {
      if (adaSuaraId()) setDukungan('ada');
    };
    window.speechSynthesis.addEventListener('voiceschanged', cek);
    const jam = window.setTimeout(
      () => setDukungan((lama) => (lama === 'ada' ? lama : 'tidak')),
      1500,
    );
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', cek);
      window.clearTimeout(jam);
    };
  }, [dukungan]);

  return dukungan;
}

export default function MateriAksesibel() {
  const { profil } = useAuth();
  const wadahRef = useRef<HTMLDivElement>(null);

  const [materi, setMateri] = useState<Materi[]>([]);
  const [terpilih, setTerpilih] = useState<Materi | null>(null);
  const [varian, setVarian] = useState<VarianMateri[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState('');
  const [pesan, setPesan] = useState('');

  const [mode, setMode] = useState<Mode>(() => {
    try {
      const simpan = localStorage.getItem(KUNCI_MODE);
      return simpan === 'teks-besar' || simpan === 'kontras-tinggi' ? simpan : '';
    } catch {
      return '';
    }
  });
  const [pendek, setPendek] = useState(false);
  const [laju, setLaju] = useState<Laju>(1);
  const [sedangBicara, setSedangBicara] = useState(false);

  const [judul, setJudul] = useState('');
  const [teks, setTeks] = useState('');
  const [menyimpan, setMenyimpan] = useState(false);

  const dukungan = useDukunganSuara();
  const bisaBacakan = dukungan === 'ada';

  const bukaMateri = useCallback(async (m: Materi) => {
    setTerpilih(m);
    setVarian([]);
    setGalat('');
    setPesan('');
    window.speechSynthesis?.cancel();
    setSedangBicara(false);
    try {
      setVarian(await daftarVarian(m.id));
      await catatAkses('materials', m.id, { aksi: 'buka' });
    } catch (e) {
      setGalat(pesanGalat(e));
    }
  }, []);

  useEffect(() => {
    let hidup = true;
    (async () => {
      try {
        const rows = await daftarMateri();
        if (hidup) {
          setMateri(rows);
          if (rows.length > 0) void bukaMateri(rows[0]);
        }
      } catch (e) {
        if (hidup) setGalat(pesanGalat(e));
      } finally {
        if (hidup) setMemuat(false);
      }
    })();
    return () => {
      hidup = false;
    };
  }, [bukaMateri]);

  useEffect(() => {
    if (mode) document.documentElement.dataset.mode = mode;
    else delete document.documentElement.dataset.mode;
    try {
      localStorage.setItem(KUNCI_MODE, mode);
    } catch {
      //
    }
  }, [mode]);

  useEffect(
    () => () => {
      delete document.documentElement.dataset.mode;
      window.speechSynthesis?.cancel();
    },
    [],
  );

  useGSAP(
    () => {
      gsap.from('.anim-muncul', {
        opacity: 0,
        y: 16,
        stagger: 0.08,
        duration: 0.6,
        ease: 'power3.out',
      });
    },
    { scope: wadahRef, dependencies: [memuat] },
  );

  const paragraf = useMemo(() => bagiParagraf(terpilih?.teks_sumber ?? ''), [terpilih]);
  const kalimat = useMemo(() => paragraf.flatMap(pecahKalimat), [paragraf]);
  const teksBacaan = useMemo(
    () => (pendek ? kalimat.join('. ') : paragraf.join('. ')),
    [pendek, kalimat, paragraf],
  );

  const bacakan = () => {
    if (!terpilih) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(teksBacaan);
      u.lang = 'id-ID';
      u.rate = laju;
      u.onend = () => setSedangBicara(false);
      u.onerror = () => setSedangBicara(false);
      setSedangBicara(true);
      window.speechSynthesis.speak(u);
    } catch (e) {
      setGalat(pesanGalat(e));
      setSedangBicara(false);
    }
  };

  const hentikan = () => {
    window.speechSynthesis?.cancel();
    setSedangBicara(false);
  };

  const simpanBahan = async (e: FormEvent) => {
    e.preventDefault();
    if (!profil) return;
    setGalat('');
    setPesan('');
    setMenyimpan(true);
    try {
      const isi = teks.trim();
      const potongan = bagiParagraf(isi).flatMap(pecahKalimat);
      const baris = await simpanMateri(
        { judul: judul.trim(), teks_sumber: isi, dibuat_oleh: profil.id },
        [
          { jenis: 'teks_besar', teks: isi },
          ...(potongan.length
            ? [{ jenis: 'kalimat_pendek' as const, teks: potongan.join('\n') }]
            : []),
        ],
      );
      setMateri((lama) => [...lama, baris].sort((a, b) => a.judul.localeCompare(b.judul)));
      setJudul('');
      setTeks('');
      setPesan(`Materi "${baris.judul}" tersimpan beserta varian aksesibelnya.`);
      void bukaMateri(baris);
    } catch (err) {
      setGalat(pesanGalat(err));
    } finally {
      setMenyimpan(false);
    }
  };

  return (
    <div ref={wadahRef} className="space-y-8">
      {/* Header Editorial */}
      <header className="anim-muncul border-b border-[var(--garis)] pb-6">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="font-mono text-xs uppercase tracking-wider">
            F10 · Materi Aksesibel
          </Badge>
          <span className="text-xs text-[var(--tinta-lembut)]">Mendukung Disleksia & Kesulitan Membaca</span>
        </div>

        <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--tinta)] sm:text-4xl">
          Penyaji Materi Aksesibel
        </h1>
        <p className="mt-2 text-base text-[var(--tinta-lembut)] max-w-3xl leading-relaxed">
          Teks pembelajaran dipecah menjadi kalimat ringkas dan dapat dibacakan otomatis (Text-to-Speech)
          untuk menurunkan beban kognitif membaca bagi siswa berkebutuhan khusus.
        </p>
      </header>

      {galat && (
        <div className="anim-muncul rounded-sm border border-[var(--galat)] bg-red-50/50 p-4 text-[var(--galat)] text-sm flex items-start gap-3" role="alert">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Terjadi Kendala</p>
            <p>{galat}</p>
          </div>
        </div>
      )}
      {pesan && (
        <div className="anim-muncul rounded-sm border border-[var(--berhasil)] bg-emerald-50/50 p-4 text-[var(--berhasil)] text-sm flex items-center gap-3" role="status">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-[var(--berhasil)]" />
          <span className="font-medium">{pesan}</span>
        </div>
      )}

      {/* Grid Asimetris: Daftar Materi (4 Kolom) + Pembaca Materi (8 Kolom) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Kolom Kiri: Koleksi Materi */}
        <section className="anim-muncul lg:col-span-4 border border-[var(--garis)] bg-[var(--kartu)] rounded-sm p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--garis)] pb-3">
            <BookOpen className="w-4 h-4 text-[var(--aksen)]" />
            <h2 className="font-display text-base font-bold text-[var(--tinta)]">Pustaka Materi</h2>
          </div>

          {memuat ? (
            <div className="p-8 text-center font-mono text-xs text-[var(--tinta-lembut)]">
              Memuat pustaka materi...
            </div>
          ) : materi.length === 0 ? (
            <p className="text-xs text-[var(--tinta-lembut)] py-4">Belum ada materi tersimpan di sekolah ini.</p>
          ) : (
            <div className="space-y-1.5">
              {materi.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => void bukaMateri(m)}
                  className={`w-full text-left p-3 rounded-sm text-xs font-medium transition-all flex items-center justify-between border ${
                    terpilih?.id === m.id
                      ? 'border-[var(--aksen)] bg-[var(--aksen)]/5 font-bold text-[var(--aksen)]'
                      : 'border-[var(--garis)] hover:border-[var(--garis-kuat)] text-[var(--tinta)]'
                  }`}
                >
                  <span className="truncate pr-2">{m.judul}</span>
                  {terpilih?.id === m.id && <Sparkles className="w-3.5 h-3.5 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Kolom Kanan: Pembaca & Kontrol Aksesibilitas */}
        <section className="anim-muncul lg:col-span-8 space-y-6">
          <div className="border border-[var(--garis)] bg-[var(--kartu)] rounded-sm p-6 space-y-6">
            {/* Toolbar Kontrol Tampilan & Suara */}
            <div className="p-4 bg-[var(--latar-lembut)]/40 border border-[var(--garis)] rounded-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Mode Tampilan */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-medium text-[var(--tinta-lembut)] mr-1">TAMPILAN:</span>
                  <button
                    type="button"
                    onClick={() => setMode('')}
                    className={`px-2.5 py-1 text-xs rounded-sm border font-medium transition-colors ${
                      mode === '' ? 'bg-[var(--tinta)] text-white border-[var(--tinta)]' : 'border-[var(--garis)] text-[var(--tinta-lembut)]'
                    }`}
                  >
                    Standar
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('teks-besar')}
                    className={`px-2.5 py-1 text-xs rounded-sm border font-medium transition-colors ${
                      mode === 'teks-besar' ? 'bg-[var(--tinta)] text-white border-[var(--tinta)]' : 'border-[var(--garis)] text-[var(--tinta-lembut)]'
                    }`}
                  >
                    Teks Besar
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('kontras-tinggi')}
                    className={`px-2.5 py-1 text-xs rounded-sm border font-medium transition-colors ${
                      mode === 'kontras-tinggi' ? 'bg-[var(--tinta)] text-white border-[var(--tinta)]' : 'border-[var(--garis)] text-[var(--tinta-lembut)]'
                    }`}
                  >
                    Kontras Tinggi
                  </button>
                </div>

                {/* Mode Pecah Kalimat Toggle */}
                <button
                  type="button"
                  onClick={() => setPendek((p) => !p)}
                  className={`px-3 py-1 text-xs font-mono rounded-sm border transition-colors flex items-center gap-1.5 ${
                    pendek ? 'border-[var(--aksen)] bg-[var(--aksen)] text-white' : 'border-[var(--garis)] text-[var(--tinta-lembut)]'
                  }`}
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                  Mode Pecah Kalimat: {pendek ? 'AKTIF' : 'NONAKTIF'}
                </button>
              </div>

              {/* Bar Pemutar Suara TTS */}
              <div className="pt-3 border-t border-[var(--garis)] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-medium text-[var(--tinta-lembut)] flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5" />
                    KECEPATAN SUARA:
                  </span>
                  <div className="inline-flex rounded-sm border border-[var(--garis)] bg-white p-0.5">
                    {[0.7, 1, 1.3].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setLaju(r as Laju)}
                        className={`px-2 py-0.5 font-mono text-xs rounded-sm ${
                          laju === r ? 'bg-[var(--aksi)] text-white font-bold' : 'text-[var(--tinta-lembut)]'
                        }`}
                      >
                        {r}x
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={bacakan}
                    disabled={!bisaBacakan || !terpilih || sedangBicara}
                    className="h-8 text-xs font-mono bg-[var(--aksi)] text-white hover:bg-[var(--aksi-gelap)]"
                  >
                    <Play className="w-3.5 h-3.5 mr-1" />
                    {sedangBicara ? 'Sedang Membaca...' : 'Bacakan Teks'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={hentikan}
                    disabled={!bisaBacakan || !sedangBicara}
                    className="h-8 text-xs font-mono"
                  >
                    <Square className="w-3.5 h-3.5 mr-1" />
                    Berhenti
                  </Button>
                </div>
              </div>

              {dukungan === 'tidak' && (
                <p className="text-xs text-amber-800 font-mono">{PESAN_TANPA_SUARA}</p>
              )}
            </div>

            {/* Konten Teks Terbaca */}
            {terpilih ? (
              <div className="space-y-4">
                <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--tinta)]">
                  {terpilih.judul}
                </h2>

                {pendek ? (
                  <div className="space-y-3">
                    <span className="text-xs font-mono text-[var(--aksen)] block font-bold">
                      STRUKTUR KALIMAT PENDEK BERURUTAN:
                    </span>
                    <ol className="space-y-2.5 list-decimal pl-5">
                      {kalimat.map((k, idx) => (
                        <li key={idx} className="p-2.5 rounded-sm bg-[var(--latar-lembut)]/30 border border-[var(--garis)] text-base text-[var(--tinta)] leading-relaxed">
                          {k}
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : (
                  <div className="space-y-4 text-base text-[var(--tinta)] leading-relaxed font-sans">
                    {paragraf.map((p, idx) => (
                      <p key={idx}>{p}</p>
                    ))}
                  </div>
                )}

                {varian.length > 0 && (
                  <div className="pt-4 border-t border-[var(--garis)] text-xs text-[var(--tinta-lembut)] font-mono flex items-center gap-2">
                    <span>Varian tersimpan:</span>
                    {varian.map((v) => (
                      <Badge key={v.id} variant="secondary" className="font-mono text-[10px]">
                        {v.jenis}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-[var(--tinta-lembut)] py-12 text-center">
                Pilih salah satu materi di pustaka kiri untuk mulai membaca.
              </p>
            )}
          </div>

          {/* Form Tambah Bahan Baru */}
          {profil && (
            <div className="border border-[var(--garis)] bg-[var(--kartu)] rounded-sm p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-[var(--garis)] pb-3">
                <FilePlus className="w-4 h-4 text-[var(--aksen)]" />
                <h2 className="font-display text-base font-bold text-[var(--tinta)]">Unggah Bahan Bacaan Baru</h2>
              </div>
              <p className="text-xs text-[var(--tinta-lembut)]">
                Teks asli akan otomatis dipecah dan disimpan dalam varian teks besar dan kalimat pendek secara otomatis.
              </p>

              <form onSubmit={(e) => void simpanBahan(e)} className="space-y-4">
                <div>
                  <label htmlFor="judul-baru" className="block text-xs font-mono font-medium text-[var(--tinta)] mb-1">
                    JUDUL BACAAN <span className="text-[var(--aksen)]">*</span>
                  </label>
                  <Input
                    id="judul-baru"
                    value={judul}
                    onChange={(e) => setJudul(e.target.value)}
                    placeholder="Contoh: Mengenal Ekosistem Hutan Hujan Tropis"
                    required
                    className="text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="teks-baru" className="block text-xs font-mono font-medium text-[var(--tinta)] mb-1">
                    TEKS SUMBER LENGKAP <span className="text-[var(--aksen)]">*</span>
                  </label>
                  <Textarea
                    id="teks-baru"
                    value={teks}
                    onChange={(e) => setTeks(e.target.value)}
                    placeholder="Tempelkan paragraf materi pelajaran di sini..."
                    rows={5}
                    required
                    className="text-sm leading-relaxed"
                  />
                </div>

                <Button type="submit" disabled={menyimpan} className="w-full sm:w-auto">
                  {menyimpan ? 'Menyimpan & Memecah Kalimat...' : 'Simpan Materi Aksesibel'}
                </Button>
              </form>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
