import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/* Campo de asteroides "passando" pela cena — rochas facetadas          */
/* (InstancedMesh) que derivam lentamente em +x, tombam em eixos        */
/* aleatórios e dão a volta (wrap) ao saírem do campo. Iluminadas pelo  */
/* Sol via as luzes da cena.                                            */
/* ------------------------------------------------------------------ */

interface Rock {
  pos: THREE.Vector3;
  axis: THREE.Vector3;
  spin: number;
  scale: number;
  ang: number;
  drift: number;
}

interface Props {
  count?: number;
}

const X_MIN = -32;
const X_MAX = 32;
const Z_NEAR = 2;
const Z_FAR = -128;

export function Asteroids({ count = 180 }: Props) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);

  const rocks = useMemo<Rock[]>(
    () =>
      Array.from({ length: count }, () => ({
        pos: new THREE.Vector3(
          X_MIN + Math.random() * (X_MAX - X_MIN),
          (Math.random() - 0.5) * 30,
          Z_NEAR + Math.random() * (Z_FAR - Z_NEAR),
        ),
        axis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
        spin: (Math.random() - 0.5) * 1.2,
        scale: 0.06 + Math.random() * 0.42,
        ang: Math.random() * Math.PI * 2,
        drift: 0.3 + Math.random() * 0.8,
      })),
    [count],
  );

  const geometry = useMemo(() => {
    // icosaedro low-poly deformado → cara de rocha irregular
    const g = new THREE.IcosahedronGeometry(1, 1);
    const p = g.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const n = 0.72 + Math.abs(Math.sin(v.x * 3.1) * Math.cos(v.y * 2.7) * Math.sin(v.z * 3.3)) * 0.6;
      v.multiplyScalar(n);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  }, []);

  useFrame((_, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    for (let i = 0; i < rocks.length; i++) {
      const r = rocks[i];
      r.ang += r.spin * delta;
      r.pos.x += r.drift * delta;
      if (r.pos.x > X_MAX) r.pos.x = X_MIN;
      q.setFromAxisAngle(r.axis, r.ang);
      dummy.position.copy(r.pos);
      dummy.quaternion.copy(q);
      dummy.scale.setScalar(r.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[geometry, undefined, count]} frustumCulled={false}>
      <meshStandardMaterial color="#6b6258" roughness={1} metalness={0.05} emissive="#24201b" emissiveIntensity={0.6} flatShading />
    </instancedMesh>
  );
}
