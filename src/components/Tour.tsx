import { useEffect, useLayoutEffect, useState } from 'react';
import type { TourStep } from '../lib/tutorial';

interface Rect { top: number; left: number; width: number; height: number; }

/** Acha o elemento [data-tour=key] que está VISÍVEL (ignora o duplicado oculto
 *  no mobile/desktop). Retorna null se não houver. */
function findTarget(key?: string): HTMLElement | null {
  if (!key) return null;
  const all = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${key}"]`));
  return all.find((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }) ?? null;
}

/**
 * Tour em foco (spotlight): escurece a tela com um "buraco" sobre o elemento
 * destacado e mostra um card explicativo. Sem dependências externas.
 */
export function Tour({ steps, onClose, onStep }: { steps: TourStep[]; onClose: () => void; onStep?: (s: TourStep, i: number) => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const step = steps[i];
  const last = i === steps.length - 1;

  // avisa o pai (troca de aba) ao entrar no passo
  useEffect(() => { if (step) onStep?.(step, i); /* eslint-disable-next-line */ }, [i]);

  // mede o alvo (depois de a aba renderizar) e re-mede em resize/scroll
  useLayoutEffect(() => {
    let raf = 0;
    const measure = () => {
      const el = findTarget(step?.target);
      if (!el) { setRect(null); return; }
      el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    const t = setTimeout(() => { raf = requestAnimationFrame(measure); }, 90);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); };
  }, [i, step?.target]);

  // teclado: Esc fecha, setas/Enter navegam
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') setI((x) => Math.min(steps.length - 1, x + 1));
      else if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [steps.length, onClose]);

  if (!step) return null;
  const pad = 8;
  const hole = rect ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 } : null;

  // posição do card: abaixo do alvo (ou acima se não couber); centralizado se sem alvo
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const below = hole ? hole.top + hole.height + 12 : 0;
  const cardStyle: React.CSSProperties = hole
    ? below + 220 < vh
      ? { top: below, left: Math.max(12, Math.min(hole.left, (typeof window !== 'undefined' ? window.innerWidth : 1000) - 332)) }
      : { top: Math.max(12, hole.top - 200), left: Math.max(12, Math.min(hole.left, (typeof window !== 'undefined' ? window.innerWidth : 1000) - 332)) }
    : { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' };

  const next = () => (last ? onClose() : setI((x) => x + 1));

  return (
    <div className="fixed inset-0 z-[100]">
      {/* fundo escuro: com buraco (box-shadow) quando há alvo, ou cobertura cheia */}
      {hole ? (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-neon-cyan/70 transition-all duration-300"
          style={{ ...hole, boxShadow: '0 0 0 9999px rgba(2,4,12,0.80)' }}
        />
      ) : (
        <div className="absolute inset-0 bg-void/85" />
      )}

      {/* clique no fundo não faz nada (evita interagir com o app durante o tour) */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />

      {/* card */}
      <div className="absolute w-[320px] max-w-[90vw] rounded-2xl border border-white/12 bg-void/95 p-5 shadow-2xl backdrop-blur-md" style={cardStyle}>
        <div className="mb-1 flex items-center justify-between">
          <span className="font-mono text-[10px] tracking-[0.25em] text-neon-cyan uppercase">Tutorial · {i + 1}/{steps.length}</span>
          <button onClick={onClose} className="font-mono text-sm text-white/40 hover:text-white">✕</button>
        </div>
        <h3 className="font-display text-lg font-bold tracking-wide text-white">{step.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-white/70">{step.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <button onClick={onClose} className="font-mono text-[10px] tracking-[0.2em] text-white/40 uppercase hover:text-white">Pular</button>
          <div className="flex gap-2">
            {i > 0 && <button onClick={() => setI((x) => x - 1)} className="rounded-full border border-white/15 px-3.5 py-1.5 font-mono text-[10px] tracking-[0.2em] text-white/60 uppercase hover:text-white">Voltar</button>}
            <button onClick={next} className="pill-button !px-4 !py-1.5 text-[10px] !border-neon-cyan/50">{last ? 'Concluir' : 'Próximo'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
