import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';

/** Tajuk yang dibuka berjenjang: tiap baris duduk di dalam wadah
 *  `overflow: hidden`, lalu naik dari bawah (yPercent 100 -> 0).
 *
 *  Teks tetap ada di DOM apa adanya — bukan gambar, bukan aria-label — jadi
 *  pembaca layar, Ctrl+F, dan mode teks besar tetap bekerja. Bila pengguna
 *  meminta gerak minimal, animasinya tidak dibuat dan teks sudah berada di
 *  tempatnya. */
export default function RevealText({
  baris,
  kelas = '',
  tunda = 0,
  id,
}: {
  baris: string[];
  kelas?: string;
  tunda?: number;
  id?: string;
}) {
  const ref = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const pecahan = gsap.utils.toArray<HTMLElement>('.tudung-baris > span', ref.current);
        if (pecahan.length === 0) return;
        gsap.from(pecahan, {
          yPercent: 100,
          duration: 1.1,
          ease: 'power4.out',
          stagger: 0.06,
          delay: tunda,
        });
      });
    },
    { scope: ref, dependencies: [baris.join('\u0000')] },
  );

  return (
    <h1 ref={ref} className={kelas} id={id}>
      {baris.map((teks, i) => (
        <span className="tudung-baris" key={`${i}-${teks}`}>
          {/* Spasi di ujung tiap baris: tanpa itu pembaca layar membunyikan
              tajuk dua baris sebagai satu kata ("Masuk kePPI-Link"). */}
          <span>{teks}{' '}</span>
        </span>
      ))}
    </h1>
  );
}