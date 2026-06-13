import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/* Galáxia espiral (nossa Via Láctea) — o pano de fundo da ABERTURA.   */
/* Disco de milhares de estrelas em braços logarítmicos: núcleo quente */
/* e denso → braços azulados, com regiões rosadas (nebulosas HII).     */
/* Gira lentamente. Aditivo. Um sprite de brilho marca o bojo central. */
/* ------------------------------------------------------------------ */

const VERTEX = /* glsl */ `
  attribute float aScale;
  attribute vec3 aColor;
  attribute float aTw;
  uniform float uTime;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vTw;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aScale * uPixelRatio * (70.0 / max(1.0, -mv.z));
    gl_Position = projectionMatrix * mv;
    vColor = aColor;
    vTw = 0.7 + 0.3 * sin(uTime * (0.6 + aTw) + aTw * 30.0);
  }
`;

const FRAGMENT = /* glsl */ `
  varying vec3 vColor;
  varying float vTw;
  void main() {
    float d = distance(gl_PointCoord, vec2(0.5));
    float glow = smoothstep(0.5, 0.0, d);
    float alpha = pow(glow, 1.7) * vTw;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(vColor * (1.0 + glow * 0.6), alpha);
  }
`;

function makeCoreGlow(): THREE.CanvasTexture {
  const s = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d')!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,244,214,0.95)');
  g.addColorStop(0.25, 'rgba(255,221,160,0.5)');
  g.addColorStop(0.6, 'rgba(220,150,120,0.12)');
  g.addColorStop(1, 'rgba(120,90,160,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

interface Props {
  count?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  radius?: number; // raio do disco em unidades de mundo
}

export function Galaxy({
  count = 7000,
  position = [2, 5, -46],
  rotation = [1.12, 0.1, 0.4],
  radius = 22,
}: Props) {
  const spinRef = useRef<THREE.Group>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const scl = new Float32Array(count);
    const tw = new Float32Array(count);
    const arms = 4;
    const inner = new THREE.Color('#fff3d2');
    const mid = new THREE.Color('#cfe0ff');
    const outer = new THREE.Color('#5f8fe0');
    const pink = new THREE.Color('#ff8fce');
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const r = Math.pow(Math.random(), 0.55); // denso no núcleo
      const arm = (i % arms) / arms;
      const wind = r * 5.2;
      const scatter = (Math.random() - 0.5) * (0.12 + r * 0.5);
      const angle = arm * Math.PI * 2 + wind + scatter;
      const rr = r * radius;
      pos[i * 3] = Math.cos(angle) * rr;
      pos[i * 3 + 2] = Math.sin(angle) * rr;
      // disco fino, mais espesso no bojo
      pos[i * 3 + 1] = (Math.random() - 0.5) * (radius * (0.16 * (1.0 - r) + 0.012));

      // cor por raio (+ algumas regiões rosadas)
      if (r < 0.22) c.copy(inner).lerp(mid, r / 0.22);
      else c.copy(mid).lerp(outer, (r - 0.22) / 0.78);
      if (Math.random() < 0.04 && r > 0.25) c.lerp(pink, 0.6);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;

      const bright = r < 0.15 || Math.random() < 0.03;
      scl[i] = (0.5 + Math.random() * 0.8) * (bright ? 2.6 : 1);
      tw[i] = Math.random();
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aScale', new THREE.BufferAttribute(scl, 1));
    geo.setAttribute('aTw', new THREE.BufferAttribute(tw, 1));
    return geo;
  }, [count, radius]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: {
            value: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2),
          },
        },
      }),
    [],
  );

  const coreTex = useMemo(makeCoreGlow, []);
  const coreMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: coreTex,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
    [coreTex],
  );

  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta;
    if (spinRef.current) spinRef.current.rotation.y += delta * 0.015;
  });

  return (
    <group position={position} rotation={rotation}>
      <group ref={spinRef}>
        <points geometry={geometry} material={material} frustumCulled={false} />
        <sprite material={coreMat} scale={[radius * 0.9, radius * 0.9, 1]} />
      </group>
    </group>
  );
}
