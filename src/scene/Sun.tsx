import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NOISE_GLSL } from './glsl-noise';

/* ------------------------------------------------------------------ */
/* Estrela distante — luz-chave da cena espacial. Núcleo emissivo +    */
/* corona em sprites aditivos (sem fog → brilha como um sol real) +    */
/* uma pointLight quente que ilumina os planetas. Pulsa de leve.       */
/* ------------------------------------------------------------------ */

function makeGlow(stops: [number, string][]): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface Props {
  position?: [number, number, number];
  radius?: number;
  color?: string;
  glowColor?: string;
  lightIntensity?: number;
  lightDistance?: number;
  quality?: number;
}

export function Sun({
  position = [-18, 10, -50],
  radius = 2.6,
  color = '#fff4d6',
  glowColor = '#ffcf7a',
  lightIntensity = 600,
  lightDistance = 120,
  quality = 1,
}: Props) {
  const coreRef = useRef<THREE.Mesh>(null);
  const innerHalo = useRef<THREE.Sprite>(null);
  const t = useRef(0);
  const segments = quality < 0.55 ? 28 : 40;

  const haloTex = useMemo(
    () =>
      makeGlow([
        [0, 'rgba(255,244,214,0.95)'],
        [0.18, 'rgba(255,207,122,0.6)'],
        [0.45, 'rgba(255,150,70,0.18)'],
        [1, 'rgba(255,120,40,0)'],
      ]),
    [],
  );
  const rayTex = useMemo(
    () =>
      makeGlow([
        [0, 'rgba(255,255,235,0.5)'],
        [0.5, 'rgba(255,210,140,0.08)'],
        [1, 'rgba(255,180,90,0)'],
      ]),
    [],
  );

  const haloMat = useMemo(
    () => new THREE.SpriteMaterial({ map: haloTex, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
    [haloTex],
  );
  const rayMat = useMemo(
    () => new THREE.SpriteMaterial({ map: rayTex, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
    [rayTex],
  );

  // superfície turbulenta procedural (granulação + manchas quentes), emissiva
  const surfMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        toneMapped: false,
        fog: false,
        uniforms: {
          uTime: { value: 0 },
          uHot: { value: new THREE.Color(color) },
          uCool: { value: new THREE.Color('#ff7a1e') },
        },
        vertexShader: /* glsl */ `
          varying vec3 vLocal;
          void main() {
            vLocal = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          varying vec3 vLocal;
          uniform float uTime; uniform vec3 uHot; uniform vec3 uCool;
          ${NOISE_GLSL}
          void main() {
            float g = fbm(vLocal * 3.4 + vec3(uTime * 0.12));
            float fine = fbm(vLocal * 9.0 - vec3(0.0, uTime * 0.2, 0.0));
            float h = clamp(0.5 + 0.6 * g + 0.25 * fine, 0.0, 1.0);
            vec3 col = mix(uCool, uHot, h);
            col += pow(h, 4.0) * 0.6; // pontos mais quentes brilham mais
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      }),
    [color],
  );

  useFrame((_, delta) => {
    t.current += delta;
    surfMat.uniforms.uTime.value += delta;
    const pulse = 1 + Math.sin(t.current * 1.3) * 0.04;
    if (coreRef.current) coreRef.current.scale.setScalar(pulse);
    if (innerHalo.current) innerHalo.current.scale.setScalar(radius * 6 * (1 + Math.sin(t.current * 1.1) * 0.05));
  });

  return (
    <group position={position}>
      {/* superfície emissiva turbulenta (sem fog → estrela sempre brilhante) */}
      <mesh ref={coreRef} material={surfMat}>
        <sphereGeometry args={[radius, segments, segments]} />
      </mesh>

      {/* corona / halo */}
      <sprite ref={innerHalo} material={haloMat} scale={[radius * 6, radius * 6, 1]} />
      <sprite material={rayMat} scale={[radius * 14, radius * 14, 1]} />

      {/* luz quente que ilumina os planetas */}
      <pointLight color={glowColor} intensity={lightIntensity} distance={lightDistance} decay={2} />
    </group>
  );
}
