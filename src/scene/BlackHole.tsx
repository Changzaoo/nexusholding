import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NOISE_GLSL } from './glsl-noise';

function makeGlow(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d')!;
  const halo = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  halo.addColorStop(0, 'rgba(255,238,205,0.20)');
  halo.addColorStop(0.28, 'rgba(255,160,72,0.095)');
  halo.addColorStop(0.62, 'rgba(160,70,32,0.032)');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, size, size);

  const band = ctx.createLinearGradient(0, size / 2, size, size / 2);
  band.addColorStop(0, 'rgba(255,92,32,0)');
  band.addColorStop(0.5, 'rgba(255,205,125,0.13)');
  band.addColorStop(1, 'rgba(255,92,32,0)');
  ctx.fillStyle = band;
  ctx.fillRect(0, size * 0.47, size, size * 0.06);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeLensMaterial(inner: number, outer: number, inclination: number): THREE.ShaderMaterial {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uInner: { value: inner },
      uOuter: { value: outer },
      uInclination: { value: inclination },
    },
    vertexShader: /* glsl */ `
      varying vec2 vXY;
      void main() {
        vXY = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vXY;
      uniform float uTime;
      uniform float uInner;
      uniform float uOuter;
      uniform float uInclination;
      ${NOISE_GLSL}

      void main() {
        float r = length(vXY);
        if (r < uInner || r > uOuter) discard;

        float f = (r - uInner) / (uOuter - uInner);
        float a = atan(vXY.y, vXY.x);
        float sy = sin(a);
        float cx = cos(a);

        float topMask = smoothstep(0.10, 0.68, sy);
        float bottomMask = smoothstep(0.16, 0.82, -sy) * (0.48 + uInclination * 0.14);
        float rightBridge = smoothstep(0.34, 1.0, cx) * smoothstep(0.22, 0.64, abs(sy)) * 0.24;
        float topRidge = exp(-pow((f - 0.16) / 0.090, 2.0)) + exp(-pow((f - 0.32) / 0.18, 2.0)) * 0.28;
        float bottomRidge = exp(-pow((f - 0.075) / 0.045, 2.0));
        float arcMask = topMask * topRidge + bottomMask * bottomRidge + rightBridge * topRidge;

        float radialFade = smoothstep(0.0, 0.045, f) * (1.0 - smoothstep(0.62, 1.0, f));
        float n = 0.5 + 0.5 * fbm(vec3(
          cos(a * 2.0 - uTime * 0.42) * (2.0 + f * 5.0),
          sin(a * 2.0 - uTime * 0.42) * (2.0 + f * 5.0),
          uTime * 0.11
        ));
        float lane = 1.0 - smoothstep(0.035, 0.22, abs(fract(f * 5.0 + n * 0.12 - uTime * 0.018) - 0.5));
        float innerFlare = exp(-f * 8.5);
        float doppler = 0.52 + 1.05 * smoothstep(-0.32, 0.96, cos(a - 0.18));
        float heat = innerFlare * 0.78 + pow(1.0 - f, 2.1) * 0.36 + lane * 0.12;
        float alpha = clamp(arcMask * radialFade * doppler * heat * (0.48 + n * 0.34), 0.0, 0.74);

        vec3 whiteHot = vec3(1.0, 0.96, 0.82);
        vec3 orange = vec3(1.0, 0.48, 0.14);
        vec3 ember = vec3(0.45, 0.10, 0.035);
        vec3 color = mix(whiteHot, orange, smoothstep(0.0, 0.48, f));
        color = mix(color, ember, smoothstep(0.54, 1.0, f));
        color *= 1.02 + heat * 1.05;

        gl_FragColor = vec4(color, alpha);
      }
    `,
  });
  material.toneMapped = false;
  return material;
}

function makeBandMaterial(radius: number, outer: number, inclination: number): THREE.ShaderMaterial {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uRadius: { value: radius },
      uOuter: { value: outer },
      uInclination: { value: inclination },
    },
    vertexShader: /* glsl */ `
      varying vec2 vXY;
      void main() {
        vXY = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vXY;
      uniform float uTime;
      uniform float uRadius;
      uniform float uOuter;
      uniform float uInclination;
      ${NOISE_GLSL}

      void main() {
        float x = vXY.x;
        float y = vXY.y;
        float ax = abs(x);
        if (ax > uOuter) discard;

        float outerFade = 1.0 - smoothstep(uOuter * 0.48, uOuter, ax);
        float outsideShadow = smoothstep(uRadius * 0.90, uRadius * 1.08, ax);
        float thickness = mix(uRadius * 0.013, uRadius * (0.052 + uInclination * 0.030), smoothstep(uRadius, uOuter, ax));
        float band = exp(-pow(abs(y) / max(thickness, 0.001), 1.32));
        float razor = exp(-pow(abs(y) / (uRadius * 0.008), 2.0));
        float edgeFlare = exp(-abs(ax - uRadius * 1.02) / (uRadius * 0.15));

        float n = 0.5 + 0.5 * fbm(vec3(x * 0.08 - uTime * 0.22, y * 0.34, uTime * 0.16));
        float gaps = 0.74 + 0.26 * sin(x * 1.35 + n * 4.0 - uTime * 1.4);
        float doppler = mix(0.58, 1.65, smoothstep(-uOuter * 0.45, uOuter * 0.82, x));
        float heat = (band * outsideShadow * (0.46 + edgeFlare * 1.02) + razor * (0.58 + edgeFlare * 0.42));
        heat *= outerFade * doppler * gaps;

        float alpha = clamp((band * outsideShadow * 0.54 + razor * 0.72 + edgeFlare * band * 0.28) * outerFade, 0.0, 0.84);
        float distanceColor = smoothstep(uRadius * 1.1, uOuter, ax);
        vec3 color = mix(vec3(1.0, 0.98, 0.88), vec3(1.0, 0.48, 0.12), distanceColor);
        color = mix(color, vec3(0.55, 0.12, 0.035), smoothstep(0.48, 1.0, distanceColor));
        color *= 1.12 + heat * 1.45;

        gl_FragColor = vec4(color, alpha);
      }
    `,
  });
  material.toneMapped = false;
  return material;
}

function makeLensedStars(count: number, radius: number): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const speeds = new Float32Array(count);
  const seeds = new Float32Array(count);
  const warmth = new Float32Array(count);
  const extent = radius * 4.8;

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() * 2 - 1) * extent;
    positions[i * 3 + 1] = (Math.random() * 2 - 1) * extent * 0.72;
    positions[i * 3 + 2] = -radius * 0.28;
    sizes[i] = 0.55 + Math.random() * 1.85;
    speeds[i] = 0.45 + Math.random() * 0.95;
    seeds[i] = Math.random();
    warmth[i] = Math.random();
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute('aWarmth', new THREE.BufferAttribute(warmth, 1));
  return geometry;
}

function makeLensedStarMaterial(radius: number, extent: number): THREE.ShaderMaterial {
  const material = new THREE.ShaderMaterial({
    transparent: false,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uRadius: { value: radius },
      uExtent: { value: extent },
      uPixelRatio: {
        value: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2),
      },
    },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aSpeed;
      attribute float aSeed;
      attribute float aWarmth;
      uniform float uTime;
      uniform float uRadius;
      uniform float uExtent;
      uniform float uPixelRatio;
      varying float vAlpha;
      varying float vWarmth;
      varying float vSpark;

      void main() {
        vec2 p = position.xy;
        float span = uExtent * 2.0;
        p.x = mod(p.x + uTime * aSpeed * 1.08 + aSeed * span * 2.0 + span * 8.0, span) - uExtent;

        float r = length(p);
        vec2 dir = p / max(r, 0.001);
        float lens = smoothstep(uRadius * 3.15, uRadius * 0.34, r);
        float ring = exp(-pow((r - uRadius * 0.82) / (uRadius * 0.36), 2.0));
        float shear = ring * (0.22 + aSeed * 0.18);

        p += dir * (uRadius * (0.42 * lens + 0.30 * ring));
        p += vec2(-dir.y, dir.x) * uRadius * shear;

        float sourceFade = 1.0 - smoothstep(uExtent * 0.82, uExtent, abs(p.x));
        float swallowed = smoothstep(0.0, uRadius * 0.28, r);
        float magnified = 0.62 + ring * 1.45 + lens * 0.42;
        vAlpha = sourceFade * swallowed * (0.38 + aSeed * 0.62) * magnified;
        vWarmth = aWarmth;
        vSpark = 0.75 + 0.25 * sin(uTime * (2.0 + aSeed * 4.0) + aSeed * 30.0);

        vec4 mv = modelViewMatrix * vec4(p.x, p.y, position.z, 1.0);
        gl_PointSize = aSize * uPixelRatio * (250.0 / max(1.0, -mv.z)) * magnified;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vAlpha;
      varying float vWarmth;
      varying float vSpark;

      void main() {
        float d = distance(gl_PointCoord, vec2(0.5));
        float core = smoothstep(0.5, 0.0, d);
        float alpha = pow(core, 2.1) * vAlpha * vSpark;
        if (alpha < 0.01) discard;

        vec3 cool = vec3(0.72, 0.84, 1.0);
        vec3 warm = vec3(1.0, 0.80, 0.52);
        vec3 color = mix(cool, warm, smoothstep(0.62, 1.0, vWarmth));
        gl_FragColor = vec4(color * (1.0 + core * 1.6), alpha);
      }
    `,
  });
  material.toneMapped = false;
  return material;
}

function makePhotonMaterial(): THREE.ShaderMaterial {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: false,
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vXY;
      void main() {
        vXY = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vXY;
      uniform float uTime;
      ${NOISE_GLSL}

      void main() {
        float a = atan(vXY.y, vXY.x);
        float n = 0.5 + 0.5 * fbm(vec3(cos(a * 3.0), sin(a * 3.0), uTime * 0.2));
        float beam = 0.58 + 0.92 * smoothstep(-0.12, 1.0, cos(a - 0.08));
        float pulse = 0.84 + 0.16 * sin(a * 9.0 - uTime * 2.1);
        float alpha = clamp((0.52 + n * 0.48) * beam * pulse, 0.0, 1.0);
        gl_FragColor = vec4(vec3(1.0, 0.86, 0.58) * (1.6 + alpha), alpha);
      }
    `,
  });
  material.toneMapped = false;
  return material;
}

interface Props {
  position?: [number, number, number];
  radius?: number;
  tilt?: number;
}

export function BlackHole({ position = [-20, 5, -125], radius = 6, tilt = 0.42 }: Props) {
  const billboardRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Sprite>(null);

  const inclination = THREE.MathUtils.clamp(Math.abs(tilt), 0, 1);
  const lensInner = radius * 1.055;
  const lensOuter = radius * 2.55;
  const bandOuter = radius * 2.95;
  const starExtent = radius * 4.8;

  const lensGeometry = useMemo(() => new THREE.RingGeometry(lensInner, lensOuter, 260, 18), [lensInner, lensOuter]);
  const photonGeometry = useMemo(() => new THREE.RingGeometry(radius * 1.005, radius * 1.065, 220, 2), [radius]);
  const bandGeometry = useMemo(() => new THREE.PlaneGeometry(bandOuter * 2, radius * 0.74, 180, 12), [bandOuter, radius]);
  const lensedStarGeometry = useMemo(() => makeLensedStars(220, radius), [radius]);

  const lensMaterial = useMemo(() => makeLensMaterial(lensInner, lensOuter, inclination), [lensInner, lensOuter, inclination]);
  const bandMaterial = useMemo(() => makeBandMaterial(radius, bandOuter, inclination), [radius, bandOuter, inclination]);
  const lensedStarMaterial = useMemo(() => makeLensedStarMaterial(radius, starExtent), [radius, starExtent]);
  const photonMaterial = useMemo(makePhotonMaterial, []);
  const glowTexture = useMemo(makeGlow, []);
  const glowMaterial = useMemo(() => {
    const material = new THREE.SpriteMaterial({
      map: glowTexture,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      fog: false,
    });
    material.toneMapped = false;
    return material;
  }, [glowTexture]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    lensMaterial.uniforms.uTime.value = time;
    bandMaterial.uniforms.uTime.value = time;
    lensedStarMaterial.uniforms.uTime.value = time;
    photonMaterial.uniforms.uTime.value = time;

    if (billboardRef.current) {
      billboardRef.current.lookAt(state.camera.position);
    }

    if (glowRef.current) {
      const pulse = 1 + Math.sin(time * 1.15) * 0.035;
      glowRef.current.scale.set(radius * 8.9 * pulse, radius * 5.6 * pulse, 1);
    }
  });

  return (
    <group position={position}>
      <sprite ref={glowRef} material={glowMaterial} scale={[radius * 8.9, radius * 5.6, 1]} renderOrder={0} />

      <mesh renderOrder={1}>
        <sphereGeometry args={[radius, 96, 96]} />
        <meshBasicMaterial color="#000000" toneMapped={false} fog={false} />
      </mesh>

      <group ref={billboardRef}>
        <points geometry={lensedStarGeometry} material={lensedStarMaterial} renderOrder={0} />
        <mesh geometry={lensGeometry} material={lensMaterial} renderOrder={2} />
        <mesh geometry={bandGeometry} material={bandMaterial} renderOrder={3} />
        <mesh geometry={photonGeometry} material={photonMaterial} renderOrder={4} />
      </group>
    </group>
  );
}
