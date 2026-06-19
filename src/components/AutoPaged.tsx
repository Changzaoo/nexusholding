import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Lista/grade que se PAGINA para caber exatamente na altura disponível —
 * o usuário nunca rola: o que não cabe vai para a próxima página (‹ ›).
 *
 *  - rowPx:   altura aproximada de cada item (linha)
 *  - colMinPx: se definido, vira grade (colunas = largura / colMinPx)
 */
export function AutoPaged<T>({
  items,
  render,
  rowPx,
  colMinPx,
  gap = 12,
  empty,
}: {
  items: T[];
  render: (item: T, index: number) => ReactNode;
  rowPx: number;
  colMinPx?: number;
  gap?: number;
  empty?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [page, setPage] = useState(0);

  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current;
      if (el) setBox({ w: el.clientWidth, h: el.clientHeight });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (ref.current) ro.observe(ref.current);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  const cols = colMinPx ? Math.max(1, Math.floor((box.w + gap) / (colMinPx + gap))) : 1;
  const rows = Math.max(1, Math.floor((box.h + gap) / (rowPx + gap)));
  const perPage = Math.max(1, cols * rows);
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  const cur = Math.min(page, pages - 1);
  const slice = items.slice(cur * perPage, cur * perPage + perPage);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div ref={ref} className="min-h-0 flex-1 overflow-hidden">
        {items.length === 0
          ? (empty ?? <div className="glass-panel flex h-full items-center justify-center rounded-2xl p-8 text-center font-mono text-xs text-white/40">Nada por aqui ainda.</div>)
          : (
            <div
              style={colMinPx
                ? { display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gap, alignContent: 'start' }
                : { display: 'flex', flexDirection: 'column', gap }}
            >
              {slice.map((it, i) => render(it, cur * perPage + i))}
            </div>
          )}
      </div>
      {items.length > perPage && (
        <Pager
          page={cur}
          pages={pages}
          total={items.length}
          from={cur * perPage + 1}
          to={Math.min(items.length, cur * perPage + perPage)}
          onPrev={() => setPage((p) => Math.max(0, p - 1))}
          onNext={() => setPage((p) => Math.min(pages - 1, p + 1))}
        />
      )}
    </div>
  );
}

export function Pager({ page, pages, total, from, to, onPrev, onNext }: {
  page: number; pages: number; total: number; from: number; to: number; onPrev: () => void; onNext: () => void;
}) {
  const btn = 'flex h-7 w-7 items-center justify-center rounded-lg border border-white/12 font-mono text-sm text-white/70 transition-colors hover:border-neon-cyan/40 hover:text-neon-cyan disabled:opacity-30 disabled:hover:border-white/12 disabled:hover:text-white/70';
  return (
    <div className="flex shrink-0 items-center justify-between px-1">
      <span className="font-mono text-[10px] tracking-[0.15em] text-white/40 uppercase">{from}–{to} de {total}</span>
      <div className="flex items-center gap-2">
        <button onClick={onPrev} disabled={page === 0} className={btn} aria-label="Anterior">‹</button>
        <span className="font-mono text-[10px] text-white/45">{page + 1}/{pages}</span>
        <button onClick={onNext} disabled={page >= pages - 1} className={btn} aria-label="Próxima">›</button>
      </div>
    </div>
  );
}
