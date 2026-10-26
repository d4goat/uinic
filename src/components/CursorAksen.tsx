import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';

/** Cincin aksen yang mengikuti penunjuk — pelengkap, bukan pengganti:
 *  kursor bawaan tetap terlihat supaya sasaran klik tidak pernah hilang.
 *
 *  Cincin membesar di atas sasaran yang bisa diklik, dan tidak pernah dibuat
 *  di perangkat sentuh atau bila pengguna meminta gerak minimal. */
export default function CursorAksen() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference) and (pointer: fine)', () => {
        const cincin = ref.current;
        if (!cincin) return;

        const geserX = gsap.quickTo(cincin, 'x', { duration: 0.35, ease: 'power3.out' });
        const geserY = gsap.quickTo(cincin, 'y', { duration: 0.35, ease: 'power3.out' });
        const SASARAN = 'a, button, input, select, textarea, summary, [data-kursor]';

        const ikuti = (e: PointerEvent) => {
          geserX(e.clientX);
          geserY(e.clientY);
          cincin.dataset.aktif = 'true';
          const di = e.target instanceof Element ? e.target.closest(SASARAN) : null;
          cincin.dataset.tumbuh = di ? 'true' : 'false';
        };
        const keluar = () => {
          cincin.dataset.aktif = 'false';
        };

        window.addEventListener('pointermove', ikuti, { passive: true });
        document.documentElement.addEventListener('pointerleave', keluar);
        return () => {
          window.removeEventListener('pointermove', ikuti);
          document.documentElement.removeEventListener('pointerleave', keluar);
        };
      });
    },
    { scope: ref },
  );

  return <div ref={ref} className="kursor-aksen" aria-hidden="true" data-aktif="false" data-tumbuh="false" />;
}