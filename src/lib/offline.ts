// Antrean sesi offline (F6, alasan [S6]: koneksi sekolah tidak stabil).
// Simpan ke localStorage, kirim ulang saat online. Idempoten di sisi server
// (client_uuid unik) -> tidak pernah tercatat dua kali walau terkirim berkali-kali.
import { catatSesi } from './api';
import type { SesiAntrean } from './types';

const KUNCI = 'ppi-link.antrean-sesi';

export function bacaAntrean(): SesiAntrean[] {
  try {
    return JSON.parse(localStorage.getItem(KUNCI) ?? '[]') as SesiAntrean[];
  } catch {
    return [];
  }
}

function tulisAntrean(a: SesiAntrean[]) {
  localStorage.setItem(KUNCI, JSON.stringify(a));
}

export function antre(s: SesiAntrean) {
  tulisAntrean([...bacaAntrean().filter((x) => x.client_uuid !== s.client_uuid), s]);
}

/** Kirim semua yang tertunda. Yang berhasil dikeluarkan dari antrean. */
export async function kirimAntrean(): Promise<{ terkirim: number; sisa: number }> {
  if (!navigator.onLine) return { terkirim: 0, sisa: bacaAntrean().length };
  let terkirim = 0;
  for (const s of bacaAntrean()) {
    try {
      await catatSesi(s);
      terkirim++;
      tulisAntrean(bacaAntrean().filter((x) => x.client_uuid !== s.client_uuid));
    } catch {
      // biarkan di antrean; coba lagi nanti
    }
  }
  return { terkirim, sisa: bacaAntrean().length };
}

/** Panggil sekali di main.tsx. */
export function pasangSinkronisasi() {
  window.addEventListener('online', () => void kirimAntrean());
  void kirimAntrean();
}
