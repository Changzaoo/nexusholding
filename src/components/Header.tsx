import { useSiteContent } from '../lib/content';

/**
 * Header minimalista fixo: apenas o logo textual à esquerda (HUD).
 * Sem navegação. Nenhuma referência ao admin.
 */
export function Header() {
  const siteContent = useSiteContent();
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between px-6 py-5 md:px-10">
      <a
        href="#top"
        className="pointer-events-auto font-mono text-[13px] font-medium tracking-[0.45em] text-white/90 transition-colors hover:text-neon-cyan"
      >
        {siteContent.company}
        <span className="ml-2 inline-block h-[6px] w-[6px] animate-pulse rounded-full bg-neon-cyan align-middle" />
      </a>
    </header>
  );
}
