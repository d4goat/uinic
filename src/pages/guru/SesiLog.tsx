// F6: catat sesi pendampingan terhadap tujuan PPI.
// Tahan offline: sesi yang gagal terkirim dititipkan ke antrean
// perangkat (lib/offline.ts) dan dikirim ulang otomatis; client_uuid membuat
// pengiriman ulang idempoten di sisi server.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  CloudOff,
  History,
  Lock,
  RefreshCw,
  Save,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  catatanAsesmen,
  catatAkses,
  catatSesi,
  daftarSesi,
  rekapCapaian,
  versiPpi,
} from '../../lib/api';
import { antre, bacaAntrean, kirimAntrean } from '../../lib/offline';
import type { Capaian, Sesi, SesiAntrean } from '../../lib/types';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';

type Tujuan = { id: string; tujuan: string; indikator: string };
type Pesan = { jenis: 'berhasil' | 'peringatan' | 'galat'; teks: string };

const LABEL: Record<Capaian, string> = { belum: 'Belum', sebagian: 'Sebagian', tercapai: 'Tercapai' };
const HARI_INI = () => new Date().toISOString().slice(0, 10);
const formatTanggal = (t: string) =>
  new Date(`${t}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

const kunciTujuan = (ppiId: string) => `ppi-link.tujuan.${ppiId}`;
function bacaTujuanTersimpan(ppiId: string): Tujuan[] {
  try {
    return JSON.parse(localStorage.getItem(kunciTujuan(ppiId)) ?? '[]') as Tujuan[];
  } catch {
    return [];
  }
}

export default function SesiLog() {
  const { id: ppiId = '' } = useParams();
  const studentId = (useLocation().state as { studentId?: string } | null)?.studentId ?? null;
  const wadahRef = useRef<HTMLDivElement>(null);

  const [tujuan, setTujuan] = useState<Tujuan[]>([]);
  const [sesi, setSesi] = useState<Sesi[]>([]);
  const [rekap, setRekap] = useState<Record<Capaian, number>>({ belum: 0, sebagian: 0, tercapai: 0 });
  const [antrean, setAntrean] = useState<SesiAntrean[]>([]);
  const [daring, setDaring] = useState(navigator.onLine);
  const [goalId, setGoalId] = useState('');
  const [tanggal, setTanggal] = useState(HARI_INI);
  const [status, setStatus] = useState<Capaian>('sebagian');
  const [catatan, setCatatan] = useState('');
  const [pesan, setPesan] = useState<Pesan | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);
  const [mengirim, setMengirim] = useState(false);

  const muat = useCallback(async () => {
    try {
      const versi = await versiPpi(ppiId);
      const aktif = versi[0];
      const daftar = aktif?.ppi_goals ?? [];
      setTujuan(daftar);
      if (daftar.length) localStorage.setItem(kunciTujuan(ppiId), JSON.stringify(daftar));
    } catch {
      setTujuan(bacaTujuanTersimpan(ppiId));
    }

    try {
      const baris = await daftarSesi(ppiId);
      setSesi(baris);
      for (const s of baris) {
        if (!s.catatan_enc) continue;
        const gagal = () =>
          setSesi((kini) =>
            kini.map((x) => (x.id === s.id ? { ...x, catatan: 'Catatan tidak dapat dibuka.' } : x)));
        catatanAsesmen(s.catatan_enc)
          .then((teks) =>
            setSesi((kini) => kini.map((x) => (x.id === s.id ? { ...x, catatan: teks } : x))))
          .catch(gagal);
      }
    } catch {
      // luring
    }

    try {
      const hitung: Record<Capaian, number> = { belum: 0, sebagian: 0, tercapai: 0 };
      for (const b of await rekapCapaian(ppiId)) hitung[b.status_capaian] += 1;
      setRekap(hitung);
    } catch {
      // luring
    }

    setAntrean(bacaAntrean());
    setMemuat(false);
  }, [ppiId]);

  useEffect(() => {
    if (!ppiId) return;
    void catatAkses('sessions', ppiId, { aksi: 'buka' }).catch(() => {});
    void (async () => {
      await muat();
    })();
  }, [ppiId, muat]);

  useEffect(() => {
    const naik = () => setDaring(true);
    const turun = () => setDaring(false);
    window.addEventListener('online', naik);
    window.addEventListener('offline', turun);
    return () => {
      window.removeEventListener('online', naik);
      window.removeEventListener('offline', turun);
    };
  }, []);

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

  async function simpan(e: FormEvent) {
    e.preventDefault();
    const isi: SesiAntrean = {
      client_uuid: crypto.randomUUID(),
      ppi_id: ppiId,
      goal_id: goalId || null,
      tanggal,
      status_capaian: status,
      catatan,
    };
    setMenyimpan(true);
    try {
      await catatSesi(isi);
      setPesan({ jenis: 'berhasil', teks: 'Sesi tersimpan. Catatan sensitif diamankan dengan pgcrypto.' });
      setGoalId('');
      setCatatan('');
      await muat();
    } catch {
      antre(isi);
      setAntrean(bacaAntrean());
      setGoalId('');
      setCatatan('');
      setPesan({
        jenis: 'peringatan',
        teks: 'Koneksi terputus. Sesi disimpan di antrean lokal perangkat dan otomatis disinkronkan saat online.',
      });
    } finally {
      setMenyimpan(false);
    }
  }

  async function kirim() {
    setMengirim(true);
    try {
      const hasil = await kirimAntrean();
      setAntrean(bacaAntrean());
      setPesan({
        jenis: 'berhasil',
        teks: `Sinkronisasi selesai: ${hasil.terkirim} sesi terkirim, ${hasil.sisa} menunggu.`,
      });
      if (hasil.terkirim) await muat();
    } catch {
      setPesan({ jenis: 'galat', teks: 'Antrean gagal dikirim. Periksa koneksi internet Anda.' });
    } finally {
      setMengirim(false);
    }
  }

  const jumlahSesi = rekap.belum + rekap.sebagian + rekap.tercapai;

  return (
    <div ref={wadahRef} className="space-y-8">
      {/* Header Editorial */}
      <header className="anim-muncul border-b border-garis pb-6">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs -ml-2 text-tinta-lembut">
              <Link to={studentId ? `/siswa/${studentId}/ppi` : '/siswa'}>
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Kembali ke Draf PPI
              </Link>
            </Button>
            <span className="text-xs text-[var(--garis)]">/</span>
            <Badge variant="outline" className="font-mono text-xs uppercase tracking-wider">
              F6 · Log Sesi & Offline Sync
            </Badge>
          </div>

          {/* Indikator Status Jaringan */}
          <div className="flex items-center gap-2 text-xs font-mono">
            {daring ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border border-emerald-300 bg-emerald-50 text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <Wifi className="w-3.5 h-3.5" />
                ONLINE
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border border-amber-300 bg-amber-50 text-amber-800">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <WifiOff className="w-3.5 h-3.5" />
                LURING (OFFLINE)
              </span>
            )}
          </div>
        </div>

        <h1 className="font-display text-3xl font-bold tracking-tight text-tinta sm:text-4xl">
          Log Sesi Pendampingan
        </h1>
        <p className="mt-2 text-base text-tinta-lembut max-w-2xl leading-relaxed">
          Catat capaian tiap sesi terhadap target indikator PPI. Pengisian tahan kondisi luring: data tersimpan di penyimpanan
          lokal dan tersinkronisasi idempoten saat terhubung kembali.
        </p>

        {/* Ringkasan Statistik Capaian */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3.5 border border-garis bg-kartu rounded-sm font-mono">
            <span className="text-xs text-tinta-lembut block">TOTAL SESI</span>
            <span className="text-2xl font-bold text-tinta">{jumlahSesi}</span>
          </div>
          <div className="p-3.5 border border-garis bg-kartu rounded-sm font-mono">
            <span className="text-xs text-emerald-700 block">TERCAPAI</span>
            <span className="text-2xl font-bold text-emerald-800">{rekap.tercapai}</span>
          </div>
          <div className="p-3.5 border border-garis bg-kartu rounded-sm font-mono">
            <span className="text-xs text-amber-700 block">SEBAGIAN</span>
            <span className="text-2xl font-bold text-amber-800">{rekap.sebagian}</span>
          </div>
          <div className="p-3.5 border border-garis bg-kartu rounded-sm font-mono">
            <span className="text-xs text-red-700 block">BELUM</span>
            <span className="text-2xl font-bold text-red-800">{rekap.belum}</span>
          </div>
        </div>
      </header>

      {/* Alert Umpan Balik */}
      {pesan && (
        <div
          className={`anim-muncul rounded-sm border p-4 text-sm flex items-start gap-3 ${
            pesan.jenis === 'berhasil'
              ? 'border-berhasil bg-emerald-50/50 text-berhasil'
              : pesan.jenis === 'peringatan'
                ? 'border-[var(--peringatan)] bg-amber-50/50 text-[var(--peringatan)]'
                : 'border-galat bg-red-50/50 text-galat'
          }`}
          role={pesan.jenis === 'galat' ? 'alert' : 'status'}
        >
          {pesan.jenis === 'berhasil' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-semibold">{pesan.jenis === 'berhasil' ? 'Berhasil' : 'Pemberitahuan'}</p>
            <p>{pesan.teks}</p>
          </div>
        </div>
      )}

      {/* Grid Asimetris: Formulir Sesi (8 Kolom) + Antrean & Riwayat (4 Kolom) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Kolom Kiri: Form Sesi Baru */}
        <section className="anim-muncul lg:col-span-7 space-y-6">
          <div className="border border-garis bg-kartu rounded-sm p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-garis pb-4">
              <Calendar className="w-4 h-4 text-aksen" />
              <h2 className="font-display text-xl font-bold text-tinta">Catat Sesi Baru</h2>
            </div>

            <form onSubmit={(e) => void simpan(e)} className="space-y-5">
              <div>
                <label htmlFor="sesi-tujuan" className="block text-xs font-mono font-medium text-tinta mb-1">
                  TARGET PPI / INDIKATOR
                </label>
                <select
                  id="sesi-tujuan"
                  value={goalId}
                  onChange={(e) => setGoalId(e.target.value)}
                  className="w-full text-sm rounded-sm border border-garis bg-kartu p-2.5 focus:border-aksen focus:ring-1 focus:ring-[var(--aksen)] outline-hidden"
                >
                  <option value="">Tanpa tujuan spesifik (Pengamatan Umum)</option>
                  {tujuan.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.tujuan} &rarr; {t.indikator}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-tinta-lembut block mt-1">
                  Diambil dari tujuan PPI versi aktif untuk menjaga kesinambungan evaluasi.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="sesi-tanggal" className="block text-xs font-mono font-medium text-tinta mb-1">
                    TANGGAL PELAKSANAAN <span className="text-aksen">*</span>
                  </label>
                  <input
                    id="sesi-tanggal"
                    type="date"
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    required
                    className="w-full text-sm rounded-sm border border-garis bg-kartu p-2.5 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-medium text-tinta mb-1">
                    STATUS CAPAIAN <span className="text-aksen">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 border border-garis rounded-sm bg-latar-lembut">
                    {(['belum', 'sebagian', 'tercapai'] as Capaian[]).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setStatus(c)}
                        className={`text-xs py-1.5 font-medium rounded-sm transition-colors ${
                          status === c
                            ? c === 'tercapai'
                              ? 'bg-emerald-700 text-white shadow-xs'
                              : c === 'sebagian'
                                ? 'bg-amber-700 text-white shadow-xs'
                                : 'bg-red-700 text-white shadow-xs'
                            : 'text-tinta-lembut hover:text-tinta'
                        }`}
                      >
                        {LABEL[c]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="sesi-catatan" className="text-xs font-mono font-medium text-tinta flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-aksen" />
                    CATATAN PERILAKU / EVALUASI (TERENKRIPSI)
                  </label>
                  <span className="text-[11px] font-mono text-tinta-lembut">Maks. 500 karakter</span>
                </div>
                <Textarea
                  id="sesi-catatan"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  maxLength={500}
                  placeholder="Deskripsikan respon siswa, tingkat kemandirian, dan hambatan yang muncul selama latihan..."
                  rows={4}
                  className="text-sm"
                />
              </div>

              <div className="pt-2">
                <Button type="submit" disabled={menyimpan || !ppiId} className="w-full sm:w-auto">
                  <Save className="w-4 h-4 mr-1.5" />
                  {menyimpan ? 'Menyimpan Sesi...' : 'Simpan Catatan Sesi'}
                </Button>
              </div>
            </form>
          </div>
        </section>

        {/* Kolom Kanan: Antrean Offline & Riwayat Sesi */}
        <aside className="anim-muncul lg:col-span-5 space-y-6">
          {/* Antrean Offline Card */}
          <div className="border border-garis bg-kartu rounded-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-garis pb-3">
              <div className="flex items-center gap-2">
                <CloudOff className="w-4 h-4 text-aksen" />
                <h2 className="font-display text-base font-bold text-tinta">Antrean Offline Lokal</h2>
              </div>
              <Badge variant={antrean.length > 0 ? 'default' : 'outline'} className="font-mono text-xs">
                {antrean.length} Menunggu
              </Badge>
            </div>

            {antrean.length === 0 ? (
              <p className="text-xs text-tinta-lembut py-2">
                Semua sesi telah tersinkronisasi bersih dengan server.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-tinta-lembut">
                  Data berikut tersimpan aman di browser Anda dan siap dikirimkan saat jaringan kembali:
                </p>
                <div className="space-y-2">
                  {antrean.map((s) => (
                    <div key={s.client_uuid} className="p-3 border border-garis rounded-sm text-xs bg-latar-lembut/30 space-y-1">
                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span>{formatTanggal(s.tanggal)}</span>
                        <Badge variant="secondary" className="text-[10px] uppercase">
                          {LABEL[s.status_capaian]}
                        </Badge>
                      </div>
                      {s.catatan && <p className="text-tinta italic truncate">&ldquo;{s.catatan}&rdquo;</p>}
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void kirim()}
                  disabled={mengirim || !daring}
                  className="w-full text-xs font-mono"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${mengirim ? 'animate-spin' : ''}`} />
                  {mengirim ? 'Mengirim Antrean...' : 'Sinkronkan Sekarang'}
                </Button>
              </div>
            )}
          </div>

          {/* Riwayat Sesi Terkini */}
          <div className="border border-garis bg-kartu rounded-sm p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-garis pb-3">
              <History className="w-4 h-4 text-aksen" />
              <h2 className="font-display text-base font-bold text-tinta">Riwayat Sesi Terkini</h2>
            </div>

            {sesi.length === 0 ? (
              <p className="text-xs text-tinta-lembut py-3">Belum ada riwayat sesi yang tercatat di server.</p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {sesi.map((s) => (
                  <div key={s.id} className="p-3 border border-garis rounded-sm text-xs space-y-1.5 bg-transparent">
                    <div className="flex items-center justify-between font-mono">
                      <span className="text-[11px] text-tinta-lembut flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTanggal(s.tanggal)}
                      </span>
                      <Badge
                        variant={s.status_capaian === 'tercapai' ? 'default' : 'secondary'}
                        className={`text-[10px] font-mono ${
                          s.status_capaian === 'tercapai' ? 'bg-emerald-700 text-white' : ''
                        }`}
                      >
                        {LABEL[s.status_capaian]}
                      </Badge>
                    </div>
                    <p className="text-tinta leading-relaxed">
                      {s.catatan ?? (s.catatan_enc ? 'Memuat catatan terenkripsi...' : 'Tanpa catatan tambahan.')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

