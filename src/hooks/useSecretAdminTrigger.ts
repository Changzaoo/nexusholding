import { useEffect, useRef, useState } from 'react';

const HOLD_DURATION_MS = 10_000;

export interface SecretTriggerState {
  /** 0 → 1 enquanto a tecla G está pressionada */
  progress: number;
  holding: boolean;
}

/**
 * Gatilho secreto do admin: segurar a tecla "G" por 10 segundos contínuos.
 * - Soltar antes do tempo cancela e esconde o indicador.
 * - Ignora quando o foco está em inputs (digitação normal).
 * - Ignora auto-repeat do teclado.
 *
 * ⚠️ Isto é apenas uma camada de UX oculta — a segurança real
 * é o Firebase Auth (ver src/lib/firebase.ts).
 */
export function useSecretAdminTrigger(onUnlock: () => void): SecretTriggerState {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);

  const rafRef = useRef(0);
  const startRef = useRef(0);
  const activeRef = useRef(false);
  const onUnlockRef = useRef(onUnlock);
  onUnlockRef.current = onUnlock;

  useEffect(() => {
    const cancel = () => {
      if (!activeRef.current) return;
      activeRef.current = false;
      cancelAnimationFrame(rafRef.current);
      setHolding(false);
      setProgress(0);
    };

    const tick = () => {
      if (!activeRef.current) return;
      const elapsed = performance.now() - startRef.current;
      const p = Math.min(1, elapsed / HOLD_DURATION_MS);
      setProgress(p);
      if (p >= 1) {
        activeRef.current = false;
        setHolding(false);
        setProgress(0);
        onUnlockRef.current();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'g' || e.repeat || activeRef.current) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      activeRef.current = true;
      startRef.current = performance.now();
      setHolding(true);
      rafRef.current = requestAnimationFrame(tick);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'g') cancel();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', cancel);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', cancel);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return { progress, holding };
}
