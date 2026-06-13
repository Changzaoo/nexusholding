import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { pointerState } from '../lib/scrollState';

interface HolographicRingProps {
  position?: [number, number, number];
  scale?: number;
  /** raio do tubo do torus */
  tube?: number;
  /** velocidade da rotação contínua */
  speed?: number;
  /** quanto o anel reage ao mouse (0 = nada) */
  mouseInfluence?: number;
  color?: string;
}

/**
 * Anel holográfico de vidro líquido: torus físico com transmission,
 * iridescência e clearcoat. Gira lentamente em X/Y/Z, "respira"
 * (deformação sutil de escala) e inclina suavemente em direção ao mouse.
 */
export function HolographicRing({
  position = [0, 0, 0],
  scale = 1,
  tube = 0.42,
  speed = 1,
  mouseInfluence = 0.35,
  color = '#bcd6ff',
}: HolographicRingProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(Math.random() * 100);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const t = timeRef.current;
    const mesh = meshRef.current;
    const group = groupRef.current;
    if (!mesh || !group) return;

    // rotação contínua lenta em 3 eixos
    mesh.rotation.x += delta * 0.12 * speed;
    mesh.rotation.y += delta * 0.18 * speed;
    mesh.rotation.z += delta * 0.07 * speed;

    // deformação orgânica sutil ("respiração" assimétrica)
    mesh.scale.set(
      1 + Math.sin(t * 0.7) * 0.045,
      1 + Math.sin(t * 0.9 + 1.3) * 0.045,
      1 + Math.cos(t * 0.6 + 0.5) * 0.045,
    );

    // inclinação suave em direção ao mouse
    group.rotation.x = THREE.MathUtils.damp(
      group.rotation.x,
      pointerState.y * mouseInfluence,
      2.2,
      delta,
    );
    group.rotation.y = THREE.MathUtils.damp(
      group.rotation.y,
      pointerState.x * mouseInfluence,
      2.2,
      delta,
    );

    // flutuação vertical
    group.position.y = position[1] + Math.sin(t * 0.55) * 0.12;
  });

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <mesh ref={meshRef}>
        <torusGeometry args={[1.6, tube, 48, 128]} />
        <meshPhysicalMaterial
          color={color}
          transmission={1}
          thickness={1.4}
          roughness={0.12}
          metalness={0}
          ior={1.3}
          clearcoat={1}
          clearcoatRoughness={0.1}
          iridescence={1}
          iridescenceIOR={1.4}
          iridescenceThicknessRange={[120, 560]}
          attenuationColor="#8b5cf6"
          attenuationDistance={3.5}
          envMapIntensity={1.6}
        />
      </mesh>
    </group>
  );
}
