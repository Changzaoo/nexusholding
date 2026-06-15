import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollState } from '../lib/scrollState';

/* ------------------------------------------------------------------ */
/* Efeito de "viagem na luz" — partículas esticadas em linhas que      */
/* surgem durante a transição entre a galáxia distante e o sistema     */
/* solar (scroll progress ~0.02 a ~0.26). Um flash no pico reforça a  */
/* sensação de chegar ao destino.                                      */
/* ------------------------------------------------------------------ */

const VERTEX = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aOffset;
  uniform float uTime;
  uniform float uIntensity;
  uniform float uTravel;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vSize;

  void main() {
    vec3 pos = position;
    // Loop particles along z to create infinite tunnel illusion
    pos.z = mod(pos.z + uTravel + aOffset * 60.0, 400.0) - 350.0;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    float dist = max(1.0, -mv.z);

    // Circular points, size grows with intensity
    gl_PointSize = aSize * uPixelRatio * (60.0 / dist) * (1.0 + uIntensity * 2.0);
    gl_Position = projectionMatrix * mv;

    vColor = aColor;
    vSize = aSize;
    // fade edges of the tunnel
    vAlpha = uIntensity
      * smoothstep(-350.0, -60.0, pos.z)
      * smoothstep(20.0, -60.0, pos.z);
  }
`;

const FRAGMENT = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vSize;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float core = smoothstep(0.5, 0.0, d);

    // Soft star glow — round with bright center
    float glow = pow(1.0 - d * 2.0, 2.0);
    float alpha = glow * vAlpha * 0.7;

    if (alpha < 0.003) discard;

    // Add subtle cross flare for brighter particles
    float cross = exp(-pow(abs(uv.x * uv.y) * 100.0, 0.5)) * 0.12;
    alpha += cross * vAlpha * 0.3;

    vec3 col = vColor * (1.0 + core * 1.4);
    gl_FragColor = vec4(col, alpha);
  }
`;

const COUNT_DEFAULT = 6500;

/** Warp intensity envelope: ramps up 0.02→0.12, peaks, fades 0.12→0.26 */
function warpIntensity(p: number): number {
  if (p < 0.02 || p > 0.26) return 0;
  if (p < 0.12) return Math.pow((p - 0.02) / 0.10, 1.5);
  return Math.pow(1 - (p - 0.12) / 0.14, 2);
}

/** Accumulated travel distance — accelerating during warp */
function warpTravel(p: number): number {
  if (p < 0.02 || p > 0.26) return 0;
  const t = (p - 0.02) / 0.24;
  return t * t * 600;
}

interface WarpEffectProps {
  /** nº de partículas — menor em dispositivos fracos para evitar travamento */
  count?: number;
  /** opacidade máxima do flash branco — menor evita pico de overdraw que
      congela GPUs antigas quando a tela fica toda branca */
  maxFlash?: number;
}

export function WarpEffect({ count = COUNT_DEFAULT, maxFlash = 1.35 }: WarpEffectProps = {}) {
  const ref = useRef<THREE.Points>(null);
  const spriteRef = useRef<THREE.Sprite>(null);
  const COUNT = count;

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    const scl = new Float32Array(COUNT);
    const off = new Float32Array(COUNT);

    const palette = [
      new THREE.Color('#ffffff'),
      new THREE.Color('#d0e4ff'),
      new THREE.Color('#41e8ff'),
      new THREE.Color('#8b5cf6'),
      new THREE.Color('#a0c4ff'),
      new THREE.Color('#ff4ecd'),
      new THREE.Color('#a3ff6b'),
      new THREE.Color('#ffd9b0'),
    ];

    for (let i = 0; i < COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      // mais concentração perto do eixo (túnel) + alcance lateral maior
      const r = 1.5 + Math.pow(Math.random(), 0.7) * 24;
      pos[i * 3] = Math.cos(angle) * r;
      pos[i * 3 + 1] = Math.sin(angle) * r;
      pos[i * 3 + 2] = Math.random() * 400 - 350;

      const c = palette[Math.floor(Math.random() * palette.length)];
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;

      scl[i] = 0.45 + Math.random() * 2.6;
      off[i] = Math.random();
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(scl, 1));
    geo.setAttribute('aOffset', new THREE.BufferAttribute(off, 1));
    return geo;
  }, [COUNT]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        toneMapped: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: 0 },
          uTravel: { value: 0 },
          uPixelRatio: {
            value: Math.min(
              typeof window !== 'undefined' ? window.devicePixelRatio : 1,
              2,
            ),
          },
        },
      }),
    [],
  );

  /* --- flash texture (lens-flare sprite at warp peak) --- */
  const flashTex = useMemo(() => {
    const s = 256;
    const cv = document.createElement('canvas');
    cv.width = cv.height = s;
    const ctx = cv.getContext('2d')!;
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.16, 'rgba(255,255,255,1)');
    g.addColorStop(0.42, 'rgba(255,255,255,0.5)');
    g.addColorStop(0.72, 'rgba(255,255,255,0.14)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);

  const flashMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: flashTex,
        color: '#ffffff',
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
        fog: false,
      }),
    [flashTex],
  );

  useFrame((_, delta) => {
    const p = scrollState.progress;
    const intensity = warpIntensity(p);
    const travel = warpTravel(p);

    material.uniforms.uTime.value += delta;
    material.uniforms.uIntensity.value = THREE.MathUtils.damp(
      material.uniforms.uIntensity.value,
      intensity,
      5,
      delta,
    );
    material.uniforms.uTravel.value = travel;

    /* --- brilho que VEM em direção à câmera ---
       Surge no fundo (-z), acelera e passa pela câmera no fim da viagem,
       lavando a tela — sensação de "a luz vindo até você". */
    const wp = THREE.MathUtils.clamp((p - 0.02) / 0.24, 0, 1);
    const approach = wp * wp * (3 - 2 * wp); // smoothstep (acelera no meio)
    if (spriteRef.current) {
      // -48 (longe, à frente) → +6 (atravessa a câmera, que está em z≈3)
      spriteRef.current.position.z = THREE.MathUtils.lerp(-48, 6, approach);
      // aumenta conforme se aproxima (além do crescimento natural por perspectiva);
      // escala do pico acompanha maxFlash → menos área branca em GPUs fracas
      const peak = 18 + 16 * (maxFlash / 1.35);
      spriteRef.current.scale.setScalar(6 + approach * peak);
    }
    // aparece durante a aproximação e estoura ao chegar perto, sumindo ao passar
    const rise = THREE.MathUtils.smoothstep(wp, 0.12, 0.55);
    const pass = 1 - THREE.MathUtils.smoothstep(wp, 0.9, 0.98);
    flashMat.opacity = Math.min(maxFlash, rise * pass * maxFlash);
  });

  return (
    <group>
      <points
        ref={ref}
        geometry={geometry}
        material={material}
        frustumCulled={false}
      />
      <sprite
        ref={spriteRef}
        material={flashMat}
        position={[0, 0.5, -10]}
        renderOrder={999}
      />
    </group>
  );
}
