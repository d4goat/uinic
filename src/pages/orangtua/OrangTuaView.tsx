import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { catatAkses, ringkasanWali, simpanConsent, siswaWali } from '../../lib/api';
import type { RingkasanWali } from '../../lib/api';
import type { ConsentStatus, Siswa } from '../../lib/types';

/** [F7] Tampilan orang tua: baca-saja, tanpa catatan asesmen, hanya anak tertaut. */

const TEKS_CAPAIAN: Record<string, string> = {
  belum: 'Belum tercapai',
  sebagian: 'Sebagian tercapai',
  tercapai: 'Tercapai',
};

const TEKS_STATUS: Record<ConsentStatus, string> = {
  menunggu: 'Menunggu',
  disetujui: 'Disetujui',
  ditolak: 'Ditolak',
  dicabut: 'Dicabut',
};

const teksGalat = (e: unknown) => (e instanceof Error ? e.message : 'Terjadi kesalahan.');

const tanggal = (v: string | null) => {
  if (!v) return 'Tanpa batas waktu';
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? 'Tanpa batas waktu'
    : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

export default function OrangTuaView() {
  const { id } = useParams<{ id: string }>();
  const [anak, setAnak] = useState<Siswa[]>([]);
  const [dipilih, setDipilih] = useState(id ?? '');
  const [ringkasan, setRingkasan] = useState<RingkasanWali | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState('');
  const [pesan, setPesan] = useState('');

  // Daftar anak yang tertaut ke akun ini. Rute /orangtua/:id dipakai apa adanya
  // supaya tautan langsung tetap bekerja walau daftarnya gagal dimuat.
  useEffect(() => {
    let hidup = true;
    (async () => {
      try {
        const daftar = await siswaWali();
        if (!hidup) return;
        setAnak(daftar);
        setDipilih((p) => p || daftar[0]?.id || '');
      } catch (e) {
        if (hidup) setGalat(teksGalat(e));
      } finally {
        if (hidup) setMemuat(false);
      }
    })();
    return () => {
      hidup = false;
    };
  }, []);

  useEffect(() => {
    if (!dipilih) {
      setRingkasan(null);
      setMemuat(false);
      return;
    }
    let hidup = true;
    setMemuat(true);
    setGalat('');
    setPesan('');
    (async () => {
      try {
        const r = await ringkasanWali(dipilih);
        if (!hidup) return;
        setRingkasan(r);
        // [F12] RPC tidak terjangkau trigger audit; klien mencatat pembacaannya.
        void catatAkses('wali_ringkasan', dipilih, { aksi: 'buka' }).catch(() => {});
      } catch (e) {
        if (hidup) {
          setRingkasan(null);
          setGalat(teksGalat(e));
        }
      } finally {
        if (hidup) setMemuat(false);
      }
    })();
    return () => {
      hidup = false;
    };
  }, [dipilih]);

  async function ubahPersetujuan(status: 'disetujui' | 'dicabut') {
    if (!dipilih) return;
    if (
      status === 'dicabut' &&
      !window.confirm(
        'Tarik persetujuan berbagi rekam? Sekolah lain tidak lagi bisa meminta rekam anak Anda.',
      )
    ) {
      return;
    }
    setSibuk(true);
    setGalat('');
    setPesan('');
    try {
      await simpanConsent(dipilih, status);
      setRingkasan(await ringkasanWali(dipilih));
      setPesan(
        status === 'disetujui'
          ? 'Persetujuan berbagi rekam tersimpan.'
          : 'Persetujuan berbagi rekam ditarik.',
      );
    } catch (e) {
      setGalat(teksGalat(e));
    } finally {
      setSibuk(false);
    }
  }

  const ppi = ringkasan?.ppi ?? null;
  const persetujuan = ringkasan?.persetujuan.filter((c) => c.jenis === 'berbagi_rekam') ?? [];
  const terakhir = persetujuan[0];
  const aktif = terakhir?.status === 'disetujui';

  return (
    <>
      <h1>Ringkasan anak</h1>
      <p className="lede">
        Halaman ini baca-saja untuk orang tua/wali. Isinya tidak memuat catatan asesmen dan hanya
        menampilkan anak yang tertaut ke akun Anda.
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

      {anak.length > 1 && (
        <div className="kartu">
          <label htmlFor="pilih-anak">Anak yang ditampilkan</label>
          <p className="hint" id="hint-anak">
            Akun Anda tertaut ke {anak.length} anak. Pilih satu untuk melihat ringkasannya.
          </p>
          <select
            id="pilih-anak"
            aria-describedby="hint-anak"
            value={dipilih}
            onChange={(e) => setDipilih(e.target.value)}
          >
            {anak.map((a) => (
              <option key={a.id} value={a.id}>
                {a.inisial} - kelas {a.kelas} ({a.kode})
              </option>
            ))}
          </select>
        </div>
      )}

      {memuat && <p className="pesan">Memuat ringkasan...</p>}

      {!memuat && !galat && !dipilih && (
        <p className="pesan pesan-peringatan">
          Belum ada anak yang tertaut ke akun Anda. Hubungi koordinator sekolah untuk menautkan data.
        </p>
      )}

      {!memuat && ringkasan && (
        <>
          <section className="kartu">
            <h2 style={{ marginTop: 0 }}>Identitas anak</h2>
            <div className="bisa-digulir">
              <table>
                <caption>Data anak yang tercatat di sekolah</caption>
                <tbody>
                  <tr>
                    <th scope="row">Kode</th>
                    <td>{ringkasan.siswa.kode}</td>
                  </tr>
                  <tr>
                    <th scope="row">Inisial</th>
                    <td>{ringkasan.siswa.inisial}</td>
                  </tr>
                  <tr>
                    <th scope="row">Kelas</th>
                    <td>{ringkasan.siswa.kelas}</td>
                  </tr>
                  <tr>
                    <th scope="row">Sekolah</th>
                    <td>{ringkasan.sekolah}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="kartu">
            <h2 style={{ marginTop: 0 }}>Program Pembelajaran Individual (PPI)</h2>
            {ppi ? (
              <>
                <p className="baris">
                  <span className="lencana">Versi {ppi.versi}</span>
                  <span className="hint" style={{ margin: 0 }}>
                    Diperbarui {tanggal(ppi.diperbarui)}
                  </span>
                </p>
                <h3>Ringkasan</h3>
                <p>{ppi.ringkasan ?? 'Belum ada ringkasan pada versi ini.'}</p>

                <h3>Tujuan dan indikator</h3>
                <div className="bisa-digulir">
                  <table>
                    <caption>Tujuan PPI beserta indikator ketercapaiannya</caption>
                    <thead>
                      <tr>
                        <th scope="col">Tujuan</th>
                        <th scope="col">Indikator</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ppi.tujuan.length === 0 && (
                        <tr>
                          <td colSpan={2}>Belum ada tujuan pada versi ini.</td>
                        </tr>
                      )}
                      {ppi.tujuan.map((t, i) => (
                        <tr key={i}>
                          <td>{t.tujuan}</td>
                          <td>{t.indikator}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h3>Akomodasi</h3>
                {ppi.akomodasi.length === 0 ? (
                  <p>Belum ada akomodasi pada versi ini.</p>
                ) : (
                  <ul>
                    {ppi.akomodasi.map((a, i) => (
                      <li key={i}>
                        {a.nama} -{' '}
                        <span className={a.disetujui ? 'lencana lencana-kuat' : 'lencana'}>
                          {a.disetujui ? 'Disetujui' : 'Tidak disetujui'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p>Belum ada draf PPI untuk anak ini.</p>
            )}
          </section>

          <section className="kartu">
            <h2 style={{ marginTop: 0 }}>10 sesi terakhir</h2>
            <div className="bisa-digulir">
              <table>
                <caption>Catatan sesi terakhir yang dibagikan guru</caption>
                <thead>
                  <tr>
                    <th scope="col">Tanggal</th>
                    <th scope="col">Capaian</th>
                    <th scope="col">Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {ringkasan.sesi.length === 0 && (
                    <tr>
                      <td colSpan={3}>Belum ada sesi tercatat.</td>
                    </tr>
                  )}
                  {ringkasan.sesi.map((s, i) => (
                    <tr key={i}>
                      <td>{tanggal(s.tanggal)}</td>
                      <td>{TEKS_CAPAIAN[s.capaian] ?? s.capaian}</td>
                      <td>{s.catatan ?? 'Tanpa catatan.'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="kartu">
            <h2 style={{ marginTop: 0 }}>Persetujuan berbagi rekam</h2>
            <p>
              Persetujuan inilah yang membuat sekolah lain boleh meminta rekam anak Anda. Tanpa
              persetujuan aktif, permintaan itu ditolak.
            </p>
            {terakhir ? (
              <p className="baris">
                Status:{' '}
                <span className={aktif ? 'lencana lencana-kuat' : 'lencana'}>
                  {TEKS_STATUS[terakhir.status]}
                </span>
                <span className="hint" style={{ margin: 0 }}>
                  Berlaku hingga {tanggal(terakhir.berlaku_hingga)}
                </span>
              </p>
            ) : (
              <p className="pesan pesan-peringatan">Belum ada persetujuan berbagi rekam.</p>
            )}
            <div className="baris">
              <button
                type="button"
                className="tombol"
                disabled={sibuk || aktif}
                onClick={() => void ubahPersetujuan('disetujui')}
              >
                Beri persetujuan berbagi rekam
              </button>
              <button
                type="button"
                className="tombol tombol-sekunder"
                disabled={sibuk || !aktif}
                onClick={() => void ubahPersetujuan('dicabut')}
              >
                Tarik persetujuan
              </button>
            </div>
            {sibuk && <p role="status">Menyimpan persetujuan...</p>}
          </section>

          <section className="kartu">
            <h2 style={{ marginTop: 0 }}>Riwayat persetujuan</h2>
            <div className="bisa-digulir">
              <table>
                <caption>Riwayat persetujuan yang pernah diberikan</caption>
                <thead>
                  <tr>
                    <th scope="col">Jenis</th>
                    <th scope="col">Status</th>
                    <th scope="col">Berlaku hingga</th>
                    <th scope="col">Dibuat</th>
                  </tr>
                </thead>
                <tbody>
                  {ringkasan.persetujuan.length === 0 && (
                    <tr>
                      <td colSpan={4}>Belum ada catatan persetujuan.</td>
                    </tr>
                  )}
                  {ringkasan.persetujuan.map((c) => (
                    <tr key={c.id}>
                      <td>{c.jenis.replace('_', ' ')}</td>
                      <td>{TEKS_STATUS[c.status] ?? c.status}</td>
                      <td>{tanggal(c.berlaku_hingga)}</td>
                      <td>{tanggal(c.dibuat_pada)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}
