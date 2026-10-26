import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  HeartHandshake,
  History,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';
import { catatAkses, ringkasanWali, simpanConsent, siswaWali } from '../../lib/api';
import type { RingkasanWali } from '../../lib/api';
import type { ConsentStatus, Siswa } from '../../lib/types';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';

/** [F7] Tampilan orang tua: baca-saja, tanpa catatan asesmen, hanya anak tertaut. */

const TEKS_CAPAIAN: Record<string, string> = {
  belum: 'Belum tercapai',
  sebagian: 'Sebagian tercapai',
  tercapai: 'Tercapai',
};

const TEKS_STATUS: Record<ConsentStatus, string> = {
  menunggu: 'Menunggu',
  disetujui: 'Disetujui',
  ditolak: 'Ditolak',
  dicabut: 'Dicabut',
};

const teksGalat = (e: unknown) => (e instanceof Error ? e.message : 'Terjadi kesalahan.');

const tanggal = (v: string | null) => {
  if (!v) return 'Tanpa batas waktu';
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? 'Tanpa batas waktu'
    : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

export default function OrangTuaView() {
  const { id } = useParams<{ id: string }>();
  const wadahRef = useRef<HTMLDivElement>(null);

  const [anak, setAnak] = useState<Siswa[]>([]);
  const [dipilih, setDipilih] = useState(id ?? '');
  const [ringkasan, setRingkasan] = useState<RingkasanWali | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState('');
  const [pesan, setPesan] = useState('');

  useEffect(() => {
    let hidup = true;
    (async () => {
      try {
        const daftar = await siswaWali();
        if (!hidup) return;
        setAnak(daftar);
        setDipilih((p) => p || daftar[0]?.id || '');
      } catch (e) {
        if (hidup) setGalat(teksGalat(e));
      } finally {
        if (hidup) setMemuat(false);
      }
    })();
    return () => {
      hidup = false;
    };
  }, []);

  useEffect(() => {
    if (!dipilih) {
      setRingkasan(null);
      setMemuat(false);
      return;
    }
    let hidup = true;
    setMemuat(true);
    setGalat('');
    setPesan('');
    (async () => {
      try {
        const r = await ringkasanWali(dipilih);
        if (!hidup) return;
        setRingkasan(r);
        void catatAkses('wali_ringkasan', dipilih, { aksi: 'buka' }).catch(() => {});
      } catch (e) {
        if (hidup) {
          setRingkasan(null);
          setGalat(teksGalat(e));
        }
      } finally {
        if (hidup) setMemuat(false);
      }
    })();
    return () => {
      hidup = false;
    };
  }, [dipilih]);

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

  async function ubahPersetujuan(status: 'disetujui' | 'dicabut') {
    if (!dipilih) return;
    if (
      status === 'dicabut' &&
      !window.confirm(
        'Tarik persetujuan berbagi rekam? Sekolah lain tidak lagi bisa meminta rekam anak Anda.',
      )
    ) {
      return;
    }
    setSibuk(true);
    setGalat('');
    setPesan('');
    try {
      await simpanConsent(dipilih, status);
      setRingkasan(await ringkasanWali(dipilih));
      setPesan(
        status === 'disetujui'
          ? 'Persetujuan berbagi rekam berhasil diberikan.'
          : 'Persetujuan berbagi rekam telah dicabut.',
      );
    } catch (e) {
      setGalat(teksGalat(e));
    } finally {
      setSibuk(false);
    }
  }

  const ppi = ringkasan?.ppi ?? null;
  const persetujuan = ringkasan?.persetujuan.filter((c) => c.jenis === 'berbagi_rekam') ?? [];
  const terakhir = persetujuan[0];
  const aktif = terakhir?.status === 'disetujui';

  return (
    <div ref={wadahRef} className="space-y-8">
      {/* Header Portal Orang Tua */}
      <header className="anim-muncul border-b border-[var(--garis)] pb-6">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="font-mono text-xs uppercase tracking-wider">
            F7 · Portal Orang Tua / Wali
          </Badge>
          <span className="text-xs text-[var(--tinta-lembut)]">Transparan & Baca-Saja</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--tinta)] sm:text-4xl">
              Kemajuan Belajar Anak
            </h1>
            <p className="mt-2 text-base text-[var(--tinta-lembut)] max-w-2xl leading-relaxed">
              Ringkasan resmi Program Pembelajaran Individual (PPI) dan log aktivitas belajar anak Anda di sekolah inklusif.
            </p>
          </div>

          {anak.length > 1 && (
            <div className="bg-[var(--kartu)] border border-[var(--garis)] p-3 rounded-sm shrink-0">
              <label htmlFor="pilih-anak" className="block text-[11px] font-mono text-[var(--tinta-lembut)] mb-1">
                PILIH ANAK
              </label>
              <select
                id="pilih-anak"
                value={dipilih}
                onChange={(e) => setDipilih(e.target.value)}
                className="text-sm font-semibold rounded-sm border border-[var(--garis)] bg-white p-1.5 focus:border-[var(--aksen)] outline-hidden"
              >
                {anak.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.inisial} &mdash; Kelas {a.kelas} ({a.kode})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </header>

      {/* Umpan Balik Status */}
      {galat && (
        <div className="anim-muncul rounded-sm border border-[var(--galat)] bg-red-50/50 p-4 text-[var(--galat)] text-sm flex items-start gap-3" role="alert">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Terjadi Kendala</p>
            <p>{galat}</p>
          </div>
        </div>
      )}
      {pesan && (
        <div className="anim-muncul rounded-sm border border-[var(--berhasil)] bg-emerald-50/50 p-4 text-[var(--berhasil)] text-sm flex items-center gap-3" role="status">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-[var(--berhasil)]" />
          <span className="font-medium">{pesan}</span>
        </div>
      )}

      {memuat ? (
        <div className="p-16 text-center border border-[var(--garis)] bg-[var(--kartu)] rounded-sm">
          <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-[var(--aksen)] border-t-transparent" />
          <p className="mt-3 text-sm text-[var(--tinta-lembut)] font-mono">Memuat data anak & PPI...</p>
        </div>
      ) : !ringkasan ? (
        <div className="p-8 text-center border border-[var(--garis)] bg-[var(--kartu)] rounded-sm space-y-2">
          <Users className="w-10 h-10 mx-auto text-[var(--tinta-lembut)] opacity-40 mb-2" />
          <p className="font-medium text-[var(--tinta)]">Belum ada anak yang tertaut</p>
          <p className="text-sm text-[var(--tinta-lembut)] max-w-md mx-auto">
            Hubungi koordinator inklusi atau staf sekolah untuk menautkan akun wali Anda dengan identitas siswa.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Kolom Kiri: PPI & Sesi (8 Kolom) */}
          <section className="anim-muncul lg:col-span-8 space-y-8">
            {/* Kartu Profil Anak */}
            <div className="border border-[var(--garis)] bg-[var(--kartu)] rounded-sm p-6">
              <div className="flex items-center gap-2 border-b border-[var(--garis)] pb-3 mb-4">
                <User className="w-4 h-4 text-[var(--aksen)]" />
                <h2 className="font-display text-lg font-bold text-[var(--tinta)]">Identitas Peserta Didik</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm font-mono">
                <div>
                  <span className="text-[11px] text-[var(--tinta-lembut)] block">KODE PSEUDONIM</span>
                  <span className="font-bold text-[var(--tinta)]">{ringkasan.siswa.kode}</span>
                </div>
                <div>
                  <span className="text-[11px] text-[var(--tinta-lembut)] block">INISIAL</span>
                  <span className="font-bold text-[var(--tinta)]">{ringkasan.siswa.inisial}</span>
                </div>
                <div>
                  <span className="text-[11px] text-[var(--tinta-lembut)] block">KELAS</span>
                  <span className="font-bold text-[var(--tinta)]">{ringkasan.siswa.kelas}</span>
                </div>
                <div>
                  <span className="text-[11px] text-[var(--tinta-lembut)] block">SEKOLAH</span>
                  <span className="font-bold text-[var(--tinta)] truncate block">{ringkasan.sekolah}</span>
                </div>
              </div>
            </div>

            {/* Program Pembelajaran Individual (PPI) */}
            <div className="border border-[var(--garis)] bg-[var(--kartu)] rounded-sm p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-[var(--garis)] pb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[var(--aksen)]" />
                  <h2 className="font-display text-xl font-bold text-[var(--tinta)]">Rencana Pembelajaran (PPI)</h2>
                </div>
                {ppi && (
                  <Badge variant="outline" className="font-mono text-xs">
                    Versi {ppi.versi} · {tanggal(ppi.diperbarui)}
                  </Badge>
                )}
              </div>

              {ppi ? (
                <div className="space-y-6">
                  {ppi.ringkasan && (
                    <div className="bg-[var(--latar-lembut)]/30 p-4 rounded-sm border border-[var(--garis)]">
                      <span className="text-xs font-mono font-semibold text-[var(--tinta-lembut)] block mb-1">
                        RINGKASAN PROGRAM
                      </span>
                      <p className="text-sm text-[var(--tinta)] leading-relaxed italic">
                        &ldquo;{ppi.ringkasan}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Target & Indikator */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-sm text-[var(--tinta)]">Target Pembelajaran Terukur</h3>
                    <div className="space-y-2.5">
                      {ppi.tujuan.map((t, idx) => (
                        <div key={idx} className="p-3 border border-[var(--garis)] rounded-sm text-sm bg-white space-y-1">
                          <p className="font-medium text-[var(--tinta)]">{t.tujuan}</p>
                          <p className="text-xs text-[var(--tinta-lembut)] font-mono flex items-center gap-1">
                            <span>Indikator:</span>
                            <span className="text-[var(--tinta)]">{t.indikator}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Akomodasi Disetujui */}
                  <div className="space-y-3 border-t border-[var(--garis)] pt-4">
                    <h3 className="font-bold text-sm text-[var(--tinta)]">Dukungan Akomodasi di Kelas</h3>
                    <div className="flex flex-wrap gap-2">
                      {ppi.akomodasi.map((a, idx) => (
                        <span
                          key={idx}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-xs font-medium ${
                            a.disetujui
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                              : 'border-gray-200 bg-gray-50 text-gray-500 line-through'
                          }`}
                        >
                          {a.disetujui ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : null}
                          {a.nama}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[var(--tinta-lembut)] py-4">Belum ada draf PPI tersimpan untuk anak ini.</p>
              )}
            </div>

            {/* 10 Sesi Pendampingan Terakhir */}
            <div className="border border-[var(--garis)] bg-[var(--kartu)] rounded-sm p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-[var(--garis)] pb-3">
                <Clock className="w-4 h-4 text-[var(--aksen)]" />
                <h2 className="font-display text-lg font-bold text-[var(--tinta)]">Catatan Perkembangan Sesi</h2>
              </div>
              <p className="text-xs text-[var(--tinta-lembut)]">
                10 sesi pendampingan terakhir yang dicatat oleh guru kelas dan guru pendamping khusus.
              </p>

              {ringkasan.sesi.length === 0 ? (
                <p className="text-xs text-[var(--tinta-lembut)] py-3">Belum ada sesi pendampingan tercatat.</p>
              ) : (
                <div className="space-y-3">
                  {ringkasan.sesi.map((s, idx) => (
                    <div key={idx} className="p-3 border border-[var(--garis)] rounded-sm text-xs space-y-1 bg-transparent">
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-[var(--tinta-lembut)]">{tanggal(s.tanggal)}</span>
                        <Badge
                          variant={s.capaian === 'tercapai' ? 'default' : 'secondary'}
                          className={`text-[10px] uppercase font-mono ${
                            s.capaian === 'tercapai' ? 'bg-emerald-700 text-white' : ''
                          }`}
                        >
                          {TEKS_CAPAIAN[s.capaian] ?? s.capaian}
                        </Badge>
                      </div>
                      <p className="text-sm text-[var(--tinta)] mt-1">{s.catatan || 'Tanpa catatan khusus.'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Kolom Kanan: Persetujuan Berbagi Rekam (F8 Transfer Consent) */}
          <aside className="anim-muncul lg:col-span-4 space-y-6">
            <div className="border border-[var(--garis)] bg-[var(--kartu)] rounded-sm p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-[var(--garis)] pb-3">
                <ShieldCheck className="w-4 h-4 text-[var(--aksen)]" />
                <h2 className="font-display text-base font-bold text-[var(--tinta)]">Persetujuan Berbagi Rekam</h2>
              </div>

              <p className="text-xs text-[var(--tinta-lembut)] leading-relaxed">
                Sesuai prinsip kedaulatan data dan UU PDP, sekolah tujuan hanya dapat mengakses rekam PPI jika orang tua/wali
                telah memberikan persetujuan aktif secara tertulis di sistem.
              </p>

              <div className={`p-4 rounded-sm border text-xs space-y-2 ${
                aktif ? 'border-emerald-300 bg-emerald-50/60' : 'border-amber-300 bg-amber-50/60'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold">STATUS PERSETUJUAN:</span>
                  <Badge variant={aktif ? 'default' : 'outline'} className={aktif ? 'bg-emerald-700 text-white' : ''}>
                    {terakhir ? TEKS_STATUS[terakhir.status] : 'Belum Ada'}
                  </Badge>
                </div>
                {terakhir && (
                  <p className="text-[11px] text-[var(--tinta-lembut)] font-mono">
                    Berlaku sampai: {tanggal(terakhir.berlaku_hingga)}
                  </p>
                )}
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  type="button"
                  disabled={sibuk || aktif}
                  onClick={() => void ubahPersetujuan('disetujui')}
                  className="w-full text-xs font-medium bg-[var(--aksi)] text-white hover:bg-[var(--aksi-gelap)]"
                >
                  <HeartHandshake className="w-3.5 h-3.5 mr-1.5" />
                  Beri Persetujuan Berbagi Rekam
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={sibuk || !aktif}
                  onClick={() => void ubahPersetujuan('dicabut')}
                  className="w-full text-xs text-red-700 hover:bg-red-50 border-red-200"
                >
                  Tarik / Cabut Persetujuan
                </Button>
              </div>
            </div>

            {/* Riwayat Persetujuan */}
            <div className="border border-[var(--garis)] bg-[var(--kartu)] rounded-sm p-6 space-y-3 text-xs">
              <div className="flex items-center gap-1.5 border-b border-[var(--garis)] pb-2 font-bold">
                <History className="w-3.5 h-3.5 text-[var(--aksen)]" />
                <span>Log Riwayat Persetujuan</span>
              </div>
              {ringkasan.persetujuan.length === 0 ? (
                <p className="text-xs text-[var(--tinta-lembut)]">Belum ada riwayat persetujuan.</p>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto">
                  {ringkasan.persetujuan.map((c) => (
                    <div key={c.id} className="p-2 border border-[var(--garis)] rounded-sm font-mono text-[11px] space-y-0.5">
                      <div className="flex justify-between font-bold">
                        <span>{c.jenis.replace('_', ' ').toUpperCase()}</span>
                        <span>{TEKS_STATUS[c.status]}</span>
                      </div>
                      <span className="text-[10px] text-[var(--tinta-lembut)] block">{tanggal(c.dibuat_pada)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
