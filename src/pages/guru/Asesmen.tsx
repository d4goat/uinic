import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { catatanAsesmen, referensiHambatan, riwayatAsesmen, saranPpi, simpanAsesmen } from '../../lib/api';
import type { HambatanRef, PpiSaran, Tingkat } from '../../lib/types';

const GAGAL_BACA = 'catatan tidak dapat dibaca';
const TINGKAT: Tingkat[] = ['ringan', 'sedang', 'berat'];
const LABEL: Record<Tingkat, string> = { ringan: 'Ringan', sedang: 'Sedang', berat: 'Berat' };
const LENCANA: Record<Tingkat, string> = { ringan: 'lencana-lemah', sedang: 'lencana-sedang', berat: 'lencana-kuat' };

/** riwayatAsesmen() memilih kolomnya sendiri; `catatan_enc` ditandai opsional di sini
 *  supaya jalur dekripsi di bawah tetap benar begitu kolom itu ikut termuat. */
type BarisRiwayat = {
  id: string;
  tanggal: string;
  assessment_barriers: { tingkat: string; barriers: HambatanRef }[];
  catatan_enc?: string | null;
};

/** bytea dari PostgREST datang sebagai teks hex; rapikan dulu sebelum fn_dec(). */
async function bacaCatatan(enc: string | null | undefined): Promise<string | null> {
  const bersih = enc?.trim();
  if (!bersih) return null;
  const hex = bersih.startsWith('\\x') ? bersih : `\\x${bersih}`;
  try {
    return await catatanAsesmen(hex);
  } catch {
    return GAGAL_BACA;
  }
}

const tingkatDari = (nilai: string): Tingkat => (TINGKAT.includes(nilai as Tingkat) ? (nilai as Tingkat) : 'sedang');

function tanggalIndo(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
}

export default function Asesmen() {
  const { id: studentId } = useParams<{ id: string }>();

  const [hambatanRef, setHambatanRef] = useState<HambatanRef[]>([]);
  const [saran, setSaran] = useState<PpiSaran | null>(null);
  const [riwayat, setRiwayat] = useState<BarisRiwayat[]>([]);
  const [catatanRiwayat, setCatatanRiwayat] = useState<Record<string, string | null>>({});
  const [terpilih, setTerpilih] = useState<Record<string, Tingkat>>({});
  const [catatan, setCatatan] = useState('');
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState('');
  const [berhasil, setBerhasil] = useState('');
  const [menyimpan, setMenyimpan] = useState(false);

  const muat = useCallback(async () => {
    if (!studentId) return;
    setMemuat(true);
    setGalat('');
    try {
      const [ref, saranBaru, riw] = await Promise.all([
        referensiHambatan(),
        saranPpi(studentId).catch(() => null),
        riwayatAsesmen(studentId),
      ]);
      const baris = (riw as BarisRiwayat[]).slice().sort((a, b) => b.tanggal.localeCompare(a.tanggal));
      const idTerbaru = baris.length > 0 ? baris[0].id : null;

      setHambatanRef(ref);
      setSaran(saranBaru);
      setRiwayat(baris);

      // Catatan terenkripsi -> dekripsi satu per satu; satu gagal tidak menjatuhkan halaman.
      // Baris terbaru memakai catatan dari saranPpi (didekripsi server) bila enc tidak ada.
      const catatanBaru: Record<string, string | null> = {};
      for (const b of baris) {
        catatanBaru[b.id] =
          (await bacaCatatan(b.catatan_enc)) ?? (b.id === idTerbaru ? (saranBaru?.assessment?.catatan ?? null) : null);
      }
      setCatatanRiwayat(catatanBaru);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : 'Data asesmen gagal dimuat.');
    } finally {
      setMemuat(false);
    }
  }, [studentId]);

  useEffect(() => {
    void muat();
  }, [muat]);

  const alih = (barrierId: string, dicentang: boolean) =>
    setTerpilih((lama) => {
      const baru = { ...lama };
      if (dicentang) baru[barrierId] = lama[barrierId] ?? 'sedang';
      else delete baru[barrierId];
      return baru;
    });

  async function kirim(e: FormEvent) {
    e.preventDefault();
    if (!studentId) return;
    setGalat('');
    setBerhasil('');
    setMenyimpan(true);
    try {
      await simpanAsesmen(
        studentId,
        Object.entries(terpilih).map(([barrier_id, tingkat]) => ({ barrier_id, tingkat })),
        catatan,
      );
      setTerpilih({});
      setCatatan('');
      setBerhasil('Asesmen tersimpan.');
      await muat();
    } catch (err) {
      setGalat(err instanceof Error ? err.message : 'Asesmen gagal disimpan.');
    } finally {
      setMenyimpan(false);
    }
  }

  const kode = saran?.student.kode ?? null;
  const jumlahTerpilih = Object.keys(terpilih).length;

  if (!studentId) {
    return (
      <p className="pesan pesan-galat" role="alert">
        Alamat halaman tidak memuat identitas siswa. Buka asesmen dari halaman Data siswa.
      </p>
    );
  }

  return (
    <>
      <h1>Asesmen hambatan{kode ? ` — siswa ${kode}` : ''}</h1>
      <p className="lede">
        Tandai hambatan belajar yang tampak di kelas, pilih tingkatnya, lalu tulis pengamatan Anda. Hasil
        ini menjadi dasar saran akomodasi di draf PPI.
      </p>

      {galat && (
        <p className="pesan pesan-galat" role="alert">
          {galat}
        </p>
      )}
      {berhasil && (
        <div className="pesan pesan-berhasil" role="status">
          <p style={{ margin: 0 }}>{berhasil}</p>
          <p style={{ margin: '0.35rem 0 0' }}>
            <Link to={`/siswa/${studentId}/ppi`}>Lanjut ke draf PPI</Link>
          </p>
        </div>
      )}

      {memuat ? (
        <p>Memuat daftar hambatan...</p>
      ) : (
        <form className="kartu" onSubmit={(e) => void kirim(e)}>
          <h2 style={{ marginTop: 0 }}>Hambatan yang teramati</h2>
          <p className="hint">
            {jumlahTerpilih} hambatan dipilih. Keterangan tiap tingkat ditulis, tidak hanya dibedakan warna.
          </p>

          {hambatanRef.map((h) => {
            const dicentang = h.id in terpilih;
            return (
              <div key={h.id} style={{ borderTop: '1px solid var(--garis)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
                <label className="pilihan" htmlFor={`hambatan-${h.id}`}>
                  <input
                    id={`hambatan-${h.id}`}
                    type="checkbox"
                    checked={dicentang}
                    onChange={(e) => alih(h.id, e.target.checked)}
                  />
                  <span className="pilihan-teks">
                    <strong>{h.nama}</strong>
                    <span className="hint" style={{ margin: 0 }}>
                      {h.deskripsi ?? 'Tanpa deskripsi tambahan.'}
                    </span>
                  </span>
                </label>

                <div className="baris" style={{ marginTop: '0.5rem' }}>
                  <label htmlFor={`tingkat-${h.id}`} style={{ margin: 0 }}>
                    Tingkat untuk {h.nama}
                  </label>
                  <select
                    id={`tingkat-${h.id}`}
                    style={{ maxWidth: '10rem' }}
                    disabled={!dicentang}
                    value={terpilih[h.id] ?? 'sedang'}
                    onChange={(e) => setTerpilih((lama) => ({ ...lama, [h.id]: tingkatDari(e.target.value) }))}
                  >
                    {TINGKAT.map((t) => (
                      <option key={t} value={t}>
                        {LABEL[t]}
                      </option>
                    ))}
                  </select>
                  <span className="hint" style={{ margin: 0 }}>
                    {dicentang
                      ? `Tercatat: ${LABEL[terpilih[h.id] ?? 'sedang']}.`
                      : 'Nonaktif sampai kotak hambatan dicentang.'}
                  </span>
                </div>
              </div>
            );
          })}

          <h2>Catatan pengamatan</h2>
          <label htmlFor="catatan-pengamatan">Catatan guru</label>
          <p className="hint" id="catatan-pengamatan-hint">
            Catatan ini disimpan terenkripsi dan hanya dibaca staf yang berhak atas siswa ini.
          </p>
          <textarea
            id="catatan-pengamatan"
            value={catatan}
            aria-describedby="catatan-pengamatan-hint"
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Contoh: kesulitan menyalin papan tulis saat jarak duduk di belakang."
          />

          <div className="baris" style={{ marginTop: '0.75rem' }}>
            <button type="submit" disabled={menyimpan}>
              {menyimpan ? 'Menyimpan...' : 'Simpan asesmen'}
            </button>
            <span className="hint" style={{ margin: 0 }}>
              Menyimpan akan membuat satu catatan asesmen baru, bukan menimpa yang lama.
            </span>
          </div>
        </form>
      )}

      <h2>Riwayat asesmen</h2>
      {riwayat.length === 0 ? (
        <p className="pesan pesan-peringatan">
          Belum ada asesmen untuk siswa ini. Asesmen pertama bisa diisi lewat formulir di atas.
        </p>
      ) : (
        <ol style={{ paddingLeft: '1.25rem' }}>
          {riwayat.map((b, urutan) => (
            <li key={b.id} className="kartu">
              <p className="renggang" style={{ margin: 0 }}>
                <strong>{tanggalIndo(b.tanggal)}</strong>{' '}
                {urutan === 0 && <span className="lencana">Terbaru</span>}
              </p>
              {b.assessment_barriers.length === 0 ? (
                <p className="hint">Tanpa hambatan yang ditandai pada asesmen ini.</p>
              ) : (
                <ul style={{ paddingLeft: '1.1rem', margin: '0.4rem 0' }}>
                  {b.assessment_barriers.map((ab) => {
                    const t = tingkatDari(ab.tingkat);
                    return (
                      <li key={ab.barriers.id}>
                        {ab.barriers.nama} — <span className={`lencana ${LENCANA[t]}`}>Tingkat {LABEL[t]}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p style={{ margin: 0 }}>
                <span className="hint">Catatan: </span>
                {catatanRiwayat[b.id] ?? 'tidak ada catatan tersimpan'}
              </p>
            </li>
          ))}
        </ol>
      )}

      <p className="pesan pesan-peringatan">
        Hasil asesmen ini catatan guru tentang hambatan yang teramati, bukan diagnosis. Saran akomodasi di
        halaman PPI berasal dari tabel aturan yang terbuka dan boleh ditolak atau diubah sesuai kondisi
        siswa.
      </p>
    </>
  );
}
