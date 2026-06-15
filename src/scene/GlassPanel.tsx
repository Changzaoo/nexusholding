import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Text } from '@react-three/drei';
import * as THREE from 'three';
import { scrollState } from '../lib/scrollState';
import { FloatingPanel } from './FloatingPanel';

/* Fontes da marca (locais → texto 3D nítido, na identidade e sem depender de CDN) */
const FONT_DISPLAY = '/fonts/SairaCondensed-Bold.ttf';
const FONT_BODY = '/fonts/SpaceGrotesk.ttf';
const FONT_MONO = '/fonts/IBMPlexMono-Regular.ttf';

/* Material base compartilhado p/ texto secundário (índice, tag, corpo):
   toneMapped=false evita que o ACES rebaixe o branco a cinza — sem isso o
   texto fino e pequeno fica "apagado", sobretudo nos cards vistos em ângulo.
   O troika deriva deste material e a cor (`color`) continua por instância. */
const TEXT_MATERIAL = new THREE.MeshBasicMaterial({
  toneMapped: false,
  transparent: true,
});

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
 * luminosa + scanlines (FloatingPanel atrás), reflexo interno e conteúdo
 * editorial em texto 3D (índice, título, eyebrow, divisor e corpo). Flutua
 * em seno, gira de leve com o scroll e revela-se conforme a câmera se
 * aproxima — parecendo um painel de instalação, não um card SaaS.
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

  const padX = 0.46; // respiro lateral → texto nunca encosta na borda
  const left = -w / 2 + padX;
  const top = h / 2 - 0.46;
  const innerW = w - padX * 2; // largura útil de texto
  const titleSize = hero ? Math.min(0.5, h * 0.17) : Math.min(0.42, h * 0.16);

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

        {/* corpo de vidro fosco escuro — sólido (sem transmissão) p/ cor cheia */}
        <RoundedBox args={[w, h, 0.08]} radius={0.1} smoothness={4}>
          <meshPhysicalMaterial
            color="#0c1530"
            emissive="#070c1c"
            emissiveIntensity={0.5}
            roughness={0.3}
            metalness={0.14}
            clearcoat={1}
            clearcoatRoughness={0.16}
            iridescence={0.32}
            iridescenceIOR={1.3}
            envMapIntensity={0.95}
          />
        </RoundedBox>

        {/* placa escura por trás do texto → contraste alto, texto bem legível */}
        <mesh position={[0, 0, 0.045]}>
          <planeGeometry args={[w - 0.14, h - 0.14]} />
          <meshBasicMaterial color="#040711" toneMapped={false} />
        </mesh>

        {/* faixa de cabeçalho luminosa (recuada das bordas) */}
        <mesh position={[0, h / 2 - 0.2, 0.05]}>
          <planeGeometry args={[innerW, 0.02]} />
          <meshBasicMaterial color={accent} transparent opacity={0.7} toneMapped={false} />
        </mesh>

        {/* reflexo interno diagonal — limitado à largura do card */}
        <mesh position={[0, 0, 0.045]} rotation={[0, 0, 0.5]}>
          <planeGeometry args={[w * 0.85, 0.1]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.05} toneMapped={false} />
        </mesh>

        {hero ? (
          /* ----------------------- card de destaque (centralizado) */
          <>
            {index && (
              <Text font={FONT_MONO} material={TEXT_MATERIAL} position={[0, top, 0.06]} fontSize={0.13} color={accent} anchorX="center" anchorY="top" letterSpacing={0.32} outlineWidth={0.006} outlineColor="#020512" outlineOpacity={0.85}>
                {`— ${index} —`}
              </Text>
            )}
            <Text font={FONT_DISPLAY} position={[0, h * 0.16, 0.06]} fontSize={titleSize} maxWidth={innerW} color="#ffffff" anchorX="center" anchorY="middle" textAlign="center" letterSpacing={0.02} lineHeight={0.96} outlineWidth={0.004} outlineColor="#0a1430" outlineOpacity={0.6}>
              {title}
            </Text>
            {tag && (
              <Text font={FONT_MONO} material={TEXT_MATERIAL} position={[0, -0.16, 0.06]} fontSize={0.105} maxWidth={innerW} color={accent} anchorX="center" anchorY="middle" textAlign="center" letterSpacing={0.16} outlineWidth={0.005} outlineColor="#020512" outlineOpacity={0.85}>
                {tag.toUpperCase()}
              </Text>
            )}
            <mesh position={[0, -0.4, 0.06]}>
              <planeGeometry args={[Math.min(0.9, innerW), 0.014]} />
              <meshBasicMaterial color={accent} toneMapped={false} />
            </mesh>
            {body && (
              <Text font={FONT_BODY} material={TEXT_MATERIAL} position={[0, -0.56, 0.06]} fontSize={0.1} maxWidth={innerW - 0.3} color="#f4f8ff" anchorX="center" anchorY="top" textAlign="center" lineHeight={1.45} outlineWidth={0.005} outlineColor="#020512" outlineOpacity={0.8}>
                {body}
              </Text>
            )}
          </>
        ) : (
          /* ----------------------- card padrão (alinhado à esquerda) */
          <>
            {index && (
              <Text font={FONT_MONO} material={TEXT_MATERIAL} position={[left, top, 0.06]} fontSize={0.125} color={accent} anchorX="left" anchorY="top" letterSpacing={0.28} outlineWidth={0.006} outlineColor="#020512" outlineOpacity={0.85}>
                {`/ ${index}`}
              </Text>
            )}
            <Text font={FONT_DISPLAY} position={[left, top - 0.28, 0.06]} fontSize={titleSize} maxWidth={innerW} color="#ffffff" anchorX="left" anchorY="top" textAlign="left" letterSpacing={0.015} lineHeight={0.95} outlineWidth={0.004} outlineColor="#0a1430" outlineOpacity={0.6}>
              {title.toUpperCase()}
            </Text>
            {tag && (
              <Text font={FONT_MONO} material={TEXT_MATERIAL} position={[left, top - 0.28 - titleSize - 0.14, 0.06]} fontSize={0.09} color={accent} anchorX="left" anchorY="top" letterSpacing={0.18} maxWidth={innerW} lineHeight={1.2} outlineWidth={0.005} outlineColor="#020512" outlineOpacity={0.85}>
                {tag.toUpperCase()}
              </Text>
            )}
            <mesh position={[left + 0.3, top - 0.28 - titleSize - 0.34, 0.06]}>
              <planeGeometry args={[0.6, 0.013]} />
              <meshBasicMaterial color={accent} toneMapped={false} />
            </mesh>
            {body && (
              <Text font={FONT_BODY} material={TEXT_MATERIAL} position={[left, top - 0.28 - titleSize - 0.5, 0.06]} fontSize={0.088} maxWidth={innerW} color="#f4f8ff" anchorX="left" anchorY="top" textAlign="left" lineHeight={1.42} outlineWidth={0.005} outlineColor="#020512" outlineOpacity={0.8}>
                {body}
              </Text>
            )}
          </>
        )}
      </group>
    </group>
  );
}
