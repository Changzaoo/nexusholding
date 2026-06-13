import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { pointerState, scrollState } from '../lib/scrollState';

/**
 * Objeto inicial do vídeo: um loop/infinito vertical desenhado com
 * linhas luminosas finas (lemniscata em TubeGeometry), com um pequeno
 * anel no topo e pontos orbitando. Gira lentamente, reage ao mouse e
 * cresce no começo do scroll, desvanecendo quando a galeria entra.
 */
export function LoopHeroObject({
  position = [0, 0, 0],
}: {
  position?: [number, number, number];
}) {
  const groupRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const orbitRef = useRef<THREE.Group>(null);
  const matRefs = useRef<THREE.MeshStandardMaterial[]>([]);
  const t = useRef(Math.random() * 10);

  // lemniscata vertical (figure-eight em pé) → tubo fino
  const tubeGeo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const a = 1.5;
    for (let i = 0; i <= 220; i++) {
      const u = (i / 220) * Math.PI * 2;
      const denom = 1 + Math.sin(u) * Math.sin(u);
      const x = (a * Math.cos(u)) / denom;
      const y = (a * 1.7 * Math.sin(u) * Math.cos(u)) / denom; // eixo longo = Y
      const z = Math.sin(u * 2) * 0.18;
      pts.push(new THREE.Vector3(x, y, z));
    }
    const curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);
    return new THREE.TubeGeometry(curve, 420, 0.035, 12, true);
  }, []);

  // segundo loop cruzado (mais fino), rotacionado
  const tubeGeo2 = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const a = 1.2;
    for (let i = 0; i <= 200; i++) {
      const u = (i / 200) * Math.PI * 2;
      const denom = 1 + Math.sin(u) * Math.sin(u);
      const x = (a * Math.cos(u)) / denom;
      const y = (a * 1.5 * Math.sin(u) * Math.cos(u)) / denom;
      pts.push(new THREE.Vector3(x, y, 0));
    }
    const curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);
    return new THREE.TubeGeometry(curve, 380, 0.02, 10, true);
  }, []);

  // pontos orbitando
  const orbiters = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        radius: 1.5 + Math.random() * 1.1,
        speed: 0.3 + Math.random() * 0.7,
        phase: (i / 18) * Math.PI * 2,
        tilt: Math.random() * Math.PI,
        size: 0.018 + Math.random() * 0.03,
      })),
    [],
  );

  useFrame((_, delta) => {
    t.current += delta;
    const group = groupRef.current;
    const spin = spinRef.current;
    if (!group || !spin) return;

    // rotação contínua lenta
    spin.rotation.y += delta * 0.35;
    spin.rotation.z = Math.sin(t.current * 0.3) * 0.12;

    // reação ao mouse (inclinação suave)
    group.rotation.x = THREE.MathUtils.damp(group.rotation.x, pointerState.y * 0.35, 2.2, delta);
    group.rotation.y = THREE.MathUtils.damp(group.rotation.y, pointerState.x * 0.45, 2.2, delta);

    // cresce no início, some quando entra a galeria (~28%)
    const p = scrollState.progress;
    const grow = 1 + THREE.MathUtils.smoothstep(p, 0, 0.18) * 0.45;
    const fade = 1 - THREE.MathUtils.smoothstep(p, 0.22, 0.32);
    group.scale.setScalar(grow * (0.7 + fade * 0.3));
    group.position.y = position[1] + Math.sin(t.current * 0.5) * 0.1;
    // never fully hide the group — keep it present but allow emissive fade
    group.visible = true;

    const intensity = (2.2 + Math.sin(t.current * 2) * 0.5) * fade;
    matRefs.current.forEach((m) => m && (m.emissiveIntensity = intensity));

    if (orbitRef.current) {
      orbitRef.current.children.forEach((child, i) => {
        const o = orbiters[i];
        const ang = t.current * o.speed + o.phase;
        child.position.set(
          Math.cos(ang) * o.radius,
          Math.sin(ang * 0.7) * o.radius * 0.5,
          Math.sin(ang) * o.radius * Math.cos(o.tilt),
        );
      });
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <group ref={spinRef}>
        <mesh geometry={tubeGeo}>
          <meshStandardMaterial
            ref={(r) => r && (matRefs.current[0] = r)}
            color="#ffffff"
            emissive="#9fe8ff"
            emissiveIntensity={2.2}
            roughness={0.3}
            metalness={0.1}
            toneMapped={false}
          />
        </mesh>
        <mesh geometry={tubeGeo2} rotation={[0, Math.PI / 2, 0]}>
          <meshStandardMaterial
            ref={(r) => r && (matRefs.current[1] = r)}
            color="#ffffff"
            emissive="#b39dff"
            emissiveIntensity={2}
            roughness={0.3}
            metalness={0.1}
            toneMapped={false}
          />
        </mesh>

        {/* anel pequeno no topo */}
        <mesh position={[0, 1.85, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.42, 0.018, 12, 64]} />
          <meshStandardMaterial
            ref={(r) => r && (matRefs.current[2] = r)}
            color="#ffffff"
            emissive="#41e8ff"
            emissiveIntensity={2.4}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* pontos luminosos orbitando */}
      <group ref={orbitRef}>
        {orbiters.map((o, i) => (
          <mesh key={i} scale={o.size}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshBasicMaterial
              color={i % 3 === 0 ? '#41e8ff' : i % 3 === 1 ? '#b39dff' : '#ffffff'}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
