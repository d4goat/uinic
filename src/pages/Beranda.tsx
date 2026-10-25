import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

/** Beranda per peran: hanya menampilkan langkah yang memang boleh dibuka. */
export default function Beranda() {
  const { profil, siap } = useAuth();
  if (!siap) return <p>Memuat…</p>;
  if (!profil) return <p>Silakan <a href="/login">masuk</a> dulu.</p>;

  const tautan: Record<string, { ke: string; judul: string; isi: string }[]> = {
    guru: [
      { ke: '/siswa', judul: 'Siswa', isi: 'Pilih siswa, isi asesmen hambatan, susun draf PPI.' },
      { ke: '/materi', judul: 'Materi aksesibel', isi: 'Sajikan bacaan dalam mode teks besar, kalimat pendek, atau bacakan.' },
    ],
    gpk: [
      { ke: '/siswa', judul: 'Siswa', isi: 'Tinjau draf PPI guru dan buat versi baru.' },
      { ke: '/materi', judul: 'Materi aksesibel', isi: 'Kelola materi dan varian aksesibelnya.' },
    ],
    koordinator: [
      { ke: '/siswa', judul: 'Data siswa', isi: 'Ringkasan seluruh siswa sekolah dan penghapusan data atas permintaan.' },
      { ke: '/koordinator', judul: 'Transfer rekam', isi: 'Ajukan pengiriman rekam ke sekolah lain setelah persetujuan orang tua.' },
      { ke: '/audit', judul: 'Audit log', isi: 'Telusuri siapa mengakses dan mengubah data siswa.' },
    ],
    orang_tua: [
      { ke: '/orangtua', judul: 'Ringkasan anak', isi: 'Baca ringkasan PPI, sesi terakhir, dan beri persetujuan berbagi rekam.' },
    ],
    admin: [
      { ke: '/audit', judul: 'Audit log', isi: 'Seluruh akses data siswa tercatat.' },
      { ke: '/siswa', judul: 'Siswa', isi: 'Seluruh sekolah.' },
    ],
  };

  return (
    <>
      <h1>Selamat datang, {profil.nama}</h1>
      <p className="lede">
        Peran Anda: <strong>{profil.role.replace('_', ' ')}</strong>. Alur PPI-Link:
        asesmen hambatan → saran akomodasi beserta alasannya → draf PPI berversi → catat sesi →
        bagikan ke orang tua atau sekolah lain.
      </p>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {(tautan[profil.role] ?? []).map((t) => (
          <li key={t.ke} className="kartu">
            <h2 style={{ marginTop: 0 }}><Link to={t.ke}>{t.judul}</Link></h2>
            <p style={{ margin: 0 }}>{t.isi}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
