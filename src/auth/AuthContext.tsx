import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { ambilProfil, logout as apiLogout } from '../lib/api';
import type { Profil } from '../lib/types';

interface AuthNilai {
  profil: Profil | null;
  siap: boolean;
  galat: string | null;
  keluar: () => Promise<void>;
  segarkan: () => Promise<void>;
}

const Ctx = createContext<AuthNilai>({
  profil: null, siap: false, galat: null,
  keluar: async () => {}, segarkan: async () => {},
});

/** Batas waktu pemeriksaan sesi. Tanpa ini halaman berhenti di "Memuat…" selamanya. */
const BATAS_MS = 8000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profil, setProfil] = useState<Profil | null>(null);
  const [siap, setSiap] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const segarkan = useCallback(async () => {
    setGalat(null);
    try {
      // `siap` WAJIB jadi true apa pun yang terjadi (blok finally). Tanpa itu,
      // satu kegagalan jaringan atau token rusak = layar "Memuat…" tanpa akhir,
      // dan pengguna tidak punya jalan keluar selain menutup tab.
      const hasil = await Promise.race<
        { data: { session: Session | null }; error: { message: string } | null }
      >([
        supabase.auth.getSession(),
        new Promise<never>((_, tolak) =>
          setTimeout(() => tolak(new Error(`pemeriksaan sesi melebihi ${BATAS_MS / 1000} detik`)), BATAS_MS),
        ),
      ]);

      if (hasil.error) throw new Error(hasil.error.message);
      if (!hasil.data.session) {
        setProfil(null);
        return;
      }

      const p = await ambilProfil();
      if (!p) {
        // Sesi sah tetapi tidak ada baris profil (mis. akun dibuat di luar seed).
        setGalat('Sesi aktif, tetapi profil pengguna tidak ditemukan. Jalankan `npm run seed` atau hubungi admin sekolah.');
        setProfil(null);
        return;
      }
      setProfil(p);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : 'pemeriksaan sesi gagal');
      setProfil(null);
    } finally {
      setSiap(true);
    }
  }, []);

  useEffect(() => {
    void segarkan();
    // Token refresh / login di tab lain juga memperbarui peran yang dipakai RBAC.
    const { data } = supabase.auth.onAuthStateChange(() => void segarkan());
    return () => data.subscription.unsubscribe();
  }, [segarkan]);

  const nilai = useMemo<AuthNilai>(
    () => ({
      profil, siap, galat,
      keluar: async () => { await apiLogout(); setProfil(null); },
      segarkan,
    }),
    [profil, siap, galat, segarkan],
  );

  return <Ctx.Provider value={nilai}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
