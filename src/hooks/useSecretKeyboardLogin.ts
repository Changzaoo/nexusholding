import { useEffect, useRef } from 'react';

/**
 * Login secreto por teclado (sem campos visíveis):
 *   1. digite o e-mail e pressione ENTER
 *   2. digite a senha e pressione ENTER  → faz o login admin
 *
 * Mesmo efeito de preencher e-mail/senha no modal aberto pelo "G" por 10s.
 * - Ignora quando o foco está em inputs (digitação normal/forms).
 * - Reseta sozinho após inatividade (evita acúmulo acidental).
 *
 * ⚠️ Camada de acesso oculta — a segurança real é o Firebase Auth.
 */
export function useSecretKeyboardLogin(
  onSubmit: (email: string, password: string) => void,
  enabled = true,
) {
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const stage = useRef<'email' | 'password'>('email');
  const email = useRef('');
  const buffer = useRef('');
  const idleTimer = useRef<number>(0);

  useEffect(() => {
    const RESET_MS = 12_000;

    const reset = () => {
      stage.current = 'email';
      email.current = '';
      buffer.current = '';
    };

    const bumpIdle = () => {
      window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(reset, RESET_MS);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (!enabledRef.current) return;

      // não captura quando o usuário está digitando em um campo
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      // ignora combinações com Ctrl/Meta/Alt (atalhos do navegador)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'Enter') {
        if (stage.current === 'email') {
          if (!buffer.current) return;
          email.current = buffer.current.trim();
          buffer.current = '';
          stage.current = 'password';
          bumpIdle();
        } else {
          const pwd = buffer.current;
          const mail = email.current;
          reset();
          window.clearTimeout(idleTimer.current);
          if (mail && pwd) onSubmitRef.current(mail, pwd);
        }
        return;
      }

      if (e.key === 'Backspace') {
        buffer.current = buffer.current.slice(0, -1);
        bumpIdle();
        return;
      }

      // apenas caracteres imprimíveis (length 1)
      if (e.key.length === 1) {
        buffer.current += e.key;
        bumpIdle();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(idleTimer.current);
    };
  }, []);
}
