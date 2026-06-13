import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { pointerState } from '../lib/scrollState';

/**
 * Aplica parallax suave a um grupo 3D em direção oposta ao ponteiro.
 * Use DENTRO do Canvas: atribua a ref retornada a um <group>.
 *
 *   const ref = useMouseParallax(0.5);
 *   return <group ref={ref}>{children}</group>;
 */
export function useMouseParallax(factor = 0.5) {
  const ref = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    g.position.x = THREE.MathUtils.damp(g.position.x, -pointerState.x * factor, 1.8, delta);
    g.position.y = THREE.MathUtils.damp(g.position.y, pointerState.y * factor, 1.8, delta);
  });

  return ref;
}
