import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  // Gagal cepat + jelas, daripada error 401 misterius nanti.
  throw new Error(
    'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum diisi. Salin .env.example ke .env.local.',
  );
}

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
});

// PostgREST membuka OpenAPI-nya sendiri (F9) — halaman /api-docs menunjuk ke sini.
export const openApiUrl = `${url}/rest/v1/`;
