import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { pointerState, scrollState } from '../lib/scrollState';

interface Key {
  p: number;
  pos: [number, number, number];
  look: [number, number, number];
}

/**
 * Timeline cinematográfica da câmera, mapeada ao roteiro do vídeo:
 *  0%  loop central · 10% aproxima · 20% título + anel (offset lateral)
 *  30% entra na galeria pela esquerda · 42% card central
 *  55-66% varredura horizontal à direita (cards rotacionados)
 *  78% card à esquerda · 88% galeria some / escurece
 *  100% objeto técnico final
 * Movimento tipo drone: lerp entre keyframes + damping, sem cortes.
 */
const KEYS: Key[] = [
  { p: 0.0,  pos: [0, 0.5, 5],     look: [0, 2, -120] },    // galáxia distante preenche a tela
  { p: 0.06, pos: [0, 0.5, 3],     look: [0, 1.5, -80] },   // contempla a galáxia + hint
  { p: 0.14, pos: [0, 0.6, 3],     look: [0, 1, -20] },     // início da viagem na luz
  { p: 0.26, pos: [0, 0.6, 3],     look: [0, 0.5, -10] },   // fim da viagem: emerge no sistema solar
  { p: 0.30, pos: [-2.4, 0.4, -3],  look: [-3.2, 0.1, -12] },// entra no corredor
  { p: 0.34, pos: [-4.6, 0.25, -7], look: [-3.4, 0, -13] },   // card 01 / PROGRAM HERO
  { p: 0.46, pos: [0.1, 0.05, -14], look: [0.6, 0, -19.5] },  // card 02 / ATRAIR
  { p: 0.55, pos: [4.6, 0.15, -20], look: [5.4, 0, -25.5] },  // card 03 / OPERAR
  { p: 0.66, pos: [7.2, 0.55, -28], look: [7.8, 0, -33] },    // card 04 / EVOLUIR
  { p: 0.74, pos: [7.0, 0.65, -31], look: [7.8, 0.8, -33] },  // card 04 linger (MISSION)
  { p: 0.80, pos: [-4, -0.15, -34], look: [-6.6, 0, -39.5] }, // sai da galeria
  { p: 0.88, pos: [-6, 1.5, -60],  look: [-12, 3, -95] },   // aproxima do buraco negro
  { p: 1.0,  pos: [-10, 3, -75],    look: [-16, 4, -110] },  // close-up: Saturno (dir.) + buraco negro (esq.)
];

export function CameraRig() {
  const look = useRef(new THREE.Vector3(0, 0, 0));
  const smooth = useRef({ x: 0, y: 0 });

  // Splines contínuos (centripetal Catmull-Rom) através de todos os keyframes:
  // tangentes contínuas nas junções → a câmera NÃO para em cada card, o que
  // dá um deslize fluido de drone ao longo de toda a viagem.
  const { posCurve, lookCurve, tp, tl } = useMemo(() => {
    const pts = KEYS.map((k) => new THREE.Vector3(...k.pos));
    const lks = KEYS.map((k) => new THREE.Vector3(...k.look));
    return {
      posCurve: new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5),
      lookCurve: new THREE.CatmullRomCurve3(lks, false, 'centripetal', 0.5),
      tp: new THREE.Vector3(),
      tl: new THREE.Vector3(),
    };
  }, []);

  useFrame((state, delta) => {
    const p = THREE.MathUtils.clamp(scrollState.progress, 0, 1);

    // mapeia o progresso de scroll → parâmetro do spline respeitando o
    // "horário" (p) de cada keyframe; suaviza só o cruzamento de cada trecho.
    let i = 0;
    while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++;
    const seg = THREE.MathUtils.clamp((p - KEYS[i].p) / (KEYS[i + 1].p - KEYS[i].p), 0, 1);
    // ease suave (smoothstep) p/ entrada/saída macia, sem parar de vez
    const segE = seg * seg * (3 - 2 * seg);
    const u = (i + segE) / (KEYS.length - 1);

    posCurve.getPoint(u, tp);
    lookCurve.getPoint(u, tl);

    // parallax do mouse suavizado
    smooth.current.x = THREE.MathUtils.damp(smooth.current.x, pointerState.x, 2, delta);
    smooth.current.y = THREE.MathUtils.damp(smooth.current.y, pointerState.y, 2, delta);
    tp.x += smooth.current.x * 0.45;
    tp.y -= smooth.current.y * 0.3;

    const cam = state.camera;
    cam.position.x = THREE.MathUtils.damp(cam.position.x, tp.x, 2.6, delta);
    cam.position.y = THREE.MathUtils.damp(cam.position.y, tp.y, 2.6, delta);
    cam.position.z = THREE.MathUtils.damp(cam.position.z, tp.z, 2.6, delta);

    look.current.x = THREE.MathUtils.damp(look.current.x, tl.x, 2.6, delta);
    look.current.y = THREE.MathUtils.damp(look.current.y, tl.y, 2.6, delta);
    look.current.z = THREE.MathUtils.damp(look.current.z, tl.z, 2.6, delta);
    cam.lookAt(look.current);

    // inclinação holandesa sutil pela velocidade do scroll
    cam.rotation.z += THREE.MathUtils.clamp(scrollState.velocity * 0.004, -0.035, 0.035);
  });

  return null;
}
