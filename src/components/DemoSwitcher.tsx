import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  School,
  GraduationCap,
  BookOpen,
  ArrowLeftRight,
  HeartHandshake,
  User,
  Check,
  ChevronDown,
  X,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import type { Profil, Role } from '../lib/types';

export interface AkunDemo {
  id: string;
  nama: string;
  role: Role;
  sekolah: string;
  kodeSekolah: string;
  rute: string;
  deskripsi: string;
  ikon: typeof User;
}

export const DAFTAR_DEMO: AkunDemo[] = [
  {
    id: 'demo-guru-rina',
    nama: 'Bu Rina',
    role: 'guru',
    sekolah: 'SDN Inklusi Harapan A',
    kodeSekolah: 'SIA',
    rute: '/siswa',
    deskripsi: 'Guru kelas: menyusun asesmen hambatan & log sesi belajar harian',
    ikon: GraduationCap,
  },
  {
    id: 'demo-gpk-dimas',
    nama: 'Pak Dimas',
    role: 'gpk',
    sekolah: 'SDN Inklusi Harapan A',
    kodeSekolah: 'SIA',
    rute: '/siswa',
    deskripsi: 'Guru Pendamping Khusus: meninjau saran akomodasi & draf PPI',
    ikon: BookOpen,
  },
  {
    id: 'demo-koordinator-wulan',
    nama: 'Bu Wulan',
    role: 'koordinator',
    sekolah: 'SDN Inklusi Harapan A',
    kodeSekolah: 'SIA',
    rute: '/koordinator',
    deskripsi: 'Koordinator: protokol transfer rekam lintas sekolah & audit log',
    ikon: ArrowLeftRight,
  },
  {
    id: 'demo-orangtua-sari',
    nama: 'Ibu Sari',
    role: 'orang_tua',
    sekolah: 'SDN Inklusi Harapan A',
    kodeSekolah: 'SIA',
    rute: '/orangtua',
    deskripsi: 'Orang tua siswa AN: ringkasan PPI, progres 10 sesi & consent transfer',
    ikon: HeartHandshake,
  },
];

export default function DemoSwitcher() {
  const { profil, pilihDemo } = useAuth();
  const [buka, setBuka] = useState(false);
  const [instansiPilihan, setInstansiPilihan] = useState<'SIA' | 'SHB'>('SIA');
  const navigate = useNavigate();

  const handlePilih = (akun: AkunDemo) => {
    const profilDemo: Profil = {
      id: akun.id,
      school_id: instansiPilihan === 'SIA' ? 'sekolah-sia-demo' : 'sekolah-shb-demo',
      nama: akun.nama,
      email: `${akun.role}@demo.test`,
      role: akun.role,
    };
    pilihDemo(profilDemo);
    setBuka(false);
    navigate(akun.rute);
  };

  const aktif = DAFTAR_DEMO.find((d) => d.role === profil?.role);

  return (
    <div className="relative inline-block text-left">
      {/* Floating Demo Switcher Pill (design.md Modul 1) */}
      <button
        type="button"
        onClick={() => setBuka((p) => !p)}
        className="demo-pill inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border border-garis bg-latar-lembut hover:bg-latar text-tinta transition-colors shadow-xs"
        aria-expanded={buka}
        aria-haspopup="dialog"
        title="Buka panel simulasi skenario demo lomba"
      >
        <Sparkles size={13} className="text-aksi flex-shrink-0" aria-hidden="true" />
        <span className="hidden sm:inline font-mono font-medium text-[11px] text-aksi">DEMO:</span>
        <span className="max-w-[100px] truncate">{aktif ? aktif.nama : 'Pilih Skenario'}</span>
        <ChevronDown size={12} className="opacity-60" aria-hidden="true" />
      </button>

      {/* Modal / Dialog Dropdown */}
      {buka && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
            onClick={() => setBuka(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Panel Simulasi Skenario Demo"
            className="absolute right-0 mt-2 w-80 sm:w-96 z-50 rounded-2xl bg-kartu p-4 shadow-[0_8px_32px_-4px_rgba(30,36,32,0.12)] border border-garis animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Header Dialog */}
            <div className="flex items-center justify-between pb-3 border-b border-garis">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-aksi-lembut text-aksi flex items-center justify-center">
                  <Sparkles size={14} />
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-tinta font-mono">
                    Simulasi Skenario Juri
                  </h3>
                  <p className="text-[11px] text-tinta-lembut">
                    1-klik ganti peran & instansi tanpa relogin
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBuka(false)}
                className="text-tinta-lembut hover:text-tinta p-1 rounded-md"
                aria-label="Tutup panel demo"
              >
                <X size={15} />
              </button>
            </div>

            {/* Pemilih Instansi (PRD §10: SIA vs SHB) */}
            <div className="my-3">
              <span className="block text-[11px] font-mono text-tinta-lembut uppercase mb-1.5">
                1. Pilih Instansi Sekolah
              </span>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-latar-lembut rounded-xl border border-garis">
                <button
                  type="button"
                  onClick={() => setInstansiPilihan('SIA')}
                  className={`text-left px-2.5 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 ${
                    instansiPilihan === 'SIA'
                      ? 'bg-kartu text-aksi font-semibold shadow-xs'
                      : 'text-tinta-lembut hover:text-tinta'
                  }`}
                >
                  <School size={13} className="flex-shrink-0" />
                  <span className="truncate">SDN Harapan A (SIA)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInstansiPilihan('SHB')}
                  className={`text-left px-2.5 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 ${
                    instansiPilihan === 'SHB'
                      ? 'bg-kartu text-aksi font-semibold shadow-xs'
                      : 'text-tinta-lembut hover:text-tinta'
                  }`}
                >
                  <School size={13} className="flex-shrink-0" />
                  <span className="truncate">SMPN Tumbuh B (SHB)</span>
                </button>
              </div>
            </div>

            {/* Pemilih Peran (4 Peran Pengguna) */}
            <div className="my-3">
              <span className="block text-[11px] font-mono text-tinta-lembut uppercase mb-1.5">
                2. Pilih Peran Pengguna
              </span>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {DAFTAR_DEMO.map((item) => {
                  const terpilih = profil?.role === item.role;
                  const IkonPeran = item.ikon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handlePilih(item)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start gap-2.5 ${
                        terpilih
                          ? 'border-aksi bg-aksi-lembut/60 text-tinta'
                          : 'border-garis bg-latar/50 hover:bg-latar-lembut hover:border-garis-kuat text-tinta'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          terpilih
                            ? 'bg-aksi text-white'
                            : 'bg-latar-lembut text-tinta-lembut'
                        }`}
                      >
                        <IkonPeran size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold truncate text-tinta">
                            {item.nama}
                          </span>
                          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-latar border border-garis text-tinta-lembut">
                            {item.role.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-[11px] text-tinta-lembut line-clamp-1 mt-0.5">
                          {item.deskripsi}
                        </p>
                      </div>
                      {terpilih && (
                        <Check size={14} className="text-aksi flex-shrink-0 mt-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mode Siswa Akses Cepat */}
            <div className="pt-2 border-t border-garis">
              <button
                type="button"
                onClick={() => {
                  setBuka(false);
                  navigate('/materi');
                }}
                className="w-full text-left p-2 rounded-xl bg-latar-lembut hover:bg-latar border border-garis text-xs flex items-center justify-between text-tinta"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">🎒</span>
                  <div>
                    <span className="font-medium text-xs block text-tinta">
                      Layar Siswa: Materi Aksesibel (F10)
                    </span>
                    <span className="text-[10px] text-tinta-lembut">
                      Text-to-Speech & Pecah Kalimat
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-aksi">Buka &rarr;</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
