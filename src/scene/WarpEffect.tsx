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

const COUNT = 3000;

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

export function WarpEffect() {
  const ref = useRef<THREE.Points>(null);
  const spriteRef = useRef<THREE.Sprite>(null);

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
    ];

    for (let i = 0; i < COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 3.0 + Math.pow(Math.random(), 0.5) * 18;
      pos[i * 3] = Math.cos(angle) * r;
      pos[i * 3 + 1] = Math.sin(angle) * r;
      pos[i * 3 + 2] = Math.random() * 400 - 350;

      const c = palette[Math.floor(Math.random() * palette.length)];
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;

      scl[i] = 0.5 + Math.random() * 2.0;
      off[i] = Math.random();
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(scl, 1));
    geo.setAttribute('aOffset', new THREE.BufferAttribute(off, 1));
    return geo;
  }, []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
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
    g.addColorStop(0.12, 'rgba(200,230,255,0.7)');
    g.addColorStop(0.35, 'rgba(100,170,255,0.18)');
    g.addColorStop(1, 'rgba(65,232,255,0)');
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
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
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

    /* --- flash at warp peak (p ≈ 0.12) — ONLY sprite, no pointLight --- */
    const flashT = Math.max(0, 1 - Math.abs(p - 0.12) / 0.045);
    flashMat.opacity = flashT * 0.85;
    if (spriteRef.current) {
      spriteRef.current.scale.setScalar(18 + flashT * 36);
    }
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
      />
    </group>
  );
}