import { useRef } from 'react';
import type { ReactNode } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';

/** Tombol daya tarik magnetik: elemen bergeser beberapa piksel mengikuti
 *  penunjuk, lalu pulih saat penunjuk pergi. Maksimum 8px supaya tetap bisa
 *  ditekan dengan sasaran yang tidak bergerak jauh.
 *
 *  Hanya di perangkat bertunjuk presisi dan bila gerak tidak diminimalkan;
 *  di perangkat sentuh dan mode gerak minimal, tombol tetap tombol biasa. */
export default function Magnetik({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference) and (pointer: fine)', () => {
        const kotak = ref.current;
        const isi = kotak?.firstElementChild;
        if (!kotak || !(isi instanceof HTMLElement)) return;

        const geserX = gsap.quickTo(isi, 'x', { duration: 0.5, ease: 'power3.out' });
        const geserY = gsap.quickTo(isi, 'y', { duration: 0.5, ease: 'power3.out' });

        const ikuti = (e: PointerEvent) => {
          const r = kotak.getBoundingClientRect();
          geserX(((e.clientX - (r.left + r.width / 2)) / r.width) * 16);
          geserY(((e.clientY - (r.top + r.height / 2)) / r.height) * 12);
        };
        const pulih = () => {
          geserX(0);
          geserY(0);
        };

        kotak.addEventListener('pointermove', ikuti);
        kotak.addEventListener('pointerleave', pulih);
        return () => {
          kotak.removeEventListener('pointermove', ikuti);
          kotak.removeEventListener('pointerleave', pulih);
        };
      });
    },
    { scope: ref },
  );

  return (
    <span ref={ref} className="inline-block">
      {children}
    </span>
  );
}