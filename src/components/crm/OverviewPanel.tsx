import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { subscribeLeads } from '../../lib/leads';
import {
  PIPELINE,
  agendaStore,
  financeiroStore,
  propostasStore,
  moeda,
  type Lead,
  type Evento,
  type Parcela,
  type Proposta,
} from '../../lib/crm';

const todayISO = () => new Date().toISOString().slice(0, 10);

const tipoLabel: Record<Evento['type'], string> = {
  reuniao: 'Reunião',
  ligacao: 'Ligação',
  apresentacao: 'Apresentação',
  entrega: 'Entrega',
  tarefa: 'Tarefa',
};

/**
 * Visão geral — preenche a tela: KPIs no topo, a lista de Leads (children)
 * como área principal e, em telas grandes, funil + próximos numa coluna
 * lateral. Nada de empilhar e cortar: tudo no campo de visão.
 */
export function OverviewPanel({ onGo, children }: { onGo?: (mod: string) => void; children?: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  useEffect(() => subscribeLeads(setLeads), []);
  useEffect(() => agendaStore.subscribe(setEventos), []);
  useEffect(() => financeiroStore.subscribe(setParcelas), []);
  useEffect(() => propostasStore.subscribe(setPropostas), []);

  const won = leads.filter((l) => l.status === 'fechado').length;
  const conv = leads.length ? Math.round((won / leads.length) * 100) : 0;
  const open = leads.filter((l) => l.status !== 'fechado' && l.status !== 'perdido').length;

  const aReceber = parcelas.filter((p) => p.status !== 'recebido').reduce((s, p) => s + p.value, 0);
  const atrasado = parcelas.filter((p) => p.status === 'atrasado').reduce((s, p) => s + p.value, 0);
  // receita a fechar = propostas enviadas (aguardando resposta do cliente)
  const aFechar = propostas.filter((p) => p.status === 'enviada').reduce((s, p) => s + p.value, 0);

  // distribuição do funil (estágios ativos)
  const funil = useMemo(
    () =>
      PIPELINE.filter((s) => s.value !== 'perdido').map((s) => ({
        ...s,
        qtd: leads.filter((l) => l.status === s.value).length,
      })),
    [leads],
  );
  const maxFunil = Math.max(1, ...funil.map((f) => f.qtd));

  const proximos = useMemo(() => {
    const t = todayISO();
    return [...eventos]
      .filter((e) => e.date >= t)
      .sort((a, b) => (a.date + (a.time ?? '')).localeCompare(b.date + (b.time ?? '')))
      .slice(0, 3);
  }, [eventos]);

  const cards = [
    { label: 'Leads totais', value: String(leads.length), color: '#cfe2ff', go: 'pipeline' },
    { label: 'Em aberto', value: String(open), color: '#41e8ff', go: 'pipeline' },
    { label: 'Conversão', value: `${conv}%`, color: '#8b5cf6', go: 'pipeline' },
    { label: 'A receber', value: moeda(aReceber), color: atrasado > 0 ? '#ff5d73' : '#22c55e', sub: atrasado > 0 ? `${moeda(atrasado)} atrasado` : 'contratado', go: 'financeiro' },
    { label: 'A fechar', value: moeda(aFechar), color: '#a3ff6b', sub: 'propostas enviadas', go: 'financeiro' },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* indicadores (compactos, fixos no topo) */}
      <div className="grid shrink-0 grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <button
            key={c.label}
            onClick={() => onGo?.(c.go)}
            className="glass-panel rounded-xl p-3 text-left transition-colors hover:bg-white/5"
          >
            <div className="font-display text-xl font-bold lg:text-2xl" style={{ color: c.color }}>{c.value}</div>
            <div className="mt-0.5 font-mono text-[9px] tracking-[0.22em] text-white/45 uppercase">{c.label}</div>
            {c.sub && <div className="font-mono text-[9px] text-white/35">{c.sub}</div>}
          </button>
        ))}
      </div>

      {/* área principal: Leads (children) + coluna lateral só em telas grandes */}
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[1fr_320px]">
        <div className="flex min-h-0 flex-col">
          <h2 className="mb-2 shrink-0 font-mono text-[11px] tracking-[0.3em] text-white/55 uppercase">Leads</h2>
          <div className="min-h-0 flex-1">{children}</div>
        </div>

        <aside className="hidden min-h-0 flex-col gap-3 overflow-hidden lg:flex">
          {/* funil comercial */}
          <div className="glass-panel shrink-0 rounded-2xl p-4">
            <h3 className="mb-3 font-mono text-[11px] tracking-[0.3em] text-white/55 uppercase">Funil comercial</h3>
            <div className="flex flex-col gap-1.5">
              {funil.map((f) => (
                <div key={f.value}>
                  <div className="mb-0.5 flex items-center justify-between text-xs">
                    <span className="text-white/60">{f.label}</span>
                    <span className="font-mono" style={{ color: f.color }}>{f.qtd}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(f.qtd / maxFunil) * 100}%`, background: f.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* próximos compromissos */}
          <div className="glass-panel flex min-h-0 flex-1 flex-col rounded-2xl p-4">
            <div className="mb-3 flex shrink-0 items-center justify-between">
              <h3 className="font-mono text-[11px] tracking-[0.3em] text-white/55 uppercase">Próximos</h3>
              <button onClick={() => onGo?.('agenda')} className="font-mono text-[10px] tracking-[0.2em] text-neon-cyan uppercase hover:text-white">agenda →</button>
            </div>
            {proximos.length === 0 ? (
              <p className="font-mono text-xs text-white/40">Nada agendado. 🎉</p>
            ) : (
              <div className="flex min-h-0 flex-col gap-2 overflow-hidden">
                {proximos.map((e) => (
                  <div key={e.id} className="shrink-0 rounded-lg bg-white/5 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-white">{e.title}</span>
                      <span className="shrink-0 font-mono text-[10px] text-white/45">{e.date.slice(8, 10)}/{e.date.slice(5, 7)}{e.time ? ` ${e.time}` : ''}</span>
                    </div>
                    <div className="font-mono text-[10px] text-white/40">{tipoLabel[e.type]}{e.relatedTo ? ` · ${e.relatedTo}` : ''}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
