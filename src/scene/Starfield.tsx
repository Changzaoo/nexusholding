import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/* Campo de estrelas distante — a âncora do tema de espaço sideral.    */
/* Casca esférica de pontos minúsculos em volta de toda a jornada,     */
/* maioria branco-azulada com algumas quentes, cintilando de leve e    */
/* girando muito devagar. Sem fog (estrelas no "infinito").            */
/* ------------------------------------------------------------------ */

const VERTEX = /* glsl */ `
  attribute float aScale;
  attribute float aTw;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aScale * uPixelRatio * (90.0 / max(1.0, -mv.z));
    gl_Position = projectionMatrix * mv;
    vColor = aColor;
    vTwinkle = 0.55 + 0.45 * sin(uTime * (0.8 + aTw * 2.5) + aTw * 30.0);
  }
`;

const FRAGMENT = /* glsl */ `
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    float d = distance(gl_PointCoord, vec2(0.5));
    float glow = smoothstep(0.5, 0.0, d);
    float alpha = pow(glow, 1.8) * vTwinkle;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(vColor * (1.0 + glow * 0.5), alpha);
  }
`;

// cores estelares realistas: maioria branca/azulada, algumas quentes
const STAR_COLORS = ['#ffffff', '#dCe8ff', '#bcd0ff', '#fff2d6', '#ffd9b0', '#cfe0ff', '#ffe4b5', '#f0e6ff', '#ccd9ff', '#e8f0ff'];

interface Props {
  count?: number;
}

export function Starfield({ count = 2600 }: Props) {
  const groupRef = useRef<THREE.Group>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const tw = new Float32Array(count);
    const color = new THREE.Color();
    const v = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      // distribuição uniforme numa casca esférica (raio 75–110)
      v.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
      if (v.lengthSq() < 0.0001) v.set(0, 0, 1);
      v.normalize().multiplyScalar(75 + Math.random() * 35);
      // centra a casca no miolo do corredor (z ≈ -28)
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z - 28;

      color.set(STAR_COLORS[(Math.random() * STAR_COLORS.length) | 0]);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // smaller base size, brighter stars rarer for more realistic look
      const bright = Math.random() < 0.015;
      scales[i] = (0.3 + Math.random() * 0.6) * (bright ? 4.5 : 1);
      tw[i] = Math.random();
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    geo.setAttribute('aTw', new THREE.BufferAttribute(tw, 1));
    return geo;
  }, [count]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: {
            value: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2),
          },
        },
      }),
    [],
  );

  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta;
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.004;
  });

  return (
    <group ref={groupRef}>
      <points geometry={geometry} material={material} frustumCulled={false} />
    </group>
  );
}
