import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { pointerState, scrollState } from '../lib/scrollState';

/* ------------------------------------------------------------------ */
/* EASTER EGG #2 — PERSEGUIÇÃO OVNI                                     */
/* Complementar ao foguete (que pousa na Lua quando o usuário fica      */
/* parado observando a Terra). Aqui: ao chegar ao FINAL da viagem       */
/* (perto do buraco negro) e ficar ~14s com a tela parada, um disco     */
/* voador atravessa a tela da ESQUERDA p/ a DIREITA fugindo, com duas   */
/* naves caça logo atrás disparando rajadas de laser contra ele.        */
/*                                                                      */
/* Toda a cena é montada num grupo alinhado à CÂMERA (mesma orientação),*/
/* então o eixo X local = direita da tela e a perseguição cruza sempre  */
/* o campo de visão, independente de onde a câmera esteja apontando.    */
/* ------------------------------------------------------------------ */

const BOLTS = 7; // rajadas de laser simultâneas (stream contínuo)
const DURATION = 7.5; // duração da travessia (s)
const IDLE_TRIGGER = 14; // segundos parado p/ disparar
const DIST = 24; // profundidade à frente da câmera (unidades)
const RANGE = 18; // amplitude horizontal (entra/sai fora da tela)
const UP = 2.6; // deslocamento p/ cima (acima do CTA)

/** Disco voador: corpo metálico achatado, cúpula de vidro, anel pulsante. */
function Saucer() {
  const rim = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const pulse = 0.6 + 0.4 * Math.sin(t * 6);
    if (rim.current) (rim.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.4 + pulse;
    if (glow.current) (glow.current.material as THREE.MeshBasicMaterial).opacity = 0.25 + pulse * 0.25;
  });
  return (
    <group>
      {/* casco inferior (disco achatado) */}
      <mesh scale={[1, 0.26, 1]}>
        <sphereGeometry args={[0.95, 32, 20]} />
        <meshStandardMaterial color="#c7ced8" metalness={0.95} roughness={0.22} envMapIntensity={1.4} />
      </mesh>
      {/* anel luminoso pulsante na borda */}
      <mesh ref={rim} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.92, 0.06, 12, 48]} />
        <meshStandardMaterial color="#9bf6ff" emissive="#41e8ff" emissiveIntensity={2} toneMapped={false} />
      </mesh>
      {/* cúpula de vidro */}
      <mesh position={[0, 0.16, 0]}>
        <sphereGeometry args={[0.42, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial
          color="#bfe9ff"
          transmission={0.85}
          thickness={0.4}
          roughness={0.08}
          metalness={0}
          clearcoat={1}
          emissive="#2a6cff"
          emissiveIntensity={0.35}
          transparent
          opacity={0.85}
        />
      </mesh>
      {/* três luzes na barriga */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[Math.cos((i / 3) * Math.PI * 2) * 0.5, -0.16, Math.sin((i / 3) * Math.PI * 2) * 0.5]}>
          <sphereGeometry args={[0.07, 10, 10]} />
          <meshBasicMaterial color="#ffd36b" toneMapped={false} />
        </mesh>
      ))}
      {/* brilho anti-gravidade por baixo */}
      <mesh ref={glow} position={[0, -0.34, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.7, 24]} />
        <meshBasicMaterial color="#41e8ff" transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** Nave caça (perseguidora): fuselagem escura angular + brilho de motor. */
function Fighter({ accent = '#ff5a3c' }: { accent?: string }) {
  return (
    <group rotation={[0, Math.PI / 2, 0]}>
      {/* fuselagem */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.16, 0.7, 12]} />
        <meshStandardMaterial color="#3a4250" metalness={0.85} roughness={0.35} />
      </mesh>
      {/* asas */}
      <mesh position={[0, -0.05, 0.08]}>
        <boxGeometry args={[0.62, 0.03, 0.2]} />
        <meshStandardMaterial color="#2a3140" metalness={0.8} roughness={0.4} />
      </mesh>
      {/* cabine */}
      <mesh position={[0, 0.07, -0.05]}>
        <sphereGeometry args={[0.08, 12, 10]} />
        <meshStandardMaterial color="#8fe0ff" emissive="#3aa0ff" emissiveIntensity={0.7} metalness={0.3} roughness={0.2} />
      </mesh>
      {/* motor (brilho traseiro) */}
      <mesh position={[0, 0, 0.4]}>
        <sphereGeometry args={[0.1, 12, 10]} />
        <meshBasicMaterial color={accent} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function UfoChase() {
  const grp = useRef<THREE.Group>(null);
  const ufo = useRef<THREE.Group>(null);
  const fighters = useRef<THREE.Group>(null);
  const bolts = useRef<THREE.Mesh[]>([]);

  const phase = useRef<'idle' | 'flying'>('idle');
  const idle = useRef(0);
  const animT = useRef(0);
  const lastProg = useRef(scrollState.progress);
  const lastPtr = useRef({ x: pointerState.x, y: pointerState.y });

  const fwd = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const g = grp.current;
    if (!g || !ufo.current || !fighters.current) return;

    // janela do FINAL (perto do buraco negro) — não conflita com o foguete
    const inWindow = scrollState.progress > 0.9;
    const scrolled = Math.abs(scrollState.progress - lastProg.current) > 0.0002;
    const moved =
      Math.abs(pointerState.x - lastPtr.current.x) + Math.abs(pointerState.y - lastPtr.current.y) > 0.015;
    lastProg.current = scrollState.progress;
    lastPtr.current.x = pointerState.x;
    lastPtr.current.y = pointerState.y;

    if (!inWindow) {
      g.visible = false;
      phase.current = 'idle';
      idle.current = 0;
      animT.current = 0;
      return;
    }

    if (phase.current === 'idle') {
      g.visible = false;
      if (!scrolled && !moved) idle.current += delta;
      else idle.current = 0;
      if (idle.current >= IDLE_TRIGGER) {
        phase.current = 'flying';
        animT.current = 0;
      }
      return;
    }

    // ---- voando: posiciona o grupo À FRENTE da câmera, alinhado a ela ----
    const cam = state.camera;
    cam.getWorldDirection(fwd);
    g.position.copy(cam.position).addScaledVector(fwd, DIST);
    g.quaternion.copy(cam.quaternion); // x local = direita da tela
    g.visible = true;

    animT.current += delta / DURATION;
    const t = animT.current;
    if (t >= 1) {
      // fim da travessia → re-arma (novo flyby após outro período parado)
      phase.current = 'idle';
      idle.current = 0;
      g.visible = false;
      return;
    }

    // OVNI: varre da esquerda (-RANGE) p/ direita (+RANGE), com fuga evasiva
    const ufoX = THREE.MathUtils.lerp(-RANGE, RANGE, t);
    const ufoY = UP + Math.sin(t * Math.PI * 3) * 1.3;
    ufo.current.position.set(ufoX, ufoY, 0);
    ufo.current.rotation.z = -Math.cos(t * Math.PI * 3) * 0.35; // banking
    ufo.current.rotation.y += delta * 2.5; // giro do disco

    // naves caça: logo atrás (à esquerda) do OVNI, escalonadas
    const fx = ufoX - 4.2;
    fighters.current.position.set(fx, UP + Math.sin(t * Math.PI * 3 + 0.6) * 1.1, 0);
    // mira/inclina as naves para o OVNI
    fighters.current.rotation.z = -0.15 + Math.sin(t * 10) * 0.04;

    // rajadas de laser: stream contínuo das naves em direção ao OVNI
    const startX = fx + 0.6;
    const endX = ufoX - 0.9;
    bolts.current.forEach((b, i) => {
      if (!b) return;
      const ph = (t * 6 + i / BOLTS) % 1; // ciclo do tiro
      const bx = THREE.MathUtils.lerp(startX, endX, ph);
      const lane = (i % 2 === 0 ? 0.18 : -0.18);
      const by = THREE.MathUtils.lerp(fighters.current!.position.y, ufoY, ph) + lane;
      b.position.set(bx, by, (i % 3 - 1) * 0.15);
      const op = Math.sin(ph * Math.PI); // brilha no meio do trajeto
      (b.material as THREE.MeshBasicMaterial).opacity = op;
      b.scale.set(1, 1, 1);
    });
  });

  return (
    <group ref={grp} visible={false}>
      {/* luz que acompanha a cena p/ realçar os cascos metálicos */}
      <pointLight position={[0, UP + 1, 2]} intensity={18} distance={40} color="#bfe0ff" />

      <group ref={ufo}>
        <Saucer />
      </group>

      <group ref={fighters}>
        <group position={[0, 0.5, 0.4]}>
          <Fighter accent="#ff5a3c" />
        </group>
        <group position={[-1.1, -0.4, -0.5]} scale={0.85}>
          <Fighter accent="#ff8a3c" />
        </group>
      </group>

      {/* pool de rajadas de laser (cilindros emissivos esticados em X) */}
      {Array.from({ length: BOLTS }).map((_, i) => (
        <mesh
          key={i}
          ref={(m) => { if (m) bolts.current[i] = m; }}
          rotation={[0, 0, Math.PI / 2]}
        >
          <cylinderGeometry args={[0.035, 0.035, 0.9, 6]} />
          <meshBasicMaterial color="#ff3b2f" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
