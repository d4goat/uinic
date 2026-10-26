import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  History,
  Info,
  Lock,
  Save,
} from 'lucide-react';
import {
  catatanAsesmen,
  referensiHambatan,
  riwayatAsesmen,
  saranPpi,
  simpanAsesmen,
} from '../../lib/api';
import type { HambatanRef, PpiSaran, Tingkat } from '../../lib/types';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';

const GAGAL_BACA = 'Catatan terenkripsi tidak dapat didekripsi.';
const TINGKAT: Tingkat[] = ['ringan', 'sedang', 'berat'];
const LABEL: Record<Tingkat, string> = { ringan: 'Ringan', sedang: 'Sedang', berat: 'Berat' };

type BarisRiwayat = {
  id: string;
  tanggal: string;
  assessment_barriers: { tingkat: string; barriers: HambatanRef }[];
  catatan_enc?: string | null;
};

async function bacaCatatan(enc: string | null | undefined): Promise<string | null> {
  const bersih = enc?.trim();
  if (!bersih) return null;
  const hex = bersih.startsWith('\\x') ? bersih : `\\x${bersih}`;
  try {
    return await catatanAsesmen(hex);
  } catch {
    return GAGAL_BACA;
  }
}

const tingkatDari = (nilai: string): Tingkat => (TINGKAT.includes(nilai as Tingkat) ? (nilai as Tingkat) : 'sedang');

function tanggalIndo(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
}

export default function Asesmen() {
  const { id: studentId } = useParams<{ id: string }>();
  const wadahRef = useRef<HTMLDivElement>(null);

  const [hambatanRef, setHambatanRef] = useState<HambatanRef[]>([]);
  const [saran, setSaran] = useState<PpiSaran | null>(null);
  const [riwayat, setRiwayat] = useState<BarisRiwayat[]>([]);
  const [catatanRiwayat, setCatatanRiwayat] = useState<Record<string, string | null>>({});
  const [terpilih, setTerpilih] = useState<Record<string, Tingkat>>({});
  const [catatan, setCatatan] = useState('');
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState('');
  const [berhasil, setBerhasil] = useState('');
  const [menyimpan, setMenyimpan] = useState(false);

  const muat = useCallback(async () => {
    if (!studentId) return;
    setMemuat(true);
    setGalat('');
    try {
      const [ref, saranBaru, riw] = await Promise.all([
        referensiHambatan(),
        saranPpi(studentId).catch(() => null),
        riwayatAsesmen(studentId),
      ]);
      const baris = (riw as BarisRiwayat[]).slice().sort((a, b) => b.tanggal.localeCompare(a.tanggal));
      const idTerbaru = baris.length > 0 ? baris[0].id : null;

      setHambatanRef(ref);
      setSaran(saranBaru);
      setRiwayat(baris);

      const catatanBaru: Record<string, string | null> = {};
      for (const b of baris) {
        catatanBaru[b.id] =
          (await bacaCatatan(b.catatan_enc)) ?? (b.id === idTerbaru ? (saranBaru?.assessment?.catatan ?? null) : null);
      }
      setCatatanRiwayat(catatanBaru);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : 'Data asesmen gagal dimuat.');
    } finally {
      setMemuat(false);
    }
  }, [studentId]);

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

  const alih = (barrierId: string, dicentang: boolean) =>
    setTerpilih((lama) => {
      const baru = { ...lama };
      if (dicentang) baru[barrierId] = lama[barrierId] ?? 'sedang';
      else delete baru[barrierId];
      return baru;
    });

  async function kirim(e: FormEvent) {
    e.preventDefault();
    if (!studentId) return;
    setGalat('');
    setBerhasil('');
    setMenyimpan(true);
    try {
      await simpanAsesmen(
        studentId,
        Object.entries(terpilih).map(([barrier_id, tingkat]) => ({ barrier_id, tingkat })),
        catatan,
      );
      setTerpilih({});
      setCatatan('');
      setBerhasil('Asesmen baru berhasil disimpan dan menjadi dasar rekomendasi PPI.');
      await muat();
    } catch (err) {
      setGalat(err instanceof Error ? err.message : 'Asesmen gagal disimpan.');
    } finally {
      setMenyimpan(false);
    }
  }

  const kode = saran?.student.kode ?? null;
  const inisial = saran?.student.inisial ?? null;
  const jumlahTerpilih = Object.keys(terpilih).length;

  if (!studentId) {
    return (
      <div className="p-6 border border-[var(--galat)] bg-red-50/50 text-[var(--galat)] rounded-sm">
        <p className="font-semibold">Parameter Tidak Lengkap</p>
        <p className="text-sm mt-1">Alamat halaman tidak memuat identitas siswa. Buka asesmen dari menu Data Siswa.</p>
        <Button asChild variant="outline" className="mt-4" size="sm">
          <Link to="/siswa">Kembali ke Daftar Siswa</Link>
        </Button>
      </div>
    );
  }

  return (
    <div ref={wadahRef} className="space-y-8">
      {/* Header Navigasi & Identitas */}
      <header className="anim-muncul border-b border-[var(--garis)] pb-6">
        <div className="flex items-center gap-2 mb-3">
          <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs -ml-2 text-[var(--tinta-lembut)]">
            <Link to="/siswa">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Daftar Siswa
            </Link>
          </Button>
          <span className="text-xs text-[var(--garis)]">/</span>
          <Badge variant="outline" className="font-mono text-xs uppercase tracking-wider">
            F3 · Asesmen Hambatan
          </Badge>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--tinta)] sm:text-4xl">
              Asesmen Hambatan Belajar
            </h1>
            <p className="mt-2 text-base text-[var(--tinta-lembut)] max-w-2xl leading-relaxed">
              Tandai hambatan belajar yang tampak selama pendampingan di kelas. Sistem akan memetakan akomodasi yang
              relevan berdasarkan bukti ilmiah (PRD §6 & §11).
            </p>
          </div>

          {kode && (
            <div className="bg-[var(--kartu)] border border-[var(--garis)] p-3 rounded-sm shrink-0 font-mono text-right">
              <span className="text-[11px] text-[var(--tinta-lembut)] block">SUBJEK ASESMEN</span>
              <span className="text-lg font-bold text-[var(--tinta)]">{kode}</span>
              {inisial && <span className="text-xs text-[var(--tinta-lembut)] block">Inisial: {inisial}</span>}
            </div>
          )}
        </div>
      </header>

      {/* Pesan Kesalahan / Keberhasilan */}
      {galat && (
        <div className="anim-muncul rounded-sm border border-[var(--galat)] bg-red-50/50 p-4 text-[var(--galat)] text-sm flex items-start gap-3" role="alert">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Gagal Menyimpan Asesmen</p>
            <p>{galat}</p>
          </div>
        </div>
      )}
      {berhasil && (
        <div className="anim-muncul rounded-sm border border-[var(--berhasil)] bg-emerald-50/50 p-4 text-[var(--berhasil)] text-sm flex items-center justify-between gap-4" role="status">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-[var(--berhasil)] shrink-0" />
            <span className="font-medium">{berhasil}</span>
          </div>
          <Button asChild size="sm" variant="default" className="shrink-0 bg-[var(--berhasil)] hover:bg-[var(--berhasil)]/90 text-white">
            <Link to={`/siswa/${studentId}/ppi`}>
              Buka Draf PPI
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
          </Button>
        </div>
      )}

      {/* Grid Asimetris: Formulir Observasi (Kolom Kiri 8) + Riwayat Asesmen (Kolom Kanan 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Formulir Hambatan Teramati */}
        <section className="anim-muncul lg:col-span-8 space-y-6">
          <div className="border border-[var(--garis)] bg-[var(--kartu)] rounded-sm p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--garis)] pb-4">
              <div>
                <h2 className="font-display text-xl font-bold text-[var(--tinta)]">Hambatan yang Teramati</h2>
                <p className="text-xs text-[var(--tinta-lembut)] mt-0.5">
                  Centang hambatan dan tetapkan tingkat intensitasnya di lingkungan kelas.
                </p>
              </div>
              <Badge variant="secondary" className="font-mono text-xs">
                {jumlahTerpilih} Dipilih
              </Badge>
            </div>

            {memuat ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[var(--aksen)] border-t-transparent" />
                <p className="mt-2 text-xs text-[var(--tinta-lembut)] font-mono">Memuat referensi hambatan...</p>
              </div>
            ) : (
              <form onSubmit={(e) => void kirim(e)} className="space-y-6">
                <div className="space-y-3">
                  {hambatanRef.map((h) => {
                    const dicentang = h.id in terpilih;
                    const nilaiTingkat = terpilih[h.id] ?? 'sedang';

                    return (
                      <div
                        key={h.id}
                        className={`p-4 border rounded-sm transition-all ${
                          dicentang
                            ? 'border-[var(--aksen)] bg-[var(--aksen)]/5'
                            : 'border-[var(--garis)] hover:border-[var(--garis-kuat)] bg-transparent'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            id={`hambatan-${h.id}`}
                            checked={dicentang}
                            onChange={(e) => alih(h.id, e.target.checked)}
                            className="mt-1 h-4 w-4 rounded border-gray-300 text-[var(--aksen)] focus:ring-[var(--aksen)] cursor-pointer"
                          />
                          <div className="flex-1">
                            <label
                              htmlFor={`hambatan-${h.id}`}
                              className="font-medium text-sm text-[var(--tinta)] cursor-pointer select-none block"
                            >
                              {h.nama}
                            </label>
                            <p className="text-xs text-[var(--tinta-lembut)] mt-0.5 leading-relaxed">
                              {h.deskripsi ?? 'Tanpa deskripsi tambahan.'}
                            </p>

                            {/* Pilihan Tingkat jika dicentang */}
                            {dicentang && (
                              <div className="mt-3 pt-3 border-t border-[var(--garis)] flex flex-wrap items-center gap-3">
                                <span className="text-xs font-mono font-medium text-[var(--tinta)]">
                                  TINGKAT INTENSITAS:
                                </span>
                                <div className="inline-flex rounded-sm border border-[var(--garis)] bg-[var(--kartu)] p-0.5">
                                  {TINGKAT.map((t) => (
                                    <button
                                      key={t}
                                      type="button"
                                      onClick={() =>
                                        setTerpilih((lama) => ({ ...lama, [h.id]: t }))
                                      }
                                      className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${
                                        nilaiTingkat === t
                                          ? 'bg-[var(--aksen)] text-white'
                                          : 'text-[var(--tinta-lembut)] hover:text-[var(--tinta)]'
                                      }`}
                                    >
                                      {LABEL[t]}
                                    </button>
                                  ))}
                                </div>
                                <span className="text-[11px] text-[var(--tinta-lembut)]">
                                  Status: {LABEL[nilaiTingkat]}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Catatan Pengamatan Guru (Terenkripsi) */}
                <div className="border-t border-[var(--garis)] pt-6 space-y-2">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[var(--aksen)]" />
                    <label htmlFor="catatan-pengamatan" className="text-sm font-bold text-[var(--tinta)]">
                      Catatan Guru (Enkripsi End-to-End di Database)
                    </label>
                  </div>
                  <p className="text-xs text-[var(--tinta-lembut)]">
                    Catatan sensitif disimpan terenkripsi dengan pgcrypto dan hanya dapat dibaca oleh staf berwenang.
                  </p>
                  <Textarea
                    id="catatan-pengamatan"
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    placeholder="Contoh: Kesulitan menyalin materi dari papan tulis saat duduk di baris belakang; fokus meningkat ketika dibantu panduan visual langkah demi langkah..."
                    className="min-h-[100px] text-sm"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[var(--garis)]">
                  <span className="text-xs text-[var(--tinta-lembut)] font-mono">
                    * Menyimpan asesmen akan mencatat versi baru dan mengkalkulasi rekomendasi akomodasi PPI.
                  </span>
                  <Button type="submit" disabled={menyimpan} className="shrink-0">
                    <Save className="w-4 h-4 mr-1.5" />
                    {menyimpan ? 'Menyimpan...' : 'Simpan Asesmen'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </section>

        {/* Kolom Kanan: Riwayat Asesmen & Disclaimer (4 Kolom) */}
        <aside className="anim-muncul lg:col-span-4 space-y-6">
          <div className="border border-[var(--garis)] bg-[var(--kartu)] rounded-sm p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--garis)] pb-3">
              <History className="w-4 h-4 text-[var(--aksen)]" />
              <h2 className="font-display text-base font-bold text-[var(--tinta)]">Riwayat Asesmen</h2>
            </div>

            {riwayat.length === 0 ? (
              <p className="text-xs text-[var(--tinta-lembut)] py-4">
                Belum ada riwayat asesmen tersimpan untuk siswa ini.
              </p>
            ) : (
              <div className="space-y-4">
                {riwayat.map((b, urutan) => (
                  <div
                    key={b.id}
                    className={`p-3.5 border rounded-sm text-xs space-y-2 ${
                      urutan === 0
                        ? 'border-[var(--aksen)] bg-[var(--latar-lembut)]/30'
                        : 'border-[var(--garis)] bg-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-[var(--tinta-lembut)] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {tanggalIndo(b.tanggal)}
                      </span>
                      {urutan === 0 && (
                        <Badge variant="outline" className="text-[10px] uppercase font-mono border-[var(--aksen)] text-[var(--aksen)]">
                          Terbaru
                        </Badge>
                      )}
                    </div>

                    {b.assessment_barriers.length === 0 ? (
                      <p className="text-[var(--tinta-lembut)] italic">Tanpa hambatan tercatat.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {b.assessment_barriers.map((ab) => {
                          const t = tingkatDari(ab.tingkat);
                          return (
                            <span
                              key={ab.barriers.id}
                              className="inline-block px-1.5 py-0.5 rounded bg-[var(--kartu)] border border-[var(--garis)] text-[11px]"
                            >
                              {ab.barriers.nama} ({LABEL[t]})
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {catatanRiwayat[b.id] && (
                      <div className="pt-2 border-t border-[var(--garis)] text-[var(--tinta-lembut)] text-[11px] flex items-start gap-1.5">
                        <Lock className="w-3 h-3 shrink-0 mt-0.5 text-[var(--aksen)]" />
                        <span className="line-clamp-3">{catatanRiwayat[b.id]}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Banner Prinsip Transparansi PRD */}
          <div className="border border-[var(--garis)] bg-[var(--latar-lembut)]/50 p-4 rounded-sm space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-[var(--tinta)]">
              <Info className="w-4 h-4 text-[var(--aksen)]" />
              <span>Bukan Diagnosis Medis</span>
            </div>
            <p className="text-[var(--tinta-lembut)] leading-relaxed">
              Hasil asesmen ini merupakan observasi praktis guru di kelas, bukan diagnosis klinis. Rekomendasi akomodasi
              dapat diubah atau disesuaikan sepenuhnya oleh guru dan GPK di editor PPI.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
