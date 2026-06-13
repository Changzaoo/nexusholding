import { siteContent } from '../data/siteContent';
const NAV_ITEMS = siteContent.nav;

/**
 * Header minimalista fixo: logo textual à esquerda, navegação em pills
 * pequenas à direita (estilo HUD). Nenhuma referência ao admin.
 */
export function Header() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between px-6 py-5 md:px-10">
      <a
        href="#top"
        className="pointer-events-auto font-mono text-[13px] font-medium tracking-[0.45em] text-white/90 transition-colors hover:text-neon-cyan"
      >
        {siteContent.company}
        <span className="ml-2 inline-block h-[6px] w-[6px] animate-pulse rounded-full bg-neon-cyan align-middle" />
      </a>

      <nav className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-1.5 py-1.5 backdrop-blur-md">
        {NAV_ITEMS.map((item, i) => (
          <a
            key={item.label}
            href={item.href}
            className={
              i === NAV_ITEMS.length - 1
                ? 'rounded-full bg-white/8 px-4 py-1.5 font-mono text-[10px] tracking-[0.28em] text-white transition-colors duration-300 hover:text-neon-cyan'
                : 'rounded-full px-4 py-1.5 font-mono text-[10px] tracking-[0.28em] text-white/55 transition-colors duration-300 hover:text-white'
            }
          >
            {item.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
