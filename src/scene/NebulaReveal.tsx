import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollState } from '../lib/scrollState';

/* ------------------------------------------------------------------ */
/* Nebulosa de transição — nuvem brilhante que envolve a chegada ao    */
/* sistema solar após a viagem na luz. Cria a ilusão de "atravessar    */
/* uma nuvem interestelar" e revela os planetas gradualmente.          */
/* ------------------------------------------------------------------ */

const PARTICLE_VERTEX = /* glsl */ `
  attribute float aSize;
  attribute float aSpeed;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    p.x += sin(uTime * aSpeed * 0.3 + position.y * 0.5) * 0.3;
    p.y += cos(uTime * aSpeed * 0.2 + position.x * 0.4) * 0.3;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = aSize * uPixelRatio * (50.0 / max(1.0, -mv.z));
    gl_Position = projectionMatrix * mv;

    vColor = aColor;
    vAlpha = uOpacity * 0.5;
  }
`;

const PARTICLE_FRAGMENT = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float d = distance(gl_PointCoord, vec2(0.5));
    float glow = smoothstep(0.5, 0.0, d);
    float alpha = pow(glow, 2.5) * vAlpha;
    if (alpha < 0.002) discard;
    gl_FragColor = vec4(vColor * (1.0 + glow * 0.5), alpha);
  }
`;

const COUNT = 1500;

/** Nebula intensity envelope: fades in 0.22→0.30, stays, fades out 0.50→0.65 */
function nebulaIntensity(p: number): number {
  if (p < 0.22 || p > 0.65) return 0;
  if (p < 0.30) return Math.pow((p - 0.22) / 0.08, 1.5);
  if (p > 0.50) return 1 - Math.pow((p - 0.50) / 0.15, 1.5);
  return 1;
}

const CLOUD_COLORS = [
  { color: '#41e8ff', pos: [-4, 2, -8], scale: 18, spin: 0.008 },
  { color: '#8b5cf6', pos: [5, -1, -12], scale: 22, spin: -0.01 },
  { color: '#ff4ecd', pos: [-3, -3, -14], scale: 16, spin: 0.006 },
  { color: '#3b82f6', pos: [4, 4, -16], scale: 20, spin: -0.007 },
  { color: '#a3ff6b', pos: [0, -2, -10], scale: 14, spin: 0.009 },
];

function makeGlow(color: string): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  const c = new THREE.Color(color);
  const rgb = `${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0}`;
  g.addColorStop(0, `rgba(${rgb},0.6)`);
  g.addColorStop(0.3, `rgba(${rgb},0.2)`);
  g.addColorStop(0.7, `rgba(${rgb},0.04)`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function NebulaReveal() {
  const particleMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: PARTICLE_VERTEX,
        fragmentShader: PARTICLE_FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: 0 },
          uPixelRatio: {
            value: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2),
          },
        },
      }),
    [],
  );

  const particleGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    const scl = new Float32Array(COUNT);
    const spd = new Float32Array(COUNT);
    const palette = ['#41e8ff', '#8b5cf6', '#ff4ecd', '#3b82f6', '#a3ff6b', '#cdd9ff'];
    const c = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 2] = -6 - Math.random() * 20;
      c.set(palette[(Math.random() * palette.length) | 0]);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      scl[i] = 0.2 + Math.random() * 0.6;
      spd[i] = 0.1 + Math.random() * 0.5;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(scl, 1));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(spd, 1));
    return geo;
  }, []);

  const cloudMats = useMemo(
    () => CLOUD_COLORS.map((c) => new THREE.SpriteMaterial({
      map: makeGlow(c.color),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })),
    [],
  );

  useFrame((_, delta) => {
    const p = scrollState.progress;
    const intensity = nebulaIntensity(p);

    particleMat.uniforms.uTime.value += delta;
    particleMat.uniforms.uOpacity.value = THREE.MathUtils.damp(
      particleMat.uniforms.uOpacity.value, intensity, 3, delta,
    );

    cloudMats.forEach((m, i) => {
      m.opacity = intensity * 0.4;
      m.rotation += CLOUD_COLORS[i].spin * delta * 10;
    });
  });

  return (
    <group>
      <points geometry={particleGeo} material={particleMat} frustumCulled={false} />
      {CLOUD_COLORS.map((c, i) => (
        <sprite
          key={i}
          position={c.pos as [number, number, number]}
          scale={[c.scale, c.scale, 1]}
          material={cloudMats[i]}
        />
      ))}
    </group>
  );
}