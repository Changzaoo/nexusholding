import * as THREE from 'three';

/**
 * Geometria compartilhada da coluna vertebral digital.
 * A espinha é um eixo vertical com leve curvatura em S (X) e deriva em Z —
 * orgânica, não reta. Coluna, transição e laboratório usam estas funções
 * para se alinharem ao mesmo eixo.
 */
export const SPINE = {
  topY: 3.0,
  spacing: 0.42,
  curveX: 0.55,
  curveZ: 0.35,
};

/** Posição base da vértebra i (sem animação de onda). */
export function spinePoint(i: number): THREE.Vector3 {
  return new THREE.Vector3(
    Math.sin(i * 0.28) * SPINE.curveX,
    SPINE.topY - i * SPINE.spacing,
    Math.cos(i * 0.2) * SPINE.curveZ - 0.4,
  );
}

/** Y do fundo da coluna (onde fica o laboratório). */
export function spineBottomY(segments: number): number {
  return SPINE.topY - (segments - 1) * SPINE.spacing;
}
