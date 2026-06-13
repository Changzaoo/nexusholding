import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollState } from '../lib/scrollState';

const PALETTE = [
  '#41e8ff', // ciano
  '#8b5cf6', // roxo
  '#3b82f6', // azul elétrico
  '#a3ff6b', // verde ácido
  '#ff4ecd', // magenta
  '#cdd9ff', // branco azulado
];

const VERTEX = /* glsl */ `
  attribute float aScale;
  attribute float aSpeed;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vTwinkle;

  void main() {
    vec3 p = position;
    // deriva lenta — poeira cósmica
    p.x += sin(uTime * aSpeed + position.y * 0.6) * 0.45;
    p.y += cos(uTime * aSpeed * 0.7 + position.x * 0.4) * 0.35;
    p.z += sin(uTime * aSpeed * 0.4 + position.x) * 0.25;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = aScale * uPixelRatio * (34.0 / max(1.0, -mv.z));
    gl_Position = projectionMatrix * mv;

    vColor = aColor;
    vTwinkle = 0.65 + 0.35 * sin(uTime * (1.5 + aSpeed * 2.0) + position.x * 10.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vTwinkle;

  void main() {
    float d = distance(gl_PointCoord, vec2(0.5));
    float glow = smoothstep(0.5, 0.0, d);
    float alpha = pow(glow, 2.4) * vTwinkle * uOpacity;
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(vColor * (1.0 + glow * 0.6), alpha);
  }
`;

/**
 * Intensidade das partículas ao longo da viagem:
 * discreta na intro, picos no portal / horizon / mission,
 * acalmando no final.
 */
function intensityFor(p: number): number {
  const bump = (center: number, width: number, amp: number) => {
    const x = (p - center) / width;
    return amp * Math.exp(-x * x);
  };
  let i = 0.42;
  i += bump(0.24, 0.09, 0.5); // portal
  i += bump(0.65, 0.08, 0.45); // horizon
  i += bump(0.82, 0.07, 0.6); // mission
  i *= 1 - THREE.MathUtils.smoothstep(p, 0.9, 1) * 0.55; // final acalma
  return i;
}

interface ParticleFieldProps {
  count?: number;
}

export function ParticleField({ count = 3200 }: ParticleFieldProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const speeds = new Float32Array(count);
    const color = new THREE.Color();

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 38;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 22;
      positions[i * 3 + 2] = 14 - Math.random() * 116; // corredor inteiro

      color.set(PALETTE[Math.floor(Math.random() * PALETTE.length)]);
      colors[i * 3 + 0] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // ~8% são "poeira luminosa" maior
      const large = Math.random() < 0.08;
      scales[i] = (0.35 + Math.random() * 0.65) * (large ? 3.2 : 1);
      speeds[i] = 0.15 + Math.random() * 0.85;
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
          uOpacity: { value: 0.5 },
          uPixelRatio: {
            value: Math.min(
              typeof window !== 'undefined' ? window.devicePixelRatio : 1,
              2,
            ),
          },
        },
      }),
    [],
  );

  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta;
    const target = intensityFor(scrollState.progress);
    material.uniforms.uOpacity.value = THREE.MathUtils.damp(
      material.uniforms.uOpacity.value,
      target,
      2.5,
      delta,
    );
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <primitive object={material} attach="material" ref={materialRef} />
    </points>
  );
}
