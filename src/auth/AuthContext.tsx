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
  pilihDemo: (profil: Profil | null) => void;
}

const Ctx = createContext<AuthNilai>({
  profil: null,
  siap: false,
  galat: null,
  keluar: async () => {},
  segarkan: async () => {},
  pilihDemo: () => {},
});

/** Batas waktu pemeriksaan sesi. */
const BATAS_MS = 8000;
const STORAGE_DEMO_KEY = 'ppi_demo_profile';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profil, setProfil] = useState<Profil | null>(null);
  const [siap, setSiap] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const pilihDemo = useCallback((p: Profil | null) => {
    if (p) {
      localStorage.setItem(STORAGE_DEMO_KEY, JSON.stringify(p));
      setProfil(p);
    } else {
      localStorage.removeItem(STORAGE_DEMO_KEY);
      setProfil(null);
    }
  }, []);

  const segarkan = useCallback(async () => {
    setGalat(null);
    try {
      // 1. Cek sesi Supabase aktif
      const hasil = await Promise.race<
        { data: { session: Session | null }; error: { message: string } | null }
      >([
        supabase.auth.getSession(),
        new Promise<never>((_, tolak) =>
          setTimeout(() => tolak(new Error(`pemeriksaan sesi melebihi ${BATAS_MS / 1000} detik`)), BATAS_MS),
        ),
      ]);

      if (hasil.error) throw new Error(hasil.error.message);

      if (hasil.data.session) {
        const id = hasil.data.session.user.id;
        const p = await ambilProfil(id);
        if (p) {
          setProfil(p);
          localStorage.removeItem(STORAGE_DEMO_KEY);
          return;
        }
        await new Promise((r) => setTimeout(r, 600));
        const ulang = await ambilProfil(id);
        if (ulang) {
          setProfil(ulang);
          localStorage.removeItem(STORAGE_DEMO_KEY);
          return;
        }
      }

      // 2. Fallback ke sesi demo lokal jika juri/penguji memilih skenario demo
      const demoRaw = localStorage.getItem(STORAGE_DEMO_KEY);
      if (demoRaw) {
        try {
          const parsed = JSON.parse(demoRaw) as Profil;
          if (parsed && parsed.role) {
            setProfil(parsed);
            return;
          }
        } catch {
          localStorage.removeItem(STORAGE_DEMO_KEY);
        }
      }

      setProfil(null);
    } catch (e) {
      // Cek fallback demo jika jaringan terputus
      const demoRaw = localStorage.getItem(STORAGE_DEMO_KEY);
      if (demoRaw) {
        try {
          const parsed = JSON.parse(demoRaw) as Profil;
          if (parsed && parsed.role) {
            setProfil(parsed);
            return;
          }
        } catch {
          // ignore
        }
      }
      setGalat(e instanceof Error ? e.message : 'pemeriksaan sesi gagal');
      setProfil(null);
    } finally {
      setSiap(true);
    }
  }, []);

  useEffect(() => {
    void segarkan();
    const { data } = supabase.auth.onAuthStateChange(() => void segarkan());
    return () => data.subscription.unsubscribe();
  }, [segarkan]);

  const nilai = useMemo<AuthNilai>(
    () => ({
      profil,
      siap,
      galat,
      keluar: async () => {
        localStorage.removeItem(STORAGE_DEMO_KEY);
        try {
          await apiLogout();
        } catch {
          // ignore
        }
        setProfil(null);
      },
      segarkan,
      pilihDemo,
    }),
    [profil, siap, galat, segarkan, pilihDemo],
  );

  return <Ctx.Provider value={nilai}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
