import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import {
  ArrowLeftRight,
  BookOpen,
  FileJson,
  HeartHandshake,
  LogOut,
  Menu,
  ScrollText,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import type { Role } from '../lib/types';

const MENU: { ke: string; label: string; peran?: Role[]; Ikon: typeof Users; publik?: boolean }[] = [
  { ke: '/landing', label: 'Tentang', Ikon: BookOpen, publik: true },
  { ke: '/siswa', label: 'Siswa', peran: ['guru', 'gpk', 'koordinator', 'admin'], Ikon: Users },
  { ke: '/materi', label: 'Materi', peran: ['guru', 'gpk', 'admin'], Ikon: BookOpen },
  { ke: '/koordinator', label: 'Transfer', peran: ['koordinator', 'admin'], Ikon: ArrowLeftRight },
  { ke: '/audit', label: 'Audit', peran: ['koordinator', 'admin'], Ikon: ScrollText },
  { ke: '/orangtua', label: 'Ringkasan', peran: ['orang_tua', 'admin'], Ikon: HeartHandshake },
  {
    ke: '/api-docs',
    label: 'API Docs',
    peran: ['guru', 'gpk', 'koordinator', 'admin', 'orang_tua'],
    publik: true,
    Ikon: FileJson,
  },
];

export default function AppShell({ children }: { children?: ReactNode }) {
  const { profil, keluar } = useAuth();
  const peran = profil?.role;
  const terlihat = profil && peran
    ? MENU.filter((m) => m.peran && m.peran.includes(peran))
    : MENU.filter((m) => m.publik);
  const [menuTerbuka, setMenuTerbuka] = useState(false);
  const lokasi = useLocation();

  // Tutup menu mobile saat navigasi
  useEffect(() => {
    setMenuTerbuka(false);
  }, [lokasi.pathname]);

  // Tutup menu mobile saat ESC
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuTerbuka(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <>
      <a className="lompati-ke-konten" href="#konten-utama">Lewati ke konten utama</a>

      <header className="bilah-utama">
        {/* Merek */}
        <NavLink to="/" className="merek-link" aria-label="PPI-Link — beranda">
          <span className="bilah-merek">PPI-Link</span>
        </NavLink>

        {/* Navigasi desktop */}
        <nav className="nav-desktop" aria-label="Navigasi utama">
          {terlihat.map((m) => (
            <NavLink key={m.ke} to={m.ke} className="nav-tautan">
              <m.Ikon size={15} aria-hidden="true" className="nav-ikon" />
              <span>{m.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Panel akhir: profil + keluar ATAU masuk */}
        <div className="bilah-akhir">
          {profil ? (
            <>
              <div className="profil-chip">
                <span className="profil-nama">{profil.nama}</span>
                <span className="lencana">{profil.role.replace('_', ' ')}</span>
              </div>
              <button
                type="button"
                className="tombol-sekunder tombol-kecil keluar-tombol"
                onClick={() => void keluar()}
                aria-label="Keluar dari akun"
              >
                <LogOut size={15} aria-hidden="true" />
                <span className="keluar-label">Keluar</span>
              </button>
            </>
          ) : (
            <NavLink
              to="/login"
              className="tombol tombol-kecil text-xs no-underline inline-flex items-center gap-1.5"
              aria-label="Masuk ke PPI-Link"
            >
              <span>Masuk</span>
            </NavLink>
          )}

          {/* Toggle hamburger mobile */}
          {terlihat.length > 0 && (
            <button
              type="button"
              className="hamburger"
              onClick={() => setMenuTerbuka((p) => !p)}
              aria-expanded={menuTerbuka}
              aria-controls="nav-mobile"
              aria-label={menuTerbuka ? 'Tutup menu' : 'Buka menu'}
            >
              {menuTerbuka ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </button>
          )}
        </div>
      </header>

      {/* Drawer mobile */}
      {menuTerbuka && (
        <div
          id="nav-mobile"
          className="nav-mobile"
          role="dialog"
          aria-modal="true"
          aria-label="Menu navigasi"
        >
          <nav aria-label="Navigasi utama mobile">
            {terlihat.map((m) => (
              <NavLink key={m.ke} to={m.ke} className="nav-mobile-tautan">
                <m.Ikon size={16} aria-hidden="true" />
                <span>{m.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      )}

      {/* Overlay mobile */}
      {menuTerbuka && (
        <div
          className="nav-overlay"
          onClick={() => setMenuTerbuka(false)}
          aria-hidden="true"
        />
      )}

      <main id="konten-utama" className="wadah wadah-lebar halaman-utama">
        {children ?? <Outlet />}
      </main>

      <footer className="bilah-footer">
        <p className="meta mb-0">
          Data demo sintetis — PPI-Link bukan alat diagnosis dan tidak menggantikan asesmen ahli.
        </p>
        <p className="meta mb-0 ml-auto">UINIC 8.0 · Subtema pendidikan</p>
      </footer>
    </>
  );
}