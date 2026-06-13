import { useMemo } from 'react';

export interface DeviceProfile {
  isMobile: boolean;
  lowPower: boolean;
  reducedMotion: boolean;
  effects: boolean;
  /** multiplicador geral de densidade (partículas/painéis decorativos) */
  quality: number;
  particleCount: number;
  /** nº de vértebras da coluna */
  spineSegments: number;
  dpr: [number, number];
}

/**
 * Perfil de performance resolvido uma única vez.
 * Mobile / poucos núcleos / prefers-reduced-motion → cena simplificada
 * (menos partículas, coluna mais curta, sem chão refletivo, sem bloom).
 */
export function useDeviceProfile(): DeviceProfile {
  return useMemo(() => {
    const isMobile =
      typeof window !== 'undefined' &&
      (window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent));
    const lowPower =
      typeof navigator !== 'undefined' &&
      (navigator.hardwareConcurrency ?? 8) <= 4;
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const quality = isMobile || lowPower ? 0.32 : 0.62;

    return {
      isMobile,
      lowPower,
      reducedMotion,
      effects: !reducedMotion && !lowPower,
      quality,
      particleCount: Math.round(3200 * quality),
      spineSegments: isMobile || lowPower ? 16 : 30,
      dpr: isMobile || lowPower ? [1, 1.1] : [1, 1.2],
    };
  }, []);
}
