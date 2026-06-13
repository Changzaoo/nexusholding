import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Text } from '@react-three/drei';
import * as THREE from 'three';
import { scrollState } from '../lib/scrollState';
import { FloatingPanel } from './FloatingPanel';

interface GlassCard3DProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  width?: number;
  height?: number;
  title: string;
  tag?: string;
  index?: string;
  accent?: string;
  /** card de destaque (horizon/mission) — tipografia maior, centralizada */
  hero?: boolean;
}

/**
 * Card 3D de vidro fosco: RoundedBox físico translúcido + halo
 * holográfico atrás + textos em 3D. Flutua em seno, gira de leve
 * com o scroll e "entra em cena" (scale) conforme a câmera se aproxima.
 */
export function GlassCard3D({
  position,
  rotation = [0, 0, 0],
  width = 3.4,
  height = 2,
  title,
  tag,
  index,
  accent = '#41e8ff',
  hero = false,
}: GlassCard3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Group>(null);
  const phase = useRef(Math.random() * Math.PI * 2);
  const timeRef = useRef(0);

  useFrame((state, delta) => {
    timeRef.current += delta;
    const t = timeRef.current;
    const group = groupRef.current;
    const inner = innerRef.current;
    if (!group || !inner) return;

    // flutuação senoidal contínua
    group.position.y = position[1] + Math.sin(t * 0.55 + phase.current) * 0.14;
    group.rotation.z = rotation[2] + Math.sin(t * 0.4 + phase.current) * 0.025;

    // entrada em profundidade: revela conforme a câmera se aproxima
    const dz = Math.abs(state.camera.position.z - position[2]);
    const appear = 1 - THREE.MathUtils.smoothstep(dz, 16, 30);
    const targetScale = 0.72 + appear * 0.28;
    const s = THREE.MathUtils.damp(group.scale.x, targetScale, 3, delta);
    group.scale.setScalar(s);

    // rotação no eixo Y: base + abertura na entrada + reação ao scroll
    inner.rotation.y = THREE.MathUtils.damp(
      inner.rotation.y,
      (1 - appear) * 0.55 + scrollState.velocity * 0.045,
      3,
      delta,
    );
  });

  const titleSize = hero ? height * 0.18 : 0.3;
  const left = -width / 2 + 0.32;

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <group ref={innerRef}>
        {/* halo holográfico atrás do vidro */}
        <FloatingPanel
          position={[0, 0, -0.09]}
          width={width + 0.22}
          height={height + 0.22}
          color={accent}
          opacity={0.55}
          float={false}
          scrollSpin={0}
        />

        {/* corpo de vidro fosco */}
        <RoundedBox args={[width, height, 0.08]} radius={0.09} smoothness={4}>
          <meshPhysicalMaterial
            color="#0b1226"
            transparent
            opacity={0.92}
            transmission={0.7}
            thickness={0.5}
            roughness={0.22}
            metalness={0.1}
            clearcoat={1}
            clearcoatRoughness={0.15}
            iridescence={0.45}
            iridescenceIOR={1.3}
            envMapIntensity={1.1}
          />
        </RoundedBox>

        {/* tipografia 3D */}
        {index && (
          <Text
            position={[left, height / 2 - 0.34, 0.06]}
            fontSize={0.14}
            color={accent}
            anchorX="left"
            anchorY="middle"
            letterSpacing={0.3}
          >
            {`/ ${index}`}
          </Text>
        )}

        <Text
          position={hero ? [0, 0.1, 0.06] : [left, -0.05, 0.06]}
          fontSize={titleSize}
          maxWidth={width - 0.6}
          color="#f4f6fb"
          anchorX={hero ? 'center' : 'left'}
          anchorY="middle"
          textAlign={hero ? 'center' : 'left'}
          letterSpacing={hero ? 0.08 : 0.02}
          lineHeight={1.1}
        >
          {hero ? title : title.toUpperCase()}
        </Text>

        {tag && (
          <Text
            position={hero ? [0, -height / 2 + 0.4, 0.06] : [left, -height / 2 + 0.38, 0.06]}
            fontSize={0.105}
            color="#8fa3c8"
            anchorX={hero ? 'center' : 'left'}
            anchorY="middle"
            letterSpacing={0.28}
          >
            {tag}
          </Text>
        )}

        {/* linha de acento */}
        <mesh position={[hero ? 0 : left + 0.3, -height / 2 + 0.22, 0.06]}>
          <planeGeometry args={[0.6, 0.012]} />
          <meshBasicMaterial color={accent} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}
