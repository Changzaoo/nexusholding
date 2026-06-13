import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { pointerState } from '../lib/scrollState';

interface Props {
  position?: [number, number, number];
  /** chão refletivo só no desktop (pesado) */
  reflectiveFloor?: boolean;
}

/**
 * Clímax da jornada — um REATOR de energia, não formas aleatórias:
 *  · núcleo emissivo pulsante (blooma) dentro de
 *  · um nó toroidal (torus knot) de vidro líquido iridescente,
 *  · envolto por um GIROSCÓPIO de 3 anéis ortogonais que contra-giram
 *    de forma coordenada nos eixos X/Y/Z (movimento mecânico intencional),
 *  · com uma órbita limpa de pontos de luz igualmente espaçados,
 *  tudo refletido num chão escuro molhado. Câmera se aproxima no fim.
 */
export function FinalTechObject({
  position = [0, 0, -62],
  reflectiveFloor = true,
}: Props) {
  const rootRef = useRef<THREE.Group>(null);
  const knotRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const gimbalX = useRef<THREE.Mesh>(null);
  const gimbalY = useRef<THREE.Mesh>(null);
  const gimbalZ = useRef<THREE.Mesh>(null);
  const orbitRef = useRef<THREE.Group>(null);
  const t = useRef(0);

  // pontos de luz da órbita — espaçamento determinístico (não aleatório)
  const orbitDots = useMemo(() => {
    const N = 28;
    const r = 2.85;
    return Array.from({ length: N }, (_, i) => {
      const a = (i / N) * Math.PI * 2;
      return {
        pos: [Math.cos(a) * r, 0, Math.sin(a) * r] as [number, number, number],
        // alterna duas cores em padrão regular
        color: i % 2 === 0 ? '#69f5ff' : '#a78bfa',
        size: i % 4 === 0 ? 0.06 : 0.035,
      };
    });
  }, []);

  useFrame((_, delta) => {
    t.current += delta;
    const time = t.current;
    const root = rootRef.current;
    if (!root) return;

    // inclinação suave em direção ao mouse (a peça toda)
    root.rotation.y = THREE.MathUtils.damp(root.rotation.y, pointerState.x * 0.3, 2, delta);
    root.rotation.x = THREE.MathUtils.damp(root.rotation.x, pointerState.y * 0.2, 2, delta);

    // nó toroidal de vidro gira devagar e coerente
    if (knotRef.current) {
      knotRef.current.rotation.y += delta * 0.25;
      knotRef.current.rotation.z += delta * 0.12;
    }

    // núcleo pulsa (energia) → blooma
    if (coreRef.current) {
      const pulse = 1 + Math.sin(time * 2.2) * 0.12;
      coreRef.current.scale.setScalar(pulse);
      const mat = coreRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.85 + Math.sin(time * 2.2) * 0.12;
    }
    if (haloRef.current) {
      const mat = haloRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.32 + Math.sin(time * 2.2 + 0.6) * 0.12;
      haloRef.current.scale.setScalar(1 + Math.sin(time * 1.6) * 0.05);
    }

    // GIROSCÓPIO: cada anel gira no SEU eixo, contra-rotação coordenada
    if (gimbalX.current) gimbalX.current.rotation.x += delta * 0.55;
    if (gimbalY.current) gimbalY.current.rotation.y -= delta * 0.42;
    if (gimbalZ.current) gimbalZ.current.rotation.z += delta * 0.32;

    // órbita de pontos gira como um todo (anel inclinado)
    if (orbitRef.current) orbitRef.current.rotation.y += delta * 0.22;
  });

  return (
    <group position={position}>
      <group ref={rootRef}>
        {/* halo de energia atrás do núcleo (additivo, blooma) */}
        <mesh ref={haloRef} position={[0, 0, -0.05]}>
          <circleGeometry args={[1.5, 64]} />
          <meshBasicMaterial
            color="#69f5ff"
            transparent
            opacity={0.32}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>

        {/* núcleo de energia emissivo (centro do reator) */}
        <mesh ref={coreRef}>
          <sphereGeometry args={[0.46, 48, 48]} />
          <meshBasicMaterial color="#dffaff" transparent opacity={0.9} toneMapped={false} />
        </mesh>

        {/* casca: nó toroidal de vidro líquido iridescente em volta do núcleo */}
        <mesh ref={knotRef}>
          <torusKnotGeometry args={[0.92, 0.13, 240, 36, 2, 3]} />
          <meshPhysicalMaterial
            color="#cfe2ff"
            transmission={1}
            thickness={1.3}
            roughness={0.06}
            ior={1.4}
            clearcoat={1}
            clearcoatRoughness={0.08}
            iridescence={1}
            iridescenceIOR={1.4}
            iridescenceThicknessRange={[120, 560]}
            attenuationColor="#41e8ff"
            attenuationDistance={2.4}
            envMapIntensity={1.8}
          />
        </mesh>

        {/* GIROSCÓPIO — 3 anéis ortogonais finos e luminosos */}
        <mesh ref={gimbalX} rotation={[0, 0, 0]}>
          <torusGeometry args={[1.7, 0.022, 16, 160]} />
          <meshStandardMaterial color="#eaf6ff" emissive="#41e8ff" emissiveIntensity={2.2} metalness={0.9} roughness={0.2} toneMapped={false} />
        </mesh>
        <mesh ref={gimbalY} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.0, 0.02, 16, 160]} />
          <meshStandardMaterial color="#efeaff" emissive="#8b5cf6" emissiveIntensity={2.2} metalness={0.9} roughness={0.2} toneMapped={false} />
        </mesh>
        <mesh ref={gimbalZ} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[2.3, 0.018, 16, 160]} />
          <meshStandardMaterial color="#e6f0ff" emissive="#3b82f6" emissiveIntensity={2} metalness={0.9} roughness={0.2} toneMapped={false} />
        </mesh>

        {/* órbita limpa de pontos de luz (anel inclinado, espaçamento regular) */}
        <group ref={orbitRef} rotation={[0.38, 0, 0]}>
          {orbitDots.map((d, i) => (
            <mesh key={i} position={d.pos}>
              <sphereGeometry args={[d.size, 12, 12]} />
              <meshBasicMaterial color={d.color} toneMapped={false} />
            </mesh>
          ))}
        </group>
      </group>

      {/* disco de brilho projetado no chão sob o reator */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.98, 0]}>
        <circleGeometry args={[3.6, 64]} />
        <meshBasicMaterial
          color="#1a3a66"
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* chão escuro refletivo (molhado) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]}>
        <planeGeometry args={[60, 60]} />
        {reflectiveFloor ? (
          <MeshReflectorMaterial
            resolution={256}
            mixBlur={1}
            mixStrength={6}
            blur={[400, 120]}
            mirror={0.6}
            color="#05060f"
            metalness={0.7}
            roughness={0.85}
            depthScale={1.1}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.2}
          />
        ) : (
          <meshStandardMaterial color="#05060f" metalness={0.8} roughness={0.3} />
        )}
      </mesh>
    </group>
  );
}
