import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { RealisticEarth } from './RealisticEarth';
import { scrollState, pointerState } from '../lib/scrollState';

/* ------------------------------------------------------------------ */
/* Sistema da Terra: o planeta + a LUA orbitando + alguns SATÉLITES     */
/* artificiais em órbita baixa (painéis solares + luz piscando).        */
/* Trilhas de órbita sutis. Tudo iluminado pelo Sol (uSunPos).          */
/* ------------------------------------------------------------------ */

interface SatProps {
  orbitR: number;
  speed: number;
  phase: number;
  tilt: number;
  quality?: number;
}

/** Asa de painel solar: arma + painel azul com divisórias de células. */
function SolarWing({ side, detailed }: { side: 1 | -1; detailed: boolean }) {
  return (
    <group position={[side * 1.15, 0, 0]}>
      {/* braço de fixação */}
      <mesh position={[side * -0.45, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.035, 0.035, 0.5, 8]} />
        <meshStandardMaterial color="#9aa3ad" metalness={0.85} roughness={0.35} />
      </mesh>
      {/* painel */}
      <mesh>
        <boxGeometry args={[1.25, 0.035, 0.78]} />
        <meshStandardMaterial color="#16245a" metalness={0.55} roughness={0.4} emissive="#1b49b8" emissiveIntensity={0.55} />
      </mesh>
      {/* divisórias das células (3 longitudinais + 1 transversal) */}
      {detailed && (
        <>
          {[-0.42, -0.14, 0.14, 0.42].map((z) => (
            <mesh key={z} position={[0, 0.025, z]}>
              <boxGeometry args={[1.25, 0.01, 0.012]} />
              <meshStandardMaterial color="#0a1330" metalness={0.3} roughness={0.7} />
            </mesh>
          ))}
          <mesh position={[0, 0.025, 0]}>
            <boxGeometry args={[0.014, 0.011, 0.78]} />
            <meshStandardMaterial color="#0a1330" metalness={0.3} roughness={0.7} />
          </mesh>
        </>
      )}
    </group>
  );
}

function Satellite({ orbitR, speed, phase, tilt, quality = 1 }: SatProps) {
  const orbit = useRef<THREE.Group>(null);
  const blink = useRef<THREE.MeshBasicMaterial>(null);
  const t = useRef(phase);
  const detailed = quality >= 0.55;
  useFrame((_, delta) => {
    t.current += delta;
    if (orbit.current) orbit.current.rotation.y = t.current * speed;
    if (blink.current) blink.current.opacity = 0.35 + 0.65 * Math.abs(Math.sin(t.current * 3));
  });
  return (
    <group rotation={[tilt, 0, 0]}>
      <group ref={orbit} rotation={[0, phase, 0]}>
        <group position={[orbitR, 0, 0]} scale={0.13} rotation={[0.2, 0.4, 0]}>
          {/* barramento principal — folha dourada (MLI) */}
          <mesh>
            <boxGeometry args={[0.62, 0.66, 0.6]} />
            <meshStandardMaterial color="#caa14a" metalness={0.9} roughness={0.3} emissive="#3a2a08" emissiveIntensity={0.4} />
          </mesh>
          {/* módulo de instrumentos prateado no topo */}
          <mesh position={[0, 0.46, 0]}>
            <boxGeometry args={[0.4, 0.28, 0.4]} />
            <meshStandardMaterial color="#cdd3da" metalness={0.85} roughness={0.3} />
          </mesh>

          {/* asas solares */}
          <SolarWing side={1} detailed={detailed} />
          <SolarWing side={-1} detailed={detailed} />

          {detailed && (
            <>
              {/* antena parabólica */}
              <group position={[0, -0.2, 0.55]} rotation={[1.15, 0, 0]}>
                <mesh>
                  <cylinderGeometry args={[0.32, 0.05, 0.16, 20, 1, true]} />
                  <meshStandardMaterial color="#e6e9ee" metalness={0.5} roughness={0.4} side={THREE.DoubleSide} />
                </mesh>
                {/* alimentador */}
                <mesh position={[0, 0.16, 0]}>
                  <cylinderGeometry args={[0.012, 0.012, 0.3, 6]} />
                  <meshStandardMaterial color="#9aa3ad" metalness={0.8} roughness={0.3} />
                </mesh>
                <mesh position={[0, 0.3, 0]}>
                  <sphereGeometry args={[0.04, 8, 8]} />
                  <meshStandardMaterial color="#cdd3da" metalness={0.8} roughness={0.3} />
                </mesh>
              </group>

              {/* haste de antena com ponteira luminosa */}
              <mesh position={[0, 0.7, 0]}>
                <cylinderGeometry args={[0.012, 0.012, 0.5, 6]} />
                <meshStandardMaterial color="#9aa3ad" metalness={0.8} roughness={0.3} />
              </mesh>
              <mesh position={[0, 0.96, 0]}>
                <sphereGeometry args={[0.05, 10, 10]} />
                <meshBasicMaterial color="#8fe0ff" toneMapped={false} />
              </mesh>
            </>
          )}

          {/* luz de navegação piscando */}
          <mesh position={[0.34, 0.18, 0.34]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshBasicMaterial ref={blink} color="#ff4d4d" transparent toneMapped={false} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function OrbitRing({ r, tilt = 0, opacity = 0.12, segments = 72 }: { r: number; tilt?: number; opacity?: number; segments?: number }) {
  const geo = useMemo(() => new THREE.RingGeometry(r - 0.012, r + 0.012, segments), [r, segments]);
  return (
    <mesh geometry={geo} rotation={[-Math.PI / 2 + tilt, 0, 0]}>
      <meshBasicMaterial color="#9fb8ff" transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

/* Lua real (textura NASA) iluminada pela direção do Sol. */
const MOON_FRAG = /* glsl */ `
  varying vec2 vUv; varying vec3 vPosW; varying vec3 vNormalW;
  uniform sampler2D uMap; uniform vec3 uSunPos; uniform float uOpacity;
  void main() {
    vec3 N = normalize(vNormalW);
    vec3 L = normalize(uSunPos - vPosW);
    float lit = smoothstep(-0.05, 0.4, dot(N, L));
    vec3 c = texture2D(uMap, vUv).rgb;
    gl_FragColor = vec4(c * (lit * 1.1 + 0.03) * uOpacity, 1.0);
  }
`;
const MOON_VERT = /* glsl */ `
  varying vec2 vUv; varying vec3 vPosW; varying vec3 vNormalW;
  void main() {
    vUv = uv;
    vPosW = (modelMatrix * vec4(position, 1.0)).xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

function Moon({ radius, sunPosition, quality }: { radius: number; sunPosition: [number, number, number]; quality: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const map = useTexture('/textures/moon_1024.jpg');
  useEffect(() => {
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    map.needsUpdate = true;
  }, [map]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: MOON_VERT,
        fragmentShader: MOON_FRAG,
        uniforms: {
          uMap: { value: map },
          uSunPos: { value: new THREE.Vector3(...sunPosition) },
          uOpacity: { value: 1 },
        },
      }),
    [map, sunPosition],
  );
  useFrame((_, d) => {
    if (ref.current) ref.current.rotation.y += d * 0.01;
  });
  const seg = quality < 0.55 ? 24 : 48;
  return (
    <mesh ref={ref} material={mat} rotation={[0.05, 0, 0]}>
      <sphereGeometry args={[radius, seg, seg]} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* EASTER EGG: se o usuário ficar 30s com a TELA PARADA observando a    */
/* Terra e a Lua (sem rolar e sem mover o mouse), um foguete desce e    */
/* pousa na Lua — com chama de motor, poeira no toque e bandeira NEXUS. */
/* ------------------------------------------------------------------ */
function MoonRocket({ moonRadius, accent = '#41e8ff' }: { moonRadius: number; accent?: string }) {
  const rocket = useRef<THREE.Group>(null);
  const flame = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const flag = useRef<THREE.Group>(null);
  const idle = useRef(0);
  const animT = useRef(0);
  const phase = useRef<'hidden' | 'landing' | 'landed'>('hidden');
  const lastPtr = useRef({ x: pointerState.x, y: pointerState.y });
  const lastProg = useRef(scrollState.progress);

  const startY = moonRadius + 7;
  const landY = moonRadius + 0.2;
  const DURATION = 7;

  useFrame((state, delta) => {
    const g = rocket.current;
    if (!g || !ring.current || !flag.current) return;

    const inView = scrollState.progress > 0.27 && scrollState.progress < 0.42;
    // "tela parada": sem rolar (progresso estável) e sem mover o mouse
    const scrolled = Math.abs(scrollState.progress - lastProg.current) > 0.0002;
    const moved =
      Math.abs(pointerState.x - lastPtr.current.x) +
        Math.abs(pointerState.y - lastPtr.current.y) >
      0.015;
    const still = !scrolled;
    lastProg.current = scrollState.progress;
    lastPtr.current.x = pointerState.x;
    lastPtr.current.y = pointerState.y;

    // fora da janela de observação → reseta o easter egg
    if (!inView) {
      idle.current = 0;
      phase.current = 'hidden';
      animT.current = 0;
      g.visible = false;
      ring.current.visible = false;
      flag.current.visible = false;
      return;
    }

    if (phase.current === 'hidden') {
      g.visible = false;
      ring.current.visible = false;
      flag.current.visible = false;
      if (still && !moved) idle.current += delta;
      else idle.current = 0;
      if (idle.current >= 30) {
        phase.current = 'landing';
        animT.current = 0;
      }
      return;
    }

    g.visible = true;

    if (phase.current === 'landing') {
      animT.current = Math.min(1, animT.current + delta / DURATION);
      const t = animT.current;
      const e = t * t * (3 - 2 * t);
      g.position.y = THREE.MathUtils.lerp(startY, landY, e);

      // chama do motor: forte na descida, apaga ao tocar
      const burning = t < 0.92 ? 1 : Math.max(0, 1 - (t - 0.92) / 0.08);
      const flick = 0.75 + 0.25 * Math.sin(state.clock.elapsedTime * 45);
      if (flame.current) {
        flame.current.scale.set(1, burning * (1.4 + flick * 0.6), 1);
        (flame.current.material as THREE.MeshBasicMaterial).opacity = burning * 0.9 * flick;
      }

      // poeira no toque
      const dust = THREE.MathUtils.clamp((t - 0.9) / 0.1, 0, 1);
      ring.current.visible = dust > 0;
      const ds = 0.3 + dust * 1.4;
      ring.current.scale.set(ds, ds, ds);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = (1 - dust) * 0.5;

      if (t >= 1) phase.current = 'landed';
      return;
    }

    // pousado: motor desligado, bandeira fincada tremulando de leve
    g.position.y = landY;
    if (flame.current) (flame.current.material as THREE.MeshBasicMaterial).opacity = 0;
    ring.current.visible = false;
    flag.current.visible = true;
    flag.current.rotation.z = Math.sin(state.clock.elapsedTime * 3) * 0.08;
  });

  return (
    <group>
      {/* foguete (desce do alto) */}
      <group ref={rocket} visible={false}>
        <group scale={0.55}>
          {/* fuselagem */}
          <mesh>
            <cylinderGeometry args={[0.14, 0.16, 0.62, 16]} />
            <meshStandardMaterial color="#eef2f7" metalness={0.5} roughness={0.35} />
          </mesh>
          {/* faixa de acento */}
          <mesh position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.142, 0.142, 0.1, 16]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.5} metalness={0.4} roughness={0.4} />
          </mesh>
          {/* cone do nariz */}
          <mesh position={[0, 0.46, 0]}>
            <coneGeometry args={[0.14, 0.26, 16]} />
            <meshStandardMaterial color="#e0463a" metalness={0.3} roughness={0.5} />
          </mesh>
          {/* escotilha */}
          <mesh position={[0, 0.16, 0.145]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.02, 12]} />
            <meshStandardMaterial color="#8fe0ff" emissive="#3aa0ff" emissiveIntensity={0.6} metalness={0.2} roughness={0.2} />
          </mesh>
          {/* 3 aletas */}
          {[0, 1, 2].map((i) => (
            <mesh
              key={i}
              position={[Math.cos((i / 3) * Math.PI * 2) * 0.16, -0.26, Math.sin((i / 3) * Math.PI * 2) * 0.16]}
              rotation={[0, -(i / 3) * Math.PI * 2, 0.32]}
            >
              <boxGeometry args={[0.02, 0.22, 0.16]} />
              <meshStandardMaterial color="#e0463a" metalness={0.3} roughness={0.5} />
            </mesh>
          ))}
          {/* bocal do motor */}
          <mesh position={[0, -0.36, 0]}>
            <cylinderGeometry args={[0.1, 0.13, 0.12, 14]} />
            <meshStandardMaterial color="#6b7178" metalness={0.85} roughness={0.3} />
          </mesh>
          {/* chama */}
          <mesh ref={flame} position={[0, -0.62, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.11, 0.5, 14]} />
            <meshBasicMaterial color="#ffb24d" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>
        </group>
      </group>

      {/* poeira no pouso */}
      <mesh ref={ring} position={[0, moonRadius + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.18, 0.34, 24]} />
        <meshBasicMaterial color="#cfd6dd" transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* bandeira NEXUS fincada */}
      <group ref={flag} position={[0.34, moonRadius + 0.05, 0.05]} visible={false}>
        <mesh position={[0, 0.16, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.34, 6]} />
          <meshStandardMaterial color="#cdd3da" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0.12, 0.27, 0]}>
          <planeGeometry args={[0.22, 0.13]} />
          <meshBasicMaterial color={accent} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

interface Props {
  position: [number, number, number];
  radius?: number;
  sunPosition?: [number, number, number];
  quality?: number;
}

export function EarthSystem({ position, radius = 2.4, sunPosition = [-14, 7, 4], quality = 1 }: Props) {
  const moonOrbit = useRef<THREE.Group>(null);
  const moonR = radius * 2.7;
  const lightMode = quality < 0.55;
  const orbitSegments = lightMode ? 48 : 72;

  useFrame((_, delta) => {
    if (moonOrbit.current) moonOrbit.current.rotation.y += delta * 0.22;
  });

  return (
    <group position={position}>
      {/* Terra realista (texturas NASA) */}
      <RealisticEarth position={[0, 0, 0]} radius={radius} sunPosition={sunPosition} quality={quality} showMarkers={false} />

      {/* Lua em órbita (inclinada) — textura real */}
      <group rotation={[0.32, 0, 0.08]}>
        <OrbitRing r={moonR} opacity={0.1} segments={orbitSegments} />
        <group ref={moonOrbit}>
          <group position={[moonR, 0, 0]}>
            <Moon radius={radius * 0.27} sunPosition={sunPosition} quality={quality} />
            <MoonRocket moonRadius={radius * 0.27} accent="#41e8ff" />
          </group>
        </group>
      </group>

      {/* satélites artificiais em órbita baixa */}
      <OrbitRing r={radius * 1.5} tilt={0.5} opacity={0.08} segments={orbitSegments} />
      <OrbitRing r={radius * 1.7} tilt={-0.4} opacity={0.07} segments={orbitSegments} />
      <Satellite orbitR={radius * 1.5} speed={0.6} phase={0} tilt={0.5} quality={quality} />
      <Satellite orbitR={radius * 1.7} speed={0.45} phase={2.1} tilt={-0.4} quality={quality} />
      <Satellite orbitR={radius * 1.9} speed={0.5} phase={4.0} tilt={0.2} quality={quality} />
    </group>
  );
}
