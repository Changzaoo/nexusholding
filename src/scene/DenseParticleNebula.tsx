import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollState } from '../lib/scrollState';

const PALETTE = ['#41e8ff', '#8b5cf6', '#3b82f6', '#a3ff6b', '#ff4ecd', '#cdd9ff'];

const VERTEX = /* glsl */ `
  attribute float aScale;
  attribute float aSpeed;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uBurst;
  varying vec3 vColor;
  varying float vTwinkle;

  void main() {
    vec3 p = position;
    p.x += sin(uTime * aSpeed + position.y * 0.6) * 0.5;
    p.y += cos(uTime * aSpeed * 0.7 + position.x * 0.4) * 0.4;
    p.z += sin(uTime * aSpeed * 0.4 + position.x) * 0.3;
    // "explosão" radial sutil quando uBurst sobe
    p += normalize(position + 0.001) * uBurst * (0.6 + aSpeed);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = aScale * uPixelRatio * (40.0 / max(1.0, -mv.z));
    gl_Position = projectionMatrix * mv;

    vColor = aColor;
    vTwinkle = 0.6 + 0.4 * sin(uTime * (1.5 + aSpeed * 2.0) + position.x * 10.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    float d = distance(gl_PointCoord, vec2(0.5));
    float glow = smoothstep(0.5, 0.0, d);
    float alpha = pow(glow, 2.2) * vTwinkle * uOpacity;
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(vColor * (1.0 + glow * 0.7), alpha);
  }
`;

/** Textura radial procedural para as nuvens de nebulosa (sem assets). */
function makeGlow(color: string): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  const c = new THREE.Color(color);
  const rgb = `${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0}`;
  g.addColorStop(0, `rgba(${rgb},0.8)`);
  g.addColorStop(0.3, `rgba(${rgb},0.3)`);
  g.addColorStop(0.7, `rgba(${rgb},0.06)`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const CLOUDS = [
  { color: '#8b5cf6', position: [-9, 4, -16], scale: 22, opacity: 0.22, spin: 0.015 },
  { color: '#41e8ff', position: [10, -5, -24], scale: 26, opacity: 0.18, spin: -0.02 },
  { color: '#103a2c', position: [-12, -3, -30], scale: 28, opacity: 0.3, spin: 0.01 },
  { color: '#3b82f6', position: [8, 5, -36], scale: 24, opacity: 0.2, spin: -0.012 },
  { color: '#ff4ecd', position: [-7, 2, -42], scale: 20, opacity: 0.14, spin: 0.02 },
  { color: '#8b5cf6', position: [9, -2, -48], scale: 26, opacity: 0.22, spin: -0.015 },
  { color: '#41e8ff', position: [0, 6, -56], scale: 28, opacity: 0.15, spin: 0.01 },
] as const;

/**
 * Curva de densidade: discreta na intro, MUITO densa no meio (galeria),
 * limpando no final — replicando o ritmo do vídeo.
 */
function intensityFor(p: number): number {
  const bump = (c: number, w: number, amp: number) => {
    const x = (p - c) / w;
    return amp * Math.exp(-x * x);
  };
  let i = 0.32;
  i += bump(0.22, 0.08, 0.45); // título
  i += bump(0.5, 0.16, 0.95); // pico — galeria densa
  i += bump(0.7, 0.1, 0.5);
  i *= 1 - THREE.MathUtils.smoothstep(p, 0.85, 1) * 0.7; // final limpa
  return i;
}

interface Props {
  count?: number;
}

/**
 * Fundo de partículas denso + nebulosa digital. Reage à câmera (parallax
 * leve via MouseParallax que o envolve) e à velocidade do scroll (burst).
 */
export function DenseParticleNebula({ count = 5000 }: Props) {
  const burstRef = useRef(0);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const speeds = new Float32Array(count);
    const color = new THREE.Color();
    for (let i = 0; i < count; i++) {
      // concentra mais partículas no miolo do corredor (galeria)
      const zBias = Math.pow(Math.random(), 0.8);
      positions[i * 3 + 0] = (Math.random() - 0.5) * 42;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 26;
      positions[i * 3 + 2] = 14 - zBias * 74;

      color.set(PALETTE[(Math.random() * PALETTE.length) | 0]);
      colors[i * 3 + 0] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      const large = Math.random() < 0.07;
      scales[i] = (0.35 + Math.random() * 0.7) * (large ? 3.4 : 1);
      speeds[i] = 0.15 + Math.random() * 0.9;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    return geo;
  }, [count]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: 0.35 },
          uBurst: { value: 0 },
          uPixelRatio: {
            value: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2),
          },
        },
      }),
    [],
  );

  const cloudMaterials = useMemo(
    () =>
      CLOUDS.map(
        (c) =>
          new THREE.SpriteMaterial({
            map: makeGlow(c.color),
            transparent: true,
            opacity: c.opacity,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            rotation: Math.random() * Math.PI,
          }),
      ),
    [],
  );

  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta;
    const target = intensityFor(scrollState.progress);
    material.uniforms.uOpacity.value = THREE.MathUtils.damp(
      material.uniforms.uOpacity.value, target, 2.5, delta,
    );
    burstRef.current = THREE.MathUtils.damp(
      burstRef.current, Math.min(1.2, Math.abs(scrollState.velocity) * 0.4), 3, delta,
    );
    material.uniforms.uBurst.value = burstRef.current;
    cloudMaterials.forEach((m, i) => (m.rotation += CLOUDS[i].spin * delta * 10));
  });

  return (
    <group>
      <points geometry={geometry} frustumCulled={false}>
        <primitive object={material} attach="material" />
      </points>
      {CLOUDS.map((c, i) => (
        <sprite
          key={i}
          position={c.position as unknown as [number, number, number]}
          scale={[c.scale, c.scale, 1]}
          material={cloudMaterials[i]}
        />
      ))}
    </group>
  );
}
