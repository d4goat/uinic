import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import {
  FileText,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import { catatAkses, daftarSiswa, hapusSiswa, tambahSiswa } from '../../lib/api';
import type { Siswa } from '../../lib/types';
import { useAuth } from '../../auth/AuthContext';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

/** F2 — data siswa pseudonim. Cermin constraint `students` di supabase/schema.sql;
 *  DB tetap memvalidasi ulang, ini hanya supaya galat muncul dekat kolomnya. */
const KODE = /^[A-Z0-9-]{3,12}$/;
const INISIAL = /^[A-Z]{1,3}$/;
const TAHUN_MIN = 1990;
const TAHUN_INI = new Date().getFullYear();

type Isian = { kode: string; inisial: string; tahun_lahir: string; kelas: string };
type GalatIsian = Partial<Record<keyof Isian, string>>;

const ISIAN_KOSONG: Isian = { kode: '', inisial: '', tahun_lahir: '', kelas: '' };

function periksa(f: Isian): GalatIsian {
  const g: GalatIsian = {};
  if (!KODE.test(f.kode)) g.kode = '3-12 karakter, huruf kapital, angka, tanda hubung (misal S-001).';
  if (!INISIAL.test(f.inisial)) g.inisial = '1-3 huruf kapital (misal ARS).';
  const tahun = Number(f.tahun_lahir);
  if (!/^\d{4}$/.test(f.tahun_lahir) || tahun < TAHUN_MIN || tahun > TAHUN_INI) {
    g.tahun_lahir = `Empat angka antara ${TAHUN_MIN} dan ${TAHUN_INI}.`;
  }
  if (!f.kelas.trim()) g.kelas = 'Kelas wajib diisi (misal 7A).';
  return g;
}

export default function SiswaList() {
  const { profil } = useAuth();
  const bolehHapus = profil?.role === 'koordinator' || profil?.role === 'admin';
  const wadahRef = useRef<HTMLDivElement>(null);

  const [daftar, setDaftar] = useState<Siswa[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [cari, setCari] = useState('');
  const [isian, setIsian] = useState<Isian>(ISIAN_KOSONG);
  const [galatIsian, setGalatIsian] = useState<GalatIsian>({});
  const [galat, setGalat] = useState('');
  const [berhasil, setBerhasil] = useState('');
  const [sedangKirim, setSedangKirim] = useState(false);

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat('');
    try {
      setDaftar(await daftarSiswa());
    } catch (e) {
      setGalat(e instanceof Error ? e.message : 'Daftar siswa gagal dimuat.');
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    void muat();
  }, [muat]);

  useGSAP(
    () => {
      gsap.from('.anim-muncul', {
        opacity: 0,
        y: 16,
        stagger: 0.08,
        duration: 0.6,
        ease: 'power3.out',
      });
    },
    { scope: wadahRef, dependencies: [memuat] },
  );

  // Filter di sisi klien: satu sekolah cuma beberapa kelas, jadi tidak perlu bolak-balik server.
  const hasil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    if (!q) return daftar;
    return daftar.filter(
      (s) =>
        s.kode.toLowerCase().includes(q) ||
        s.inisial.toLowerCase().includes(q) ||
        s.kelas.toLowerCase().includes(q),
    );
  }, [daftar, cari]);

  const ubah = (kunci: keyof Isian, nilai: string) => setIsian((lama) => ({ ...lama, [kunci]: nilai }));

  async function kirim(e: FormEvent) {
    e.preventDefault();
    const g = periksa(isian);
    setGalatIsian(g);
    setGalat('');
    setBerhasil('');
    if (Object.keys(g).length > 0) return;

    setSedangKirim(true);
    try {
      const kode = isian.kode;
      await tambahSiswa({
        kode,
        inisial: isian.inisial,
        tahun_lahir: Number(isian.tahun_lahir),
        kelas: isian.kelas.trim(),
      });
      setIsian(ISIAN_KOSONG);
      setBerhasil(`Siswa ${kode} tersimpan.`);
      await muat();
    } catch (err) {
      setGalat(err instanceof Error ? err.message : 'Siswa gagal disimpan.');
    } finally {
      setSedangKirim(false);
    }
  }

  async function hapus(s: Siswa) {
    const setuju = window.confirm(
      `Hapus data siswa ${s.kode}? Asesmen, draf PPI, dan catatan sesinya dihapus permanen dan tidak bisa dikembalikan.`,
    );
    if (!setuju) return;
    setGalat('');
    setBerhasil('');
    try {
      await hapusSiswa(s.id);
      setBerhasil(`Data siswa ${s.kode} dihapus permanen.`);
      await muat();
    } catch (err) {
      setGalat(err instanceof Error ? err.message : 'Data siswa gagal dihapus.');
    }
  }

  // Audit pembacaan: sengaja tidak di-await supaya navigasi tidak pernah menunggu.
  const catatBuka = (id: string) => {
    void catatAkses('students', id, { aksi: 'buka' }).catch(() => undefined);
  };

  return (
    <div ref={wadahRef} className="space-y-8">
      {/* Header Editorial */}
      <header className="anim-muncul border-b border-garis pb-6">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Badge variant="outline" className="font-sans text-xs tracking-wider uppercase">
            F2 · Direktori Siswa
          </Badge>
          <span className="text-xs text-tinta-lembut">Privasi Terjaga Tanpa NIK</span>
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-tinta sm:text-4xl">
          Data Siswa Pseudonim
        </h1>
        <p className="mt-2 text-base text-tinta-lembut max-w-3xl leading-relaxed">
          Siswa diidentifikasi secara anonim menggunakan kode alfanumerik dan inisial. Sesuai prinsip
          minimisasi data (PRD §6 & §7), tidak ada data NIK atau nama lengkap yang disimpan di server.
        </p>
      </header>

      {/* Feedback Alert */}
      {galat && (
        <div className="anim-muncul rounded-md border border-galat bg-red-50/50 p-4 text-galat text-sm flex items-start gap-3" role="alert">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Terjadi Kendala</p>
            <p>{galat}</p>
          </div>
        </div>
      )}
      {berhasil && (
        <div className="anim-muncul rounded-md border border-berhasil bg-emerald-50/50 p-4 text-berhasil text-sm flex items-start gap-3" role="status">
          <UserCheck className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Berhasil</p>
            <p>{berhasil}</p>
          </div>
        </div>
      )}

      {/* Grid Asimetris: Daftar Siswa (2 Kolom) + Tambah Siswa (1 Kolom) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Kolom Kiri: Cari & Tabel Siswa (8 Kolom) */}
        <section className="anim-muncul lg:col-span-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-kartu border border-garis rounded-2xl shadow-xs">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tinta-lembut" />
              <Input
                id="cari-siswa"
                type="search"
                value={cari}
                onChange={(e) => setCari(e.target.value)}
                placeholder="Cari kode, inisial, atau kelas..."
                className="pl-9 h-10 border-garis text-sm bg-transparent rounded-xl"
                aria-label="Cari siswa"
              />
            </div>
            <div className="font-sans text-xs text-tinta-lembut shrink-0 self-center">
              Menampilkan <span className="font-bold text-tinta">{hasil.length}</span> dari {daftar.length} siswa
            </div>
          </div>

          {memuat ? (
            <div className="p-12 text-center border border-garis bg-kartu rounded-2xl shadow-xs">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-aksen border-t-transparent" />
              <p className="mt-3 text-sm text-tinta-lembut font-sans">Memuat direktori siswa...</p>
            </div>
          ) : daftar.length === 0 ? (
            <div className="p-8 text-center border border-garis bg-kartu rounded-2xl shadow-xs">
              <Users className="w-10 h-10 mx-auto text-tinta-lembut opacity-40 mb-3" />
              <p className="font-medium text-tinta">Belum ada siswa di sekolah ini</p>
              <p className="text-sm text-tinta-lembut mt-1 max-w-md mx-auto">
                Tambahkan siswa pertama menggunakan formulir pseudonim di samping untuk mulai menyusun asesmen dan PPI.
              </p>
            </div>
          ) : hasil.length === 0 ? (
            <div className="p-8 text-center border border-garis bg-kartu rounded-2xl shadow-xs">
              <p className="text-sm text-tinta-lembut">
                Tidak ada siswa yang cocok dengan kata kunci &ldquo;{cari.trim()}&rdquo;.
              </p>
              <Button variant="outline" size="sm" onClick={() => setCari('')} className="mt-3 rounded-xl">
                Reset Pencarian
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto border border-garis bg-kartu rounded-2xl shadow-[0_4px_24px_-4px_rgba(30,36,32,0.05)]">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-latar-lembut border-b border-garis font-sans text-xs uppercase text-tinta-lembut">
                  <tr>
                    <th className="px-4 py-3.5 font-semibold">Siswa (Pseudonim)</th>
                    <th className="px-4 py-3.5 font-semibold">Kelas</th>
                    <th className="px-4 py-3.5 font-semibold">Tahun Lahir</th>
                    <th className="px-4 py-3.5 font-semibold text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-garis">
                  {hasil.map((s) => (
                    <tr key={s.id} className="hover:bg-latar-lembut/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-aksi-lembut text-aksi font-bold text-xs flex items-center justify-center shrink-0">
                            {s.inisial}
                          </div>
                          <div>
                            <span className="font-sans font-bold text-tinta block">{s.kode}</span>
                            <span className="text-[11px] text-tinta-lembut block">Inisial: {s.inisial}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="font-sans text-xs rounded-lg">
                          {s.kelas}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-sans text-xs text-tinta-lembut">
                        {s.tahun_lahir}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                            <Link to={`/siswa/${s.id}/asesmen`} onClick={() => catatBuka(s.id)}>
                              <Sparkles className="w-3.5 h-3.5 mr-1 text-aksen" />
                              Asesmen
                            </Link>
                          </Button>
                          <Button asChild size="sm" variant="default" className="h-8 text-xs">
                            <Link to={`/siswa/${s.id}/ppi`} onClick={() => catatBuka(s.id)}>
                              <FileText className="w-3.5 h-3.5 mr-1" />
                              Draf PPI
                            </Link>
                          </Button>
                          {bolehHapus && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-galat hover:bg-red-50"
                              title={`Hapus data siswa ${s.kode}`}
                              onClick={() => void hapus(s)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="sr-only">Hapus {s.kode}</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Kolom Kanan: Tambah Siswa Form (4 Kolom) */}
        <section className="anim-muncul lg:col-span-4">
          <div className="border border-garis bg-kartu rounded-2xl shadow-[0_4px_24px_-4px_rgba(30,36,32,0.05)] p-6 sticky top-24">
            <div className="flex items-center gap-2 mb-4 border-b border-garis pb-3">
              <Plus className="w-4 h-4 text-aksen" />
              <h2 className="font-display text-lg font-bold text-tinta">Tambah Siswa</h2>
            </div>
            <p className="text-xs text-tinta-lembut mb-4">
              Gunakan kode pseudonim acak untuk melindungi privasi peserta didik (sesuai UU PDP & PRD §2).
            </p>

            <form onSubmit={(e) => void kirim(e)} noValidate className="space-y-4">
              <div>
                <label htmlFor="kode-siswa" className="block text-xs font-sans font-medium text-tinta mb-1">
                  KODE SISWA <span className="text-aksen">*</span>
                </label>
                <Input
                  id="kode-siswa"
                  value={isian.kode}
                  onChange={(e) => ubah('kode', e.target.value.toUpperCase())}
                  placeholder="Contoh: S-001"
                  className="font-sans uppercase text-sm"
                  aria-invalid={galatIsian.kode ? true : undefined}
                />
                {galatIsian.kode && (
                  <p className="text-xs text-galat mt-1">{galatIsian.kode}</p>
                )}
                <span className="text-[11px] text-tinta-lembut">3-12 karakter huruf/angka/tanda hubung.</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="inisial-siswa" className="block text-xs font-sans font-medium text-tinta mb-1">
                    INISIAL <span className="text-aksen">*</span>
                  </label>
                  <Input
                    id="inisial-siswa"
                    value={isian.inisial}
                    onChange={(e) => ubah('inisial', e.target.value.toUpperCase())}
                    placeholder="ARS"
                    className="font-sans uppercase text-sm"
                    maxLength={3}
                    aria-invalid={galatIsian.inisial ? true : undefined}
                  />
                  {galatIsian.inisial && (
                    <p className="text-xs text-galat mt-1">{galatIsian.inisial}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="kelas-siswa" className="block text-xs font-sans font-medium text-tinta mb-1">
                    KELAS <span className="text-aksen">*</span>
                  </label>
                  <Input
                    id="kelas-siswa"
                    value={isian.kelas}
                    onChange={(e) => ubah('kelas', e.target.value)}
                    placeholder="7A"
                    className="text-sm"
                    aria-invalid={galatIsian.kelas ? true : undefined}
                  />
                  {galatIsian.kelas && (
                    <p className="text-xs text-galat mt-1">{galatIsian.kelas}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="tahun-siswa" className="block text-xs font-sans font-medium text-tinta mb-1">
                  TAHUN LAHIR <span className="text-aksen">*</span>
                </label>
                <Input
                  id="tahun-siswa"
                  inputMode="numeric"
                  value={isian.tahun_lahir}
                  onChange={(e) => ubah('tahun_lahir', e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="2012"
                  className="font-sans text-sm"
                  aria-invalid={galatIsian.tahun_lahir ? true : undefined}
                />
                {galatIsian.tahun_lahir && (
                  <p className="text-xs text-galat mt-1">{galatIsian.tahun_lahir}</p>
                )}
                <span className="text-[11px] text-tinta-lembut">Rentang {TAHUN_MIN}&ndash;{TAHUN_INI}.</span>
              </div>

              <div className="pt-2">
                <Button type="submit" disabled={sedangKirim} className="w-full">
                  {sedangKirim ? 'Menyimpan...' : 'Simpan Data Siswa'}
                </Button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

