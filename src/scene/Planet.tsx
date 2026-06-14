import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NOISE_GLSL } from './glsl-noise';

/* ------------------------------------------------------------------ */
/* Planeta procedural realista. Tipos:                                  */
/*  · 'terran'  continentes + oceanos + gelo + nuvens + atmosfera       */
/*  · 'gas'     bandas turbulentas + grande tempestade (gigante gasoso) */
/*  · 'rocky'   superfície árida/crateras (tipo Marte)                  */
/* Relevo por perturbação de normal (montanhas/crateras recebem luz),   */
/* iluminação dia/noite a partir do Sol. Atmosfera (halo) SÓ na Terra.  */
/* ------------------------------------------------------------------ */

type PlanetType = 'terran' | 'gas' | 'rocky';

interface Props {
  position: [number, number, number];
  radius?: number;
  type?: PlanetType;
  sunPosition?: [number, number, number];
  /** mostra o halo de atmosfera (default: só terrestre) */
  atmosphere?: boolean;
  atmosphereColor?: string;
  /** sobrescreve as cores da superfície (gás/rochoso) */
  colorA?: string;
  colorB?: string;
  ring?: boolean;
  ringColor?: string;
  ringInner?: number;
  ringOuter?: number;
  tilt?: number;
  spin?: number;
  seed?: number;
  quality?: number;
}

const VERT = /* glsl */ `
  varying vec3 vLocal;
  varying vec3 vPosW;
  varying vec3 vNormalW;
  void main() {
    vLocal = normalize(position);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vPosW = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const BASEFREQ: Record<PlanetType, number> = { terran: 2.4, gas: 1.0, rocky: 2.6 };

// preenche: surf (cor), shin (especular), bumpAmt (intensidade do relevo)
const SURFACE: Record<PlanetType, string> = {
  terran: /* glsl */ `
    // Base noise for continent shapes — soft domain warp for natural coastlines
    vec3 p = vLocal + uSeed * 0.1;
    float warp = fbm(p * 2.0 + 5.0) * 0.25;
    p += warp * 0.3;
    
    float n = baseHeight(p);
    // Clamp n to safe range (prevents black artifacts)
    n = clamp(n, 0.0, 1.0);
    float land = smoothstep(0.06, 0.18, n);
    
    // Ocean colors: deep → medium → shallow coastal
    vec3 deep = vec3(0.015, 0.06, 0.22);
    vec3 mid = vec3(0.025, 0.15, 0.38);
    vec3 shallow = vec3(0.06, 0.32, 0.52);
    vec3 ocean = mix(deep, mid, smoothstep(0.0, 0.04, n));
    ocean = mix(ocean, shallow, smoothstep(0.04, 0.08, n));
    
    // Vegetation
    float veg = fbm(p * 5.0 + 11.0);
    float vegDense = fbm(p * 10.0 + 3.7);
    veg = smoothstep(0.15, 0.55, veg * 0.6 + vegDense * 0.4);
    
    // Terrain colors by elevation
    vec3 desert = vec3(0.55, 0.45, 0.25);
    vec3 grass = vec3(0.22, 0.35, 0.14);
    vec3 forest = vec3(0.12, 0.25, 0.09);
    vec3 mountain = vec3(0.40, 0.34, 0.28);
    vec3 snow = vec3(0.93, 0.95, 0.98);
    
    // Build terrain color from elevation
    vec3 landCol = mix(desert, grass, veg);
    landCol = mix(landCol, forest, smoothstep(0.12, 0.28, n));
    landCol = mix(landCol, mountain, smoothstep(0.32, 0.55, n));
    // Snow only at high peaks AND only above 50° latitude — prevents white tops
    float lat = abs(vLocal.y);
    float highLat = smoothstep(0.50, 0.70, lat);
    landCol = mix(landCol, snow, smoothstep(0.60, 0.80, n) * highLat);
    
    surf = mix(ocean, landCol, land);
    
    // Polar ice caps — very tight, only actual poles (>82° latitude)
    float ice = smoothstep(0.82, 0.95, lat + fbm(vLocal * 3.0 + 5.0) * 0.05);
    surf = mix(surf, snow * 0.85, ice);
    
    shin = (1.0 - land) * 0.6 * (1.0 - ice);
    bumpAmt = land * 0.7 + 0.3;
  `,
  gas: /* glsl */ `
    float turb = fbm(vLocal * vec3(0.6, 2.0, 0.6) + uSeed);
    float fine = fbm(vLocal * vec3(1.0, 7.0, 1.0) + vec3(uTime * 0.03, 0.0, 0.0));
    float bands = sin((vLocal.y * 10.0 + turb * 1.3) * 3.14159);
    vec3 c = mix(uColA, uColB, 0.5 + 0.5 * bands);
    c *= 0.88 + 0.16 * fine;
    vec3 sp = normalize(vec3(0.5, -0.25, 0.83));
    float spot = smoothstep(0.32, 0.0, distance(vLocal, sp));
    c = mix(c, uColB * 1.35, spot * 0.7);
    surf = c; shin = 0.0; bumpAmt = 0.0;
  `,
  rocky: /* glsl */ `
    float n = baseHeight(vLocal);
    vec3 c = mix(uColA, uColB, 0.5 + 0.5 * n);
    float cr = fbm(vLocal * 9.0);
    c *= 0.78 + 0.34 * cr;
    float ice = smoothstep(0.85, 0.95, abs(vLocal.y));
    c = mix(c, vec3(0.9, 0.92, 0.95), ice);
    surf = c; shin = 0.0; bumpAmt = 1.0 * (1.0 - ice);
  `,
};

function bodyFragment(type: PlanetType) {
  return /* glsl */ `
    varying vec3 vLocal;
    varying vec3 vPosW;
    varying vec3 vNormalW;
    uniform vec3 uSunPos;
    uniform vec3 uColA;
    uniform vec3 uColB;
    uniform float uTime;
    uniform float uSeed;
    uniform float uBump;
    uniform float uOpacity;
    uniform mat3 uModelMat3;
    ${NOISE_GLSL}

    float baseHeight(vec3 p){ 
      float h = 0.0;
      float amp = 0.6;
      float freq = ${BASEFREQ[type].toFixed(1)};
      // 3 octaves for clean terrain (avoids GLSL loop issues)
      h += amp * fbm(p * freq + uSeed);
      h += amp * 0.5 * fbm(p * freq * 2.3 + uSeed + 10.0);
      h += amp * 0.25 * fbm(p * freq * 5.3 + uSeed + 20.0);
      return h;
    }

    // perturba a normal (objeto) pelo gradiente do campo de altura → relevo
    vec3 perturbN(vec3 nObj, float strength){
      if (strength <= 0.001) return nObj;
      float e = 0.012;
      float h0 = baseHeight(nObj);
      float hx = baseHeight(nObj + vec3(e, 0.0, 0.0));
      float hy = baseHeight(nObj + vec3(0.0, e, 0.0));
      float hz = baseHeight(nObj + vec3(0.0, 0.0, e));
      vec3 grad = vec3(hx - h0, hy - h0, hz - h0);
      vec3 tang = grad - dot(grad, nObj) * nObj;
      return normalize(nObj - tang * strength);
    }

    void main() {
      vec3 surf; float shin; float bumpAmt;
      ${SURFACE[type]}

      vec3 nObj = perturbN(vLocal, uBump * bumpAmt);
      vec3 N = normalize(uModelMat3 * nObj);
      vec3 L = normalize(uSunPos - vPosW);
      vec3 V = normalize(cameraPosition - vPosW);
      float ndl = dot(N, L);

      float light = smoothstep(-0.12, 0.32, ndl);
      vec3 col = surf * (light * 0.92 + 0.10);

      // especular (oceanos)
      vec3 H = normalize(L + V);
      float spec = pow(clamp(dot(N, H), 0.0, 1.0), 70.0) * shin * clamp(ndl, 0.0, 1.0);
      col += spec * vec3(0.8, 0.86, 1.0);

      // sub-surface scattering on night side (subtle glow)
      float sss = smoothstep(-0.3, 0.1, ndl) * (1.0 - smoothstep(0.1, 0.5, ndl));
      col += sss * vec3(0.08, 0.04, 0.02);

      // dispersão atmosférica quente no terminador
      float term = smoothstep(0.0, 0.3, ndl) * (1.0 - smoothstep(0.3, 0.65, ndl));
      col += term * vec3(0.25, 0.15, 0.08) * 0.5;

      gl_FragColor = vec4(col * uOpacity, 1.0);
    }
  `;
}

const COLORS: Record<PlanetType, [string, string]> = {
  terran: ['#2a6cc0', '#3a8f4a'],
  gas: ['#caa878', '#8c6a45'],
  rocky: ['#b5623a', '#7a3a26'],
};

export function Planet({
  position,
  radius = 2,
  type = 'terran',
  sunPosition = [-18, 11, -48],
  atmosphere,
  atmosphereColor,
  colorA,
  colorB,
  ring = false,
  ringColor = '#e6cfa0',
  ringInner = 1.3,
  ringOuter = 2.35,
  tilt = 0.4,
  spin = 0.05,
  seed = 0,
  quality = 1,
}: Props) {
  const bodyRef = useRef<THREE.Mesh>(null);
  const cloudRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [defA, defB] = COLORS[type];
  const showAtmo = atmosphere ?? type === 'terran';
  const atmoColor = atmosphereColor ?? '#7fb0ff';
  const q = THREE.MathUtils.clamp(quality, 0.25, 1);
  // full quality segments for close-up
  const bodySegmentsHi = type === 'terran' ? (q < 0.5 ? 48 : q < 0.75 ? 64 : 84) : ring ? 60 : 48;
  const cloudSegmentsHi = q < 0.5 ? 28 : 36;
  const atmoSegmentsHi = q < 0.5 ? 24 : 30;
  const ringSegmentsHi = q < 0.5 ? 96 : 128;
  // low-poly segments for distant view
  const bodySegmentsLo = type === 'terran' ? 20 : 14;
  const cloudSegmentsLo = 10;
  const atmoSegmentsLo = 10;
  const ringSegmentsLo = 36;
  const bumpStrength = q > 0.92 && type !== 'gas' ? 0.45 : 0;

  const bodyMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: bodyFragment(type),
        uniforms: {
          uSunPos: { value: new THREE.Vector3(...sunPosition) },
          uColA: { value: new THREE.Color(colorA ?? defA) },
          uColB: { value: new THREE.Color(colorB ?? defB) },
          uTime: { value: 0 },
          uSeed: { value: seed },
          uBump: { value: bumpStrength },
          uOpacity: { value: 1 },
          uModelMat3: { value: new THREE.Matrix3() },
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [type],
  );

  // camada de nuvens (só terrestre)
  const cloudMat = useMemo(() => {
    if (type !== 'terran') return null;
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uSunPos: { value: new THREE.Vector3(...sunPosition) },
        uTime: { value: 0 },
        uOpacity: { value: 1 },
      },
      vertexShader: VERT,
      fragmentShader: /* glsl */ `
        varying vec3 vLocal; varying vec3 vPosW; varying vec3 vNormalW;
        uniform vec3 uSunPos; uniform float uTime; uniform float uOpacity;
        ${NOISE_GLSL}
        void main() {
          float c = fbm(vLocal * 2.6 + vec3(uTime * 0.02, 0.0, 0.0));
          float wisp = fbm(vLocal * 6.0 - vec3(uTime * 0.015, 0.0, 0.0));
          float cover = smoothstep(0.18, 0.55, c) * (0.6 + 0.4 * wisp);
          vec3 N = normalize(vNormalW);
          vec3 L = normalize(uSunPos - vPosW);
          float light = smoothstep(-0.1, 0.3, dot(N, L)) * 0.9 + 0.08;
          gl_FragColor = vec4(vec3(1.0) * light, cover * 0.8 * uOpacity);
        }
      `,
    });
  }, [type, sunPosition]);

  // atmosfera — halo fresnel no limbo (aditivo, sem fog) — SÓ se showAtmo
  const atmoMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        fog: false,
        uniforms: {
          uColor: { value: new THREE.Color(atmoColor) },
          uSunPos: { value: new THREE.Vector3(...sunPosition) },
          uOpacity: { value: 1 },
        },
        vertexShader: VERT,
        fragmentShader: /* glsl */ `
          varying vec3 vLocal; varying vec3 vPosW; varying vec3 vNormalW;
          uniform vec3 uColor; uniform vec3 uSunPos; uniform float uOpacity;
          void main() {
            vec3 N = normalize(vNormalW);
            vec3 V = normalize(cameraPosition - vPosW);
            vec3 L = normalize(uSunPos - vPosW);
            float rim = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);
            float sun = clamp(dot(N, L) + 0.3, 0.0, 1.0);
            gl_FragColor = vec4(uColor, rim * (0.22 + 0.48 * sun) * uOpacity);
          }
        `,
      }),
    [atmoColor, sunPosition],
  );

  // anéis procedurais
  const ringMat = useMemo(() => {
    if (!ring) return null;
    const inner = radius * ringInner;
    const outer = radius * ringOuter;
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uColor: { value: new THREE.Color(ringColor) },
        uInner: { value: inner },
        uOuter: { value: outer },
        uOpacity: { value: 1 },
      },
      vertexShader: /* glsl */ `
        varying float vR;
        void main() {
          vR = length(position.xy);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vR;
        uniform vec3 uColor; uniform float uInner; uniform float uOuter; uniform float uOpacity;
        ${NOISE_GLSL}
        void main() {
          float f = (vR - uInner) / (uOuter - uInner);
          if (f < 0.0 || f > 1.0) discard;
          float bands = 0.55 + 0.45 * sin(f * 120.0);
          float detail = 0.7 + 0.3 * fbm(vec3(f * 40.0, 0.0, 0.0));
          float gap = smoothstep(0.40, 0.45, abs(f - 0.52));
          float edge = smoothstep(0.0, 0.05, f) * (1.0 - smoothstep(0.93, 1.0, f));
          float a = edge * gap * detail * (0.22 + 0.5 * bands);
          gl_FragColor = vec4(uColor * (0.7 + 0.5 * bands), a * uOpacity);
        }
      `,
    });
  }, [ring, radius, ringInner, ringOuter, ringColor]);

  const ringGeo = useMemo(
    () => (ring ? new THREE.RingGeometry(radius * ringInner, radius * ringOuter, ringSegmentsHi, 1) : null),
    [ring, radius, ringInner, ringOuter, ringSegmentsHi],
  );

  useFrame((_, delta) => {
    if (bodyRef.current) {
      bodyRef.current.rotation.y += delta * spin;
      bodyRef.current.updateWorldMatrix(true, false);
      (bodyMat.uniforms.uModelMat3.value as THREE.Matrix3).setFromMatrix4(
        bodyRef.current.matrixWorld,
      );
    }
    bodyMat.uniforms.uTime.value += delta;
    if (cloudRef.current) cloudRef.current.rotation.y += delta * spin * 1.25;
    if (cloudMat) cloudMat.uniforms.uTime.value += delta;
  });

  // Segments LOD: switch between low/high based on camera distance
  const segLow = useRef(true);

  useFrame((state) => {
    if (!groupRef.current) return;
    const d = state.camera.position.distanceTo(groupRef.current.position);
    const far = d > 30;

    if (far !== segLow.current) {
      segLow.current = far;
      if (bodyRef.current) {
        const segs = far ? bodySegmentsLo : bodySegmentsHi;
        bodyRef.current.geometry.dispose();
        bodyRef.current.geometry = new THREE.SphereGeometry(radius, segs, segs);
      }
      if (cloudRef.current && cloudMat) {
        const segs = far ? cloudSegmentsLo : cloudSegmentsHi;
        cloudRef.current.geometry.dispose();
        cloudRef.current.geometry = new THREE.SphereGeometry(radius, segs, segs);
      }
      if (showAtmo) {
        const atmoMesh = groupRef.current.children[2];
        if (atmoMesh && atmoMesh.type === 'Mesh') {
          const segs = far ? atmoSegmentsLo : atmoSegmentsHi;
          (atmoMesh as THREE.Mesh).geometry?.dispose();
          (atmoMesh as THREE.Mesh).geometry = new THREE.SphereGeometry(radius * 1.045, segs, segs);
        }
      }
      if (ring && ringGeo) {
        const inner = radius * ringInner;
        const outer = radius * ringOuter;
        const segs = far ? ringSegmentsLo : ringSegmentsHi;
        const ringMesh = groupRef.current.children.find(
          (c) => (c as THREE.Mesh).geometry?.type === 'RingGeometry'
        );
        if (ringMesh) {
          (ringMesh as THREE.Mesh).geometry?.dispose();
          (ringMesh as THREE.Mesh).geometry = new THREE.RingGeometry(inner, outer, segs, 1);
        }
      }
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={[tilt, 0, tilt * 0.35]}>
      {/* corpo procedural com relevo */}
      <mesh ref={bodyRef} material={bodyMat}>
        <sphereGeometry args={[radius, bodySegmentsLo, bodySegmentsLo]} />
      </mesh>

      {/* nuvens (terrestre) */}
      {cloudMat && (
        <mesh ref={cloudRef} material={cloudMat} scale={1.02}>
          <sphereGeometry args={[radius, cloudSegmentsLo, cloudSegmentsLo]} />
        </mesh>
      )}

      {/* atmosfera — só na Terra */}
      {showAtmo && (
        <mesh material={atmoMat} scale={1.045}>
          <sphereGeometry args={[radius, atmoSegmentsLo, atmoSegmentsLo]} />
        </mesh>
      )}

      {/* anéis */}
      {ring && ringGeo && ringMat && (
        <mesh geometry={ringGeo} material={ringMat} rotation={[-Math.PI / 2, 0, 0]} />
      )}
    </group>
  );
}