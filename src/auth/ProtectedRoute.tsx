import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import type { Role } from '../lib/types';

/** Rute peran: [F1] pengguna tanpa peran yang sesuai tidak pernah sampai ke halaman. */
export function Berjaga({ peran, children }: { peran: Role[]; children: ReactNode }) {
  const { profil, siap } = useAuth();
  const lokasi = useLocation();

  if (!siap) return <p className="wadah">Memuat…</p>;
  if (!profil) return <Navigate to="/login" state={{ dari: lokasi.pathname }} replace />;
  if (!peran.includes(profil.role)) {
    return (
      <div className="wadah">
        <h1>Tidak berhak</h1>
        <p>Peran akun Anda (<strong>{profil.role}</strong>) tidak membuka halaman ini.</p>
        <p><a href="/">Kembali ke beranda</a></p>
      </div>
    );
  }
  return <>{children}</>;
}

export const staf = ['guru', 'gpk', 'koordinator', 'admin'] as Role[];
export const penyusun = ['guru', 'gpk', 'admin'] as Role[];
export const koordinator = ['koordinator', 'admin'] as Role[];
export const wali = ['orang_tua', 'admin'] as Role[];
