/**
 * F4 + F5 — Inti PPI-Link: Rekomendasi Akomodasi & Draf PPI Berversi.
 * Setiap saran akomodasi wajib tampil bersama alasan, tingkat bukti, dan peninjau
 * dari tabel aturan; guru menyetujui atau menolak. Setiap simpan menambah versi
 * baru — versi lama tidak pernah ditimpa, dan riwayatnya bisa dibandingkan.
 */
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Diff,
  FileText,
  GitCompare,
  History,
  Info,
  Plus,
  Save,
  Sparkles,
  Target,
  Trash2,
  X,
  ShieldCheck,
} from 'lucide-react';
import { ambilPpi, catatAkses, saranPpi, simpanPpi, versiPpi } from '../../lib/api';
import type { Ppi, PpiSaran, PpiVersi, SaranAkomodasi, TingkatBukti } from '../../lib/types';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';

const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function tanggal(nilai: string | null): string {
  if (!nilai) return 'tidak tercatat';
  const pola = /^(\d{4})-(\d{2})-(\d{2})/.exec(nilai);
  if (!pola) return nilai;
  const bulan = BULAN[Number(pola[2]) - 1] ?? pola[2];
  return `${Number(pola[3])} ${bulan} ${pola[1]}`;
}

function teksBukti(t: TingkatBukti): string {
  return `Bukti: ${t.replace('-', ' sampai ')}`;
}

interface Kelompok {
  akomodasi: SaranAkomodasi;
  hambatan: string[];
  alasan: string[];
}

function kelompokkan(daftar: SaranAkomodasi[]): Kelompok[] {
  const peta = new Map<string, Kelompok>();
  for (const a of daftar) {
    const ada = peta.get(a.accommodation_id);
    if (!ada) {
      peta.set(a.accommodation_id, { akomodasi: a, hambatan: [a.dari_hambatan], alasan: [a.alasan] });
      continue;
    }
    if (!ada.hambatan.includes(a.dari_hambatan)) ada.hambatan.push(a.dari_hambatan);
    if (!ada.alasan.includes(a.alasan)) ada.alasan.push(a.alasan);
  }
  return [...peta.values()];
}

interface BarisTujuan {
  kunci: number;
  tujuan: string;
  indikator: string;
}

interface Ubah {
  tujuan: string;
  lama: string;
  baru: string;
}

function hitungBeda(tua: BarisTujuan[], baru: BarisTujuan[]) {
  const inti = (t: { tujuan: string }) => t.tujuan.trim().toLowerCase();
  const petaTua = new Map(tua.map((t) => [inti(t), t]));
  const petaBaru = new Map(baru.map((t) => [inti(t), t]));
  const tambah: string[] = [];
  const hapus: string[] = [];
  const ubah: Ubah[] = [];

  for (const b of baru) {
    const t = petaTua.get(inti(b));
    if (!t) tambah.push(`${b.tujuan} — indikator: ${b.indikator}`);
    else if (t.indikator.trim() !== b.indikator.trim()) {
      ubah.push({ tujuan: b.tujuan, lama: t.indikator, baru: b.indikator });
    }
  }
  for (const t of tua) {
    if (!petaBaru.has(inti(t))) hapus.push(`${t.tujuan} — indikator: ${t.indikator}`);
  }
  return { tambah, hapus, ubah };
}

const pesanGalat = (e: unknown) =>
  e instanceof Error && e.message ? e.message : 'Terjadi kesalahan yang tidak diketahui.';

export default function PpiEditor() {
  const { id: siswaId = '' } = useParams<{ id: string }>();
  const wadahRef = useRef<HTMLDivElement>(null);

  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);
  const [saran, setSaran] = useState<PpiSaran | null>(null);
  const [ppi, setPpi] = useState<Ppi | null>(null);
  const [versi, setVersi] = useState<PpiVersi[]>([]);

  const [ringkasan, setRingkasan] = useState('');
  const [tujuan, setTujuan] = useState<BarisTujuan[]>([]);
  const [keputusan, setKeputusan] = useState<Record<string, { disetujui: boolean; catatan: string }>>({});

  const [galatSimpan, setGalatSimpan] = useState<string | null>(null);
  const [pesanSukses, setPesanSukses] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);

  const [versiDibuka, setVersiDibuka] = useState<PpiVersi | null>(null);
  const [beda, setBeda] = useState<{ tua: number; baru: number; hasil: ReturnType<typeof hitungBeda> } | null>(null);

  const kunciBerikut = useRef(1);
  const buatBaris = (): BarisTujuan => ({ kunci: kunciBerikut.current++, tujuan: '', indikator: '' });

  function isiDariVersi(v?: PpiVersi) {
    if (!v) {
      setTujuan([buatBaris()]);
      return;
    }
    setRingkasan(v.ringkasan ?? '');
    setTujuan(
      v.ppi_goals.length
        ? v.ppi_goals.map((g) => ({ kunci: kunciBerikut.current++, tujuan: g.tujuan, indikator: g.indikator }))
        : [buatBaris()],
    );
    const awal: Record<string, { disetujui: boolean; catatan: string }> = {};
    for (const a of v.ppi_accommodations) {
      awal[a.accommodation_id] = { disetujui: a.disetujui, catatan: a.catatan ?? '' };
    }
    setKeputusan(awal);
  }

  useEffect(() => {
    let aktif = true;
    (async () => {
      setMemuat(true);
      setGalat(null);
      try {
        const s = await saranPpi(siswaId);
        if (!aktif) return;
        setSaran(s);
        void catatAkses('ppi_saran', siswaId, { sumber: 'PpiEditor' }).catch(() => {});
        if (!s.assessment) {
          setMemuat(false);
          return;
        }
        const p = await ambilPpi(siswaId);
        if (!aktif) return;
        setPpi(p);
        if (p) {
          const daftar = await versiPpi(p.id);
          if (!aktif) return;
          setVersi(daftar);
          isiDariVersi(daftar[0]);
        } else {
          setTujuan([buatBaris()]);
        }
        setMemuat(false);
      } catch (e) {
        if (!aktif) return;
        setGalat(pesanGalat(e));
        setMemuat(false);
      }
    })();
    return () => {
      aktif = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siswaId]);

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

  const pilihan = (id: string) => keputusan[id] ?? { disetujui: true, catatan: '' };

  const putuskan = (id: string, disetujui: boolean) =>
    setKeputusan((lama) => ({ ...lama, [id]: { disetujui, catatan: lama[id]?.catatan ?? '' } }));

  const ubahCatatan = (id: string, catatan: string) =>
    setKeputusan((lama) => ({
      ...lama,
      [id]: { disetujui: lama[id]?.disetujui ?? true, catatan },
    }));

  function bukaBeda(versiLama: PpiVersi) {
    const terbaru = versi[0];
    if (!terbaru) return;
    setVersiDibuka(null);
    setBeda({
      tua: versiLama.nomor_versi,
      baru: terbaru.nomor_versi,
      hasil: hitungBeda(
        versiLama.ppi_goals.map((g, i) => ({ kunci: i, tujuan: g.tujuan, indikator: g.indikator })),
        terbaru.ppi_goals.map((g, i) => ({ kunci: i, tujuan: g.tujuan, indikator: g.indikator })),
      ),
    });
  }

  async function simpan(e: FormEvent) {
    e.preventDefault();
    setGalatSimpan(null);
    setPesanSukses(null);
    setBeda(null);

    const bersih = tujuan.map((t) => ({ tujuan: t.tujuan.trim(), indikator: t.indikator.trim() }));
    if (bersih.length === 0) {
      setGalatSimpan('Tambahkan minimal satu tujuan beserta indikatornya sebelum menyimpan.');
      return;
    }
    const belumLengkap = bersih.findIndex((t) => !t.tujuan || !t.indikator);
    if (belumLengkap >= 0) {
      setGalatSimpan(`Baris tujuan ${belumLengkap + 1} belum lengkap: tujuan dan indikator keduanya wajib diisi.`);
      return;
    }

    setSibuk(true);
    try {
      await simpanPpi({
        studentId: siswaId,
        ppiId: ppi?.id ?? null,
        ringkasan,
        tujuan: bersih,
        akomodasi: kelompokkan(saran?.akomodasi ?? []).map((g) => {
          const id = g.akomodasi.accommodation_id;
          const k = pilihan(id);
          return {
            accommodation_id: id,
            disetujui: k.disetujui,
            catatan: k.catatan.trim() === '' ? null : k.catatan.trim(),
          };
        }),
      });

      const p = await ambilPpi(siswaId);
      if (p) {
        setPpi(p);
        const daftar = await versiPpi(p.id);
        setVersi(daftar);
        setPesanSukses(
          daftar.length
            ? `Tersimpan sebagai versi ${daftar[0].nomor_versi} pada ${tanggal(daftar[0].dibuat_pada)}. Versi sebelumnya tetap utuh di riwayat.`
            : 'Draf tersimpan sebagai versi baru.',
        );
      }
    } catch (err) {
      setGalatSimpan(`Gagal menyimpan draf PPI: ${pesanGalat(err)}`);
    } finally {
      setSibuk(false);
    }
  }

  if (memuat) {
    return (
      <div className="p-16 text-center border border-garis bg-kartu rounded-sm">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-aksen border-t-transparent" />
        <p className="mt-3 text-sm text-tinta-lembut font-sans">Memuat saran akomodasi & draf PPI...</p>
      </div>
    );
  }

  if (galat) {
    return (
      <div className="p-6 border border-galat bg-red-50/50 rounded-sm space-y-4">
        <div className="flex items-center gap-2 text-galat font-bold">
          <AlertCircle className="w-5 h-5" />
          <span>Gagal Memuat Draf PPI</span>
        </div>
        <p className="text-sm text-galat">{galat}</p>
        <Button asChild variant="outline" size="sm">
          <Link to="/siswa">Kembali ke Daftar Siswa</Link>
        </Button>
      </div>
    );
  }

  if (!saran || !saran.student) {
    return (
      <div className="p-6 border border-galat bg-red-50/50 rounded-sm space-y-4">
        <p className="text-sm text-galat">Data siswa tidak ditemukan di database.</p>
        <Button asChild variant="outline" size="sm">
          <Link to="/siswa">Kembali ke Daftar Siswa</Link>
        </Button>
      </div>
    );
  }

  const siswa = saran.student;

  if (!saran.assessment) {
    return (
      <div className="space-y-6">
        <header className="border-b border-garis pb-4">
          <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs -ml-2 text-tinta-lembut mb-2">
            <Link to="/siswa">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Daftar Siswa
            </Link>
          </Button>
          <h1 className="font-display text-3xl font-bold tracking-tight text-tinta">
            Draf PPI: {siswa.kode} ({siswa.inisial})
          </h1>
          <p className="text-sm text-tinta-lembut mt-1">Kelas {siswa.kelas}, tahun lahir {siswa.tahun_lahir}.</p>
        </header>

        <div className="p-8 border border-[var(--peringatan)] bg-amber-50/40 rounded-sm space-y-4">
          <div className="flex items-center gap-2 text-[var(--peringatan)] font-bold">
            <Info className="w-5 h-5" />
            <span>Asesmen Belum Ditemukan</span>
          </div>
          <p className="text-sm text-tinta-lembut leading-relaxed max-w-2xl">
            Saran akomodasi PPI dikalkulasi langsung dari profil hambatan yang dicatat pada asesmen guru. Siswa ini belum
            memiliki catatan asesmen, sehingga draf PPI belum dapat disusun secara terarah.
          </p>
          <Button asChild className="bg-[var(--aksen)] hover:bg-[var(--aksen)]/90 text-white">
            <Link to={`/siswa/${siswaId}/asesmen`}>
              <Sparkles className="w-4 h-4 mr-1.5" />
              Isi Asesmen Hambatan Sekarang
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const kelompok = kelompokkan(saran.akomodasi);
  const jumlahSetuju = kelompok.filter((g) => pilihan(g.akomodasi.accommodation_id).disetujui).length;

  return (
    <div ref={wadahRef} className="space-y-8">
      {/* Header Editorial */}
      <header className="anim-muncul border-b border-garis pb-6">
        <div className="flex items-center gap-2 mb-3">
          <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs -ml-2 text-tinta-lembut">
            <Link to="/siswa">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Daftar Siswa
            </Link>
          </Button>
          <span className="text-xs text-[var(--garis)]">/</span>
          <Badge variant="outline" className="font-sans text-xs uppercase tracking-wider">
            F4 & F5 · Draf PPI Berversi
          </Badge>
          {ppi && (
            <Badge variant="secondary" className="font-sans text-xs">
              Versi Aktif: v{ppi.versi_aktif}
            </Badge>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-tinta sm:text-4xl">
              Program Pembelajaran Individual
            </h1>
            <p className="mt-2 text-base text-tinta-lembut max-w-2xl leading-relaxed">
              Saran akomodasi diturunkan transparan dari aturan berbasis bukti. Setiap perubahan tersimpan sebagai versi baru
              tanpa menghilangkan riwayat sebelumnya.
            </p>
          </div>

          <div className="bg-kartu border border-garis p-3 rounded-sm shrink-0 font-sans text-right">
            <span className="text-[11px] text-tinta-lembut block">SUBJEK SISWA</span>
            <span className="text-lg font-bold text-tinta">{siswa.kode} ({siswa.inisial})</span>
            <span className="text-xs text-tinta-lembut block">Kelas {siswa.kelas} · Asesmen: {tanggal(saran.assessment.tanggal)}</span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
          <Link
            to={`/siswa/${siswaId}/asesmen`}
            className="text-aksi hover:underline inline-flex items-center gap-1 font-medium"
          >
            <Sparkles className="w-3.5 h-3.5 text-aksen" />
            Tinjau Asesmen Hambatan Terakhir
          </Link>
          {ppi && (
            <>
              <span className="text-[var(--garis)]">·</span>
              <Link
                to={`/ppi/${ppi.id}/sesi`}
                className="text-aksi hover:underline inline-flex items-center gap-1 font-medium"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Buka Log Sesi Pendampingan (F6)
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Alert Status */}
      {galatSimpan && (
        <div className="anim-muncul rounded-sm border border-galat bg-red-50/50 p-4 text-galat text-sm flex items-start gap-3" role="alert">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Penyimpanan Gagal</p>
            <p>{galatSimpan}</p>
          </div>
        </div>
      )}
      {pesanSukses && (
        <div className="anim-muncul rounded-sm border border-berhasil bg-emerald-50/50 p-4 text-berhasil text-sm flex items-center justify-between gap-4" role="status">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-berhasil shrink-0" />
            <span className="font-medium">{pesanSukses}</span>
          </div>
          {ppi && (
            <Button asChild size="sm" variant="outline" className="border-berhasil text-berhasil hover:bg-emerald-50 shrink-0">
              <Link to={`/ppi/${ppi.id}/sesi`}>
                Catat Sesi
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          )}
        </div>
      )}

      {/* Banner Etika Non-Diagnosis (design.md Modul 2) */}
      <div className="anim-muncul rounded-2xl border border-garis bg-latar-lembut/70 p-4 text-xs text-tinta-lembut flex items-center gap-3 shadow-xs">
        <div className="w-8 h-8 rounded-xl bg-aksi-lembut text-aksi flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <p className="leading-relaxed">
          <strong className="text-tinta font-semibold">Prinsip Etika & Aksesibilitas:</strong> Catatan ini merupakan observasi fungsional pembelajaran untuk penyusunan akomodasi, <strong className="text-tinta">bukan diagnosis medis atau psikologis</strong>.
        </p>
      </div>

      {/* Layout Editor: Form Input (Kiri 8) + Versi & Riwayat (Kanan 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Kolom Kiri: Form PPI */}
        <section className="anim-muncul lg:col-span-8 space-y-8">
          <form onSubmit={simpan} noValidate className="space-y-8">
            {/* 1. Rekomendasi Akomodasi dari Aturan */}
            <div className="border border-garis bg-kartu rounded-2xl shadow-[0_4px_24px_-4px_rgba(30,36,32,0.05)] p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-garis pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-aksen" />
                    <h2 className="font-display text-xl font-bold text-tinta">Saran Akomodasi Aturan</h2>
                  </div>
                  <p className="text-xs text-tinta-lembut mt-1">
                    Dihitung dari {saran.hambatan.length} hambatan teramati. Guru memegang kendali penuh untuk menerima/menolak.
                  </p>
                </div>
                <Badge variant="outline" className="font-sans text-xs self-start sm:self-auto">
                  {jumlahSetuju} Disetujui dari {kelompok.length}
                </Badge>
              </div>

              {kelompok.length === 0 ? (
                <p className="text-sm text-tinta-lembut py-4">
                  Tidak ada aturan spesifik yang cocok untuk kombinasi hambatan saat ini. Anda tetap dapat menentukan tujuan belajar mandiri di bawah.
                </p>
              ) : (
                <div className="space-y-4">
                  {kelompok.map((g) => {
                    const a = g.akomodasi;
                    const id = a.accommodation_id;
                    const k = pilihan(id);
                    const idc = `akomodasi-${id}`;

                    return (
                      <div
                        key={id}
                        className={`p-4 border rounded-sm transition-all space-y-3 ${
                          k.disetujui
                            ? 'border-garis bg-transparent'
                            : 'border-red-200 bg-red-50/20 opacity-80'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div>
                            <h3 className="font-bold text-sm text-tinta flex items-center gap-2">
                              {a.nama}
                              <Badge
                                variant={a.tingkat_bukti === 'kuat' ? 'default' : 'secondary'}
                                className="font-sans text-[10px] uppercase font-normal"
                              >
                                {teksBukti(a.tingkat_bukti)}
                              </Badge>
                            </h3>
                            <p className="text-xs text-tinta-lembut mt-1">
                              Dari hambatan: <span className="font-medium text-tinta">{g.hambatan.join(', ')}</span>
                              {a.sumber && ` · Sumber: ${a.sumber}`}
                            </p>
                          </div>

                          {/* Tombol Radio Keputusan Guru */}
                          <div className="inline-flex rounded-sm border border-garis bg-latar-lembut p-0.5 shrink-0 self-start">
                            <button
                              type="button"
                              onClick={() => putuskan(id, true)}
                              className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-sm transition-colors ${
                                k.disetujui
                                  ? 'bg-[var(--berhasil)] text-white shadow-xs'
                                  : 'text-tinta-lembut hover:text-tinta'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                              Setujui
                            </button>
                            <button
                              type="button"
                              onClick={() => putuskan(id, false)}
                              className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-sm transition-colors ${
                                !k.disetujui
                                  ? 'bg-[var(--galat)] text-white shadow-xs'
                                  : 'text-tinta-lembut hover:text-tinta'
                              }`}
                            >
                              <X className="w-3.5 h-3.5" />
                              Tolak
                            </button>
                          </div>
                        </div>

                        {a.deskripsi && (
                          <p className="text-xs text-tinta leading-relaxed bg-latar-lembut/30 p-2.5 rounded-sm border border-garis">
                            {a.deskripsi}
                          </p>
                        )}

                        {g.alasan.map((alasan, i) => (
                          <p key={i} className="text-xs text-tinta-lembut">
                            <span className="font-semibold text-tinta">Alasan ilmiah:</span> {alasan}
                          </p>
                        ))}

                        <div className="text-[11px] font-sans text-tinta-lembut">
                          Ditinjau oleh: {a.ditinjau_oleh} · {tanggal(a.tanggal_tinjau)}
                        </div>

                        {/* Catatan Guru Opsional */}
                        <div className="pt-2 border-t border-garis">
                          <label htmlFor={`${idc}-catatan`} className="block text-[11px] font-sans text-tinta-lembut mb-1">
                            CATATAN PENYESUAIAN GURU (OPSIONAL):
                          </label>
                          <Input
                            id={`${idc}-catatan`}
                            value={k.catatan}
                            maxLength={300}
                            onChange={(e) => ubahCatatan(id, e.target.value)}
                            placeholder="Catatan penerapan di kelas, modifikasi alat, atau alasan penolakan..."
                            className="text-xs h-8"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Tujuan & Indikator Terukur */}
            <div className="border border-garis bg-kartu rounded-sm p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-garis pb-4">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-aksen" />
                  <h2 className="font-display text-xl font-bold text-tinta">Tujuan & Indikator Capaian</h2>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTujuan((lama) => [...lama, buatBaris()])}
                  className="h-8 text-xs font-sans"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Tambah Baris
                </Button>
              </div>

              <div className="space-y-4">
                {tujuan.map((t, i) => (
                  <div key={t.kunci} className="p-4 border border-garis rounded-sm bg-latar-lembut/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-sans text-xs font-bold text-tinta">
                        TARGET #{i + 1}
                      </span>
                      {tujuan.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setTujuan((lama) => lama.filter((b) => b.kunci !== t.kunci))}
                          className="text-galat hover:underline text-xs flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Hapus Target
                        </button>
                      )}
                    </div>

                    <div>
                      <label htmlFor={`tujuan-${t.kunci}`} className="block text-xs font-medium text-tinta mb-1">
                        Rumusan Tujuan Pembelajaran <span className="text-aksen">*</span>
                      </label>
                      <Input
                        id={`tujuan-${t.kunci}`}
                        value={t.tujuan}
                        onChange={(e) =>
                          setTujuan((lama) =>
                            lama.map((b) => (b.kunci === t.kunci ? { ...b, tujuan: e.target.value } : b)),
                          )
                        }
                        placeholder="Contoh: Mampu membaca teks naratif pendek 3 paragraf secara mandiri..."
                        className="text-sm bg-white"
                      />
                    </div>

                    <div>
                      <label htmlFor={`indikator-${t.kunci}`} className="block text-xs font-medium text-tinta mb-1">
                        Indikator Keberhasilan Terukur <span className="text-aksen">*</span>
                      </label>
                      <Input
                        id={`indikator-${t.kunci}`}
                        value={t.indikator}
                        onChange={(e) =>
                          setTujuan((lama) =>
                            lama.map((b) => (b.kunci === t.kunci ? { ...b, indikator: e.target.value } : b)),
                          )
                        }
                        placeholder="Contoh: Akurasi pengenalan kata minimal 80% pada 3 sesi berurutan."
                        className="text-sm bg-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Ringkasan Eksekutif PPI */}
            <div className="border border-garis bg-kartu rounded-sm p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-garis pb-3">
                <FileText className="w-4 h-4 text-aksen" />
                <h2 className="font-display text-lg font-bold text-tinta">Ringkasan Draf PPI</h2>
              </div>
              <p className="text-xs text-tinta-lembut">
                Ikhtisar ringkas yang dapat dibaca oleh kepala sekolah, guru pendamping, dan wali murid di portal orang tua.
              </p>
              <Textarea
                id="ringkasan"
                value={ringkasan}
                onChange={(e) => setRingkasan(e.target.value)}
                placeholder="Tuliskan catatan konsensus tim inklusi, prioritas semester, dan kesepakatan pembagian tugas antar-guru..."
                rows={4}
                className="text-sm"
              />
            </div>

            {/* Tombol Aksi Simpan */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-kartu border border-garis rounded-sm">
              <span className="text-xs text-tinta-lembut font-sans">
                * Simpan akan mempublikasikan versi baru ({versi.length ? `v${versi[0].nomor_versi + 1}` : 'v1'}) tanpa menimpa data lama.
              </span>
              <Button type="submit" disabled={sibuk} className="shrink-0 bg-aksi hover:bg-aksi-gelap text-white">
                <Save className="w-4 h-4 mr-1.5" />
                {sibuk ? 'Menyimpan Versi...' : 'Simpan Sebagai Versi Baru'}
              </Button>
            </div>
          </form>
        </section>

        {/* Kolom Kanan: Riwayat Versi & Diff Inspector */}
        <aside className="anim-muncul lg:col-span-4 space-y-6">
          <div className="border border-garis bg-kartu rounded-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-garis pb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-aksen" />
                <h2 className="font-display text-base font-bold text-tinta">Riwayat Versi PPI</h2>
              </div>
              <Badge variant="outline" className="font-sans text-xs">
                {versi.length} Versi
              </Badge>
            </div>

            {versi.length === 0 ? (
              <p className="text-xs text-tinta-lembut py-4">Belum ada versi PPI yang pernah disimpan.</p>
            ) : (
              <div className="space-y-3">
                {versi.map((v, i) => (
                  <div
                    key={v.id}
                    className={`p-3.5 border rounded-sm text-xs space-y-2 ${
                      i === 0 ? 'border-aksen bg-latar-lembut/30' : 'border-garis'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-sans font-bold text-tinta">
                        Versi {v.nomor_versi}
                      </span>
                      {i === 0 && (
                        <Badge variant="default" className="text-[10px] font-sans uppercase bg-[var(--aksen)] text-white">
                          Aktif
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-tinta-lembut font-sans">
                      {tanggal(v.dibuat_pada)}
                    </p>
                    {v.ringkasan && (
                      <p className="text-xs text-tinta line-clamp-2 italic">
                        &ldquo;{v.ringkasan}&rdquo;
                      </p>
                    )}

                    <div className="pt-2 border-t border-garis flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={() => {
                          setBeda(null);
                          setVersiDibuka((lama) => (lama?.id === v.id ? null : v));
                        }}
                      >
                        {versiDibuka?.id === v.id ? 'Tutup' : 'Lihat Detail'}
                      </Button>
                      {i > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-2 font-sans"
                          onClick={() => bukaBeda(v)}
                        >
                          <GitCompare className="w-3 h-3 mr-1" />
                          Diff vs v{versi[0]?.nomor_versi}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal / Panel Perbandingan Versi (Diff) */}
          {beda && versi[0] && (
            <div className="border border-garis bg-kartu rounded-sm p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-garis pb-2">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Diff className="w-4 h-4 text-aksen" />
                  <span>Perbandingan v{beda.tua} &rarr; v{beda.baru}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setBeda(null)}
                  className="text-xs text-tinta-lembut hover:text-tinta"
                >
                  Tutup
                </button>
              </div>

              {beda.hasil.tambah.length + beda.hasil.hapus.length + beda.hasil.ubah.length === 0 ? (
                <p className="text-xs text-tinta-lembut">Tidak ada perbedaan indikator antara kedua versi.</p>
              ) : (
                <div className="space-y-3 text-xs font-sans">
                  {beda.hasil.tambah.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-emerald-700 font-bold block text-[11px]">+ DITAMBAHKAN:</span>
                      {beda.hasil.tambah.map((t, idx) => (
                        <p key={idx} className="bg-emerald-50 text-emerald-800 p-1.5 rounded-sm border border-emerald-200">
                          {t}
                        </p>
                      ))}
                    </div>
                  )}

                  {beda.hasil.hapus.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-red-700 font-bold block text-[11px]">- DIHAPUS:</span>
                      {beda.hasil.hapus.map((t, idx) => (
                        <p key={idx} className="bg-red-50 text-red-800 p-1.5 rounded-sm border border-red-200">
                          {t}
                        </p>
                      ))}
                    </div>
                  )}

                  {beda.hasil.ubah.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-amber-700 font-bold block text-[11px]">~ INDIKATOR DIUBAH:</span>
                      {beda.hasil.ubah.map((u, idx) => (
                        <div key={idx} className="bg-amber-50 text-amber-900 p-1.5 rounded-sm border border-amber-200 space-y-1">
                          <p className="font-bold">{u.tujuan}</p>
                          <p className="line-through text-red-600">- {u.lama}</p>
                          <p className="text-emerald-700">+ {u.baru}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Detail Versi Tertentu */}
          {versiDibuka && (
            <div className="border border-garis bg-kartu rounded-sm p-5 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-garis pb-2">
                <span className="font-bold">Detail Versi {versiDibuka.nomor_versi}</span>
                <button
                  type="button"
                  onClick={() => setVersiDibuka(null)}
                  className="text-xs text-tinta-lembut hover:text-tinta"
                >
                  Tutup
                </button>
              </div>
              <p className="text-[11px] text-tinta-lembut font-sans">
                Dibuat: {tanggal(versiDibuka.dibuat_pada)}
              </p>
              <div>
                <span className="font-semibold block mb-1">Target Pembelajaran:</span>
                <ul className="list-disc pl-4 space-y-1">
                  {versiDibuka.ppi_goals.map((g) => (
                    <li key={g.id}>
                      <span className="font-medium">{g.tujuan}</span>
                      <br />
                      <span className="text-[11px] text-tinta-lembut font-sans">&rarr; {g.indikator}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

