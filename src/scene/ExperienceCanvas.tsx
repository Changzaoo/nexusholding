import { Suspense, useEffect, useRef, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { bindPointer, scrollState } from '../lib/scrollState';
import { useDeviceProfile } from '../hooks/useDeviceProfile';
import { CameraRig } from './CameraRig';
import { MouseParallax } from './MouseParallax';
import { DenseParticleNebula } from './DenseParticleNebula';
import { Horizontal3DGallery } from './Horizontal3DGallery';
import { Starfield } from './Starfield';
import { Sun } from './Sun';
import { Planet } from './Planet';
import { Galaxy } from './Galaxy';
import { EarthSystem } from './EarthSystem';
import { Asteroids } from './Asteroids';
import { Comets } from './Comets';
import { BlackHole } from './BlackHole';
import { WarpEffect } from './WarpEffect';
import { NebulaReveal } from './NebulaReveal';

const SUN_POS: [number, number, number] = [-9, 4.5, -6];

// Apply opacity/intensity to meshes and lights inside a group.
// If opacityFactor <= 0 the whole group is hidden (group.visible = false)
// so objects don't bleed through earlier in the timeline. When > 0 we
// restore visibility and fade materials/lights according to original values.
type OriginalStore = { mats: Map<string, number>; lights: Map<string, number> };

function applyGroupOpacity(group: THREE.Object3D | null, opacityFactor: number, originals: OriginalStore) {
  if (!group) return;
  if (opacityFactor <= 0) {
    group.visible = false;
    return;
  }

  group.visible = true;
  group.traverse((obj: any) => {
    if (!obj) return;

    // materials on meshes / sprites
    if (obj.isMesh || obj.isSprite) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m: any) => {
        if (!m) return;
        if (typeof m.opacity === 'number') {
          if (!originals.mats.has(m.uuid)) originals.mats.set(m.uuid, m.opacity);
          const orig = originals.mats.get(m.uuid) ?? 1;
          m.transparent = true;
          m.opacity = opacityFactor * orig;
        }
      });
    }

    // lights: scale intensity
    if (obj.isLight) {
      if (!originals.lights.has(obj.uuid)) originals.lights.set(obj.uuid, obj.intensity ?? 1);
      const orig = originals.lights.get(obj.uuid) ?? 1;
      obj.intensity = opacityFactor * orig;
    }
  });
}

function RevealOnScroll({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const originals = useRef<OriginalStore>({ mats: new Map(), lights: new Map() });
  useFrame(() => {
    if (!ref.current) return;
    const p = scrollState.progress;
    // planets start appearing only AFTER the warp effect ends (~0.26)
    const t = THREE.MathUtils.clamp((p - 0.26) / (0.34 - 0.26), 0, 1);
    applyGroupOpacity(ref.current, t, originals.current);
  });
  return <group ref={ref}>{children}</group>;
}

function VisibleRange({ children, start = 0, end = 1 }: { children: ReactNode; start?: number; end?: number }) {
  const ref = useRef<THREE.Group>(null);
  const originals = useRef<OriginalStore>({ mats: new Map(), lights: new Map() });
  useFrame(() => {
    if (!ref.current) return;
    const p = scrollState.progress;
    const t = end > start
      ? THREE.MathUtils.clamp((p - start) / (end - start), 0, 1)  // fade-in
      : THREE.MathUtils.clamp(1 - (p - end) / (start - end), 0, 1); // fade-out (start > end)
    applyGroupOpacity(ref.current, t, originals.current);
  });
  return <group ref={ref}>{children}</group>;
}

/** Fade out a group based on camera distance — no pop, just smooth alpha. */
function FadeByDistance({ children, position, fadeStart = 20, fadeEnd = 40 }: { children: ReactNode; position: [number, number, number]; fadeStart?: number; fadeEnd?: number }) {
  const ref = useRef<THREE.Group>(null);
  const originals = useRef<OriginalStore>({ mats: new Map(), lights: new Map() });
  useFrame((state) => {
    if (!ref.current) return;
    const d = state.camera.position.distanceTo(new THREE.Vector3(position[0], position[1], position[2]));
    const t = 1 - THREE.MathUtils.clamp((d - fadeStart) / (fadeEnd - fadeStart), 0, 1);
    applyGroupOpacity(ref.current, t, originals.current);
  });
  return <group ref={ref}>{children}</group>;
}

function RevealWhenNear({ children, position, inner = 12, outer = 24 }: { children: ReactNode; position: [number, number, number]; inner?: number; outer?: number }) {
  const ref = useRef<THREE.Group>(null);
  const originals = useRef<OriginalStore>({ mats: new Map(), lights: new Map() });
  useFrame((state) => {
    if (!ref.current) return;
    const camPos = state.camera.position;
    const target = new THREE.Vector3(position[0], position[1], position[2]);
    const d = camPos.distanceTo(target);
    // fade in when inside outer, full visible inside inner
    let t = 0;
    if (d <= inner) t = 1;
    else if (d < outer) t = 1 - (d - inner) / (outer - inner);
    else t = 0;
    applyGroupOpacity(ref.current, t, originals.current);
  });
  return <group ref={ref}>{children}</group>;
}

function SceneContent() {
  const profile = useDeviceProfile();
  const q = profile.quality;

  return (
    <>
      <CameraRig />

      {/* ============================ ESPAÇO SIDERAL ============================ */}
      {/* GALÁXIA (Via Láctea) — visível no topo (p=0), desaparece durante a viagem na luz (p=0→0.24). */}
      <VisibleRange start={0.24} end={0}>
        <Galaxy count={profile.isMobile ? 1800 : 3500} position={[0, 6, -180]} rotation={[1.2, 0, 0.4]} radius={140} />
      </VisibleRange>

      {/* campo de estrelas distante envolvendo toda a jornada */}
      <Starfield count={profile.isMobile ? 700 : 1600} />

      {/* efeito de viagem na luz — 3000 partículas, p=0.02→0.26 */}
      <WarpEffect />
      {/* nebulosa de transição — nuvem que revela planetas suavemente, p=0.22→0.65 */}
      <NebulaReveal />

      {/* iluminação — primeiras luzes visíveis na entrada, somem antes do buraco negro */}
      <ambientLight intensity={0.22} />
      <pointLight position={[0, 3, 5]} intensity={36} color="#ffffff" />
      <VisibleRange end={0.78}>
        <pointLight position={[-5, 2, -10]} intensity={55} color="#8b5cf6" />
        <pointLight position={[5, -2, -22]} intensity={60} color="#41e8ff" />
        <pointLight position={[-4, 2, -34]} intensity={60} color="#3b82f6" />
        <pointLight position={[4, 1, -42]} intensity={55} color="#a3ff6b" />
        <pointLight position={[0, 2, -60]} intensity={55} color="#ff4ecd" />
      </VisibleRange>

      {/* env map procedural p/ reflexos do vidro (sem rede) */}
      <Environment resolution={64} frames={1}>
        <color attach="background" args={['#060914']} />
        <Lightformer intensity={3} color="#41e8ff" position={[4, 2, -3]} scale={[8, 3, 1]} />
        <Lightformer intensity={2.5} color="#8b5cf6" position={[-5, -1, -2]} scale={[6, 4, 1]} />
        <Lightformer intensity={1.6} color="#ffffff" position={[0, 5, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[10, 10, 1]} />
        <Lightformer intensity={1.4} color="#ff4ecd" position={[0, -4, 2]} scale={[7, 2, 1]} />
      </Environment>

      {/* ====== SISTEMA SOLAR — todos os objetos visíveis simultaneamente ======
          FadeByDistance com fadeStart=0 garante que tudo apareça mesmo de longe.
          fadeEnd grande para transição suave ao se aproximar — sem pop-in. */}
      <RevealOnScroll>
        {/* grupo solar: Sun + Earth + asteroides */}
        <FadeByDistance position={SUN_POS} fadeStart={0} fadeEnd={30}>
          <Sun position={SUN_POS} radius={2.2} lightIntensity={profile.isMobile ? 300 : 520} quality={q} />
          <EarthSystem position={[3.5, -0.3, -9]} radius={2.6} sunPosition={SUN_POS} quality={q} />
          <Asteroids count={profile.isMobile ? 18 : 60} />
          <Comets comets={profile.isMobile ? 0 : 1} meteors={profile.isMobile ? 1 : 2} />
        </FadeByDistance>

        {/* gigante gasoso azul + planeta rochoso + gigante com anéis */}
        <FadeByDistance position={[-13, 4.5, -19]} fadeStart={0} fadeEnd={40}>
          <Planet position={[-13, 4.5, -19]} radius={2.7} type="gas" sunPosition={[-4, 8, -10]} colorA="#2b5fa6" colorB="#7fb8e8" tilt={0.7} spin={0.05} seed={9.0} quality={q} />
          <Planet position={[12, 6, -40]} radius={1.7} type="rocky" sunPosition={[6, 10, -24]} tilt={0.3} spin={0.07} seed={4.0} quality={q} />
          <Planet position={[8, 1, -78]} radius={5.8} type="gas" sunPosition={[-6, 10, -58]} ring ringColor="#e6cfa0" ringInner={1.3} ringOuter={2.4} tilt={0.5} spin={0.02} seed={1.0} quality={q} />
        </FadeByDistance>

        {/* BURACO NEGRO */}
        <FadeByDistance position={[-20, 5, -125]} fadeStart={0} fadeEnd={110}><BlackHole position={[-20, 5, -125]} radius={6} tilt={0.42} /></FadeByDistance>

        {/* galeria de conteúdo (cards de vidro) flutuando no espaço */}
        <VisibleRange start={0.34} end={0.88}><Horizontal3DGallery quality={q} /></VisibleRange>

        {/* fundo: partículas densas + nebulosa com parallax de mouse */}
        <VisibleRange start={0.34} end={0.9}>
          <MouseParallax factor={0.5}>
            <DenseParticleNebula count={profile.particleCount} />
          </MouseParallax>
        </VisibleRange>
      </RevealOnScroll>
    </>
  );
}

/**
 * Canvas fullscreen fixo: é a "página" inteira. O scroll só move a câmera
 * (CameraRig). Bloom realça os objetos luminosos; vignette escurece as
 * bordas — reforçando a atmosfera cinematográfica do vídeo.
 */
export default function ExperienceCanvas() {
  const profile = useDeviceProfile();
  useEffect(() => bindPointer(), []);

  return (
    <div className="fixed inset-0 z-0" aria-hidden>
      <Canvas
        dpr={profile.dpr}
        gl={{ antialias: !profile.isMobile && !profile.lowPower, powerPreference: 'high-performance', alpha: false }}
        camera={{ fov: 44, near: 0.1, far: 400, position: [0, 0.2, 9] }}
      >
        <color attach="background" args={['#01020a']} />
        <fog attach="fog" args={['#03040d', 30, 140]} />
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
        {profile.effects && (
          <EffectComposer enableNormalPass={false} multisampling={0}>
            <Bloom
              intensity={profile.isMobile ? 0.35 : 0.65}
              luminanceThreshold={0.18}
              luminanceSmoothing={0.4}
              mipmapBlur
              radius={0.7}
            />
            <Vignette offset={0.3} darkness={0.85} eskil={false} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}
