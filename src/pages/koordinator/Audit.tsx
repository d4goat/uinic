import { useEffect, useState } from 'react';
import { daftarAudit } from '../../lib/api';

type BarisAudit = Awaited<ReturnType<typeof daftarAudit>>[number];

const waktu = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'medium' });

/** Nama aksi di basis data -> istilah yang dimengerti operator. */
const LABEL_AKSI: Record<string, string> = {
  select: 'baca data',
  insert: 'tambah data',
  update: 'ubah data',
  delete: 'hapus data',
};

const labelAksi = (aksi: string) => {
  if (LABEL_AKSI[aksi]) return `${LABEL_AKSI[aksi]} (${aksi})`;
  if (aksi.startsWith('rpc:')) return `aksi aplikasi (${aksi})`;
  return aksi;
};

export default function Audit() {
  const [baris, setBaris] = useState<BarisAudit[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);

  async function muat() {
    setMemuat(true);
    setGalat(null);
    try {
      setBaris(await daftarAudit(50));
    } catch (e) {
      setGalat(e instanceof Error ? e.message : 'Catatan audit gagal dimuat.');
    } finally {
      setMemuat(false);
    }
  }

  useEffect(() => {
    muat();
  }, []);

  return (
    <div className="wadah wadah-lebar">
      <h1>Jejak audit</h1>
      <p className="lede">
        Catatan ini dibuat otomatis oleh basis data, bukan oleh halaman ini. Setiap perubahan data siswa
        (insert, update, delete) dicatat langsung oleh trigger pada tabelnya, sedangkan pembacaan data sensitif
        dicatat secara eksplisit oleh aplikasi dengan aksi “select” atau “rpc:...”.
      </p>
      <p className="hint">
        Kolom “pengguna” berisi id (uuid) akun yang melakukan aksi. Siapa orang di balik id itu tidak bisa
        ditebak dari halaman ini — hanya admin yang dapat mencocokkannya dengan nama pada tabel{' '}
        <code>profiles</code>. Baris dengan pengguna kosong berarti akses lewat token transfer, tanpa akun
        masuk.
      </p>

      <div className="baris renggang">
        <h2>50 catatan terbaru</h2>
        <button type="button" className="tombol-sekunder tombol-kecil" onClick={muat} disabled={memuat}>
          {memuat ? 'Memuat…' : 'Muat ulang'}
        </button>
      </div>

      {galat && (
        <p className="pesan pesan-galat" role="alert">
          {galat}
        </p>
      )}

      {!galat && baris.length === 0 && !memuat && (
        <p className="hint" role="status">
          Belum ada catatan audit.
        </p>
      )}

      {baris.length > 0 && (
        <div className="bisa-digulir">
          <table>
            <caption>Catatan audit PPI-Link, 50 baris terbaru, terbaru lebih dulu</caption>
            <thead>
              <tr>
                <th scope="col">Waktu</th>
                <th scope="col">Aksi</th>
                <th scope="col">Objek</th>
                <th scope="col">Objek id</th>
                <th scope="col">Pengguna</th>
              </tr>
            </thead>
            <tbody>
              {baris.map((b) => (
                <tr key={b.id}>
                  <td>{waktu(b.waktu)}</td>
                  <td>{labelAksi(b.aksi)}</td>
                  <td>{b.objek}</td>
                  <td>{b.objek_id ?? '—'}</td>
                  <td>
                    {b.user_id ?? (
                      <span className="lencana">akses lewat token</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="hint">
        Halaman ini hanya menampilkan 50 catatan terbaru. Catatan lama tetap tersimpan di tabel audit_logs dan
        bisa diminta ke admin.
      </p>
    </div>
  );
}
