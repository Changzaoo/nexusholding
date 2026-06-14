import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { earthMarkers, latLonToVec3 } from '../data/earthMarkers';

/* ------------------------------------------------------------------ */
/* Terra REALISTA — texturas NASA (Blue Marble):                       */
/*  · dia (cor) + luzes noturnas das cidades no lado escuro            */
/*  · máscara especular → brilho do Sol nos oceanos                    */
/*  · normal map → relevo de montanhas no terminador                  */
/*  · camada de nuvens animada + halo de atmosfera (fresnel)          */
/* Marcadores fixados sobre os CONTINENTES REAIS ligam cada região    */
/* ao conteúdo real da Nexus (ver src/data/earthMarkers.ts).          */
/* ------------------------------------------------------------------ */

interface Props {
  position?: [number, number, number];
  radius?: number;
  sunPosition?: [number, number, number];
  quality?: number;
  /** mostra os marcadores de conteúdo sobre os continentes */
  showMarkers?: boolean;
}

const VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vPosW;
  varying vec3 vNormalW;
  void main() {
    vUv = uv;
    vPosW = (modelMatrix * vec4(position, 1.0)).xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const BODY_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  varying vec3 vPosW;
  varying vec3 vNormalW;
  uniform sampler2D uDay;
  uniform sampler2D uNight;
  uniform sampler2D uSpec;
  uniform sampler2D uNormal;
  uniform vec3 uSunPos;
  uniform float uBump;
  uniform float uOpacity;

  // frame tangente sem tangentes pré-calculadas (Christian Schüler)
  mat3 cotangentFrame(vec3 N, vec3 p, vec2 uv) {
    vec3 dp1 = dFdx(p), dp2 = dFdy(p);
    vec2 duv1 = dFdx(uv), duv2 = dFdy(uv);
    vec3 dp2perp = cross(dp2, N);
    vec3 dp1perp = cross(N, dp1);
    vec3 T = dp2perp * duv1.x + dp1perp * duv2.x;
    vec3 B = dp2perp * duv1.y + dp1perp * duv2.y;
    float invmax = inversesqrt(max(dot(T, T), dot(B, B)));
    return mat3(T * invmax, B * invmax, N);
  }

  void main() {
    vec3 N0 = normalize(vNormalW);
    vec3 nt = texture2D(uNormal, vUv).xyz * 2.0 - 1.0;
    nt.xy *= uBump;
    mat3 TBN = cotangentFrame(N0, vPosW, vUv);
    vec3 N = normalize(TBN * nt);

    vec3 L = normalize(uSunPos - vPosW);
    vec3 V = normalize(cameraPosition - vPosW);
    float ndl = dot(N, L);
    float ndlGeo = dot(N0, L);

    vec3 day = texture2D(uDay, vUv).rgb;
    vec3 night = texture2D(uNight, vUv).rgb;
    float ocean = texture2D(uSpec, vUv).r;

    // realça os continentes: mais saturação e contraste no mapa de dia
    float luma = dot(day, vec3(0.299, 0.587, 0.114));
    day = mix(vec3(luma), day, 1.35);              // +saturação
    day = clamp((day - 0.5) * 1.18 + 0.5, 0.0, 1.0); // +contraste

    float lit = smoothstep(-0.08, 0.30, ndl);
    vec3 col = day * (lit * 1.0 + 0.05);

    // luzes das cidades no lado da noite
    float nightF = 1.0 - smoothstep(-0.18, 0.06, ndlGeo);
    col += night * nightF * 1.7;

    // reflexo especular do Sol nos oceanos
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), 64.0) * ocean * clamp(ndl, 0.0, 1.0);
    col += spec * vec3(0.7, 0.82, 1.0) * 1.3;

    // dispersão quente no terminador (amanhecer/entardecer)
    float term = smoothstep(0.0, 0.25, ndlGeo) * (1.0 - smoothstep(0.25, 0.6, ndlGeo));
    col += term * vec3(0.30, 0.16, 0.07) * 0.5;

    gl_FragColor = vec4(col * uOpacity, 1.0);
  }
`;

const CLOUD_FRAG = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vPosW;
  varying vec3 vNormalW;
  uniform sampler2D uClouds;
  uniform vec3 uSunPos;
  uniform float uOpacity;
  void main() {
    vec4 c = texture2D(uClouds, vUv);
    // textura paletizada: nuvens claras sobre fundo escuro → usa luminância.
    // limiar bem alto: só os núcleos mais densos das nuvens aparecem.
    float lum = (c.r + c.g + c.b) / 3.0;
    float cov = smoothstep(0.70, 0.96, lum);
    vec3 N = normalize(vNormalW);
    vec3 L = normalize(uSunPos - vPosW);
    float light = smoothstep(-0.1, 0.32, dot(N, L)) * 0.9 + 0.05;
    gl_FragColor = vec4(vec3(1.0) * light, cov * 0.28 * uOpacity);
  }
`;

const ATMO_FRAG = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vPosW;
  varying vec3 vNormalW;
  uniform vec3 uColor;
  uniform vec3 uSunPos;
  uniform float uOpacity;
  void main() {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(cameraPosition - vPosW);
    vec3 L = normalize(uSunPos - vPosW);
    float rim = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);
    float sun = clamp(dot(N, L) + 0.3, 0.0, 1.0);
    gl_FragColor = vec4(uColor, rim * (0.20 + 0.55 * sun) * uOpacity);
  }
`;

interface MarkerProps {
  m: (typeof earthMarkers)[number];
  radius: number;
  bodyRef: React.RefObject<THREE.Mesh | null>;
  showLabel: boolean;
}

function Marker({ m, radius, bodyRef, showLabel }: MarkerProps) {
  const dot = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const local = useMemo(() => latLonToVec3(m.lat, m.lon, radius * 1.005), [m, radius]);
  const dir = useMemo(() => new THREE.Vector3(...local).normalize(), [local]);
  // orienta o pino "para fora" da superfície
  const quat = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    return q;
  }, [dir]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + m.lat);
    if (halo.current) {
      const s = 1 + pulse * 0.9;
      halo.current.scale.setScalar(s);
      (halo.current.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - pulse);
    }
    if (dot.current) {
      (dot.current.material as THREE.MeshBasicMaterial).opacity = 0.85 + 0.15 * pulse;
    }
    // some o rótulo quando a câmera está longe (evita poluição)
    if (wrap.current && dot.current) {
      dot.current.getWorldPosition(tmp);
      const d = state.camera.position.distanceTo(tmp);
      const o = THREE.MathUtils.clamp(1 - (d - 16) / 14, 0, 1);
      wrap.current.style.opacity = String(o);
    }
  });

  const dotSize = radius * 0.035;

  return (
    <group position={local} quaternion={quat}>
      {/* ponto luminoso fixado no continente */}
      <mesh ref={dot}>
        <sphereGeometry args={[dotSize, 12, 12]} />
        <meshBasicMaterial color={m.accent} transparent toneMapped={false} />
      </mesh>
      {/* halo pulsante */}
      <mesh ref={halo}>
        <sphereGeometry args={[dotSize * 1.6, 12, 12]} />
        <meshBasicMaterial color={m.accent} transparent opacity={0.3} toneMapped={false} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* haste fininha */}
      <mesh position={[0, dotSize * 3, 0]}>
        <cylinderGeometry args={[dotSize * 0.12, dotSize * 0.12, dotSize * 6, 6]} />
        <meshBasicMaterial color={m.accent} transparent opacity={0.5} toneMapped={false} />
      </mesh>

      {showLabel && (
        <Html
          position={[0, dotSize * 7, 0]}
          center
          distanceFactor={12}
          occlude={[bodyRef] as any}
          zIndexRange={[20, 0]}
          style={{ pointerEvents: 'none', transition: 'opacity 0.25s' }}
          wrapperClass="earth-marker"
        >
          <div
            ref={wrap}
            style={{
              transform: 'translateY(-50%)',
              whiteSpace: 'nowrap',
              fontFamily: 'ui-monospace, monospace',
              userSelect: 'none',
            }}
          >
            <div
              style={{
                display: 'inline-block',
                padding: '4px 9px',
                borderRadius: 6,
                background: 'rgba(4,8,20,0.72)',
                border: `1px solid ${m.accent}`,
                boxShadow: `0 0 12px ${m.accent}66`,
                backdropFilter: 'blur(3px)',
              }}
            >
              <div style={{ fontSize: 7, letterSpacing: '0.18em', color: `${m.accent}`, opacity: 0.85, textTransform: 'uppercase' }}>
                {m.region}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#eaf2ff', marginTop: 1 }}>
                {m.title}
              </div>
              <div style={{ fontSize: 8, color: '#9fb4d8', marginTop: 1 }}>
                {m.caption}
              </div>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

export function RealisticEarth({
  position = [0, 0, 0],
  radius = 2.6,
  sunPosition = [-9, 4.5, -6],
  quality = 1,
  showMarkers = true,
}: Props) {
  const bodyRef = useRef<THREE.Mesh>(null);
  const cloudRef = useRef<THREE.Mesh>(null);
  const spinRef = useRef<THREE.Group>(null);
  const groupRef = useRef<THREE.Group>(null);

  const [dayMap, nightMap, specMap, normalMap, cloudMap] = useTexture([
    '/textures/earth_atmos_2048.jpg',
    '/textures/earth_lights_2048.png',
    '/textures/earth_specular_2048.jpg',
    '/textures/earth_normal_2048.jpg',
    '/textures/earth_clouds_1024.png',
  ]);

  useEffect(() => {
    dayMap.colorSpace = THREE.SRGBColorSpace;
    nightMap.colorSpace = THREE.SRGBColorSpace;
    specMap.colorSpace = THREE.NoColorSpace;
    normalMap.colorSpace = THREE.NoColorSpace;
    cloudMap.colorSpace = THREE.SRGBColorSpace;
    [dayMap, nightMap, specMap, normalMap, cloudMap].forEach((t) => {
      t.anisotropy = 8;
      t.needsUpdate = true;
    });
  }, [dayMap, nightMap, specMap, normalMap, cloudMap]);

  const sun = useMemo(() => new THREE.Vector3(...sunPosition), [sunPosition]);

  const bodyMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: BODY_FRAG,
        extensions: { derivatives: true } as any,
        uniforms: {
          uDay: { value: dayMap },
          uNight: { value: nightMap },
          uSpec: { value: specMap },
          uNormal: { value: normalMap },
          uSunPos: { value: sun },
          uBump: { value: quality > 0.5 ? 1.0 : 0.5 },
          uOpacity: { value: 1 },
        },
      }),
    [dayMap, nightMap, specMap, normalMap, sun, quality],
  );

  const cloudMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: CLOUD_FRAG,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uClouds: { value: cloudMap },
          uSunPos: { value: sun },
          uOpacity: { value: 1 },
        },
      }),
    [cloudMap, sun],
  );

  const atmoMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: ATMO_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        fog: false,
        uniforms: {
          uColor: { value: new THREE.Color('#7fb0ff') },
          uSunPos: { value: sun },
          uOpacity: { value: 1 },
        },
      }),
    [sun],
  );

  const seg = quality < 0.5 ? 48 : 96;
  const cloudSeg = quality < 0.5 ? 32 : 64;
  const showLabels = quality > 0.45;

  useFrame((_, delta) => {
    if (spinRef.current) spinRef.current.rotation.y += delta * 0.035;
    if (cloudRef.current) cloudRef.current.rotation.y += delta * 0.05;
  });

  return (
    <group ref={groupRef} position={position} rotation={[0.41, 0, 0]}>
      {/* corpo + marcadores giram juntos (continentes levam os pontos) */}
      <group ref={spinRef}>
        <mesh ref={bodyRef} material={bodyMat}>
          <sphereGeometry args={[radius, seg, seg]} />
        </mesh>

        {showMarkers &&
          earthMarkers.map((m) => (
            <Marker
              key={m.id}
              m={m}
              radius={radius}
              bodyRef={bodyRef}
              showLabel={showLabels}
            />
          ))}
      </group>

      {/* nuvens */}
      <mesh ref={cloudRef} material={cloudMat} scale={1.012}>
        <sphereGeometry args={[radius, cloudSeg, cloudSeg]} />
      </mesh>

      {/* atmosfera */}
      <mesh material={atmoMat} scale={1.05}>
        <sphereGeometry args={[radius, 48, 48]} />
      </mesh>
    </group>
  );
}
