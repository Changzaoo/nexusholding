import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/** Gera textura de brilho radial proceduralmente (sem assets externos). */
function makeGlowTexture(color: string): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2,
  );
  const c = new THREE.Color(color);
  const rgb = `${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}`;
  gradient.addColorStop(0, `rgba(${rgb},0.85)`);
  gradient.addColorStop(0.3, `rgba(${rgb},0.32)`);
  gradient.addColorStop(0.7, `rgba(${rgb},0.07)`);
  gradient.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

interface CloudConfig {
  color: string;
  position: [number, number, number];
  scale: number;
  opacity: number;
  spin: number;
}

const CLOUDS: CloudConfig[] = [
  { color: '#8b5cf6', position: [-8, 3.5, -18], scale: 26, opacity: 0.32, spin: 0.015 },
  { color: '#41e8ff', position: [9, -4, -30], scale: 30, opacity: 0.24, spin: -0.02 },
  { color: '#103a2c', position: [-12, -3, -44], scale: 32, opacity: 0.36, spin: 0.01 },
  { color: '#3b82f6', position: [8, 5, -58], scale: 28, opacity: 0.26, spin: -0.012 },
  { color: '#ff4ecd', position: [-7, 2, -72], scale: 23, opacity: 0.2, spin: 0.02 },
  { color: '#8b5cf6', position: [9, -2, -84], scale: 30, opacity: 0.26, spin: -0.015 },
  { color: '#41e8ff', position: [0, 6, -94], scale: 34, opacity: 0.2, spin: 0.01 },
];

/**
 * Nebulosa digital: sprites aditivos com gradientes radiais procedurais
 * espalhados pelo corredor — manchas de cor roxas, cianas e verdes.
 */
export function Nebula() {
  const groupRef = useRef<THREE.Group>(null);

  const materials = useMemo(
    () =>
      CLOUDS.map(
        (cloud) =>
          new THREE.SpriteMaterial({
            map: makeGlowTexture(cloud.color),
            transparent: true,
            opacity: cloud.opacity,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            rotation: Math.random() * Math.PI,
          }),
      ),
    [],
  );

  useFrame((_, delta) => {
    materials.forEach((mat, i) => {
      mat.rotation += CLOUDS[i].spin * delta * 10;
    });
  });

  return (
    <group ref={groupRef}>
      {CLOUDS.map((cloud, i) => (
        <sprite
          key={i}
          position={cloud.position}
          scale={[cloud.scale, cloud.scale, 1]}
          material={materials[i]}
        />
      ))}
    </group>
  );
}
