import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { catatAkses, daftarMateri, daftarVarian, simpanMateri } from '../lib/api';
import type { Materi, VarianMateri } from '../lib/types';
import { useAuth } from '../auth/AuthContext';

/*
 * F10 — Materi aksesibel (kesulitan membaca; PRD §S7–S8).
 * Mode tampilan ditulis ke <html data-mode="..."> supaya seluruh dokumen ikut berubah,
 * dan disimpan di localStorage supaya pilihan guru tidak hilang saat halaman dibuka lagi.
 * Pemecahan kalimat dan suara dikerjakan peramban; tidak ada layanan tambahan.
 */

const KUNCI_MODE = 'ppi-link:mode-tampilan';
const PESAN_TANPA_SUARA =
  'Peramban ini belum menyediakan suara Bahasa Indonesia; gunakan mode teks besar dan kalimat pendek.';
const GAYA_BESAR = { padding: '0.9rem 1.1rem', fontSize: '1.05rem' } as const;

type Mode = '' | 'teks-besar' | 'kontras-tinggi';
type Laju = 0.7 | 1 | 1.3;
type DukunganSuara = 'memeriksa' | 'ada' | 'tidak';

const pesanGalat = (e: unknown) => (e instanceof Error ? e.message : 'Terjadi galat tak terduga.');

const bagiParagraf = (teks: string): string[] =>
  teks.split(/\n+/).map((s) => s.trim()).filter(Boolean);

/** Aturan sederhana: titik diikuti spasi, lalu ", dan" dan " yang ". */
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

// ponytail: hook disalin di ModeSiswa; jadikan src/hooks bila muncul pemakai ketiga.
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
    // Daftar suara di banyak peramban baru terisi setelah event voiceschanged.
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

  const [judul, setJudul] = useState('');
  const [teks, setTeks] = useState('');
  const [menyimpan, setMenyimpan] = useState(false);

  const dukungan = useDukunganSuara();
  const bisaBacakan = dukungan === 'ada';

  useEffect(() => {
    let hidup = true;
    (async () => {
      try {
        const rows = await daftarMateri();
        if (hidup) setMateri(rows);
      } catch (e) {
        if (hidup) setGalat(pesanGalat(e));
      } finally {
        if (hidup) setMemuat(false);
      }
    })();
    return () => {
      hidup = false;
    };
  }, []);

  useEffect(() => {
    if (mode) document.documentElement.dataset.mode = mode;
    else delete document.documentElement.dataset.mode;
    try {
      localStorage.setItem(KUNCI_MODE, mode);
    } catch {
      /* localStorage bisa diblokir: mode tetap berlaku untuk sesi ini. */
    }
  }, [mode]);

  useEffect(
    () => () => {
      delete document.documentElement.dataset.mode;
      window.speechSynthesis?.cancel();
    },
    [],
  );

  const paragraf = useMemo(() => bagiParagraf(terpilih?.teks_sumber ?? ''), [terpilih]);
  const kalimat = useMemo(() => paragraf.flatMap(pecahKalimat), [paragraf]);
  const teksBacaan = useMemo(
    () => (pendek ? kalimat.join('. ') : paragraf.join('. ')),
    [pendek, kalimat, paragraf],
  );

  const bukaMateri = async (m: Materi) => {
    setTerpilih(m);
    setVarian([]);
    setGalat('');
    setPesan('');
    try {
      setVarian(await daftarVarian(m.id));
      await catatAkses('materials', m.id, { aksi: 'buka' });
    } catch (e) {
      setGalat(pesanGalat(e));
    }
  };

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
    } catch (err) {
      setGalat(pesanGalat(err));
    } finally {
      setMenyimpan(false);
    }
  };

  return (
    <div className="wadah wadah-lebar">
      <h1>Materi aksesibel</h1>
      <p className="lede">
        Sajikan bacaan yang sama dalam bentuk yang lebih mudah dibaca: teks besar, kontras tinggi,
        kalimat pendek, atau dibacakan. Pilihan mode tampilan berlaku untuk seluruh halaman ini dan
        disimpan di peramban.
      </p>

      {galat && (
        <p className="pesan pesan-galat" role="alert">
          {galat}
        </p>
      )}
      {pesan && (
        <p className="pesan pesan-berhasil" role="status">
          {pesan}
        </p>
      )}

      <div className="baris" style={{ alignItems: 'flex-start' }}>
        <section
          className="kartu"
          style={{ flex: '0 1 18rem', minWidth: '14rem' }}
          aria-labelledby="judul-daftar"
        >
          <h2 id="judul-daftar" style={{ marginTop: 0 }}>
            Daftar materi
          </h2>
          {memuat && <p>Memuat...</p>}
          {!memuat && materi.length === 0 && <p className="hint">Belum ada materi tersimpan.</p>}
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {materi.map((m) => (
              <li key={m.id} style={{ marginBottom: '0.4rem' }}>
                <button
                  type="button"
                  aria-pressed={terpilih?.id === m.id}
                  className={terpilih?.id === m.id ? 'tombol' : 'tombol-sekunder'}
                  style={{ width: '100%', textAlign: 'left' }}
                  onClick={() => void bukaMateri(m)}
                >
                  {m.judul}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="kartu" style={{ flex: '1 1 24rem' }} aria-labelledby="judul-pembaca">
          <h2 id="judul-pembaca" style={{ marginTop: 0 }}>
            Pembaca materi
          </h2>

          <div className="baris" role="group" aria-label="Mode tampilan halaman">
            <button
              type="button"
              className={mode === '' ? 'tombol' : 'tombol-sekunder'}
              aria-pressed={mode === ''}
              onClick={() => setMode('')}
            >
              Normal
            </button>
            <button
              type="button"
              className={mode === 'teks-besar' ? 'tombol' : 'tombol-sekunder'}
              aria-pressed={mode === 'teks-besar'}
              onClick={() => setMode('teks-besar')}
            >
              Teks besar
            </button>
            <button
              type="button"
              className={mode === 'kontras-tinggi' ? 'tombol' : 'tombol-sekunder'}
              aria-pressed={mode === 'kontras-tinggi'}
              onClick={() => setMode('kontras-tinggi')}
            >
              Kontras tinggi
            </button>
          </div>
          <p className="hint">
            Mode dipasang di akar dokumen (atribut data-mode), jadi seluruh halaman ikut
            menyesuaikan, bukan hanya kotak bacaan.
          </p>

          <div className="baris">
            <label htmlFor="laju-suara" style={{ margin: 0 }}>
              Laju bacaan
            </label>
            <select
              id="laju-suara"
              value={laju}
              onChange={(e) => setLaju(Number(e.target.value) as Laju)}
              style={{ maxWidth: '10rem' }}
            >
              <option value={0.7}>Lambat (0,7x)</option>
              <option value={1}>Sedang (1x)</option>
              <option value={1.3}>Cepat (1,3x)</option>
            </select>
            <button type="button" onClick={bacakan} disabled={!bisaBacakan || !terpilih}>
              Bacakan
            </button>
            <button
              type="button"
              className="tombol-sekunder"
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

          <div className="baris">
            <button
              type="button"
              aria-pressed={pendek}
              className={pendek ? 'tombol' : 'tombol-sekunder'}
              onClick={() => setPendek((lama) => !lama)}
            >
              Mode kalimat pendek
            </button>
            <span className="lencana">Dibuat di peramban dari teks asli</span>
          </div>
          <p className="hint">
            Pemecahan kalimat dilakukan di sisi peramban dari teks asli materi: satu kalimat pendek
            per butir, sehingga pembaca tidak menghadapi kalimat panjang.
          </p>

          {!terpilih && <p className="hint">Pilih satu materi di panel kiri untuk mulai membaca.</p>}

          {terpilih && (
            <>
              <h3>{terpilih.judul}</h3>
              {pendek ? (
                <>
                  <p className="hint">Kalimat pendek:</p>
                  <ul className="materi-teks pecah-kalimat">
                    {kalimat.map((k, i) => (
                      <li key={i}>{k}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="materi-teks">
                  {paragraf.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              )}

              <h3>Varian tersimpan</h3>
              {varian.length === 0 ? (
                <p className="hint">Belum ada varian tersimpan untuk materi ini.</p>
              ) : (
                <ul>
                  {varian.map((v) => (
                    <li key={v.id}>
                      <span className="lencana">{v.jenis.replace('_', ' ')}</span>{' '}
                      {v.teks
                        ? v.teks.slice(0, 120) + (v.teks.length > 120 ? '...' : '')
                        : 'belum diisi'}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      </div>

      {profil ? (
        <section className="kartu" aria-labelledby="judul-bahan">
          <h2 id="judul-bahan" style={{ marginTop: 0 }}>
            Bahan baru
          </h2>
          <p className="hint">
            Simpan satu teks; varian teks besar dan kalimat pendek dibuat sekaligus.
          </p>
          <form onSubmit={(e) => void simpanBahan(e)}>
            <label htmlFor="judul-bahan-baru">Judul</label>
            <input
              id="judul-bahan-baru"
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              required
            />

            <label htmlFor="teks-bahan-baru">Teks sumber</label>
            <textarea
              id="teks-bahan-baru"
              value={teks}
              onChange={(e) => setTeks(e.target.value)}
              required
            />

            <button type="submit" style={GAYA_BESAR} disabled={menyimpan}>
              {menyimpan ? 'Menyimpan...' : 'Simpan materi'}
            </button>
          </form>
        </section>
      ) : (
        <p className="hint">Masuk sebagai guru atau GPK untuk menambah bahan baru.</p>
      )}
    </div>
  );
}
