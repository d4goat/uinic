import { useEffect, useMemo, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Download,
  History,
  KeyRound,
  RefreshCw,
  School,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  ambilRekam,
  buatTransfer,
  catatAkses,
  daftarConsent,
  daftarSekolahTujuan,
  daftarSiswa,
  daftarTransfer,
} from '../../lib/api';
import type { Sekolah, Siswa, TransferHasil } from '../../lib/types';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

const MASA_BERLAKU = [
  { jam: 24, label: '24 Jam (1 Hari)' },
  { jam: 72, label: '72 Jam (3 Hari)' },
  { jam: 168, label: '168 Jam (7 Hari)' },
];

type BarisTransfer = Awaited<ReturnType<typeof daftarTransfer>>[number];
type BarisConsent = Awaited<ReturnType<typeof daftarConsent>>[number];

const waktu = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

const adaConsentAktif = (baris: BarisConsent[]) => {
  const terbaru = baris.find((c) => c.jenis === 'berbagi_rekam');
  return (
    !!terbaru &&
    terbaru.status === 'disetujui' &&
    (!terbaru.berlaku_hingga || new Date(terbaru.berlaku_hingga) > new Date())
  );
};

function unduhJson(data: unknown, namaBerkas: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = namaBerkas;
  a.click();
  URL.revokeObjectURL(url);
}

function pesanAmbilRekam(e: unknown): { teks: string; saran: string } {
  const m = e instanceof Error ? e.message : String(e);
  if (/tidak dikenali/i.test(m)) {
    return {
      teks: 'Token tidak dikenali.',
      saran: 'Periksa kembali token yang Anda masukkan. Satu karakter salah membuat token tidak cocok.',
    };
  }
  if (/sudah dipakai/i.test(m)) {
    return {
      teks: 'Token sudah dipakai.',
      saran: 'Token bersifat sekali pakai dan telah hangus. Minta sekolah asal membuat token baru.',
    };
  }
  if (/kedaluwarsa/i.test(m)) {
    return {
      teks: 'Token sudah kedaluwarsa.',
      saran: 'Masa berlaku token telah lewat. Minta sekolah asal membuat token baru.',
    };
  }
  return { teks: 'Rekam gagal diambil.', saran: `Pesan dari server: ${m}` };
}

export default function Transfer() {
  const wadahRef = useRef<HTMLDivElement>(null);

  const [siswa, setSiswa] = useState<Siswa[]>([]);
  const [sekolah, setSekolah] = useState<Sekolah[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galatMuat, setGalatMuat] = useState<string | null>(null);

  const [siswaId, setSiswaId] = useState('');
  const [keSchoolId, setKeSchoolId] = useState('');
  const [jam, setJam] = useState(72);

  const [consent, setConsent] = useState<BarisConsent[] | null>(null);
  const [memuatConsent, setMemuatConsent] = useState(false);
  const [galatConsent, setGalatConsent] = useState<string | null>(null);

  const [hasil, setHasil] = useState<TransferHasil | null>(null);
  const [galatBuat, setGalatBuat] = useState<string | null>(null);
  const [sedangBuat, setSedangBuat] = useState(false);
  const [statusSalin, setStatusSalin] = useState<string | null>(null);
  const [sedangUnduh, setSedangUnduh] = useState(false);

  const [riwayat, setRiwayat] = useState<BarisTransfer[]>([]);
  const [galatRiwayat, setGalatRiwayat] = useState<string | null>(null);

  const [token, setToken] = useState('');
  const [hasilAmbil, setHasilAmbil] = useState<unknown>(null);
  const [galatAmbil, setGalatAmbil] = useState<{ teks: string; saran: string } | null>(null);
  const [sedangAmbil, setSedangAmbil] = useState(false);

  useEffect(() => {
    catatAkses('transfers', '-', { aksi: 'buka' }).catch(() => {});
    (async () => {
      try {
        const [s, sk, tr] = await Promise.all([daftarSiswa(), daftarSekolahTujuan(), daftarTransfer()]);
        setSiswa(s);
        setSekolah(sk);
        setRiwayat(tr);
      } catch (e) {
        setGalatMuat(e instanceof Error ? e.message : 'Daftar siswa dan sekolah gagal dimuat.');
      } finally {
        setMemuat(false);
      }
    })();
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

  const siswaDipilih = useMemo(() => siswa.find((s) => s.id === siswaId) ?? null, [siswa, siswaId]);

  const sekolahTujuan = useMemo(
    () => sekolah.filter((s) => !siswaDipilih || s.id !== siswaDipilih.school_id),
    [sekolah, siswaDipilih],
  );

  const namaSekolah = (id: string) => sekolah.find((s) => s.id === id)?.nama ?? id;

  useEffect(() => {
    setHasil(null);
    setGalatBuat(null);
    setStatusSalin(null);
    setKeSchoolId('');
    if (!siswaId) {
      setConsent(null);
      return;
    }
    setMemuatConsent(true);
    setGalatConsent(null);
    (async () => {
      try {
        setConsent(await daftarConsent(siswaId));
      } catch (e) {
        setConsent(null);
        setGalatConsent(e instanceof Error ? e.message : 'Persetujuan gagal dimuat.');
      } finally {
        setMemuatConsent(false);
      }
    })();
  }, [siswaId]);

  const bolehBuat = Boolean(
    siswaId && keSchoolId && jam > 0 && consent && adaConsentAktif(consent) && !memuatConsent,
  );

  async function salinToken() {
    if (!hasil) return;
    try {
      await navigator.clipboard.writeText(hasil.token);
      setStatusSalin('Token berhasil disalin ke papan klip!');
    } catch {
      setStatusSalin('Gagal menyalin otomatis. Silakan salin teks manual.');
    }
  }

  async function buat() {
    setSedangBuat(true);
    setGalatBuat(null);
    setStatusSalin(null);
    try {
      const h = await buatTransfer(siswaId, keSchoolId, jam);
      setHasil(h);
      setRiwayat(await daftarTransfer());
    } catch (e) {
      const m = e instanceof Error ? e.message : '';
      setGalatBuat(
        /persetujuan/i.test(m)
          ? 'Transfer ditolak: persetujuan aktif orang tua belum ditemukan untuk siswa ini.'
          : `Token gagal dibuat. ${m || 'Coba lagi beberapa saat lagi.'}`,
      );
    } finally {
      setSedangBuat(false);
    }
  }

  async function unduhRekamDenganToken() {
    if (!hasil) return;
    setSedangUnduh(true);
    setGalatBuat(null);
    try {
      const rekam = await ambilRekam(hasil.token);
      unduhJson(rekam, `rekam-ppi-${siswaDipilih?.kode ?? 'siswa'}.json`);
    } catch (e) {
      const { teks, saran } = pesanAmbilRekam(e);
      setGalatBuat(`${teks} ${saran}`);
    } finally {
      setSedangUnduh(false);
    }
  }

  async function muatRiwayat() {
    setGalatRiwayat(null);
    try {
      setRiwayat(await daftarTransfer());
    } catch (e) {
      setGalatRiwayat(e instanceof Error ? e.message : 'Riwayat transfer gagal dimuat.');
    }
  }

  async function ambil() {
    setSedangAmbil(true);
    setGalatAmbil(null);
    setHasilAmbil(null);
    try {
      setHasilAmbil(await ambilRekam(token.trim()));
    } catch (e) {
      setGalatAmbil(pesanAmbilRekam(e));
    } finally {
      setSedangAmbil(false);
    }
  }

  return (
    <div ref={wadahRef} className="space-y-8">
      {/* Header Koordinator */}
      <header className="anim-muncul border-b border-garis pb-6">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="font-mono text-xs uppercase tracking-wider">
            F8 · Protokol Transfer Rekam
          </Badge>
          <span className="text-xs text-tinta-lembut">Otentikasi Kriptografis Token Sekali Pakai</span>
        </div>

        <h1 className="font-display text-3xl font-bold tracking-tight text-tinta sm:text-4xl">
          Transfer Rekam Antar-Sekolah
        </h1>
        <p className="mt-2 text-base text-tinta-lembut max-w-3xl leading-relaxed">
          Koordinator menerbitkan token sekali pakai bertenggat waktu untuk mengirim rekam PPI ke sekolah mitra.
          Transfer dilindungi RLS, wajib mendapatkan persetujuan wali aktif, dan hanya menyimpan sidik hash SHA-256 di basis data.
        </p>
      </header>

      {galatMuat && (
        <div className="anim-muncul rounded-sm border border-galat bg-red-50/50 p-4 text-galat text-sm flex items-start gap-3" role="alert">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Gagal Memuat Data</p>
            <p>{galatMuat}</p>
          </div>
        </div>
      )}

      {/* Grid Asimetris: Buat & Ambil Token (7 Kolom) + Riwayat Transfer (5 Kolom) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Kolom Kiri: Buat Token & Ambil Rekam */}
        <div className="anim-muncul lg:col-span-7 space-y-8">
          {/* 1. Buat Token Transfer */}
          <section className="border border-garis bg-kartu rounded-sm p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-garis pb-4">
              <KeyRound className="w-4 h-4 text-aksen" />
              <h2 className="font-display text-xl font-bold text-tinta">1. Terbitkan Token Transfer</h2>
            </div>

            {memuat ? (
              <div className="p-8 text-center font-mono text-xs text-tinta-lembut">
                Memuat data siswa dan sekolah mitra...
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <label htmlFor="pilih-siswa" className="block text-xs font-mono font-medium text-tinta mb-1">
                    PILIH SISWA <span className="text-aksen">*</span>
                  </label>
                  <select
                    id="pilih-siswa"
                    value={siswaId}
                    onChange={(e) => setSiswaId(e.target.value)}
                    className="w-full text-sm rounded-sm border border-garis bg-kartu p-2.5 font-medium outline-hidden"
                  >
                    <option value="">&mdash; Pilih Siswa yang Akan Ditransfer &mdash;</option>
                    {siswa.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.kode} &mdash; {s.inisial} (Kelas {s.kelas}, {namaSekolah(s.school_id)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Validasi Persetujuan Orang Tua */}
                {siswaId && (
                  <div className="p-3.5 border rounded-sm text-xs space-y-1.5 transition-all">
                    {memuatConsent ? (
                      <span className="text-tinta-lembut font-mono">Memeriksa status persetujuan wali...</span>
                    ) : galatConsent ? (
                      <p className="text-galat">{galatConsent}</p>
                    ) : consent && !adaConsentAktif(consent) ? (
                      <div className="flex items-start gap-2.5 text-amber-800">
                        <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                        <div>
                          <p className="font-bold">Menunggu Persetujuan Orang Tua</p>
                          <p className="text-[11px] text-amber-700 mt-0.5">
                            Belum ada persetujuan aktif dari wali murid. Token transfer tidak dapat dibuat sebelum orang tua memberikan izin di portalnya.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 text-emerald-800">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-semibold">Persetujuan wali murid aktif. Token siap diterbitkan.</span>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label htmlFor="pilih-tujuan" className="block text-xs font-mono font-medium text-tinta mb-1">
                    SEKOLAH TUJUAN <span className="text-aksen">*</span>
                  </label>
                  <select
                    id="pilih-tujuan"
                    value={keSchoolId}
                    onChange={(e) => setKeSchoolId(e.target.value)}
                    disabled={!siswaId}
                    className="w-full text-sm rounded-sm border border-garis bg-kartu p-2.5 outline-hidden disabled:opacity-50"
                  >
                    <option value="">&mdash; Pilih Sekolah Tujuan Transfer &mdash;</option>
                    {sekolahTujuan.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nama} ({s.kode_instansi})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-medium text-tinta mb-1">
                    MASA BERLAKU TOKEN (EXPIRATION)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {MASA_BERLAKU.map((p) => (
                      <button
                        key={p.jam}
                        type="button"
                        onClick={() => setJam(p.jam)}
                        className={`text-xs py-2 px-3 border rounded-sm font-medium transition-all ${
                          jam === p.jam
                            ? 'border-aksen bg-[var(--aksen)]/5 text-aksen font-bold'
                            : 'border-garis text-tinta-lembut hover:text-tinta'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={() => void buat()}
                    disabled={!bolehBuat || sedangBuat}
                    className="w-full sm:w-auto"
                  >
                    <KeyRound className="w-4 h-4 mr-1.5" />
                    {sedangBuat ? 'Menerbitkan Token...' : 'Buat Token Transfer'}
                  </Button>
                </div>

                {galatBuat && (
                  <p className="text-xs text-galat p-3 border border-galat bg-red-50/50 rounded-sm">
                    {galatBuat}
                  </p>
                )}
              </div>
            )}

            {/* Hasil Terbit Token (Sekali Tampil) */}
            {hasil && (
              <div className="p-5 border-2 border-aksen bg-latar-lembut/40 rounded-sm space-y-4">
                <div className="flex items-center gap-2 text-aksen font-bold text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>TOKEN TRANSFER BERHASIL DITERBITKAN</span>
                </div>
                <p className="text-xs text-tinta-lembut leading-relaxed">
                  <strong>Penting:</strong> Token ini hanya ditampilkan satu kali sekarang demi keamanan data.
                  Segera salin dan serahkan kepada koordinator sekolah tujuan.
                </p>

                <div className="p-3 bg-white border border-garis rounded-sm font-mono text-sm break-all font-bold text-tinta select-all">
                  {hasil.token}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="font-mono text-tinta-lembut">
                    Kedaluwarsa: <strong>{waktu(hasil.kedaluwarsa)}</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => void salinToken()} className="text-xs font-mono">
                      <Copy className="w-3.5 h-3.5 mr-1" />
                      Salin Token
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => void unduhRekamDenganToken()}
                      disabled={sedangUnduh}
                      className="text-xs font-mono"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      {sedangUnduh ? 'Mengunduh...' : 'Tes Unduh JSON'}
                    </Button>
                  </div>
                </div>

                {statusSalin && (
                  <p className="text-xs text-emerald-700 font-mono">{statusSalin}</p>
                )}
              </div>
            )}
          </section>

          {/* 2. Ambil Rekam di Sekolah Tujuan */}
          <section className="border border-garis bg-kartu rounded-sm p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-garis pb-4">
              <Download className="w-4 h-4 text-aksen" />
              <h2 className="font-display text-xl font-bold text-tinta">2. Terima Rekam di Sekolah Tujuan</h2>
            </div>
            <p className="text-xs text-tinta-lembut">
              Digunakan oleh sekolah tujuan untuk menukar token transfer dengan bundel data JSON lengkap siswa.
            </p>

            <div className="space-y-4">
              <div>
                <label htmlFor="input-token" className="block text-xs font-mono font-medium text-tinta mb-1">
                  TOKEN TRANSFER DARI SEKOLAH ASAL
                </label>
                <Input
                  id="input-token"
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Tempelkan token transfer di sini..."
                  className="font-mono text-xs"
                />
              </div>

              <Button
                type="button"
                onClick={() => void ambil()}
                disabled={!token.trim() || sedangAmbil}
                className="w-full sm:w-auto"
              >
                {sedangAmbil ? 'Mengambil Data...' : 'Klaim & Ambil Rekam'}
              </Button>

              {galatAmbil && (
                <div className="p-3.5 border border-galat bg-red-50/50 rounded-sm text-xs text-galat space-y-1">
                  <p className="font-bold">{galatAmbil.teks}</p>
                  <p>{galatAmbil.saran}</p>
                </div>
              )}

              {hasilAmbil !== null && (
                <div className="space-y-3 pt-3 border-t border-garis">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Rekam Berhasil Diunduh (Token Hangus)
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs font-mono"
                      onClick={() => unduhJson(hasilAmbil, `rekam-transfer-${token.trim().slice(0, 8)}.json`)}
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      Simpan File JSON
                    </Button>
                  </div>
                  <pre className="p-3 rounded-sm border border-garis bg-black text-green-400 font-mono text-[11px] max-h-64 overflow-y-auto leading-snug">
                    {JSON.stringify(hasilAmbil, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Kolom Kanan: Log Riwayat Transfer (5 Kolom) */}
        <aside className="anim-muncul lg:col-span-5 space-y-6">
          <div className="border border-garis bg-kartu rounded-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-garis pb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-aksen" />
                <h2 className="font-display text-base font-bold text-tinta">Log Aktivitas Transfer</h2>
              </div>
              <Button size="sm" variant="ghost" className="h-7 text-xs px-2 font-mono" onClick={() => void muatRiwayat()}>
                <RefreshCw className="w-3 h-3 mr-1" />
                Muat Ulang
              </Button>
            </div>

            {galatRiwayat && <p className="text-xs text-galat">{galatRiwayat}</p>}

            {riwayat.length === 0 ? (
              <p className="text-xs text-tinta-lembut py-4">Belum ada token transfer tercatat.</p>
            ) : (
              <div className="space-y-3">
                {riwayat.map((r) => {
                  const s = siswa.find((x) => x.id === r.student_id);
                  const sudahDipakai = Boolean(r.dipakai_pada);

                  return (
                    <div key={r.id} className="p-3.5 border border-garis rounded-sm text-xs space-y-2 bg-transparent">
                      <div className="flex items-center justify-between font-mono">
                        <span className="font-bold text-tinta">
                          {s ? `${s.kode} (${s.inisial})` : r.student_id}
                        </span>
                        <Badge
                          variant={sudahDipakai ? 'secondary' : 'default'}
                          className={`text-[10px] uppercase font-mono ${
                            !sudahDipakai ? 'bg-[var(--aksen)] text-white' : ''
                          }`}
                        >
                          {sudahDipakai ? 'Terpakai' : 'Aktif'}
                        </Badge>
                      </div>

                      <div className="text-[11px] text-tinta-lembut space-y-0.5">
                        <p className="flex items-center gap-1">
                          <School className="w-3 h-3" />
                          Tujuan: <span className="font-semibold text-tinta">{namaSekolah(r.ke_school)}</span>
                        </p>
                        <p className="font-mono">Dibuat: {waktu(r.dibuat_pada)}</p>
                        <p className="font-mono">Kedaluwarsa: {waktu(r.kedaluwarsa)}</p>
                        {r.dipakai_pada && (
                          <p className="text-emerald-700 font-mono font-medium">Diambil: {waktu(r.dipakai_pada)}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

