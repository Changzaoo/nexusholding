import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollState } from '../lib/scrollState';

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform float uAspect;
  uniform vec3 uColor;
  varying vec2 vUv;

  float sdRoundBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  void main() {
    vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
    float d = sdRoundBox(p, vec2(uAspect * 0.5, 0.5), 0.07);

    // preenchimento holográfico fraco + scanlines
    float fill = smoothstep(0.0, -0.02, d);
    float scan = 0.5 + 0.5 * sin(vUv.y * 90.0 + uTime * 2.4);
    float body = fill * (0.05 + scan * 0.035);

    // borda brilhante com pulso percorrendo o perímetro
    float border = smoothstep(0.012, 0.0, abs(d)) * 0.85;
    float sweep = 0.5 + 0.5 * sin(uTime * 1.4 + (vUv.x + vUv.y) * 6.0);
    border *= 0.45 + sweep * 0.55;

    // flicker sutil de holograma
    float flicker = 0.92 + 0.08 * sin(uTime * 17.0 + vUv.y * 40.0);

    float alpha = (body + border) * flicker * uOpacity;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

interface FloatingPanelProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  width?: number;
  height?: number;
  color?: string;
  opacity?: number;
  /** desativa a flutuação senoidal (para nested em cards) */
  float?: boolean;
  /** fator de rotação ligado ao scroll */
  scrollSpin?: number;
}

/**
 * Painel holográfico em perspectiva: plano com SDF de retângulo
 * arredondado, scanlines, borda com brilho percorrente e flicker.
 * Flutua com seno e gira levemente com a velocidade do scroll.
 */
export function FloatingPanel({
  position,
  rotation = [0, 0, 0],
  width = 3,
  height = 1.8,
  color = '#41e8ff',
  opacity = 0.7,
  float = true,
  scrollSpin = 0.04,
}: FloatingPanelProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const phase = useRef(Math.random() * Math.PI * 2);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: Math.random() * 50 },
          uOpacity: { value: opacity },
          uAspect: { value: width / height },
          uColor: { value: new THREE.Color(color) },
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta;
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = material.uniforms.uTime.value;
    if (float) {
      mesh.position.y =
        position[1] + Math.sin(t * 0.6 + phase.current) * 0.18;
      mesh.rotation.z = rotation[2] + Math.sin(t * 0.4 + phase.current) * 0.03;
    }
    mesh.rotation.y = THREE.MathUtils.damp(
      mesh.rotation.y,
      rotation[1] + scrollState.velocity * scrollSpin,
      3,
      delta,
    );
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      material={material}
    >
      <planeGeometry args={[width, height]} />
    </mesh>
  );
}
