import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Text } from '@react-three/drei';
import * as THREE from 'three';
import { scrollState } from '../lib/scrollState';
import { FloatingPanel } from './FloatingPanel';

interface GlassPanelProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  size?: [number, number];
  title: string;
  tag?: string;
  body?: string;
  index?: string;
  accent?: string;
  hero?: boolean;
}

/**
 * Tela holográfica de vidro: RoundedBox escuro translúcido, borda fina
 * luminosa + scanlines (FloatingPanel atrás), reflexo interno e texto 3D
 * grande. Flutua em seno, gira de leve com o scroll e revela-se conforme
 * a câmera se aproxima — parecendo um painel de instalação, não um card SaaS.
 */
export function GlassPanel({
  position,
  rotation = [0, 0, 0],
  size = [4.4, 2.7],
  title,
  tag,
  body,
  index,
  accent = '#41e8ff',
  hero = false,
}: GlassPanelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Group>(null);
  const phase = useRef(Math.random() * Math.PI * 2);
  const t = useRef(0);
  const [w, h] = size;

  useFrame((_state, delta) => {
    t.current += delta;
    const group = groupRef.current;
    const inner = innerRef.current;
    if (!group || !inner) return;

    // flutuação + leve oscilação Z (placa de vidro pendurada)
    group.position.y = position[1] + Math.sin(t.current * 0.55 + phase.current) * 0.16;
    group.rotation.z = rotation[2] + Math.sin(t.current * 0.4 + phase.current) * 0.025;

    // rotação Y sutil pela velocidade do scroll
    inner.rotation.y = THREE.MathUtils.damp(
      inner.rotation.y, scrollState.velocity * 0.05, 3, delta,
    );
  });

  const left = -w / 2 + 0.34;
  const titleSize = hero ? Math.min(0.48, h * 0.18) : 0.34;
  const bodyY = hero ? -0.58 : -0.6;
  const tagY = hero ? -h / 2 + 0.52 : -h / 2 + 0.4;
  const titleY = hero ? 0.20 : -0.02;
  const accentY = hero ? -h / 2 + 0.30 : -h / 2 + 0.24;
  const bodyFontSize = hero ? 0.10 : 0.09;
  const bodyMaxWidth = w - 0.8;
  const accentWidth = hero ? 0.9 : 0.6;
  const accentX = hero ? left + 0.5 : left + 0.3;

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <group ref={innerRef}>
        {/* borda luminosa + scanlines holográficas atrás do vidro */}
        <FloatingPanel
          position={[0, 0, -0.08]}
          width={w + 0.22}
          height={h + 0.22}
          color={accent}
          opacity={0.6}
          float={false}
          scrollSpin={0}
        />

        {/* corpo de vidro fosco escuro */}
        <RoundedBox args={[w, h, 0.08]} radius={0.1} smoothness={4}>
          <meshPhysicalMaterial
            color="#070c1c"
            transparent
            opacity={0.9}
            transmission={0.65}
            thickness={0.6}
            roughness={0.2}
            metalness={0.1}
            clearcoat={1}
            clearcoatRoughness={0.14}
            iridescence={0.5}
            iridescenceIOR={1.3}
            envMapIntensity={1.2}
          />
        </RoundedBox>

        {/* reflexo interno diagonal — limitado à largura do card */}
        <mesh position={[0, 0, 0.045]} rotation={[0, 0, 0.5]}>
          <planeGeometry args={[w * 0.85, 0.10]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.05} toneMapped={false} />
        </mesh>

        {index && (
          <Text
            position={[left, h / 2 - 0.36, 0.06]}
            fontSize={0.15}
            color={accent}
            anchorX="left"
            anchorY="middle"
            letterSpacing={0.3}
          >
            {`/ ${index}`}
          </Text>
        )}

          <Text
            position={hero ? [0, titleY, 0.06] : [left, -0.02, 0.06]}
          fontSize={titleSize}
          maxWidth={w - 0.6}
          color="#f4f6fb"
          anchorX={hero ? 'center' : 'left'}
          anchorY="middle"
          textAlign={hero ? 'center' : 'left'}
          letterSpacing={hero ? 0.04 : 0.01}
          lineHeight={1.02}
        >
          {title}
        </Text>

        {tag && (
          <Text
            position={hero ? [0, tagY, 0.06] : [left, -h / 2 + 0.4, 0.06]}
            fontSize={0.11}
            color="#8fa3c8"
            anchorX={hero ? 'center' : 'left'}
            anchorY="middle"
            letterSpacing={0.26}
          >
            {tag}
          </Text>
        )}

        {body && (
          <Text
            position={hero ? [0, bodyY, 0.06] : [left, -0.6, 0.06]}
            fontSize={bodyFontSize}
            maxWidth={bodyMaxWidth}
            color="#cfe2ff"
            anchorX={hero ? 'center' : 'left'}
            anchorY="middle"
            textAlign={hero ? 'center' : 'left'}
            lineHeight={1.06}
          >
            {body}
          </Text>
        )}

        {/* linha de acento luminosa */}
        <mesh position={[hero ? 0 : accentX, accentY, 0.06]}>
          <planeGeometry args={[accentWidth, 0.014]} />
          <meshBasicMaterial color={accent} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}
