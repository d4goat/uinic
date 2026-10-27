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
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import type { Role } from '../lib/types';
import DemoSwitcher from './DemoSwitcher';
import PwaStatusPill from './PwaStatusPill';

const MENU: { ke: string; label: string; peran?: Role[]; Ikon: typeof Users; publik?: boolean }[] = [
  { ke: '/landing', label: 'Tentang', Ikon: BookOpen, publik: true },
  { ke: '/siswa', label: 'Siswa', peran: ['guru', 'gpk', 'koordinator', 'admin'], Ikon: Users },
  { ke: '/materi', label: 'Materi', peran: ['guru', 'gpk', 'admin'], Ikon: BookOpen },
  { ke: '/koordinator', label: 'Transfer', peran: ['koordinator', 'admin'], Ikon: ArrowLeftRight },
  { ke: '/audit', label: 'Audit', peran: ['koordinator', 'admin'], Ikon: ScrollText },
  { ke: '/orangtua', label: 'Orang Tua', peran: ['orang_tua', 'admin'], Ikon: HeartHandshake },
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
    <div className="min-h-screen flex flex-col bg-latar text-tinta selection:bg-aksi-lembut selection:text-aksi">
      <a className="lompati-ke-konten" href="#konten-utama">
        Lewati ke konten utama
      </a>

      {/* Header Utama: Warm Inclusive Sanctuary (design.md Modul 1) */}
      <header className="sticky top-0 z-50 w-full border-b border-garis bg-latar/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Sisi Kiri: Merek & Tag Instansi */}
          <div className="flex items-center gap-3">
            <NavLink
              to="/"
              className="group flex items-center gap-2.5 text-decoration-none"
              aria-label="PPI-Link — Beranda"
            >
              <div className="w-8 h-8 rounded-xl bg-aksi flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
                <ShieldCheck size={18} className="text-white" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-bold text-lg leading-tight tracking-tight text-tinta">
                    PPI-Link
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-aksen" aria-hidden="true"></span>
                </div>
                <span className="text-[10px] font-mono text-tinta-lembut uppercase tracking-wider hidden sm:inline">
                  Sanctuary Inklusif
                </span>
              </div>
            </NavLink>
          </div>

          {/* Tengah: Segmented Pill Dock Navigasi (Desktop) */}
          <nav
            className="hidden lg:flex items-center gap-1 bg-latar-lembut p-1 rounded-full border border-garis shadow-[0_2px_8px_-2px_rgba(30,36,32,0.04)]"
            aria-label="Navigasi Utama"
          >
            {terlihat.map((m) => (
              <NavLink
                key={m.ke}
                to={m.ke}
                className={({ isActive }) =>
                  `inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs transition-all duration-200 ${
                    isActive
                      ? 'bg-kartu text-aksi font-semibold shadow-xs'
                      : 'text-tinta-lembut hover:text-tinta hover:bg-latar font-medium'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <m.Ikon
                      size={14}
                      className={isActive ? 'text-aksi' : 'opacity-70'}
                      aria-hidden="true"
                    />
                    <span>{m.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Sisi Kanan: Status PWA + Demo Switcher + Profil / Masuk */}
          <div className="flex items-center gap-2">
            {/* PWA Sync Pill */}
            <PwaStatusPill />

            {/* Demo Switcher Pill (Juri Shortcut) */}
            <DemoSwitcher />

            {/* Profil Chip & Logout / Login */}
            {profil ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-latar-lembut border border-garis">
                  <div className="w-5 h-5 rounded-full bg-aksi text-white text-[10px] font-bold flex items-center justify-center">
                    {profil.nama ? profil.nama.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="text-xs font-medium text-tinta max-w-[110px] truncate">
                    {profil.nama}
                  </span>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-kartu border border-garis text-tinta-lembut">
                    {profil.role.replace('_', ' ')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void keluar()}
                  className="p-1.5 rounded-xl border border-garis bg-kartu text-tinta-lembut hover:text-galat hover:border-galat/40 transition-colors shadow-xs"
                  aria-label="Keluar dari akun"
                  title="Keluar dari akun"
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <NavLink
                to="/login"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-aksi text-white hover:bg-aksi-gelap transition-colors shadow-xs"
              >
                Masuk
              </NavLink>
            )}

            {/* Toggle Hamburger Mobile */}
            {terlihat.length > 0 && (
              <button
                type="button"
                className="lg:hidden p-2 rounded-xl border border-garis bg-latar-lembut text-tinta"
                onClick={() => setMenuTerbuka((p) => !p)}
                aria-expanded={menuTerbuka}
                aria-controls="nav-mobile"
                aria-label={menuTerbuka ? 'Tutup navigasi' : 'Buka navigasi'}
              >
                {menuTerbuka ? <X size={18} /> : <Menu size={18} />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {menuTerbuka && (
          <div
            id="nav-mobile"
            className="lg:hidden border-t border-garis bg-kartu p-4 animate-in slide-in-from-top-2 duration-150 shadow-md"
            role="dialog"
            aria-modal="true"
            aria-label="Navigasi Menu Mobile"
          >
            {profil && (
              <div className="flex items-center gap-2.5 p-3 mb-3 rounded-xl bg-latar-lembut border border-garis">
                <div className="w-8 h-8 rounded-full bg-aksi text-white text-xs font-bold flex items-center justify-center">
                  {profil.nama ? profil.nama.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-tinta truncate">{profil.nama}</p>
                  <p className="text-[11px] font-mono text-tinta-lembut uppercase">
                    Peran: {profil.role.replace('_', ' ')}
                  </p>
                </div>
              </div>
            )}
            <nav className="grid grid-cols-2 gap-2" aria-label="Menu navigasi mobile">
              {terlihat.map((m) => (
                <NavLink
                  key={m.ke}
                  to={m.ke}
                  className={({ isActive }) =>
                    `flex items-center gap-2 p-2.5 rounded-xl text-xs font-medium border transition-colors ${
                      isActive
                        ? 'bg-aksi-lembut text-aksi border-aksi/40 font-semibold'
                        : 'bg-latar text-tinta-lembut border-garis hover:text-tinta'
                    }`
                  }
                >
                  <m.Ikon size={15} />
                  <span>{m.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Konten Utama */}
      <main id="konten-utama" className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8">
        {children ?? <Outlet />}
      </main>

      {/* Footer Kalem & Bukti Etis (PRD §8) */}
      <footer className="w-full border-t border-garis bg-latar-lembut/60 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-tinta-lembut font-mono">
          <p className="text-center sm:text-left">
            Data demo sintetis — PPI-Link bukan alat diagnosis medis/psikologis.
          </p>
          <div className="flex items-center gap-4 text-[11px]">
            <span>UINIC 8.0</span>
            <span>·</span>
            <span>WCAG 2.1 AA</span>
            <span>·</span>
            <span>UU PDP Compliant</span>
          </div>
        </div>
      </footer>
    </div>
  );
}