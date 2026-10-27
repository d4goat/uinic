import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import {
  ArrowLeftRight,
  BookOpen,
  ChevronDown,
  FileJson,
  HeartHandshake,
  LogOut,
  Menu,
  ScrollText,
  ShieldCheck,
  Users,
  Wifi,
  WifiOff,
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
  const [profilDropdown, setProfilDropdown] = useState(false);
  const [online, setOnline] = useState<boolean>(navigator.onLine);
  const [simulasiOffline, setSimulasiOffline] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const lokasi = useLocation();
  const navigate = useNavigate();

  const isOffline = !online || simulasiOffline;

  // Tutup menu saat navigasi rute berubah
  useEffect(() => {
    setMenuTerbuka(false);
    setProfilDropdown(false);
  }, [lokasi.pathname]);

  // Listener tombol keyboard Escape & klik di luar dropdown
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuTerbuka(false);
        setProfilDropdown(false);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfilDropdown(false);
      }
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Monitor status koneksi peramban
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const toggleSimulasiOffline = () => {
    setSimulasiOffline((prev) => !prev);
  };

  return (
    <div className="min-h-screen flex flex-col bg-latar text-tinta selection:bg-aksi-lembut selection:text-aksi font-sans">
      <a className="lompati-ke-konten" href="#konten-utama">
        Lewati ke konten utama
      </a>

      {/* Header Utama: Bersih, Tenang & Elegan */}
      <header className="sticky top-0 z-50 w-full border-b border-garis bg-latar/90 backdrop-blur-md transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Sisi Kiri: Merek */}
          <div className="flex items-center gap-3">
            <NavLink
              to="/"
              className="group flex items-center gap-2.5 text-decoration-none"
              aria-label="PPI-Link — Beranda"
            >
              <div className="w-8 h-8 rounded-xl bg-aksi flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform duration-300">
                <ShieldCheck size={18} className="text-white" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-bold text-lg leading-tight tracking-tight text-tinta">
                    PPI-Link
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-aksen" aria-hidden="true" />
                </div>
                <span className="text-[11px] text-tinta-lembut uppercase tracking-wider hidden sm:inline font-medium">
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
                  `inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ease-out ${
                    isActive
                      ? 'bg-kartu text-aksi font-semibold shadow-xs'
                      : 'text-tinta-lembut hover:text-tinta hover:bg-latar/70'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <m.Ikon
                      size={14}
                      className={`transition-colors duration-300 ${isActive ? 'text-aksi' : 'opacity-70'}`}
                      aria-hidden="true"
                    />
                    <span>{m.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Sisi Kanan: Unified Profile Chip dengan Dropdown (atau Tombol Masuk) */}
          <div className="flex items-center gap-2">
            {profil ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setProfilDropdown((p) => !p)}
                  className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-full bg-latar-lembut hover:bg-latar border border-garis transition-all duration-300 shadow-xs focus-visible:ring-2 focus-visible:ring-aksi cursor-pointer"
                  aria-expanded={profilDropdown}
                  aria-haspopup="menu"
                  aria-label="Buka menu profil dan pengaturan"
                >
                  {/* Avatar dengan Indikator Status Koneksi */}
                  <div className="relative">
                    <div className="w-6 h-6 rounded-full bg-aksi text-white text-[11px] font-bold flex items-center justify-center shadow-xs">
                      {profil.nama ? profil.nama.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white transition-colors duration-300 ${
                        isOffline ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      title={isOffline ? 'Mode Offline' : 'Tersambung'}
                    />
                  </div>

                  {/* Nama Pengguna & Peran */}
                  <div className="flex flex-col text-left leading-none">
                    <span className="text-xs font-semibold text-tinta max-w-[120px] truncate">
                      {profil.nama}
                    </span>
                    <span className="text-[10px] text-tinta-lembut uppercase tracking-wider mt-0.5 font-medium">
                      {profil.role.replace('_', ' ')}
                    </span>
                  </div>

                  <ChevronDown
                    size={14}
                    className={`text-tinta-lembut transition-transform duration-300 ${
                      profilDropdown ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>

                {/* Dropdown Menu Terpadu */}
                {profilDropdown && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-72 z-50 rounded-2xl bg-kartu p-3.5 shadow-[0_12px_36px_-4px_rgba(30,36,32,0.12)] border border-garis animate-in fade-in zoom-in-95 duration-200"
                  >
                    {/* Ringkasan Akun */}
                    <div className="p-3 rounded-xl bg-latar-lembut/70 border border-garis mb-2.5">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-7 h-7 rounded-full bg-aksi text-white text-xs font-bold flex items-center justify-center">
                          {profil.nama ? profil.nama.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-tinta truncate">{profil.nama}</p>
                          <p className="text-[11px] text-tinta-lembut truncate">{profil.email}</p>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-garis flex items-center justify-between">
                        <span className="text-[10px] uppercase font-semibold text-tinta-lembut tracking-wider">
                          Peran Akses
                        </span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-aksi-lembut text-aksi">
                          {profil.role.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Status Sinkronisasi PWA (F6 & P1) */}
                    <div className="p-3 rounded-xl border border-garis bg-latar/50 mb-2.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-tinta-lembut">
                          Status Jaringan
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isOffline
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isOffline ? 'bg-amber-600' : 'bg-emerald-600'
                            }`}
                          />
                          {isOffline ? 'Offline' : 'Online'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={toggleSimulasiOffline}
                        className="w-full flex items-center justify-between p-2 rounded-lg text-xs bg-kartu hover:bg-latar-lembut border border-garis text-tinta transition-all duration-300 cursor-pointer"
                        title="Simulasi offline untuk menguji antrean sinkronisasi lokal"
                      >
                        <div className="flex items-center gap-1.5">
                          {isOffline ? (
                            <Wifi size={13} className="text-emerald-700" />
                          ) : (
                            <WifiOff size={13} className="text-amber-700" />
                          )}
                          <span className="text-[11px]">
                            {isOffline ? 'Pulihkan Jaringan' : 'Simulasi Offline (Uji Juri)'}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-aksi">Ganti</span>
                      </button>
                    </div>

                    {/* Tombol Keluar Akun */}
                    <button
                      type="button"
                      onClick={async () => {
                        setProfilDropdown(false);
                        await keluar();
                        navigate('/login');
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-galat hover:bg-red-50/80 border border-transparent hover:border-red-200 transition-all duration-300 cursor-pointer"
                      role="menuitem"
                    >
                      <LogOut size={14} />
                      <span>Keluar dari Akun</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <NavLink
                to="/login"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-aksi text-white hover:bg-aksi-gelap transition-all duration-300 shadow-xs"
              >
                Masuk
              </NavLink>
            )}

            {/* Toggle Hamburger Mobile */}
            {terlihat.length > 0 && (
              <button
                type="button"
                className="lg:hidden p-2 rounded-xl border border-garis bg-latar-lembut text-tinta transition-colors duration-300"
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
            className="lg:hidden border-t border-garis bg-kartu p-4 animate-in slide-in-from-top-2 duration-200 shadow-md"
            role="dialog"
            aria-modal="true"
            aria-label="Navigasi Menu Mobile"
          >
            {profil && (
              <div className="p-3 mb-3 rounded-xl bg-latar-lembut border border-garis flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-aksi text-white text-xs font-bold flex items-center justify-center">
                    {profil.nama ? profil.nama.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-tinta truncate">{profil.nama}</p>
                    <p className="text-[11px] text-tinta-lembut uppercase">
                      Peran: {profil.role.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isOffline
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isOffline ? 'bg-amber-600' : 'bg-emerald-600'
                    }`}
                  />
                  {isOffline ? 'Offline' : 'Online'}
                </span>
              </div>
            )}
            <nav className="grid grid-cols-2 gap-2" aria-label="Menu navigasi mobile">
              {terlihat.map((m) => (
                <NavLink
                  key={m.ke}
                  to={m.ke}
                  className={({ isActive }) =>
                    `flex items-center gap-2 p-2.5 rounded-xl text-xs font-medium border transition-all duration-300 ${
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
            {profil && (
              <div className="mt-3 pt-3 border-t border-garis">
                <button
                  type="button"
                  onClick={async () => {
                    setMenuTerbuka(false);
                    await keluar();
                    navigate('/login');
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-galat hover:bg-red-50/80 border border-transparent hover:border-red-200 transition-all duration-300 cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Keluar dari Akun</span>
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Konten Utama */}
      <main id="konten-utama" className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8">
        {children ?? <Outlet />}
      </main>

      {/* Footer Kalem & Bukti Etis (PRD §8) */}
      <footer className="w-full border-t border-garis bg-latar-lembut/60 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-tinta-lembut">
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