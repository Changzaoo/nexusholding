import { sideIndex } from '../data/galleryContent';
import { useScrollProgress } from '../hooks/useScrollProgress';

/**
 * Índice editorial discreto no canto esquerdo (01 / INTRO, 02 / SYSTEM…).
 * Aparece principalmente no miolo do scroll (galeria) e destaca o item
 * ativo conforme o progresso — detalhe de estúdio, não um menu comum.
 */
export function SideIndex() {
  const p = useScrollProgress();

  // visível ~12% → 86%, com fade nas pontas
  const visibility =
    p < 0.12 ? p / 0.12 : p > 0.86 ? Math.max(0, 1 - (p - 0.86) / 0.08) : 1;

  let active = 0;
  for (let i = 0; i < sideIndex.length; i++) if (p >= sideIndex[i].at) active = i;

  return (
    <div
      className="fixed top-1/2 left-6 z-20 hidden -translate-y-1/2 flex-col gap-4 transition-opacity duration-500 md:flex"
      style={{ opacity: visibility }}
    >
      <div className="mb-1 font-mono text-[9px] tracking-[0.45em] text-white/25 uppercase">
        Índice
      </div>
      {sideIndex.map((item, i) => (
        <div
          key={item.id}
          className={`flex items-center gap-3 font-mono text-[10px] tracking-[0.3em] uppercase transition-all duration-500 ${
            active === i ? 'text-neon-cyan' : 'text-white/30'
          }`}
        >
          <span
            className={`h-px transition-all duration-500 ${
              active === i ? 'w-8 bg-neon-cyan' : 'w-3 bg-white/25'
            }`}
          />
          <span className="tabular-nums">{item.id}</span>
          <span>/ {item.label}</span>
        </div>
      ))}
    </div>
  );
}
