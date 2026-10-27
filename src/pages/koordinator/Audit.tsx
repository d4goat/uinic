import { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import {
  AlertCircle,
  Database,
  Key,
  RefreshCw,
} from 'lucide-react';
import { daftarAudit } from '../../lib/api';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';

type BarisAudit = Awaited<ReturnType<typeof daftarAudit>>[number];

const waktu = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'medium' });

const labelAksi = (aksi: string) => {
  if (aksi === 'select') return 'Baca Data (select)';
  if (aksi === 'insert') return 'Tambah Data (insert)';
  if (aksi === 'update') return 'Ubah Data (update)';
  if (aksi === 'delete') return 'Hapus Data (delete)';
  if (aksi.startsWith('rpc:')) return `Aplikasi (${aksi})`;
  return aksi;
};

export default function Audit() {
  const wadahRef = useRef<HTMLDivElement>(null);
  const [baris, setBaris] = useState<BarisAudit[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);

  async function muat() {
    setMemuat(true);
    setGalat(null);
    try {
      setBaris(await daftarAudit(50));
    } catch (e) {
      setGalat(e instanceof Error ? e.message : 'Catatan audit gagal dimuat.');
    } finally {
      setMemuat(false);
    }
  }

  useEffect(() => {
    void muat();
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

  return (
    <div ref={wadahRef} className="space-y-8">
      {/* Header Editorial */}
      <header className="anim-muncul border-b border-garis pb-6">
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs uppercase tracking-wider">
              F12 · Rekam Jejak Audit
            </Badge>
            <span className="text-xs text-tinta-lembut">Trigger Postgres DB & Immutable Log</span>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs font-mono"
            onClick={() => void muat()}
            disabled={memuat}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${memuat ? 'animate-spin' : ''}`} />
            {memuat ? 'Memuat...' : 'Segarkan Log'}
          </Button>
        </div>

        <h1 className="font-display text-3xl font-bold tracking-tight text-tinta sm:text-4xl">
          Jejak Audit Sistem
        </h1>
        <p className="mt-2 text-base text-tinta-lembut max-w-3xl leading-relaxed">
          Seluruh mutasi data sensitif (tambah, ubah, hapus) dicatat secara otomatis oleh trigger basis data
          PostgreSQL pada tabel <code>audit_logs</code>. Pembacaan data sensitif dicatat eksplisit oleh aplikasi untuk akuntabilitas hukum.
        </p>
      </header>

      {galat && (
        <div className="anim-muncul rounded-sm border border-galat bg-red-50/50 p-4 text-galat text-sm flex items-start gap-3" role="alert">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Kendala Memuat Audit</p>
            <p>{galat}</p>
          </div>
        </div>
      )}

      {/* Tabel Audit Modern */}
      <section className="anim-muncul border border-garis bg-kartu rounded-2xl shadow-[0_4px_24px_-4px_rgba(30,36,32,0.05)] overflow-hidden">
        <div className="p-4 border-b border-garis bg-latar-lembut/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-aksi" />
            <span className="text-xs font-mono font-bold uppercase text-tinta">50 Entri Audit Terkini</span>
          </div>
          <span className="text-[11px] font-mono text-tinta-lembut">
            Total termuat: <span className="font-bold text-tinta">{baris.length}</span> log
          </span>
        </div>

        {memuat ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-aksen border-t-transparent" />
            <p className="mt-3 text-xs text-tinta-lembut font-mono">Mengambil catatan audit dari database...</p>
          </div>
        ) : baris.length === 0 ? (
          <div className="p-8 text-center text-xs text-tinta-lembut">Belum ada aktivitas tercatat pada tabel audit.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-latar-lembut border-b border-garis font-mono uppercase text-[11px] text-tinta-lembut">
                <tr>
                  <th className="px-4 py-3 font-semibold">Waktu Stempel</th>
                  <th className="px-4 py-3 font-semibold">Aksi</th>
                  <th className="px-4 py-3 font-semibold">Tabel / Objek</th>
                  <th className="px-4 py-3 font-semibold">Objek ID</th>
                  <th className="px-4 py-3 font-semibold">Identitas Pengguna</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--garis)] font-mono">
                {baris.map((b) => {
                  const aksi = b.aksi;
                  const isInsert = aksi === 'insert';
                  const isDelete = aksi === 'delete';
                  const isUpdate = aksi === 'update';

                  return (
                    <tr key={b.id} className="hover:bg-latar-lembut/40 transition-colors">
                      <td className="px-4 py-3 text-tinta-lembut shrink-0 whitespace-nowrap">
                        {waktu(b.waktu)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase ${
                            isInsert
                              ? 'bg-emerald-100 text-emerald-800'
                              : isDelete
                                ? 'bg-red-100 text-red-800'
                                : isUpdate
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {labelAksi(aksi)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-tinta">
                        {b.objek}
                      </td>
                      <td className="px-4 py-3 text-tinta-lembut max-w-[140px] truncate" title={b.objek_id ?? undefined}>
                        {b.objek_id ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        {b.user_id ? (
                          <span className="text-tinta-lembut truncate block max-w-[180px]" title={b.user_id}>
                            {b.user_id}
                          </span>
                        ) : (
                          <Badge variant="outline" className="text-[10px] uppercase font-mono border-amber-300 text-amber-800 bg-amber-50">
                            <Key className="w-3 h-3 mr-1" />
                            Token Transfer
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

