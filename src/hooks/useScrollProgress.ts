import { useEffect, useState } from 'react';
import { scrollState } from '../lib/scrollState';

/**
 * Lê o progresso global de scroll (0 → 1) escrito por ScrollTrigger em
 * App.tsx, expondo-o como estado React para a UI HTML (Overlay/SideIndex).
 * Atualiza via rAF e só re-renderiza quando muda de forma perceptível,
 * mantendo a cena 3D livre de re-renders (ela lê scrollState direto).
 */
export function useScrollProgress(): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    let last = -1;
    const tick = () => {
      const current = scrollState.progress;
      if (Math.abs(current - last) > 0.0008) {
        last = current;
        setProgress(current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return progress;
}
