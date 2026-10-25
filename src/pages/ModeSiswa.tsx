import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { daftarMateri, daftarVarian } from '../lib/api';
import type { Materi, VarianMateri } from '../lib/types';

/*
 * F11 — Mode siswa (autisme; PRD §S8): jadwal visual berikon, satu langkah per baris,
 * tombol besar. Dibuka guru yang sudah login di perangkat kelas; anak tidak perlu akun
 * dan tidak perlu mengetik apa pun. Daftar langkah hanya tersimpan di peramban perangkat.
 */

const IKON = ['▶', '★', '●', '◆', '■', '▲', '✔', '♫'];
const KUNCI_AWALAN = 'ppi-link:mode-siswa:';
const PESAN_TANPA_SUARA =
  'Peramban ini belum menyediakan suara Bahasa Indonesia; gunakan mode teks besar dan kalimat pendek.';
const GAYA_BESAR = { padding: '0.9rem 1.1rem', fontSize: '1.05rem' } as const;

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

/** Satu kalimat = satu langkah. */
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

// ponytail: hook disalin dari MateriAksesibel; jadikan src/hooks bila muncul pemakai ketiga.
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

  const [materi, setMateri] = useState<Materi | null>(null);
  const [varian, setVarian] = useState<VarianMateri[]>([]);
  const [langkah, setLangkah] = useState<Langkah[]>([]);
  const [teksSumber, setTeksSumber] = useState('');
  const [teksBaru, setTeksBaru] = useState('');
  const [panelMateri, setPanelMateri] = useState(false);
  const [laju, setLaju] = useState<Laju>(1);
  const [galat, setGalat] = useState('');
  const [siap, setSiap] = useState(false);

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
        setVarian(v);
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

  // Simpan di peramban supaya centang tidak hilang saat halaman dimuat ulang.
  useEffect(() => {
    if (!siap || !materi) return;
    try {
      localStorage.setItem(KUNCI_AWALAN + materi.id, JSON.stringify(langkah));
    } catch {
      /* localStorage bisa diblokir: daftar tetap jalan untuk sesi ini. */
    }
  }, [langkah, siap, materi]);

  const teksBacaan = useMemo(() => langkah.map((l) => l.teks).join('. '), [langkah]);
  const jumlahSelesai = langkah.filter((l) => l.selesai).length;

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
      const u = new SpeechSynthesisUtterance(teksBacaan);
      u.lang = 'id-ID';
      u.rate = laju;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) {
      setGalat(pesanGalat(e));
    }
  };

  return (
    <div className="wadah">
      <h1>Mode siswa</h1>
      <p className="lede">
        Jadwal visual untuk dikerjakan bersama di perangkat kelas: satu langkah per baris, ikon
        besar, dan tombol besar untuk menandai selesai.
      </p>
      <p className="hint">
        Tidak diperlukan akun anak. Tidak ada nama atau data siswa yang diminta, dikirim, atau
        disimpan di layar ini; daftar langkah hanya tersimpan di peramban perangkat kelas.
      </p>

      {galat && (
        <p className="pesan pesan-galat" role="alert">
          {galat}
        </p>
      )}
      {siap && !materi && <p className="pesan pesan-peringatan">Materi tidak ditemukan.</p>}

      {materi && (
        <>
          <h2 style={{ marginTop: '0.5rem' }}>{materi.judul}</h2>

          <div className="baris">
            <button
              type="button"
              style={GAYA_BESAR}
              aria-expanded={panelMateri}
              aria-controls="panel-materi"
              onClick={() => setPanelMateri((lama) => !lama)}
            >
              {panelMateri ? 'Tutup materi' : 'Materi'}
            </button>
            <button type="button" style={GAYA_BESAR} onClick={ulangiDariAwal}>
              Ulangi dari awal
            </button>
            <button
              type="button"
              className="tombol-sekunder"
              style={GAYA_BESAR}
              onClick={aturUlang}
            >
              Atur ulang langkah
            </button>
            <span className="lencana">
              {jumlahSelesai} dari {langkah.length} langkah selesai
            </span>
          </div>

          {panelMateri && (
            <section id="panel-materi" className="kartu" aria-labelledby="judul-bacaan">
              <h3 id="judul-bacaan" style={{ marginTop: 0 }}>
                Bacaan materi
              </h3>
              <div className="baris">
                <label htmlFor="laju-suara-siswa" style={{ margin: 0 }}>
                  Laju bacaan
                </label>
                <select
                  id="laju-suara-siswa"
                  value={laju}
                  onChange={(e) => setLaju(Number(e.target.value) as Laju)}
                  style={{ maxWidth: '10rem' }}
                >
                  <option value={0.7}>Lambat (0,7x)</option>
                  <option value={1}>Sedang (1x)</option>
                  <option value={1.3}>Cepat (1,3x)</option>
                </select>
                <button
                  type="button"
                  style={GAYA_BESAR}
                  onClick={bacakan}
                  disabled={!bisaBacakan || langkah.length === 0}
                >
                  Bacakan
                </button>
                <button
                  type="button"
                  className="tombol-sekunder"
                  style={GAYA_BESAR}
                  onClick={() => window.speechSynthesis.cancel()}
                  disabled={!bisaBacakan}
                >
                  Berhenti
                </button>
              </div>
              {dukungan === 'tidak' && (
                <p className="pesan pesan-peringatan" role="status">
                  {PESAN_TANPA_SUARA}
                </p>
              )}
              {dukungan === 'memeriksa' && (
                <p className="hint">Memeriksa ketersediaan suara peramban...</p>
              )}
              <div className="materi-teks" style={{ fontSize: '1.35rem' }}>
                {bagiParagraf(teksSumber).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              {varian.length > 0 && (
                <p className="hint">
                  Tersedia {varian.length} varian aksesibel tersimpan untuk materi ini.
                </p>
              )}
            </section>
          )}

          <h2>Jadwal hari ini</h2>
          {langkah.length === 0 ? (
            <p className="hint">Belum ada langkah. Tambahkan satu langkah di bawah.</p>
          ) : (
            <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {langkah.map((l, i) => (
                <li key={l.id} className="langkah" data-selesai={l.selesai}>
                  <span className="langkah-ikon" aria-hidden="true">
                    {l.ikon}
                  </span>
                  <span className="langkah-nomor">Langkah {i + 1}</span>
                  <span className="pilihan-teks" style={{ flex: 1 }}>
                    {l.teks}
                  </span>
                  <span className="lencana">{l.selesai ? 'selesai' : 'belum'}</span>
                  <button
                    type="button"
                    style={GAYA_BESAR}
                    aria-pressed={l.selesai}
                    aria-label={`Langkah ${i + 1}: tandai ${l.selesai ? 'belum selesai' : 'selesai'}`}
                    onClick={() => alihSelesai(l.id)}
                  >
                    {l.selesai ? 'Batalkan selesai' : 'Selesai'}
                  </button>
                  <button
                    type="button"
                    className="tombol-sekunder tombol-kecil"
                    aria-label={`Hapus langkah ${i + 1}`}
                    onClick={() => hapusLangkah(l.id)}
                  >
                    Hapus
                  </button>
                </li>
              ))}
            </ol>
          )}

          <form className="kartu" onSubmit={tambahLangkah}>
            <label htmlFor="langkah-baru">Tambah satu langkah untuk siswa</label>
            <input
              id="langkah-baru"
              value={teksBaru}
              onChange={(e) => setTeksBaru(e.target.value)}
              placeholder="Contoh: taruh tas di loker"
            />
            <div className="baris">
              <button type="submit" style={GAYA_BESAR}>
                Tambah langkah
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
