import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Planet } from './Planet';

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

function Satellite({ orbitR, speed, phase, tilt, quality = 1 }: SatProps) {
  const orbit = useRef<THREE.Group>(null);
  const blink = useRef<THREE.MeshBasicMaterial>(null);
  const t = useRef(phase);
  const small = quality < 0.55;
  useFrame((_, delta) => {
    t.current += delta;
    if (orbit.current) orbit.current.rotation.y = t.current * speed;
    if (blink.current) blink.current.opacity = 0.4 + 0.6 * Math.abs(Math.sin(t.current * 3));
  });
  return (
    <group rotation={[tilt, 0, 0]}>
      <group ref={orbit} rotation={[0, phase, 0]}>
        <group position={[orbitR, 0, 0]} scale={0.13}>
          {/* corpo */}
          <mesh>
            <boxGeometry args={[0.7, 0.6, 0.6]} />
            <meshStandardMaterial color="#cdd3da" metalness={0.8} roughness={0.35} />
          </mesh>
          {/* painéis solares */}
          {!small && (
            <>
              <mesh position={[1.1, 0, 0]}>
                <boxGeometry args={[1.2, 0.04, 0.7]} />
                <meshStandardMaterial color="#1b2a55" metalness={0.6} roughness={0.4} emissive="#16337a" emissiveIntensity={0.3} />
              </mesh>
              <mesh position={[-1.1, 0, 0]}>
                <boxGeometry args={[1.2, 0.04, 0.7]} />
                <meshStandardMaterial color="#1b2a55" metalness={0.6} roughness={0.4} emissive="#16337a" emissiveIntensity={0.3} />
              </mesh>
            </>
          )}
          {/* luz piscando */}
          <mesh position={[0, 0.4, 0]}>
            <sphereGeometry args={[0.12, 8, 8]} />
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
      {/* Terra */}
      <Planet position={[0, 0, 0]} type="terran" radius={radius} sunPosition={sunPosition} tilt={0.4} spin={0.05} seed={2.0} quality={quality} />

      {/* Lua em órbita (inclinada) */}
      <group rotation={[0.32, 0, 0.08]}>
        <OrbitRing r={moonR} opacity={0.1} segments={orbitSegments} />
        <group ref={moonOrbit}>
          <Planet
            position={[moonR, 0, 0]}
            type="rocky"
            radius={radius * 0.27}
            sunPosition={sunPosition}
            colorA="#9a9a9a"
            colorB="#5c5c5c"
            tilt={0.05}
            spin={0.01}
            seed={7.0}
            quality={quality * 0.7}
          />
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
