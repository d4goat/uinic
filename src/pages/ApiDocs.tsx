import { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import {
  Check,
  Code2,
  Copy,
  Database,
  ExternalLink,
  Layers,
  Server,
  Terminal,
} from 'lucide-react';
import { openApiUrl } from '../lib/supabase';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';

/** [F9] Dokumentasi API internal: PostgREST + RPC, apa adanya dari supabase/schema.sql. */

type Rpc = {
  nama: string;
  argumen: string;
  siapa: string;
  catatan: string;
};

const RPC: Rpc[] = [
  {
    nama: 'rpc_assessment_save',
    argumen: 'p_student uuid, p_hambatan jsonb, p_catatan text',
    siapa: 'guru, gpk (authenticated)',
    catatan: 'Menyimpan hambatan terpilih + catatan asesmen (dienkripsi pgcrypto) dalam satu transaksi.',
  },
  {
    nama: 'rpc_ppi_suggest',
    argumen: 'p_student uuid',
    siapa: 'guru, gpk, koordinator, admin, wali tertaut',
    catatan: 'Hanya membaca: hambatan terbaru + akomodasi saran beserta alasan dan tingkat bukti.',
  },
  {
    nama: 'rpc_ppi_save',
    argumen: 'p_student uuid, p_ppi uuid, p_ringkasan text, p_tujuan jsonb, p_akomodasi jsonb',
    siapa: 'guru, gpk (authenticated)',
    catatan: 'Selalu menulis versi baru (nomor_versi naik); riwayat lama tidak pernah ditimpa.',
  },
  {
    nama: 'rpc_session_log',
    argumen: 'p_ppi uuid, p_goal uuid, p_tanggal date, p_status capaian_status, p_catatan text, p_client_uuid uuid',
    siapa: 'guru, gpk (authenticated)',
    catatan: 'Idempoten lewat p_client_uuid, jadi aman dikirim ulang setelah offline.',
  },
  {
    nama: 'rpc_consent_save',
    argumen: 'p_student uuid, p_jenis consent_jenis, p_status consent_status, p_berlaku_hingga timestamptz',
    siapa: 'hanya wali tertaut',
    catatan: 'Jenis persetujuan yang dipakai tampilan orang tua: berbagi_rekam.',
  },
  {
    nama: 'rpc_transfer_create',
    argumen: 'p_student uuid, p_ke_school uuid, p_berlaku_jam int',
    siapa: 'koordinator, admin (authenticated)',
    catatan: 'Butuh persetujuan wali berbagi_rekam aktif; token asli sekali tampil, hash sha256 disimpan di DB.',
  },
  {
    nama: 'rpc_record_fetch',
    argumen: 'p_token text',
    siapa: 'anon & authenticated',
    catatan: 'Token sekali pakai: hangus setelah dibaca. catatan_enc didekripsi di server.',
  },
  {
    nama: 'rpc_student_delete',
    argumen: 'p_student uuid',
    siapa: 'koordinator, admin',
    catatan: 'Hapus data atas permintaan; cascade ke seluruh turunannya (UU PDP compliance).',
  },
  {
    nama: 'rpc_wali_ringkasan',
    argumen: 'p_student uuid',
    siapa: 'hanya wali tertaut',
    catatan: 'Baca-saja ringkasan PPI & 10 sesi terakhir tanpa catatan asesmen internal.',
  },
  {
    nama: 'rpc_log_read',
    argumen: 'p_objek text, p_objek_id text, p_keterangan jsonb',
    siapa: 'authenticated',
    catatan: 'Pencatatan manual pembacaan data sensitif untuk melengkapi trigger audit.',
  },
  {
    nama: 'fn_dec',
    argumen: 'p bytea',
    siapa: 'authenticated saja',
    catatan: 'Fungsi pembantu dekripsi individual (pgp_sym_decrypt).',
  },
];

const TABEL: { nama: string; isi: string }[] = [
  { nama: 'schools, profiles', isi: 'Tenant sekolah dan akun pengguna beserta RBAC role.' },
  { nama: 'students, guardian_links', isi: 'Siswa pseudonim (kode + inisial) dan relasi wali.' },
  { nama: 'barriers, accommodations, barrier_accommodation_rules', isi: 'Tabel referensi hambatan & aturan akomodasi tertinjau manusia.' },
  { nama: 'assessments, assessment_barriers', isi: 'Asesmen hambatan per siswa dengan catatan terenkripsi.' },
  { nama: 'ppis, ppi_versions, ppi_goals, ppi_accommodations', isi: 'PPI berversi, target indikator terukur, dan status persetujuan akomodasi.' },
  { nama: 'sessions', isi: 'Log sesi dengan client_uuid untuk sinkronisasi idempoten.' },
  { nama: 'consents, transfers', isi: 'Persetujuan wali dan token transfer hash SHA-256.' },
  { nama: 'materials, material_variants', isi: 'Materi ajar teks besar dan kalimat pendek.' },
  { nama: 'audit_logs', isi: 'Jejak mutasi data otomatis trigger dan rpc_log_read.' },
];

export default function ApiDocs() {
  const wadahRef = useRef<HTMLDivElement>(null);
  const [salinTeks, setSalinTeks] = useState<string | null>(null);

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
    { scope: wadahRef },
  );

  const salin = async (kode: string, id: string) => {
    try {
      await navigator.clipboard.writeText(kode);
      setSalinTeks(id);
      setTimeout(() => setSalinTeks(null), 2000);
    } catch {
      //
    }
  };

  return (
    <div ref={wadahRef} className="space-y-8">
      {/* Header Dokumentasi API */}
      <header className="anim-muncul border-b border-garis pb-6">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="font-mono text-xs uppercase tracking-wider">
            F9 · Spesifikasi OpenAPI & RPC
          </Badge>
          <span className="text-xs text-tinta-lembut">PostgREST Engine & RLS PostgreSQL</span>
        </div>

        <h1 className="font-display text-3xl font-bold tracking-tight text-tinta sm:text-4xl">
          Dokumentasi Antarmuka Pemrograman (API)
        </h1>
        <p className="mt-2 text-base text-tinta-lembut max-w-3xl leading-relaxed">
          PPI-Link menerapkan arsitektur serverless langsung di atas Supabase Postgres. Otorisasi dan validasi
          ditegakkan di tingkat basis data menggunakan Row Level Security (RLS) dan fungsi tersimpan berpredikat{' '}
          <code>security definer</code>.
        </p>
      </header>

      {/* Grid Arsitektur & OpenAPI Endpoint */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Arsitektur Singkat */}
        <div className="anim-muncul border border-garis bg-kartu rounded-sm p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-garis pb-3">
            <Server className="w-4 h-4 text-aksen" />
            <h2 className="font-display text-base font-bold text-tinta">Arsitektur Tanpa Backend Express</h2>
          </div>
          <ul className="text-xs text-tinta-lembut space-y-2.5 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="font-mono font-bold text-aksen">&rarr;</span>
              <span><strong>Tanpa Middleware Rentan:</strong> Klien memanggil REST PostgREST secara langsung dengan token JWT terotentikasi.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono font-bold text-aksen">&rarr;</span>
              <span><strong>RLS Multi-Tenant:</strong> Isolasi antar-sekolah dan antar-peran (guru, GPK, koordinator, wali) divalidasi oleh engine Postgres.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono font-bold text-aksen">&rarr;</span>
              <span><strong>Enkripsi pgcrypto:</strong> Kolom catatan guru dienkripsi asimetris di dalam tabel database.</span>
            </li>
          </ul>
        </div>

        {/* OpenAPI Specification URL */}
        <div className="anim-muncul border border-garis bg-kartu rounded-sm p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-garis pb-3">
              <Code2 className="w-4 h-4 text-aksen" />
              <h2 className="font-display text-base font-bold text-tinta">Spesifikasi OpenAPI Terbuka</h2>
            </div>
            <p className="text-xs text-tinta-lembut leading-relaxed">
              PostgREST menerbitkan spesifikasi OpenAPI 2.0 / Swagger secara dinamis sesuai skema database aktif.
              Dokumentasi ini selalu sinkron 100% dan tidak pernah basi.
            </p>
            <div className="p-3 bg-latar-lembut border border-garis rounded-sm font-mono text-xs break-all text-tinta">
              {openApiUrl}
            </div>
          </div>

          <Button asChild size="sm" variant="default" className="w-full text-xs font-mono">
            <a href={openApiUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              Buka Spesifikasi OpenAPI JSON
            </a>
          </Button>
        </div>
      </div>

      {/* Tabel Entitas REST */}
      <section className="anim-muncul border border-garis bg-kartu rounded-sm p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-garis pb-3">
          <Database className="w-4 h-4 text-aksen" />
          <h2 className="font-display text-lg font-bold text-tinta">Endpoints Tabel PostgREST (/rest/v1/*)</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          {TABEL.map((t) => (
            <div key={t.nama} className="p-3 border border-garis rounded-sm bg-latar-lembut/20">
              <span className="font-bold text-aksen block">{t.nama}</span>
              <span className="font-sans text-tinta-lembut text-[11px] mt-1 block">{t.isi}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Tabel RPC Functions */}
      <section className="anim-muncul border border-garis bg-kartu rounded-sm overflow-hidden space-y-4 p-6">
        <div className="flex items-center justify-between border-b border-garis pb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-aksen" />
            <h2 className="font-display text-lg font-bold text-tinta">Katalog Fungsi RPC (Remote Procedure Call)</h2>
          </div>
          <Badge variant="outline" className="font-mono text-xs">{RPC.length} Prosedur</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-latar-lembut border-b border-garis font-mono text-[11px] uppercase text-tinta-lembut">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Nama Prosedur</th>
                <th className="px-3 py-2.5 font-semibold">Argumen Input</th>
                <th className="px-3 py-2.5 font-semibold">Hak Otorisasi</th>
                <th className="px-3 py-2.5 font-semibold">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--garis)] font-mono">
              {RPC.map((r) => (
                <tr key={r.nama} className="hover:bg-latar-lembut/30 transition-colors">
                  <td className="px-3 py-2.5 font-bold text-aksen whitespace-nowrap">
                    {r.nama}
                  </td>
                  <td className="px-3 py-2.5 text-tinta max-w-xs truncate" title={r.argumen}>
                    {r.argumen}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <Badge variant="secondary" className="text-[10px] uppercase font-mono">
                      {r.siapa}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 font-sans text-xs text-tinta-lembut">
                    {r.catatan}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Contoh Request cURL */}
      <section className="anim-muncul border border-garis bg-kartu rounded-sm p-6 space-y-6">
        <div className="flex items-center gap-2 border-b border-garis pb-4">
          <Terminal className="w-4 h-4 text-aksen" />
          <h2 className="font-display text-lg font-bold text-tinta">Contoh Permintaan HTTP (cURL)</h2>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5 text-xs">
              <span className="font-bold text-tinta">1. Ambil Rekam dengan Token Sekali Pakai (Tanpa Login)</span>
              <button
                type="button"
                onClick={() =>
                  void salin(
                    `curl -X POST "$SUPABASE_URL/rest/v1/rpc/rpc_record_fetch" \\\n  -H "apikey: $ANON_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"p_token":"<token_transfer>"}'`,
                    'curl-fetch',
                  )
                }
                className="text-aksi hover:underline flex items-center gap-1 font-mono text-[11px]"
              >
                {salinTeks === 'curl-fetch' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                {salinTeks === 'curl-fetch' ? 'Disalin!' : 'Salin cURL'}
              </button>
            </div>
            <pre className="p-3 bg-black text-green-400 font-mono text-xs rounded-sm overflow-x-auto leading-relaxed border border-garis">
{`curl -X POST "$SUPABASE_URL/rest/v1/rpc/rpc_record_fetch" \\
  -H "apikey: $ANON_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"p_token":"<token_transfer>"}'`}
            </pre>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5 text-xs">
              <span className="font-bold text-tinta">2. Minta Rekomendasi Akomodasi PPI (Akun Guru / GPK)</span>
              <button
                type="button"
                onClick={() =>
                  void salin(
                    `curl -X POST "$SUPABASE_URL/rest/v1/rpc/rpc_ppi_suggest" \\\n  -H "apikey: $ANON_KEY" \\\n  -H "Authorization: Bearer $ACCESS_TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -d '{"p_student":"<student_uuid>"}'`,
                    'curl-suggest',
                  )
                }
                className="text-aksi hover:underline flex items-center gap-1 font-mono text-[11px]"
              >
                {salinTeks === 'curl-suggest' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                {salinTeks === 'curl-suggest' ? 'Disalin!' : 'Salin cURL'}
              </button>
            </div>
            <pre className="p-3 bg-black text-green-400 font-mono text-xs rounded-sm overflow-x-auto leading-relaxed border border-garis">
{`curl -X POST "$SUPABASE_URL/rest/v1/rpc/rpc_ppi_suggest" \\
  -H "apikey: $ANON_KEY" \\
  -H "Authorization: Bearer $ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"p_student":"<student_uuid>"}'`}
            </pre>
          </div>
        </div>
      </section>

      {/* Tabel Kode Galat */}
      <section className="anim-muncul border border-garis bg-kartu rounded-sm p-6 space-y-4">
        <h2 className="font-display text-base font-bold text-tinta">Kode Status & Galat PostgreSQL</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[var(--latar-lemaut)] border-b border-garis font-mono text-[11px] uppercase text-tinta-lembut">
              <tr>
                <th className="px-3 py-2 font-semibold">Kode SQLSTATE</th>
                <th className="px-3 py-2 font-semibold">Penyebab Galat</th>
                <th className="px-3 py-2 font-semibold">Tindakan Penyelesaian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--garis)]">
              <tr>
                <td className="px-3 py-2 font-mono font-bold text-red-700">42501 (insufficient_privilege)</td>
                <td className="px-3 py-2">Pelanggaran RLS: akun tidak memiliki hak akses atas tenant sekolah ini.</td>
                <td className="px-3 py-2 text-tinta-lembut">Masuk dengan kredensial staf sekolah yang bersangkutan.</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-mono font-bold text-amber-700">22023 (invalid_parameter_value)</td>
                <td className="px-3 py-2">Token transfer kedaluwarsa, tidak cocok, atau sudah pernah terpakai.</td>
                <td className="px-3 py-2 text-tinta-lembut">Minta koordinator sekolah asal menerbitkan token baru.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

