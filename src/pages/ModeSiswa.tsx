import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import {
  AlertCircle,
  BookOpen,
  Check,
  ListTodo,
  Play,
  Plus,
  RotateCcw,
  Square,
  Trash2,
} from 'lucide-react';
import { daftarMateri, daftarVarian } from '../lib/api';
import type { Materi } from '../lib/types';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

/*
 * F11 — Mode siswa (autisme; PRD §S8): jadwal visual berikon, satu langkah per baris,
 * tombol besar. Dibuka guru yang sudah login di perangkat kelas; anak tidak perlu akun
 * dan tidak perlu mengetik apa pun. Daftar langkah hanya tersimpan di peramban perangkat.
 */

const IKON = ['â–¶', 'â˜…', 'â—', 'â—†', 'â– ', 'â–²', 'âœ”', 'â™«'];
const KUNCI_AWALAN = 'ppi-link:mode-siswa:';

type Laju = 0.7 | 1 | 1.3;
type DukunganSuara = 'memeriksa' | 'ada' | 'tidak';

interface Langkah {
  id: string;
  ikon: string;
  teks: string;
  selesai: boolean;
}

const pesanGalat = (e: unknown) => (e instanceof Error ? e.message : 'Terjadi galat tak terduga.');

const idBaru = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const bagiParagraf = (teks: string): string[] =>
  teks.split(/\n+/).map((s) => s.trim()).filter(Boolean);

const bagiLangkah = (teks: string): string[] =>
  teks
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);

const buatLangkah = (teks: string): Langkah[] =>
  bagiLangkah(teks).map((t, i) => ({
    id: idBaru(),
    ikon: IKON[i % IKON.length],
    teks: t,
    selesai: false,
  }));

const keLangkah = (nilai: unknown, i: number): Langkah | null => {
  if (typeof nilai !== 'object' || nilai === null) return null;
  const l = nilai as Record<string, unknown>;
  return {
    id: typeof l.id === 'string' ? l.id : idBaru(),
    ikon: typeof l.ikon === 'string' && l.ikon ? l.ikon : IKON[i % IKON.length],
    teks: typeof l.teks === 'string' ? l.teks : '',
    selesai: l.selesai === true,
  };
};

const bacaTersimpan = (id: string): Langkah[] | null => {
  try {
    const mentah = localStorage.getItem(KUNCI_AWALAN + id);
    if (!mentah) return null;
    const nilai: unknown = JSON.parse(mentah);
    if (!Array.isArray(nilai)) return null;
    const bersih = nilai.map(keLangkah).filter((l): l is Langkah => l !== null && l.teks !== '');
    return bersih.length ? bersih : null;
  } catch {
    return null;
  }
};

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

export default function ModeSiswa() {
  const { id = '' } = useParams<{ id: string }>();
  const wadahRef = useRef<HTMLDivElement>(null);

  const [materi, setMateri] = useState<Materi | null>(null);
  const [langkah, setLangkah] = useState<Langkah[]>([]);
  const [teksSumber, setTeksSumber] = useState('');
  const [teksBaru, setTeksBaru] = useState('');
  const [panelMateri, setPanelMateri] = useState(false);
  const [laju] = useState<Laju>(1);
  const [galat, setGalat] = useState('');
  const [siap, setSiap] = useState(false);
  const [sedangBicara, setSedangBicara] = useState(false);

  const dukungan = useDukunganSuara();
  const bisaBacakan = dukungan === 'ada';

  useEffect(() => {
    let hidup = true;
    (async () => {
      try {
        const semua = await daftarMateri();
        const m = semua.find((x) => x.id === id) ?? null;
        if (!hidup) return;
        setMateri(m);
        if (!m) return;
        const v = await daftarVarian(m.id);
        if (!hidup) return;
        const isi = v.find((x) => x.jenis === 'kalimat_pendek' && x.teks)?.teks ?? m.teks_sumber;
        setTeksSumber(isi);
        setLangkah(bacaTersimpan(m.id) ?? buatLangkah(isi));
      } catch (e) {
        if (hidup) setGalat(pesanGalat(e));
      } finally {
        if (hidup) setSiap(true);
      }
    })();
    return () => {
      hidup = false;
      window.speechSynthesis?.cancel();
    };
  }, [id]);

  useEffect(() => {
    if (!siap || !materi) return;
    try {
      localStorage.setItem(KUNCI_AWALAN + materi.id, JSON.stringify(langkah));
    } catch {
      //
    }
  }, [langkah, siap, materi]);

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
    { scope: wadahRef, dependencies: [siap] },
  );

  const teksBacaan = useMemo(() => langkah.map((l) => l.teks).join('. '), [langkah]);
  const jumlahSelesai = langkah.filter((l) => l.selesai).length;
  const persenSelesai = langkah.length > 0 ? Math.round((jumlahSelesai / langkah.length) * 100) : 0;

  const alihSelesai = (idLangkah: string) =>
    setLangkah((lama) =>
      lama.map((l) => (l.id === idLangkah ? { ...l, selesai: !l.selesai } : l)),
    );

  const tambahLangkah = (e: FormEvent) => {
    e.preventDefault();
    const isi = teksBaru.trim();
    if (!isi) return;
    setLangkah((lama) => [
      ...lama,
      { id: idBaru(), ikon: IKON[lama.length % IKON.length], teks: isi, selesai: false },
    ]);
    setTeksBaru('');
  };

  const hapusLangkah = (idLangkah: string) =>
    setLangkah((lama) => lama.filter((l) => l.id !== idLangkah));

  const aturUlang = () => setLangkah(buatLangkah(teksSumber));

  const ulangiDariAwal = () => setLangkah((lama) => lama.map((l) => ({ ...l, selesai: false })));

  const bacakan = () => {
    try {
      window.speechSynthesis?.cancel();
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

  return (
    <div ref={wadahRef} className="space-y-8 max-w-4xl mx-auto">
      {/* Header Mode Siswa */}
      <header className="anim-muncul border-b border-garis pb-6">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="font-mono text-xs uppercase tracking-wider">
            F11 · Jadwal Visual Siswa
          </Badge>
          <span className="text-xs text-tinta-lembut">Ramah Autisme & Tanpa Akun Anak</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-tinta sm:text-4xl">
              {materi ? materi.judul : 'Mode Siswa'}
            </h1>
            <p className="mt-2 text-base text-tinta-lembut leading-relaxed">
              Panduan belajar langkah-demi-langkah dengan tombol visual besar untuk digunakan bersama guru di kelas.
            </p>
          </div>

          {/* Bar Kemajuan Visual */}
          <div className="bg-kartu border border-garis p-4 rounded-sm shrink-0 min-w-[200px]">
            <div className="flex items-center justify-between text-xs font-mono mb-1.5">
              <span className="text-tinta-lembut">KEMAJUAN</span>
              <span className="font-bold text-tinta">{persenSelesai}%</span>
            </div>
            <div className="w-full bg-latar-lembut h-2 rounded-full overflow-hidden">
              <div
                className="bg-[var(--aksen)] h-full transition-all duration-300"
                style={{ width: `${persenSelesai}%` }}
              />
            </div>
            <span className="text-[11px] font-mono text-tinta-lembut block mt-1">
              {jumlahSelesai} dari {langkah.length} langkah selesai
            </span>
          </div>
        </div>

        {/* Toolbar Cepat */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs font-mono"
            onClick={() => setPanelMateri((p) => !p)}
          >
            <BookOpen className="w-3.5 h-3.5 mr-1" />
            {panelMateri ? 'Tutup Materi Bacaan' : 'Buka Materi Bacaan'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs font-mono"
            onClick={ulangiDariAwal}
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Ulangi Dari Awal
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs font-mono text-tinta-lembut"
            onClick={aturUlang}
          >
            Atur Ulang Langkah Bawaan
          </Button>
        </div>
      </header>

      {galat && (
        <div className="anim-muncul rounded-sm border border-galat bg-red-50/50 p-4 text-galat text-sm flex items-start gap-3" role="alert">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Terjadi Kendala</p>
            <p>{galat}</p>
          </div>
        </div>
      )}

      {/* Drawer Panel Materi Bacaan */}
      {panelMateri && (
        <section className="anim-muncul border border-garis bg-kartu rounded-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-garis pb-3">
            <h2 className="font-display text-lg font-bold text-tinta">Naskah Sumber</h2>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={bacakan}
                disabled={!bisaBacakan || langkah.length === 0 || sedangBicara}
                className="h-8 text-xs font-mono"
              >
                <Play className="w-3.5 h-3.5 mr-1" />
                {sedangBicara ? 'Membaca...' : 'Bacakan'}
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

          <div className="text-base text-tinta leading-relaxed space-y-3 font-sans">
            {bagiParagraf(teksSumber).map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>
        </section>
      )}

      {/* Daftar Langkah Visual Besar */}
      <section className="anim-muncul space-y-4">
        <h2 className="font-display text-xl font-bold text-tinta flex items-center gap-2">
          <ListTodo className="w-5 h-5 text-aksen" />
          <span>Langkah Tugas Hari Ini</span>
        </h2>

        {langkah.length === 0 ? (
          <div className="p-8 border border-garis bg-kartu rounded-sm text-center text-sm text-tinta-lembut">
            Belum ada langkah visual. Tambahkan langkah pertama di formulir bawah.
          </div>
        ) : (
          <div className="space-y-3">
            {langkah.map((l, i) => (
              <div
                key={l.id}
                className={`p-4 border rounded-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  l.selesai
                    ? 'border-emerald-300 bg-emerald-50/40 opacity-70'
                    : 'border-garis bg-kartu hover:border-garis-kuat shadow-xs'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Ikon Simbol Besar */}
                  <span className={`w-11 h-11 shrink-0 rounded-sm flex items-center justify-center font-bold text-lg select-none ${
                    l.selesai ? 'bg-emerald-600 text-white' : 'bg-latar-lembut text-tinta border border-garis'
                  }`}>
                    {l.ikon}
                  </span>

                  <div>
                    <span className="text-[11px] font-mono text-tinta-lembut block uppercase">
                      Langkah #{i + 1}
                    </span>
                    <p className={`text-base font-semibold leading-relaxed ${
                      l.selesai ? 'line-through text-emerald-900' : 'text-tinta'
                    }`}>
                      {l.teks}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Button
                    size="lg"
                    variant={l.selesai ? 'outline' : 'default'}
                    onClick={() => alihSelesai(l.id)}
                    className={`h-11 px-5 text-sm font-bold tracking-wide ${
                      l.selesai
                        ? 'border-emerald-400 text-emerald-800 hover:bg-emerald-100'
                        : 'bg-[var(--aksen)] hover:bg-[var(--aksen)]/90 text-white shadow-xs'
                    }`}
                  >
                    {l.selesai ? (
                      <>
                        <RotateCcw className="w-4 h-4 mr-1.5" />
                        Batal Selesai
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-1.5" />
                        Tandai Selesai
                      </>
                    )}
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => hapusLangkah(l.id)}
                    className="h-11 w-11 text-tinta-lembut hover:text-galat"
                    title={`Hapus langkah ${i + 1}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Formulir Tambah Langkah Cepat */}
      <section className="anim-muncul border border-garis bg-kartu rounded-sm p-6 space-y-4">
        <h3 className="font-display text-base font-bold text-tinta flex items-center gap-1.5">
          <Plus className="w-4 h-4 text-aksen" />
          <span>Tambah Satu Langkah Visual Baru</span>
        </h3>

        <form onSubmit={tambahLangkah} className="flex flex-col sm:flex-row gap-3">
          <Input
            id="langkah-baru"
            value={teksBaru}
            onChange={(e) => setTeksBaru(e.target.value)}
            placeholder="Contoh: Taruh tas di loker lalu duduk di kursi masing-masing..."
            className="text-sm h-11"
          />
          <Button type="submit" className="h-11 px-6 shrink-0">
            Tambah Langkah
          </Button>
        </form>
      </section>
    </div>
  );
}

