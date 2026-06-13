import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { pointerState } from '../lib/scrollState';

/**
 * Envolve camadas de fundo (nebulosa/partículas) e as desloca suavemente
 * em direção oposta ao ponteiro, criando parallax de profundidade.
 */
export function MouseParallax({
  factor = 0.6,
  children,
}: {
  factor?: number;
  children: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    g.position.x = THREE.MathUtils.damp(g.position.x, -pointerState.x * factor, 1.8, delta);
    g.position.y = THREE.MathUtils.damp(g.position.y, pointerState.y * factor, 1.8, delta);
  });

  return <group ref={ref}>{children}</group>;
}
