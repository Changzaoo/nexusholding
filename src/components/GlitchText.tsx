import { createElement, type ElementType, type ReactElement } from 'react';

interface GlitchTextProps {
  children: string;
  as?: ElementType;
  className?: string;
}

/**
 * Texto com glitch sutil via pseudo-elementos CSS (ver globals.css).
 * O conteúdo é duplicado em ::before/::after com clip-path e
 * deslocamentos rápidos em ciano/magenta — elegante, não exagerado.
 */
export function GlitchText({
  children,
  as = 'span',
  className = '',
}: GlitchTextProps): ReactElement {
  return createElement(
    as,
    { className: `glitch ${className}`, 'data-text': children },
    children,
  );
}
