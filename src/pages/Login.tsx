import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { login } from '../lib/api';
import RevealText from '../components/RevealText';
import Magnetik from '../components/Magnetik';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

export default function Login() {
  const { profil, siap, galat: galatAuth, segarkan } = useAuth();
  const [email, setEmail] = useState('');
  const [sandi, setSandi] = useState('');
  const [galat, setGalat] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const lokasi = useLocation();
  const keadaan = lokasi.state as { dari?: string; galat?: string } | null;
  const dari = keadaan?.dari ?? '/';
  const galatSesi = keadaan?.galat ?? null;

  if (siap && profil) return <Navigate to={dari} replace />;

  async function kirim(e: FormEvent) {
    e.preventDefault();
    setSibuk(true);
    setGalat(null);
    try {
      // Batas waktu: tanpa ini, koneksi yang menggantung membuat tombol bertulis
      // "Memeriksa..." selamanya dan pengguna tidak tahu harus berbuat apa.
      await Promise.race([
        login(email.trim(), sandi),
        new Promise<never>((_, tolak) =>
          setTimeout(() => tolak(new Error('login lewat batas waktu 10 detik')), 10_000),
        ),
      ]);
      await segarkan();
    } catch (err) {
      // Pesan seragam: jangan bocorkan apakah email terdaftar (PRD §7 keamanan).
      setGalat(
        err instanceof Error && /batas waktu/i.test(err.message)
          ? 'Server tidak merespons dalam 10 detik. Periksa koneksi internet lalu coba lagi.'
          : 'Email atau kata sandi tidak cocok.',
      );
    } finally {
      setSibuk(false);
    }
  }

  return (
    <main className="wadah wadah-lebar">
      <section className="hero" aria-labelledby="judul-masuk">
        <Badge
          variant="outline"
          className="meta mb-6 font-sans text-xs uppercase tracking-wider text-tinta-lembut border-garis"
        >
          PPI-Link · UINIC 8.0 · subtema pendidikan
        </Badge>
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
            <Card className="border border-garis bg-kartu shadow-[0_4px_24px_-4px_rgba(30,36,32,0.06)] rounded-2xl overflow-hidden">
              <CardHeader className="pb-3 border-b border-garis/60">
                <CardTitle className="text-base font-bold text-tinta font-display">
                  Kredensial Masuk
                </CardTitle>
                <CardDescription className="text-xs text-tinta-lembut">
                  Masukkan email dan kata sandi akun sekolah Anda
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                {(galat || galatSesi || galatAuth) && (
                  <p className="pesan pesan-galat" role="alert">
                    {/* Kegagalan setelah login (mis. profil tidak terbaca) HARUS terlihat:
                        sebelumnya pesannya hanya tersimpan di konteks dan layar tampak diam. */}
                    {galat ??
                      (galatAuth
                        ? `Masuk berhasil, tetapi profil tidak dapat dimuat: ${galatAuth}`
                        : `Pemeriksaan sesi sebelumnya gagal: ${galatSesi}`)}
                  </p>
                )}

                <form onSubmit={kirim} noValidate className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-sans font-medium text-tinta">
                      Email
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="nama@sekolah.sch.id"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-latar/50 border-garis focus-visible:ring-aksi h-10 text-sm font-sans"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="sandi" className="text-xs font-sans font-medium text-tinta">
                      Kata sandi
                    </Label>
                    <Input
                      id="sandi"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      required
                      value={sandi}
                      onChange={(e) => setSandi(e.target.value)}
                      className="bg-latar/50 border-garis focus-visible:ring-aksi h-10 text-sm font-sans"
                    />
                  </div>

                  <Magnetik>
                    <Button
                      type="submit"
                      disabled={sibuk}
                      className="w-full bg-aksi text-white hover:bg-aksi-gelap transition-all duration-300 h-10 font-semibold rounded-xl cursor-pointer"
                    >
                      {sibuk ? 'Memeriksa...' : 'Masuk'}
                    </Button>
                  </Magnetik>
                </form>
              </CardContent>

              <CardFooter className="pt-3 border-t border-garis/60 bg-latar-lembut/40">
                <p className="hint inline-flex items-start gap-2 mb-0 text-xs">
                  <ShieldCheck size={16} className="text-aksi shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    Akun demo dibuat oleh <code>npm run seed</code>; kata sandinya ada di berkas
                    <code> .env.local</code> Anda, bukan di dalam repo.
                  </span>
                </p>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      <p className="hint">
        PPI-Link bukan alat diagnosis dan tidak menggantikan asesmen psikolog, terapis, atau GPK.
        {' '}<Link to="/landing">Kenali PPI-Link lebih dulu</Link> — apa yang dikerjakan, bukti
        pendukungnya, dan siapa yang meninjau aturan akomodasinya.
      </p>
    </main>
  );
}