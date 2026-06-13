import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { galleryCards } from '../data/galleryContent';
import { GlassPanel } from './GlassPanel';
import { FloatingPanel } from './FloatingPanel';

interface Props {
  /** 1 = desktop, <1 reduz painéis decorativos (mobile) */
  quality?: number;
}

// Apply opacity/intensity to meshes and lights inside a group.
type OriginalStore = { mats: Map<string, number>; lights: Map<string, number> };

function applyGroupOpacity(group: THREE.Object3D | null, opacityFactor: number, originals: OriginalStore) {
  if (!group) return;
  if (opacityFactor <= 0) { group.visible = false; return; }
  group.visible = true;
  group.traverse((obj: any) => {
    if (!obj) return;
    if (obj.isMesh || obj.isSprite) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m: any) => {
        if (!m || typeof m.opacity !== 'number') return;
        if (!originals.mats.has(m.uuid)) originals.mats.set(m.uuid, m.opacity);
        const orig = originals.mats.get(m.uuid) ?? 1;
        m.transparent = true;
        m.opacity = opacityFactor * orig;
      });
    }
    if (obj.isLight) {
      if (!originals.lights.has(obj.uuid)) originals.lights.set(obj.uuid, obj.intensity ?? 1);
      const orig = originals.lights.get(obj.uuid) ?? 1;
      obj.intensity = opacityFactor * orig;
    }
  });
}

/** Fade out a group based on 3D distance — smooth alpha, no pop-in. */
function FadeByDistance({ children, position, fadeStart = 12, fadeEnd = 26 }: { children: React.ReactNode; position: [number, number, number]; fadeStart?: number; fadeEnd?: number }) {
  const ref = useRef<THREE.Group>(null);
  const originals = useRef<{ mats: Map<string, number>; lights: Map<string, number> }>({ mats: new Map(), lights: new Map() });
  useFrame((state) => {
    if (!ref.current) return;
    const d = state.camera.position.distanceTo(new THREE.Vector3(position[0], position[1], position[2]));
    const t = 1 - THREE.MathUtils.clamp((d - fadeStart) / (fadeEnd - fadeStart), 0, 1);
    applyGroupOpacity(ref.current, t, originals.current);
  });
  return <group ref={ref}>{children}</group>;
}

/**
 * Galeria horizontal 3D: as telas de vidro (galleryContent) espalhadas em
 * profundidade pelo corredor, com painéis holográficos decorativos entre
 * elas para reforçar as camadas. A câmera (CameraRig) serpenteia por aqui.
 * Cada card agora usa FadeByDistance para transição suave com a câmera.
 */
export function Horizontal3DGallery({ quality = 1 }: Props) {
  return (
    <group>
      {galleryCards.map((card) => (
        <FadeByDistance key={card.id} position={card.position} fadeStart={8} fadeEnd={22}>
          <GlassPanel
            position={card.position}
            rotation={card.rotation}
            size={card.size}
            title={card.title}
            tag={card.tag}
            body={card.body}
            index={card.index}
            accent={card.accent}
            hero={card.hero}
          />
        </FadeByDistance>
      ))}

      {/* painéis distantes (camada de fundo da instalação) */}
      <FloatingPanel position={[-9, 2.5, -22]} rotation={[0, 0.7, 0]} width={3.2} height={1.8} color="#3b82f6" opacity={0.4} />
      <FloatingPanel position={[9.5, -2.5, -28]} rotation={[0, -0.7, 0.05]} width={3.6} height={2} color="#8b5cf6" opacity={0.38} />
      {quality > 0.6 && (
        <>
          <FloatingPanel position={[-10, -1.5, -34]} rotation={[0, 0.6, -0.04]} width={4} height={2.2} color="#41e8ff" opacity={0.32} />
          <FloatingPanel position={[10, 2, -40]} rotation={[0, -0.8, 0]} width={4.4} height={2.4} color="#a3ff6b" opacity={0.26} />
          <FloatingPanel position={[2, 4, -30]} rotation={[0.2, 0, 0]} width={3} height={1.6} color="#ff4ecd" opacity={0.28} />
          {/* placas gigantes passando parcialmente fora da tela (escala) */}
          <FloatingPanel position={[-12, 0.5, -38]} rotation={[0, 0.8, 0]} width={6.5} height={3.8} color="#3b82f6" opacity={0.34} />
          <FloatingPanel position={[12, -1, -44]} rotation={[0, -0.8, 0]} width={7} height={4} color="#41e8ff" opacity={0.3} />
        </>
      )}
    </group>
  );
}
