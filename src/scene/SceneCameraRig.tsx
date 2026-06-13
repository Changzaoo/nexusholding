import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { pointerState, scrollState } from '../lib/scrollState';

interface CameraKey {
  p: number;
  pos: [number, number, number];
  look: [number, number, number];
}

/**
 * Timeline cinematográfica da câmera — 6 momentos:
 * intro → portal → services → horizon → mission → final.
 * A câmera "voa" pelo corredor em -Z como um drone, com easing
 * entre keyframes, damping e parallax de mouse.
 */
const KEYS: CameraKey[] = [
  { p: 0.0,  pos: [0, 0.3, 8.5],    look: [0, 0, 0] },      // 1 — intro
  { p: 0.12, pos: [0, 0.15, 6.2],   look: [0, 0, -6] },     //     aproximação
  { p: 0.28, pos: [0.5, 0, -10],    look: [0, 0, -20] },    // 2 — atravessa o portal
  { p: 0.46, pos: [-0.9, 0.25, -22], look: [0.7, 0, -33] }, // 3 — galeria de services
  { p: 0.6,  pos: [0.9, -0.1, -38], look: [-0.5, 0, -49] }, //     fim da galeria
  { p: 0.72, pos: [2.4, 0.4, -50],  look: [-1.2, 0, -58] }, // 4 — horizon (lateral)
  { p: 0.86, pos: [0, 0, -66],      look: [0, 0, -74] },    // 5 — mission
  { p: 1.0,  pos: [0, 0.2, -81],    look: [0, 0, -88] },    // 6 — final, estabiliza
];

function ease(t: number): number {
  // smootherstep — aceleração/desaceleração de cinema
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export function SceneCameraRig() {
  const lookCurrent = useRef(new THREE.Vector3(0, 0, 0));
  const smoothPointer = useRef({ x: 0, y: 0 });

  const { targetPos, targetLook, a, b } = useMemo(
    () => ({
      targetPos: new THREE.Vector3(),
      targetLook: new THREE.Vector3(),
      a: new THREE.Vector3(),
      b: new THREE.Vector3(),
    }),
    [],
  );

  useFrame((state, delta) => {
    const p = THREE.MathUtils.clamp(scrollState.progress, 0, 1);

    // localiza o segmento de keyframes atual
    let i = 0;
    while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++;
    const k0 = KEYS[i];
    const k1 = KEYS[i + 1];
    const t = ease(
      THREE.MathUtils.clamp((p - k0.p) / (k1.p - k0.p), 0, 1),
    );

    targetPos.lerpVectors(a.fromArray(k0.pos), b.fromArray(k1.pos), t);
    targetLook.lerpVectors(a.fromArray(k0.look), b.fromArray(k1.look), t);

    // parallax do mouse, suavizado
    smoothPointer.current.x = THREE.MathUtils.damp(
      smoothPointer.current.x, pointerState.x, 2, delta,
    );
    smoothPointer.current.y = THREE.MathUtils.damp(
      smoothPointer.current.y, pointerState.y, 2, delta,
    );
    targetPos.x += smoothPointer.current.x * 0.4;
    targetPos.y -= smoothPointer.current.y * 0.28;

    // movimento tipo drone: damping em posição e em ponto de mira
    const cam = state.camera;
    cam.position.x = THREE.MathUtils.damp(cam.position.x, targetPos.x, 2.6, delta);
    cam.position.y = THREE.MathUtils.damp(cam.position.y, targetPos.y, 2.6, delta);
    cam.position.z = THREE.MathUtils.damp(cam.position.z, targetPos.z, 2.6, delta);

    lookCurrent.current.x = THREE.MathUtils.damp(lookCurrent.current.x, targetLook.x, 2.6, delta);
    lookCurrent.current.y = THREE.MathUtils.damp(lookCurrent.current.y, targetLook.y, 2.6, delta);
    lookCurrent.current.z = THREE.MathUtils.damp(lookCurrent.current.z, targetLook.z, 2.6, delta);

    cam.lookAt(lookCurrent.current);

    // leve inclinação holandesa com a velocidade do scroll
    cam.rotation.z += THREE.MathUtils.clamp(scrollState.velocity * 0.004, -0.035, 0.035);
  });

  return null;
}
