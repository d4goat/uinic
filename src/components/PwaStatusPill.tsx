import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export default function PwaStatusPill() {
  const [online, setOnline] = useState<boolean>(navigator.onLine);
  const [antrean, setAntrean] = useState<number>(0);
  const [simulasiOffline, setSimulasiOffline] = useState<boolean>(false);

  // Monitor status koneksi nyata & antrean lokal
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cek antrean offline lokal di localStorage
    const cekAntrean = () => {
      try {
        const raw = localStorage.getItem('sesi_antrean_v1');
        if (raw) {
          const list = JSON.parse(raw);
          setAntrean(Array.isArray(list) ? list.length : 0);
        } else {
          setAntrean(0);
        }
      } catch {
        setAntrean(0);
      }
    };

    cekAntrean();
    const interval = setInterval(cekAntrean, 4000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const isOffline = !online || simulasiOffline;

  const toggleSimulasi = () => {
    setSimulasiOffline((prev) => {
      const next = !prev;
      // Beri efek demo: jika offline, tambahkan dummy sync queue jika kosong
      if (next && antrean === 0) {
        setAntrean(2);
      } else if (!next) {
        setAntrean(0);
      }
      return next;
    });
  };

  return (
    <div className="inline-flex items-center">
      {isOffline ? (
        <button
          type="button"
          onClick={toggleSimulasi}
          className="group inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 transition-colors shadow-xs"
          title="Klik untuk menyalakan kembali koneksi (Simulasi Juri)"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-600"></span>
          </span>
          <WifiOff size={12} className="text-amber-700" aria-hidden="true" />
          <span className="text-[11px] font-mono">
            {antrean > 0 ? `${antrean} Antrean Lokal` : 'Offline'}
          </span>
          <span className="hidden md:inline text-[10px] opacity-75 group-hover:underline">
            (Klik: Pulihkan)
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={toggleSimulasi}
          className="group inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-50/80 border border-emerald-200 text-emerald-900 hover:bg-emerald-100/60 transition-colors shadow-xs"
          title="Tersambung ke Supabase. Klik untuk menguji simulasi mode offline"
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
          <Wifi size={12} className="text-emerald-700" aria-hidden="true" />
          <span className="hidden sm:inline text-[11px] font-mono">Sinkron</span>
        </button>
      )}
    </div>
  );
}
