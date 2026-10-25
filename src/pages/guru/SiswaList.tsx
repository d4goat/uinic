import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { catatAkses, daftarSiswa, hapusSiswa, tambahSiswa } from '../../lib/api';
import type { Siswa } from '../../lib/types';
import { useAuth } from '../../auth/AuthContext';

/** F2 — data siswa pseudonim. Cermin constraint `students` di supabase/schema.sql;
 *  DB tetap memvalidasi ulang, ini hanya supaya galat muncul dekat kolomnya. */
const KODE = /^[A-Z0-9-]{3,12}$/;
const INISIAL = /^[A-Z]{1,3}$/;
const TAHUN_MIN = 1990;
const TAHUN_INI = new Date().getFullYear();

type Isian = { kode: string; inisial: string; tahun_lahir: string; kelas: string };
type GalatIsian = Partial<Record<keyof Isian, string>>;

const ISIAN_KOSONG: Isian = { kode: '', inisial: '', tahun_lahir: '', kelas: '' };

function periksa(f: Isian): GalatIsian {
  const g: GalatIsian = {};
  if (!KODE.test(f.kode)) g.kode = '3-12 karakter, hanya huruf kapital, angka, dan tanda hubung. Contoh: S-001.';
  if (!INISIAL.test(f.inisial)) g.inisial = '1-3 huruf kapital. Contoh: ARS.';
  const tahun = Number(f.tahun_lahir);
  if (!/^\d{4}$/.test(f.tahun_lahir) || tahun < TAHUN_MIN || tahun > TAHUN_INI) {
    g.tahun_lahir = `Empat angka antara ${TAHUN_MIN} dan ${TAHUN_INI}.`;
  }
  if (!f.kelas.trim()) g.kelas = 'Kelas wajib diisi. Contoh: 7A.';
  return g;
}

export default function SiswaList() {
  const { profil } = useAuth();
  const bolehHapus = profil?.role === 'koordinator' || profil?.role === 'admin';

  const [daftar, setDaftar] = useState<Siswa[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [cari, setCari] = useState('');
  const [isian, setIsian] = useState<Isian>(ISIAN_KOSONG);
  const [galatIsian, setGalatIsian] = useState<GalatIsian>({});
  const [galat, setGalat] = useState('');
  const [berhasil, setBerhasil] = useState('');
  const [sedangKirim, setSedangKirim] = useState(false);

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat('');
    try {
      setDaftar(await daftarSiswa());
    } catch (e) {
      setGalat(e instanceof Error ? e.message : 'Daftar siswa gagal dimuat.');
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    void muat();
  }, [muat]);

  // Filter di sisi klien: satu sekolah cuma beberapa kelas, jadi tidak perlu bolak-balik server.
  const hasil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    if (!q) return daftar;
    return daftar.filter(
      (s) =>
        s.kode.toLowerCase().includes(q) ||
        s.inisial.toLowerCase().includes(q) ||
        s.kelas.toLowerCase().includes(q),
    );
  }, [daftar, cari]);

  const ubah = (kunci: keyof Isian, nilai: string) => setIsian((lama) => ({ ...lama, [kunci]: nilai }));

  async function kirim(e: FormEvent) {
    e.preventDefault();
    const g = periksa(isian);
    setGalatIsian(g);
    setGalat('');
    setBerhasil('');
    if (Object.keys(g).length > 0) return;

    setSedangKirim(true);
    try {
      const kode = isian.kode;
      await tambahSiswa({
        kode,
        inisial: isian.inisial,
        tahun_lahir: Number(isian.tahun_lahir),
        kelas: isian.kelas.trim(),
      });
      setIsian(ISIAN_KOSONG);
      setBerhasil(`Siswa ${kode} tersimpan.`);
      await muat();
    } catch (err) {
      setGalat(err instanceof Error ? err.message : 'Siswa gagal disimpan.');
    } finally {
      setSedangKirim(false);
    }
  }

  async function hapus(s: Siswa) {
    const setuju = window.confirm(
      `Hapus data siswa ${s.kode}? Asesmen, draf PPI, dan catatan sesinya dihapus permanen dan tidak bisa dikembalikan.`,
    );
    if (!setuju) return;
    setGalat('');
    setBerhasil('');
    try {
      await hapusSiswa(s.id);
      setBerhasil(`Data siswa ${s.kode} dihapus permanen.`);
      await muat();
    } catch (err) {
      setGalat(err instanceof Error ? err.message : 'Data siswa gagal dihapus.');
    }
  }

  // Audit pembacaan: sengaja tidak di-await supaya navigasi tidak pernah menunggu.
  const catatBuka = (id: string) => {
    void catatAkses('students', id, { aksi: 'buka' }).catch(() => undefined);
  };

  return (
    <>
      <h1>Data siswa</h1>
      <p className="lede">
        Daftar siswa sekolah Anda memakai kode dan inisial, tanpa nama lengkap dan tanpa NIK. Satu orang
        hanya dikenali lewat kode pseudonim.
      </p>

      {galat && (
        <p className="pesan pesan-galat" role="alert">
          {galat}
        </p>
      )}
      {berhasil && (
        <p className="pesan pesan-berhasil" role="status">
          {berhasil}
        </p>
      )}

      <h2>Cari siswa</h2>
      <div className="kartu">
        <label htmlFor="cari-siswa">Kata kunci</label>
        <p className="hint" id="cari-siswa-hint">
          Cocokkan kode, inisial, atau kelas. Pencarian tidak membedakan huruf besar/kecil.
        </p>
        <input
          id="cari-siswa"
          type="search"
          value={cari}
          aria-describedby="cari-siswa-hint"
          onChange={(e) => setCari(e.target.value)}
        />
        <p className="hint" style={{ marginTop: '0.5rem' }} role="status">
          Menampilkan {hasil.length} dari {daftar.length} siswa{cari.trim() ? ` untuk pencarian "${cari.trim()}".` : '.'}
        </p>
      </div>

      {memuat ? (
        <p>Memuat daftar siswa...</p>
      ) : daftar.length === 0 ? (
        <p className="pesan pesan-peringatan">
          Belum ada siswa di sekolah ini. Tambahkan siswa pertama lewat formulir di bawah memakai kode
          pseudonim, bukan nama asli.
        </p>
      ) : hasil.length === 0 ? (
        <p className="pesan pesan-peringatan">
          Tidak ada siswa yang cocok dengan kata kunci "{cari.trim()}". Hapus kata kunci untuk melihat
          semua siswa.
        </p>
      ) : (
        <div className="bisa-digulir">
          <table>
            <caption>Daftar siswa sekolah Anda beserta tautan tindak lanjut</caption>
            <thead>
              <tr>
                <th scope="col">Kode</th>
                <th scope="col">Inisial</th>
                <th scope="col">Kelas</th>
                <th scope="col">Tahun lahir</th>
                <th scope="col">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {hasil.map((s) => (
                <tr key={s.id}>
                  <td>{s.kode}</td>
                  <td>{s.inisial}</td>
                  <td>{s.kelas}</td>
                  <td>{s.tahun_lahir}</td>
                  <td>
                    <div className="baris">
                      <Link
                        className="tombol tombol-sekunder tombol-kecil"
                        to={`/siswa/${s.id}/asesmen`}
                        onClick={() => catatBuka(s.id)}
                      >
                        Isi asesmen
                      </Link>
                      <Link
                        className="tombol tombol-sekunder tombol-kecil"
                        to={`/siswa/${s.id}/ppi`}
                        onClick={() => catatBuka(s.id)}
                      >
                        Draf PPI
                      </Link>
                      {bolehHapus && (
                        <button type="button" className="tombol-bahaya tombol-kecil" onClick={() => void hapus(s)}>
                          Hapus data siswa {s.kode}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Tambah siswa</h2>
      <form className="kartu" onSubmit={(e) => void kirim(e)} noValidate>
        <div className="baris" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: '1 1 12rem' }}>
            <label htmlFor="kode-siswa">Kode siswa</label>
            <p className="hint" id="kode-siswa-hint">
              Pseudonim, 3-12 karakter: huruf kapital, angka, tanda hubung.
            </p>
            <input
              id="kode-siswa"
              value={isian.kode}
              aria-describedby="kode-siswa-hint"
              aria-invalid={galatIsian.kode ? true : undefined}
              onChange={(e) => ubah('kode', e.target.value.toUpperCase())}
            />
            {galatIsian.kode && (
              <p className="pesan pesan-galat" role="alert">
                {galatIsian.kode}
              </p>
            )}
          </div>

          <div style={{ flex: '1 1 8rem' }}>
            <label htmlFor="inisial-siswa">Inisial</label>
            <p className="hint" id="inisial-siswa-hint">
              1-3 huruf kapital.
            </p>
            <input
              id="inisial-siswa"
              value={isian.inisial}
              aria-describedby="inisial-siswa-hint"
              aria-invalid={galatIsian.inisial ? true : undefined}
              onChange={(e) => ubah('inisial', e.target.value.toUpperCase())}
            />
            {galatIsian.inisial && (
              <p className="pesan pesan-galat" role="alert">
                {galatIsian.inisial}
              </p>
            )}
          </div>

          <div style={{ flex: '1 1 8rem' }}>
            <label htmlFor="tahun-siswa">Tahun lahir</label>
            <p className="hint" id="tahun-siswa-hint">
              {TAHUN_MIN}&ndash;{TAHUN_INI}.
            </p>
            <input
              id="tahun-siswa"
              inputMode="numeric"
              value={isian.tahun_lahir}
              aria-describedby="tahun-siswa-hint"
              aria-invalid={galatIsian.tahun_lahir ? true : undefined}
              onChange={(e) => ubah('tahun_lahir', e.target.value.replace(/\D/g, '').slice(0, 4))}
            />
            {galatIsian.tahun_lahir && (
              <p className="pesan pesan-galat" role="alert">
                {galatIsian.tahun_lahir}
              </p>
            )}
          </div>

          <div style={{ flex: '1 1 6rem' }}>
            <label htmlFor="kelas-siswa">Kelas</label>
            <input
              id="kelas-siswa"
              value={isian.kelas}
              aria-invalid={galatIsian.kelas ? true : undefined}
              onChange={(e) => ubah('kelas', e.target.value)}
            />
            {galatIsian.kelas && (
              <p className="pesan pesan-galat" role="alert">
                {galatIsian.kelas}
              </p>
            )}
          </div>
        </div>

        <div className="baris" style={{ marginTop: '0.75rem' }}>
          <button type="submit" disabled={sedangKirim}>
            {sedangKirim ? 'Menyimpan...' : 'Simpan siswa'}
          </button>
          <span className="hint" style={{ margin: 0 }}>
            Data siswa hanya boleh berisi pseudonim. Jangan tulis nama lengkap.
          </span>
        </div>
      </form>
    </>
  );
}
