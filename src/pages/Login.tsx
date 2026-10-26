import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { login } from '../lib/api';
import RevealText from '../components/RevealText';
import Magnetik from '../components/Magnetik';

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
    <main className="wadah wadah-lebar">
      <section className="hero" aria-labelledby="judul-masuk">
        <p className="meta mb-6">PPI-Link · UINIC 8.0 · subtema pendidikan</p>
        <div className="hero-kisi">
          <div>
            <RevealText id="judul-masuk" kelas="judul-hero" baris={['Masuk ke', 'PPI-Link']} />
            <p className="lede">
              Untuk guru kelas, GPK, koordinator inklusi, dan orang tua. Siswa tidak memerlukan akun.
            </p>
            <ul className="hero-meta">
              <li>
                <span className="meta">Data siswa</span>
                <strong>kode pseudonim, tanpa NIK</strong>
              </li>
              <li>
                <span className="meta">Catatan asesmen &amp; sesi</span>
                <strong>terenkripsi di basis data</strong>
              </li>
              <li>
                <span className="meta">Kewenangan</span>
                <strong>ditegakkan di basis data, bukan di klien</strong>
              </li>
            </ul>
          </div>

          <div className="hero-rail">
            <h2 className="meta mt-0 border-t-0 pt-0">Kredensial</h2>

            {galat && (
              <p className="pesan pesan-galat" role="alert">
                {galat}
              </p>
            )}

            <form onSubmit={kirim} className="kartu" noValidate>
              <p className="mb-4">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </p>
              <p className="mb-6">
                <label htmlFor="sandi">Kata sandi</label>
                <input
                  id="sandi"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={sandi}
                  onChange={(e) => setSandi(e.target.value)}
                />
              </p>
              <Magnetik>
                <button type="submit" disabled={sibuk}>
                  {sibuk ? 'Memeriksa...' : 'Masuk'}
                </button>
              </Magnetik>
            </form>

            <p className="hint inline-flex items-start gap-2">
              <ShieldCheck size={16} aria-hidden="true" />
              <span>
                Akun demo dibuat oleh <code>npm run seed</code>; kata sandinya ada di berkas
                <code> .env.local</code> Anda, bukan di dalam repo.
              </span>
            </p>
          </div>
        </div>
      </section>

      <p className="hint">
        PPI-Link bukan alat diagnosis dan tidak menggantikan asesmen psikolog, terapis, atau GPK.
      </p>
    </main>
  );
}