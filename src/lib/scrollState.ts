/**
 * Estado de scroll/ponteiro compartilhado entre o DOM (GSAP/Lenis)
 * e a cena 3D (react-three-fiber), sem re-renders de React.
 * Mutado por ScrollTrigger em App.tsx e lido a cada frame pela cena.
 */

export const scrollState = {
  /** progresso global da página, 0 → 1 */
  progress: 0,
  /** velocidade normalizada do scroll (para inclinar/girar objetos) */
  velocity: 0,
};

export const pointerState = {
  /** -1 → 1, suavizado na cena */
  x: 0,
  y: 0,
};

export function bindPointer(): () => void {
  const onMove = (e: PointerEvent) => {
    pointerState.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointerState.y = (e.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  return () => window.removeEventListener('pointermove', onMove);
}
