import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { login } from '../lib/api';

export default function Login() {
  const { profil, siap, segarkan } = useAuth();
  const [email, setEmail] = useState('');
  const [sandi, setSandi] = useState('');
  const [galat, setGalat] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const lokasi = useLocation();
  const dari = (lokasi.state as { dari?: string } | null)?.dari ?? '/';

  if (siap && profil) return <Navigate to={dari} replace />;

  async function kirim(e: FormEvent) {
    e.preventDefault();
    setSibuk(true);
    setGalat(null);
    try {
      await login(email.trim(), sandi);
      await segarkan();
    } catch (err) {
      // Pesan seragam: jangan bocorkan apakah email terdaftar (PRD §7 keamanan).
      setGalat('Email atau kata sandi tidak cocok.');
      void err;
    } finally {
      setSibuk(false);
    }
  }

  return (
    <main className="wadah" style={{ maxWidth: '26rem', paddingTop: '3rem' }}>
      <h1>Masuk PPI-Link</h1>
      <p className="lede">
        Untuk guru kelas, GPK, koordinator inklusi, dan orang tua. Siswa tidak memerlukan akun.
      </p>
      {galat && <p className="pesan pesan-galat" role="alert">{galat}</p>}
      <form onSubmit={kirim} className="kartu" noValidate>
        <p>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="username" required
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </p>
        <p>
          <label htmlFor="sandi">Kata sandi</label>
          <input id="sandi" name="password" type="password" autoComplete="current-password" required
            value={sandi} onChange={(e) => setSandi(e.target.value)} />
        </p>
        <button type="submit" disabled={sibuk}>{sibuk ? 'Memeriksa…' : 'Masuk'}</button>
      </form>
      <p className="hint">
        Akun demo dibuat oleh <code>npm run seed</code>; kata sandinya diatur di berkas
        <code> .env.local</code> Anda, bukan di dalam repo.
      </p>
    </main>
  );
}
