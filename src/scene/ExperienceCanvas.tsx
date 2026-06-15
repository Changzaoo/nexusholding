import { Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react';
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
import { Nebula } from './Nebula';
import { Sun } from './Sun';
import { Planet } from './Planet';
import { Galaxy } from './Galaxy';
import { EarthSystem } from './EarthSystem';
import { Asteroids } from './Asteroids';
import { Comets } from './Comets';
import { BlackHole } from './BlackHole';
import { WarpEffect } from './WarpEffect';
import { NebulaReveal } from './NebulaReveal';
import { UfoChase } from './UfoChase';

const SUN_POS: [number, number, number] = [-9, 4.5, -6];

// Apply opacity/intensity to meshes and lights inside a group.
// If opacityFactor <= 0 the whole group is hidden (group.visible = false)
// so objects don't bleed through earlier in the timeline. When > 0 we
// restore visibility and fade materials/lights according to original values.
type OriginalStore = { mats: Map<string, number>; lights: Map<string, number> };

// smootherstep (5ª ordem): aceleração/desaceleração suave nas pontas →
// materialização cinematográfica sem "degraus" de opacidade.
function smoother(t: number) {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

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
        // shaders procedurais (planetas/terra/lua/sol) respeitam uOpacity:
        // fade real no fragmento, sem depender de material.opacity.
        const uo = m.uniforms?.uOpacity;
        if (uo) {
          uo.value = opacityFactor;
          return;
        }
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
    // os planetas são revelados ENQUANTO o flash branco OPACO cobre 100%
    // da tela (warpBlink segura opaco em p=0.20→0.235, ver Overlay).
    // Concluído em 0.23 → quando o branco some, já estão prontos. Nunca
    // são vistos "spawnando".
    const t = smoother((p - 0.2) / (0.23 - 0.2));
    applyGroupOpacity(ref.current, t, originals.current);
  });
  return <group ref={ref}>{children}</group>;
}

/** Janela completa: invisível fora de [a,d]; entra a→b, segura b→c, sai c→d. */
function TimeWindow({ children, a, b, c, d }: { children: ReactNode; a: number; b: number; c: number; d: number }) {
  const ref = useRef<THREE.Group>(null);
  const originals = useRef<OriginalStore>({ mats: new Map(), lights: new Map() });
  useFrame(() => {
    if (!ref.current) return;
    const p = scrollState.progress;
    let t = 0;
    if (p > a && p < d) {
      if (p < b) t = (p - a) / (b - a);
      else if (p > c) t = 1 - (p - c) / (d - c);
      else t = 1;
    }
    applyGroupOpacity(ref.current, smoother(t), originals.current);
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
      ? smoother((p - start) / (end - start))  // fade-in
      : smoother(1 - (p - end) / (start - end)); // fade-out (start > end)
    applyGroupOpacity(ref.current, t, originals.current);
  });
  return <group ref={ref}>{children}</group>;
}

/** Fade out a group based on camera distance — no pop, just smooth alpha. */
function FadeByDistance({ children, position, fadeStart = 20, fadeEnd = 40 }: { children: ReactNode; position: [number, number, number]; fadeStart?: number; fadeEnd?: number }) {
  const ref = useRef<THREE.Group>(null);
  const originals = useRef<OriginalStore>({ mats: new Map(), lights: new Map() });
  const pos = useMemo(() => new THREE.Vector3(position[0], position[1], position[2]), [position]);
  const cur = useRef(0);
  useFrame((state, delta) => {
    if (!ref.current) return;
    const d = state.camera.position.distanceTo(pos);
    // alvo eased por distância (fade-in ao aproximar)
    const target = smoother(1 - (d - fadeStart) / (fadeEnd - fadeStart));
    // amortecimento temporal → transição trailing, sem saltos por frame
    cur.current = THREE.MathUtils.damp(cur.current, target, 4, delta);
    // snap nas pontas: 0 esconde o grupo (sem render), 1 evita resíduo
    const eff = cur.current < 0.004 ? 0 : cur.current > 0.997 ? 1 : cur.current;
    applyGroupOpacity(ref.current, eff, originals.current);
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
      {/* abertura visível no primeiro frame, antes da viagem de scroll */}
      <VisibleRange start={0.22} end={0}>
        <Nebula />
      </VisibleRange>

      {/* GALÁXIA (Via Láctea) — visível no topo (p=0), desaparece durante a viagem na luz (p=0→0.24). */}
      <VisibleRange start={0.36} end={0}>
        <Galaxy count={profile.isMobile ? 3600 : 11000} position={[0, 2.5, -95]} rotation={[1.15, 0.05, 0.32]} radius={82} />
      </VisibleRange>

      {/* campo de estrelas distante envolvendo toda a jornada */}
      <Starfield count={profile.isMobile ? 900 : 2400} />

      {/* efeito de viagem na luz, p=0.02→0.26.
          Dispositivos fracos: menos partículas e flash branco mais suave —
          evita o pico de overdraw que travava GPUs antigas no clarão. */}
      <WarpEffect
        count={profile.isMobile || profile.lowPower ? 2600 : 6500}
        maxFlash={profile.isMobile || profile.lowPower ? 0.78 : 1.35}
      />
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
        {/* grupo solar: Sun + Earth */}
        <FadeByDistance position={SUN_POS} fadeStart={2} fadeEnd={52}>
          <Sun position={SUN_POS} radius={2.2} lightIntensity={profile.isMobile ? 300 : 520} quality={q} />
          <EarthSystem position={[3.5, -0.3, -9]} radius={2.6} sunPosition={SUN_POS} quality={q} />
        </FadeByDistance>

        {/* asteroides + meteoros por TODA a jornada (não atrelados ao Sol) */}
        <Asteroids count={profile.isMobile ? 70 : 200} />
        <Comets comets={profile.isMobile ? 1 : 3} meteors={profile.isMobile ? 4 : 11} />

        {/* gigante gasoso azul + planeta rochoso + gigante com anéis */}
        <FadeByDistance position={[-13, 4.5, -19]} fadeStart={2} fadeEnd={58}>
          <Planet position={[-13, 4.5, -19]} radius={2.7} type="gas" sunPosition={[-4, 8, -10]} colorA="#2b5fa6" colorB="#7fb8e8" tilt={0.7} spin={0.05} seed={9.0} quality={q} />
          <Planet position={[12, 6, -40]} radius={1.7} type="rocky" sunPosition={[6, 10, -24]} tilt={0.3} spin={0.07} seed={4.0} quality={q} />
          <Planet position={[8, 1, -78]} radius={5.8} type="gas" sunPosition={[-6, 10, -58]} ring ringColor="#e6cfa0" ringInner={1.3} ringOuter={2.4} tilt={0.5} spin={0.02} seed={1.0} quality={q} />
        </FadeByDistance>

        {/* BURACO NEGRO — SEM corte por distância: aparece JUNTO com os
            planetas (no reveal em p≈0.2) e fica visível ao fundo durante
            toda a jornada, ficando maior conforme a câmera se aproxima. */}
        <BlackHole position={[-20, 5, -125]} radius={6} tilt={0.42} />

        {/* galeria de conteúdo: surge JUNTO com os planetas (atrás do flash
            branco em 0.19→0.235) e permanece até sair perto do buraco negro */}
        <TimeWindow a={0.19} b={0.235} c={0.84} d={0.93}><Horizontal3DGallery quality={q} /></TimeWindow>

        {/* fundo: partículas densas + nebulosa com parallax de mouse */}
        <VisibleRange start={0.34} end={0.9}>
          <MouseParallax factor={0.5}>
            <DenseParticleNebula count={profile.particleCount} />
          </MouseParallax>
        </VisibleRange>
      </RevealOnScroll>

      {/* EASTER EGG #2: perseguição OVNI — fora do RevealOnScroll para gerir
          a própria visibilidade. Dispara ao ficar ~14s parado no final
          (perto do buraco negro); relativo à câmera, sempre cruza a tela. */}
      <UfoChase />
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
        // retrato tem FOV horizontal estreito → abre o FOV vertical no mobile
        // para que os totens verticais caibam inteiros na tela.
        camera={{ fov: profile.isMobile ? 62 : 44, near: 0.1, far: 400, position: [0, 0.2, 9] }}
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
