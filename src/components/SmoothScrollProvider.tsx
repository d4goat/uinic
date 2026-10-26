import { useRef } from 'react';
import type { ReactNode } from 'react';
import { useGSAP } from '@gsap/react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import CursorAksen from './CursorAksen';

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Menyambungkan Lenis ke GSAP ScrollTrigger dengan satu sumber denyut:
 *  gsap.ticker. Dua loop rAF terpisah membuat gulir dan animasi bergeser
 *  satu bingkai dan terasa "lengket".
 *
 *  Prefers-reduced-motion: `respectReducedMotion` bawaan Lenis (default true)
 *  memaksa lerp 1 supaya gulir mengikuti perangkat 1:1 — jadi tidak perlu
 *  mematikan Lenis sendiri; gulir tetap gulir asli peramban (Lenis menggeser
 *  posisi gulir dokumen, bukan transform), sehingga PgDn, spasi, panah,
 *  Ctrl+F, dan bilah gulir tetap bekerja apa adanya.
 */
export default function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const bilah = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const lenis = new Lenis({ duration: 1.05, wheelMultiplier: 0.9 });
      lenis.on('scroll', ScrollTrigger.update);
      const denyut = (waktu: number) => lenis.raf(waktu * 1000);
      gsap.ticker.add(denyut);
      gsap.ticker.lagSmoothing(0);

      // Tinggi dokumen berubah setelah font dan data halaman termuat.
      void document.fonts.ready.then(() => ScrollTrigger.refresh());

      // Indikator kemajuan gulir: terikat langsung ke posisi baca.
      const kemajuan = ScrollTrigger.create({
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          if (bilah.current) gsap.set(bilah.current, { scaleX: self.progress });
        },
      });

      return () => {
        kemajuan.kill();
        gsap.ticker.remove(denyut);
        gsap.ticker.lagSmoothing(500, 33);
        lenis.destroy();
      };
    },
    { scope: ref },
  );

  return (
    <div ref={ref}>
      <div className="kemajuan" ref={bilah} aria-hidden="true" />
      <div className="butir" aria-hidden="true" />
      <CursorAksen />
      {children}
    </div>
  );
}