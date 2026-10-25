import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import type { Role } from '../lib/types';

const MENU: { ke: string; label: string; peran: Role[] }[] = [
  { ke: '/siswa', label: 'Siswa', peran: ['guru', 'gpk', 'koordinator', 'admin'] },
  { ke: '/materi', label: 'Materi aksesibel', peran: ['guru', 'gpk', 'admin'] },
  { ke: '/koordinator', label: 'Transfer rekam', peran: ['koordinator', 'admin'] },
  { ke: '/audit', label: 'Audit log', peran: ['koordinator', 'admin'] },
  { ke: '/orangtua', label: 'Ringkasan anak', peran: ['orang_tua', 'admin'] },
  { ke: '/api-docs', label: 'Dokumentasi API', peran: ['guru', 'gpk', 'koordinator', 'admin', 'orang_tua'] },
];

export default function AppShell() {
  const { profil, keluar } = useAuth();
  const peran = profil?.role;
  const terlihat = MENU.filter((m) => peran && m.peran.includes(peran));

  return (
    <>
      <a className="lompati-ke-konten" href="#konten-utama">Lewati ke konten utama</a>
      <header className="bilah">
        <span className="bilah-merek">PPI-Link</span>
        <nav aria-label="Navigasi utama">
          {terlihat.map((m) => (
            <NavLink key={m.ke} to={m.ke}
              className={({ isActive }) => (isActive ? 'aktif' : '')}
              aria-current={undefined}>
              {m.label}
            </NavLink>
          ))}
        </nav>
        <div className="bilah-akhir">
          {profil && (
            <span className="lencana">{profil.nama} · {profil.role.replace('_', ' ')}</span>
          )}
          <button type="button" className="tombol-sekunder tombol-kecil" onClick={() => void keluar()}>
            Keluar
          </button>
        </div>
      </header>
      <main id="konten-utama" className="wadah wadah-lebar">
        <Outlet />
      </main>
      <footer className="bilah" style={{ borderTop: '1px solid var(--garis)', borderBottom: 0 }}>
        <span className="hint" style={{ margin: 0 }}>
          Data demo sintetis. PPI-Link bukan alat diagnosis dan tidak menggantikan asesmen ahli.
        </span>
      </footer>
    </>
  );
}
