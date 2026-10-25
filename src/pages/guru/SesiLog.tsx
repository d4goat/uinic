// F6: catat sesi pendampingan terhadap tujuan PPI.
// Tahan offline (alasan [S6]): sesi yang gagal terkirim dititipkan ke antrean
// perangkat (lib/offline.ts) dan dikirim ulang otomatis; client_uuid membuat
// pengiriman ulang idempoten di sisi server.
import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  catatanAsesmen, catatAkses, catatSesi, daftarSesi, rekapCapaian, versiPpi,
} from '../../lib/api';
import { antre, bacaAntrean, kirimAntrean } from '../../lib/offline';
import type { Capaian, Sesi, SesiAntrean } from '../../lib/types';

type Tujuan = { id: string; tujuan: string; indikator: string };
type Pesan = { jenis: 'berhasil' | 'peringatan' | 'galat'; teks: string };

const LABEL: Record<Capaian, string> = { belum: 'Belum', sebagian: 'Sebagian', tercapai: 'Tercapai' };
const HARI_INI = () => new Date().toISOString().slice(0, 10);
const formatTanggal = (t: string) =>
  new Date(`${t}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

// ponytail: daftar tujuan disimpan di localStorage supaya sesi tetap bisa
// dicatat luring; bila kosong, goal_id dikirim null (schema mengizinkan).
// Ganti ke IndexedDB hanya bila nanti butuh seluruh versi PPI secara luring.
const kunciTujuan = (ppiId: string) => `ppi-link.tujuan.${ppiId}`;
function bacaTujuanTersimpan(ppiId: string): Tujuan[] {
  try {
    return JSON.parse(localStorage.getItem(kunciTujuan(ppiId)) ?? '[]') as Tujuan[];
  } catch {
    return [];
  }
}

export default function SesiLog() {
  const { id: ppiId = '' } = useParams();
  // Halaman ini dibuka dari draf PPI; bila siswa tidak dioper lewat state,
  // tautan kembali jatuh ke daftar siswa.
  const studentId = (useLocation().state as { studentId?: string } | null)?.studentId ?? null;

  const [tujuan, setTujuan] = useState<Tujuan[]>([]);
  const [sesi, setSesi] = useState<Sesi[]>([]);
  const [rekap, setRekap] = useState<Record<Capaian, number>>({ belum: 0, sebagian: 0, tercapai: 0 });
  const [antrean, setAntrean] = useState<SesiAntrean[]>([]);
  const [daring, setDaring] = useState(navigator.onLine);
  const [goalId, setGoalId] = useState('');
  const [tanggal, setTanggal] = useState(HARI_INI);
  const [status, setStatus] = useState<Capaian>('sebagian');
  const [catatan, setCatatan] = useState('');
  const [pesan, setPesan] = useState<Pesan | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);
  const [mengirim, setMengirim] = useState(false);

  // Tiap bagian dimuat terpisah: satu panggilan yang gagal (luring) tidak
  // boleh mematikan halaman.
  const muat = useCallback(async () => {
    try {
      const versi = await versiPpi(ppiId);
      const aktif = versi[0]; // urut nomor_versi menurun -> terbaru = versi aktif
      const daftar = aktif?.ppi_goals ?? [];
      setTujuan(daftar);
      if (daftar.length) localStorage.setItem(kunciTujuan(ppiId), JSON.stringify(daftar));
    } catch {
      setTujuan(bacaTujuanTersimpan(ppiId));
    }

    try {
      const baris = await daftarSesi(ppiId);
      setSesi(baris);
      // Catatan tersimpan terenkripsi (pgp_sym_encrypt); dekripsi lewat fn_dec.
      // Gagal dekripsi hanya mengosongkan satu catatan, bukan seluruh halaman.
      for (const s of baris) {
        if (!s.catatan_enc) continue;
        const gagal = () =>
          setSesi((kini) =>
            kini.map((x) => (x.id === s.id ? { ...x, catatan: 'Catatan tidak dapat dibuka.' } : x)));
        catatanAsesmen(s.catatan_enc)
          .then((teks) =>
            setSesi((kini) => kini.map((x) => (x.id === s.id ? { ...x, catatan: teks } : x))))
          .catch(gagal);
      }
    } catch {
      // luring / gagal baca: riwayat dibiarkan kosong
    }

    try {
      const hitung: Record<Capaian, number> = { belum: 0, sebagian: 0, tercapai: 0 };
      for (const b of await rekapCapaian(ppiId)) hitung[b.status_capaian] += 1;
      setRekap(hitung);
    } catch {
      // luring: biarkan angka sebelumnya
    }

    setAntrean(bacaAntrean());
    setMemuat(false);
  }, [ppiId]);

  useEffect(() => {
    if (!ppiId) return;
    // F12: pembukaan halaman ini ikut tercatat; gagalnya tidak menghalangi.
    void catatAkses('sessions', ppiId, { aksi: 'buka' }).catch(() => {});
    void (async () => {
      await muat();
    })();
  }, [ppiId, muat]);

  useEffect(() => {
    const naik = () => setDaring(true);
    const turun = () => setDaring(false);
    window.addEventListener('online', naik);
    window.addEventListener('offline', turun);
    return () => {
      window.removeEventListener('online', naik);
      window.removeEventListener('offline', turun);
    };
  }, []);

  async function simpan(e: FormEvent) {
    e.preventDefault();
    const isi: SesiAntrean = {
      client_uuid: crypto.randomUUID(), // kunci idempotensi
      ppi_id: ppiId,
      goal_id: goalId || null,
      tanggal,
      status_capaian: status,
      catatan,
    };
    setMenyimpan(true);
    try {
      await catatSesi(isi);
      setPesan({ jenis: 'berhasil', teks: 'Sesi tersimpan. Catatan disimpan terenkripsi di basis data.' });
      setGoalId('');
      setCatatan('');
      await muat();
    } catch {
      // Gagal kirim bukan galat keras: sesi dititipkan ke antrean perangkat.
      antre(isi);
      setAntrean(bacaAntrean());
      setGoalId('');
      setCatatan('');
      setPesan({
        jenis: 'peringatan',
        teks: 'Koneksi ke server gagal. Sesi tersimpan di perangkat ini dan akan terkirim otomatis saat jaringan kembali.',
      });
    } finally {
      setMenyimpan(false);
    }
  }

  async function kirim() {
    setMengirim(true);
    try {
      const hasil = await kirimAntrean();
      setAntrean(bacaAntrean());
      setPesan({
        jenis: 'berhasil',
        teks: `Antrean diproses: ${hasil.terkirim} sesi terkirim, ${hasil.sisa} masih menunggu.`,
      });
      if (hasil.terkirim) await muat();
    } catch {
      setPesan({ jenis: 'galat', teks: 'Antrean gagal dikirim. Coba lagi setelah jaringan stabil.' });
    } finally {
      setMengirim(false);
    }
  }

  const jumlahSesi = rekap.belum + rekap.sebagian + rekap.tercapai;

  return (
    <>
      <h1>Log sesi pendampingan</h1>
      <p className="lede">
        Catat capaian tiap sesi terhadap tujuan PPI. Sesi yang gagal terkirim tetap tersimpan di
        perangkat dan dikirim ulang otomatis tanpa tercatat dua kali.
      </p>

      <div className="baris renggang">
        <Link to={studentId ? `/siswa/${studentId}/ppi` : '/siswa'}>Kembali ke draf PPI</Link>
        <span className={`lencana ${daring ? 'lencana-kuat' : 'lencana-lemah'}`}>
          Status jaringan: {daring ? 'tersambung' : 'terputus'}
        </span>
      </div>

      {pesan && (
        <p className={`pesan pesan-${pesan.jenis}`} role={pesan.jenis === 'galat' ? 'alert' : 'status'}>
          {pesan.teks}
        </p>
      )}

      <form className="kartu" onSubmit={(e) => void simpan(e)}>
        <h2 style={{ marginTop: 0 }}>Sesi baru</h2>

        <div>
          <label htmlFor="sesi-tujuan">Tujuan / indikator</label>
          <p className="hint" id="sesi-tujuan-hint" style={{ margin: '0 0 0.25rem' }}>
            Dipilih dari tujuan versi PPI aktif, bukan teks bebas.
          </p>
          <select
            id="sesi-tujuan"
            value={goalId}
            onChange={(e) => setGoalId(e.target.value)}
            aria-describedby="sesi-tujuan-hint"
          >
            <option value="">Tanpa tujuan tertentu</option>
            {tujuan.map((t) => (
              <option key={t.id} value={t.id}>
                {t.tujuan} — {t.indikator}
              </option>
            ))}
          </select>
          {tujuan.length === 0 && (
            <p className="pesan pesan-peringatan" role="status">
              Daftar tujuan belum termuat (kemungkinan luring). Sesi tetap dapat dicatat tanpa
              tujuan lalu dilengkapi setelah tersambung.
            </p>
          )}
        </div>

        <div className="baris">
          <div>
            <label htmlFor="sesi-tanggal">Tanggal sesi</label>
            <input
              id="sesi-tanggal"
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="sesi-status">Status capaian</label>
            <select id="sesi-status" value={status} onChange={(e) => setStatus(e.target.value as Capaian)}>
              <option value="belum">Belum</option>
              <option value="sebagian">Sebagian</option>
              <option value="tercapai">Tercapai</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="sesi-catatan">Catatan singkat</label>
          <p className="hint" id="sesi-catatan-hint" style={{ margin: '0 0 0.25rem' }}>
            Disimpan terenkripsi; cantumkan perilaku yang teramati, bukan penilaian pribadi.
          </p>
          <textarea
            id="sesi-catatan"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            aria-describedby="sesi-catatan-hint"
            maxLength={500}
          />
        </div>

        <button type="submit" disabled={menyimpan || !ppiId}>
          {menyimpan ? 'Menyimpan...' : 'Simpan sesi'}
        </button>
      </form>

      <section className="kartu" aria-labelledby="judul-antrean">
        <div className="baris renggang">
          <h2 id="judul-antrean" style={{ margin: 0 }}>
            Antrean offline: {antrean.length} sesi menunggu
          </h2>
          <button
            type="button"
            className="tombol-sekunder"
            onClick={() => void kirim()}
            disabled={mengirim || antrean.length === 0 || !daring}
          >
            {mengirim ? 'Mengirim...' : 'Kirim sekarang'}
          </button>
        </div>
        {!daring && (
          <p className="hint">Perangkat sedang luring; antrean terkirim otomatis saat jaringan kembali.</p>
        )}
        {antrean.length === 0 ? (
          <p className="hint">Tidak ada sesi yang menunggu terkirim.</p>
        ) : (
          <div className="bisa-digulir">
            <table>
              <caption>Sesi yang menunggu terkirim di perangkat ini</caption>
              <thead>
                <tr>
                  <th scope="col">Tanggal</th>
                  <th scope="col">Capaian</th>
                  <th scope="col">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {antrean.map((s) => (
                  <tr key={s.client_uuid}>
                    <td>{formatTanggal(s.tanggal)}</td>
                    <td>{LABEL[s.status_capaian]}</td>
                    <td>{s.catatan || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="hint">
        Rekap capaian:{' '}
        {memuat && jumlahSesi === 0
          ? 'memuat...'
          : jumlahSesi === 0
            ? 'belum ada sesi tercatat.'
            : `${jumlahSesi} sesi: ${rekap.belum} belum, ${rekap.sebagian} sebagian, ${rekap.tercapai} tercapai.`}
      </p>

      <section className="kartu" aria-labelledby="judul-riwayat">
        <h2 id="judul-riwayat" style={{ marginTop: 0 }}>
          Riwayat sesi
        </h2>
        {sesi.length === 0 ? (
          <p className="hint">
            {memuat ? 'Memuat riwayat...' : 'Belum ada sesi tercatat untuk PPI ini.'}
          </p>
        ) : (
          <div className="bisa-digulir">
            <table>
              <caption>Riwayat sesi pendampingan, terbaru lebih dulu</caption>
              <thead>
                <tr>
                  <th scope="col">Tanggal</th>
                  <th scope="col">Capaian</th>
                  <th scope="col">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {sesi.map((s) => (
                  <tr key={s.id}>
                    <td>{formatTanggal(s.tanggal)}</td>
                    <td>
                      <span className="lencana lencana-capaian">{LABEL[s.status_capaian]}</span>
                    </td>
                    <td>{s.catatan ?? (s.catatan_enc ? 'Memuat catatan...' : '—')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
