import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { ambilProfil, logout as apiLogout } from '../lib/api';
import type { Profil } from '../lib/types';

interface AuthNilai {
  profil: Profil | null;
  siap: boolean;
  keluar: () => Promise<void>;
  segarkan: () => Promise<void>;
}

const Ctx = createContext<AuthNilai>({
  profil: null, siap: false, keluar: async () => {}, segarkan: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profil, setProfil] = useState<Profil | null>(null);
  const [siap, setSiap] = useState(false);

  const segarkan = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    setProfil(data.session ? await ambilProfil() : null);
    setSiap(true);
  }, []);

  useEffect(() => {
    void segarkan();
    // Token refresh / login di tab lain juga memperbarui peran yang dipakai RBAC.
    const { data } = supabase.auth.onAuthStateChange(() => void segarkan());
    return () => data.subscription.unsubscribe();
  }, [segarkan]);

  const nilai = useMemo<AuthNilai>(
    () => ({
      profil, siap,
      keluar: async () => { await apiLogout(); setProfil(null); },
      segarkan,
    }),
    [profil, siap, segarkan],
  );

  return <Ctx.Provider value={nilai}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
