import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/* Cometas e meteoros cruzando o céu. Cada um: cabeça brilhante +       */
/* cauda em degradê (plano aditivo alinhado à direção de voo). Viajam   */
/* numa faixa de profundidade, somem ao sair e reaparecem com atraso    */
/* aleatório. Cometas = lentos/grandes; meteoros = rápidos/finos.       */
/* ------------------------------------------------------------------ */

function makeTailTexture(): THREE.CanvasTexture {
  const w = 256;
  const h = 16;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)'); // cauda
  g.addColorStop(0.7, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,1)'); // cabeça
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // suaviza nas bordas verticais
  const v = ctx.createLinearGradient(0, 0, 0, h);
  v.addColorStop(0, 'rgba(0,0,0,1)');
  v.addColorStop(0.5, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
  const tex = new THREE.CanvasTexture(cv);
  return tex;
}

interface StreakProps {
  tex: THREE.CanvasTexture;
  color: string;
  len: number;
  width: number;
  speed: number;
  headSize: number;
  zBand: [number, number];
  delayMax: number;
}

function Streak({ tex, color, len, width, speed, headSize, zBand, delayMax }: StreakProps) {
  const group = useRef<THREE.Group>(null);
  const MIN_OPACITY = 0.06;
  const groupOriginals = useRef<Map<string, number>>(new Map());
  const st = useRef({ x: 0, y: 0, a: 0, t: -Math.random() * delayMax, z: 0, _needReset: true });

  const applyOpacity = (val: number) => {
    const g = group.current;
    if (!g) return;
    g.traverse((obj: any) => {
      if (!obj || !obj.isMesh) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m: any) => {
        if (!m) return;
        if (typeof m.opacity === 'number') {
          if (!groupOriginals.current.has(m.uuid)) groupOriginals.current.set(m.uuid, m.opacity);
          const orig = groupOriginals.current.get(m.uuid) ?? 1;
          m.transparent = true;
          m.opacity = Math.max(MIN_OPACITY, val * orig);
        }
      });
    });
  };

  const reset = () => {
    const s = st.current;
    // entra fora da tela e cruza em diagonal descendente
    const fromLeft = Math.random() < 0.5;
    s.x = fromLeft ? -34 : 34;
    s.y = 6 + Math.random() * 14;
    s.a = fromLeft
      ? -0.35 + (Math.random() - 0.5) * 0.4 // → direita-baixo
      : Math.PI + 0.35 + (Math.random() - 0.5) * 0.4; // → esquerda-baixo
    s.z = zBand[0] + Math.random() * (zBand[1] - zBand[0]);
    s.t = 0;
    s._needReset = false;
  };

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const s = st.current;
    if (s.t < 0) {
      s.t += delta; // aguardando para reaparecer
      applyOpacity(0);
      return;
    }
    if (s._needReset) {
      reset();
      applyOpacity(1);
    }
    s.x += Math.cos(s.a) * speed * delta;
    s.y += Math.sin(s.a) * speed * delta;
    if (s.x < -40 || s.x > 40 || s.y < -24) {
      applyOpacity(0);
      s.t = -(Math.random() * delayMax + 0.5);
      s._needReset = true;
      return;
    }
    g.position.set(s.x, s.y, s.z);
    g.rotation.z = s.a;
  });

  return (
    <group ref={group}>
      {/* cauda — plano com cabeça no local x=0, cauda em -x */}
      <mesh position={[-len / 2, 0, 0]}>
        <planeGeometry args={[len, width]} />
        <meshBasicMaterial map={tex} color={color} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* cabeça */}
      <mesh>
        <sphereGeometry args={[headSize, 12, 12]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}

interface Props {
  comets?: number;
  meteors?: number;
}

export function Comets({ comets = 2, meteors = 5 }: Props) {
  const tex = useMemo(makeTailTexture, []);
  return (
    <group>
      {Array.from({ length: comets }, (_, i) => (
        <Streak key={`c${i}`} tex={tex} color={i % 2 ? '#cfe0ff' : '#bfeaff'} len={6.5} width={0.75} speed={5} headSize={0.17} zBand={[-72, -8]} delayMax={8} />
      ))}
      {Array.from({ length: meteors }, (_, i) => (
        <Streak key={`m${i}`} tex={tex} color={i % 3 === 0 ? '#ffe6c4' : '#ffffff'} len={3.4} width={0.18} speed={20 + (i % 4) * 5} headSize={0.06} zBand={[-96, -4]} delayMax={4} />
      ))}
    </group>
  );
}
