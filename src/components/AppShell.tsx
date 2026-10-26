import { NavLink, Outlet } from 'react-router-dom';
import type { ReactNode } from 'react';
import {
  ArrowLeftRight,
  BookOpen,
  FileJson,
  HeartHandshake,
  LogOut,
  ScrollText,
  Users,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import type { Role } from '../lib/types';

/** Menu sama seperti sebelumnya, kini dengan ikon 1,5px. Lucide dipakai hemat:
 *  hanya sebagai penanda baris navigasi, selalu aria-hidden karena labelnya
 *  sudah teks. */
const MENU: { ke: string; label: string; peran: Role[]; Ikon: typeof Users }[] = [
  { ke: '/siswa', label: 'Siswa', peran: ['guru', 'gpk', 'koordinator', 'admin'], Ikon: Users },
  { ke: '/materi', label: 'Materi aksesibel', peran: ['guru', 'gpk', 'admin'], Ikon: BookOpen },
  { ke: '/koordinator', label: 'Transfer rekam', peran: ['koordinator', 'admin'], Ikon: ArrowLeftRight },
  { ke: '/audit', label: 'Audit log', peran: ['koordinator', 'admin'], Ikon: ScrollText },
  { ke: '/orangtua', label: 'Ringkasan anak', peran: ['orang_tua', 'admin'], Ikon: HeartHandshake },
  {
    ke: '/api-docs',
    label: 'Dokumentasi API',
    peran: ['guru', 'gpk', 'koordinator', 'admin', 'orang_tua'],
    Ikon: FileJson,
  },
];

/** Kerangka halaman ber-sesi. Tanpa `children` (rute bersarang), isinya datang
 *  lewat <Outlet />; dengan `children`, gerbang "/" menumpangkan beranda peran
 *  ke kerangka yang sama. */
export default function AppShell({ children }: { children?: ReactNode }) {
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
            <NavLink key={m.ke} to={m.ke} className="inline-flex items-center gap-2">
              <m.Ikon size={16} aria-hidden="true" />
              {m.label}
            </NavLink>
          ))}
        </nav>

        <div className="bilah-akhir">
          {profil && (
            <>
              <span className="hidden text-sm text-tinta-lembut sm:inline">{profil.nama}</span>
              <span className="lencana">{profil.role.replace('_', ' ')}</span>
            </>
          )}
          <button
            type="button"
            className="tombol-sekunder tombol-kecil inline-flex items-center gap-2"
            onClick={() => void keluar()}
          >
            <LogOut size={16} aria-hidden="true" />
            Keluar
          </button>
        </div>
      </header>

      {/* Kisi asimetris: konten digeser dari garis rambut struktur di kiri. */}
      <main id="konten-utama" className="wadah wadah-lebar lg:border-l lg:border-garis lg:pl-16">
        {children ?? <Outlet />}
      </main>

      <footer className="bilah border-t border-b-0 border-garis">
        <p className="meta mb-0">
          Data demo sintetis — PPI-Link bukan alat diagnosis dan tidak menggantikan asesmen ahli.
        </p>
        <p className="meta mb-0 ml-auto">UINIC 8.0 · Subtema pendidikan</p>
      </footer>
    </>
  );
}