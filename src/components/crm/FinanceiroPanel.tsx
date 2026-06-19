import { useEffect, useMemo, useState } from 'react';
import {
  financeiroStore,
  custosStore,
  propostasStore,
  moeda,
  exportCSV,
  type Parcela,
  type ParcelaStatus,
  type Custo,
  type CustoCategoria,
  type Proposta,
} from '../../lib/crm';
import { AutoPaged } from '../AutoPaged';

const STATUS: { value: ParcelaStatus; label: string; color: string }[] = [
  { value: 'a_receber', label: 'A receber', color: '#41e8ff' },
  { value: 'recebido', label: 'Recebido', color: '#22c55e' },
  { value: 'atrasado', label: 'Atrasado', color: '#ff5d73' },
];
const statusMeta = (s: ParcelaStatus) => STATUS.find((x) => x.value === s) ?? STATUS[0];

const CATEGORIAS: { value: CustoCategoria; label: string; color: string }[] = [
  { value: 'trafego', label: 'Tráfego pago', color: '#8b5cf6' },
  { value: 'ferramenta', label: 'Ferramentas', color: '#41e8ff' },
  { value: 'equipe', label: 'Equipe', color: '#a3ff6b' },
  { value: 'terceiros', label: 'Terceiros', color: '#ffd166' },
  { value: 'imposto', label: 'Impostos', color: '#ff5d73' },
  { value: 'outro', label: 'Outros', color: '#8fa3c8' },
];
const catMeta = (c: CustoCategoria) => CATEGORIAS.find((x) => x.value === c) ?? CATEGORIAS[5];

const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDate = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—');
const monthKey = (iso?: string) => (iso || todayISO()).slice(0, 7);
const monthLabel = (mk: string) => {
  const [y, m] = mk.split('-');
  const nomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${nomes[Number(m) - 1]}/${y.slice(2)}`;
};
const lastMonths = (n: number): string[] => {
  const out: string[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 0; i < n; i++) {
    out.unshift(d.toISOString().slice(0, 7));
    d.setMonth(d.getMonth() - 1);
  }
  return out;
};

const INPUT = 'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-neon-cyan/60';
type View = 'resumo' | 'parcelas' | 'custos';

/** Financeiro de projetos: receita (parcelas), custos, fluxo de caixa, margem e DRE simplificada. */
export function FinanceiroPanel({ readOnly = false }: { readOnly?: boolean }) {
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [custos, setCustos] = useState<Custo[]>([]);
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [view, setView] = useState<View>('resumo');
  const [pModal, setPModal] = useState<Partial<Parcela> | null>(null);
  const [cModal, setCModal] = useState<Partial<Custo> | null>(null);
  const [mes, setMes] = useState<string>(monthKey());

  useEffect(() => financeiroStore.subscribe(setParcelas), []);
  useEffect(() => custosStore.subscribe(setCustos), []);
  useEffect(() => propostasStore.subscribe(setPropostas), []);

  // marca parcelas vencidas e não pagas como "atrasado" (visual)
  const rows = useMemo(() => {
    const t = todayISO();
    return parcelas.map((p) => (p.status === 'a_receber' && p.dueDate < t ? { ...p, status: 'atrasado' as ParcelaStatus } : p));
  }, [parcelas]);

  /* ---------------- indicadores do mês selecionado ---------------- */
  const recebidoMes = rows
    .filter((p) => p.status === 'recebido' && monthKey(p.paidAt ?? p.dueDate) === mes)
    .reduce((s, p) => s + p.value, 0);
  const custosMes = custos.filter((c) => monthKey(c.date) === mes).reduce((s, c) => s + c.value, 0);
  const resultadoMes = recebidoMes - custosMes;
  const margemMes = recebidoMes > 0 ? Math.round((resultadoMes / recebidoMes) * 100) : 0;

  // DRE: custos do mês agrupados por categoria
  const custosPorCategoria = CATEGORIAS.map((cat) => ({
    ...cat,
    total: custos.filter((c) => c.category === cat.value && monthKey(c.date) === mes).reduce((s, c) => s + c.value, 0),
  })).filter((x) => x.total > 0);

  // Fluxo de caixa dos últimos 6 meses
  const fluxo = lastMonths(6).map((mk) => {
    const entradas = rows.filter((p) => p.status === 'recebido' && monthKey(p.paidAt ?? p.dueDate) === mk).reduce((s, p) => s + p.value, 0);
    const saidas = custos.filter((c) => monthKey(c.date) === mk).reduce((s, c) => s + c.value, 0);
    return { mk, entradas, saidas, saldo: entradas - saidas };
  });

  // Margem por projeto/cliente (receita recebida x custos, acumulado)
  const porProjeto = useMemo(() => {
    const map = new Map<string, { receita: number; custo: number }>();
    const norm = (s?: string) => (s || '—').trim() || '—';
    rows.filter((p) => p.status === 'recebido').forEach((p) => {
      const k = norm(p.client);
      const cur = map.get(k) ?? { receita: 0, custo: 0 };
      cur.receita += p.value;
      map.set(k, cur);
    });
    custos.forEach((c) => {
      const k = norm(c.project);
      const cur = map.get(k) ?? { receita: 0, custo: 0 };
      cur.custo += c.value;
      map.set(k, cur);
    });
    return Array.from(map.entries())
      .map(([nome, v]) => ({ nome, ...v, margem: v.receita - v.custo, pct: v.receita > 0 ? Math.round(((v.receita - v.custo) / v.receita) * 100) : null }))
      .sort((a, b) => b.receita - a.receita);
  }, [rows, custos]);

  const aReceber = rows.filter((p) => p.status !== 'recebido').reduce((s, p) => s + p.value, 0);
  // previsão de entrada vinda das propostas
  const aFechar = propostas.filter((p) => p.status === 'enviada').reduce((s, p) => s + p.value, 0); // aguardando resposta
  const aceitasAFaturar = propostas.filter((p) => p.status === 'aceita').reduce((s, p) => s + p.value, 0); // fechadas, ainda sem parcela

  /* ---------------- salvar/excluir ---------------- */
  const mudarStatus = (p: Parcela, status: ParcelaStatus) =>
    financeiroStore.update(p.id, { status, paidAt: status === 'recebido' ? todayISO() : '' });
  const salvarParcela = async () => {
    if (!pModal?.description || !pModal.client) return;
    const data = { description: pModal.description, client: pModal.client, value: Number(pModal.value) || 0, dueDate: pModal.dueDate ?? todayISO(), status: (pModal.status ?? 'a_receber') as ParcelaStatus, paidAt: pModal.status === 'recebido' ? todayISO() : '' };
    if (pModal.id) await financeiroStore.update(pModal.id, data); else await financeiroStore.create(data);
    setPModal(null);
  };
  const salvarCusto = async () => {
    if (!cModal?.description) return;
    const data = { description: cModal.description, project: cModal.project ?? '', category: (cModal.category ?? 'outro') as CustoCategoria, value: Number(cModal.value) || 0, date: cModal.date ?? todayISO(), recurring: !!cModal.recurring };
    if (cModal.id) await custosStore.update(cModal.id, data); else await custosStore.create(data);
    setCModal(null);
  };

  const TAB = (v: View, label: string) => (
    <button onClick={() => setView(v)} className={`rounded-full px-4 py-2 font-mono text-[10px] tracking-[0.2em] uppercase transition-colors ${view === v ? 'bg-white/12 text-white' : 'text-white/45 hover:text-white/80'}`}>{label}</button>
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* Faixa de indicadores: resultado do mês + previsão de entrada */}
      <div className="grid shrink-0 grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: `Receita ${monthLabel(mes)}`, value: moeda(recebidoMes), color: '#22c55e', sub: undefined as string | undefined },
          { label: `Custos ${monthLabel(mes)}`, value: moeda(custosMes), color: '#ff5d73', sub: undefined },
          { label: 'Resultado', value: moeda(resultadoMes), color: resultadoMes >= 0 ? '#41e8ff' : '#ff5d73', sub: `margem ${margemMes}%` },
          { label: 'A receber', value: moeda(aReceber), color: '#41e8ff', sub: 'contratado' },
          { label: 'Aceitas', value: moeda(aceitasAFaturar), color: '#22c55e', sub: 'a faturar' },
          { label: 'A fechar', value: moeda(aFechar), color: '#a3ff6b', sub: 'propostas' },
        ].map((k) => (
          <div key={k.label} className="glass-panel rounded-xl p-3">
            <div className="font-display text-lg font-bold lg:text-xl" style={{ color: k.color }}>{k.value}</div>
            <div className="mt-0.5 truncate font-mono text-[9px] tracking-[0.2em] text-white/45 uppercase">{k.label}</div>
            {k.sub && <div className="truncate font-mono text-[9px] text-white/35">{k.sub}</div>}
          </div>
        ))}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">{TAB('resumo', 'DRE & Fluxo')}{TAB('parcelas', 'Receitas')}{TAB('custos', 'Custos')}</div>
        <label className="flex items-center gap-2 font-mono text-[10px] tracking-[0.18em] text-white/45 uppercase">
          Mês
          <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white outline-none" />
        </label>
      </div>

      {/* área da visão ativa — preenche a tela; nada rola, listas paginam */}
      <div className="min-h-0 flex-1 overflow-hidden">

      {/* ============================== RESUMO: DRE + Fluxo + Projetos */}
      {view === 'resumo' && (
        <div className="grid h-full min-h-0 gap-3 lg:grid-cols-3">
            {/* DRE simplificada — só em telas grandes */}
            <div className="glass-panel hidden min-h-0 flex-col overflow-hidden rounded-2xl p-4 lg:flex">
              <h3 className="mb-3 shrink-0 font-mono text-[11px] tracking-[0.25em] text-neon-cyan uppercase">DRE · {monthLabel(mes)}</h3>
              <DreRow label="Receita bruta" value={recebidoMes} bold />
              {custosPorCategoria.length === 0 ? (
                <div className="py-1 font-mono text-[11px] text-white/35">Sem custos lançados neste mês.</div>
              ) : (
                custosPorCategoria.map((c) => <DreRow key={c.value} label={`(−) ${c.label}`} value={-c.total} color={c.color} />)
              )}
              <div className="my-2 border-t border-white/10" />
              <DreRow label="(=) Resultado líquido" value={resultadoMes} bold color={resultadoMes >= 0 ? '#22c55e' : '#ff5d73'} />
              <div className="mt-1 text-right font-mono text-[10px] text-white/40">margem {margemMes}%</div>
            </div>

            {/* Fluxo de caixa — só em telas grandes */}
            <div className="glass-panel hidden min-h-0 flex-col overflow-hidden rounded-2xl p-4 lg:flex">
              <h3 className="mb-3 shrink-0 font-mono text-[11px] tracking-[0.25em] text-neon-cyan uppercase">Fluxo · 6 meses</h3>
              <div className="flex flex-col gap-1.5">
                {fluxo.map((f) => {
                  const max = Math.max(1, ...fluxo.map((x) => Math.max(x.entradas, x.saidas)));
                  return (
                    <div key={f.mk} className="grid grid-cols-[44px_1fr_auto] items-center gap-2">
                      <span className="font-mono text-[10px] text-white/45">{monthLabel(f.mk)}</span>
                      <div className="flex flex-col gap-0.5">
                        <div className="h-2 rounded-full bg-neon-acid/70" style={{ width: `${(f.entradas / max) * 100}%` }} title={`Entradas ${moeda(f.entradas)}`} />
                        <div className="h-2 rounded-full bg-neon-magenta/70" style={{ width: `${(f.saidas / max) * 100}%` }} title={`Saídas ${moeda(f.saidas)}`} />
                      </div>
                      <span className="text-right font-mono text-[10px]" style={{ color: f.saldo >= 0 ? '#22c55e' : '#ff5d73' }}>{moeda(f.saldo)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex gap-4 font-mono text-[9px] tracking-[0.18em] text-white/40 uppercase">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-neon-acid/70" /> entradas</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-neon-magenta/70" /> saídas</span>
              </div>
            </div>

          {/* Margem por projeto */}
          <div className="glass-panel flex min-h-0 flex-col overflow-hidden rounded-2xl p-4 lg:col-span-1">
            <div className="flex shrink-0 items-center justify-between pb-2">
              <h3 className="font-mono text-[11px] tracking-[0.25em] text-neon-cyan uppercase">Margem por projeto / cliente</h3>
              <span className="font-mono text-[10px] text-white/35">a receber: {moeda(aReceber)}</span>
            </div>
            <div className="min-h-0 flex-1">
              <AutoPaged
                items={porProjeto}
                rowPx={38}
                empty={<div className="flex h-full items-center justify-center p-6 text-center font-mono text-xs text-white/35">Lance receitas e custos vinculados a um cliente/projeto para ver a margem.</div>}
                render={(p) => (
                  <div key={p.nome} className="flex items-center gap-3 border-b border-white/5 py-2 text-sm">
                    <span className="min-w-0 flex-1 truncate font-medium text-white">{p.nome}</span>
                    <span className="w-24 text-right text-neon-acid">{moeda(p.receita)}</span>
                    <span className="w-24 text-right text-neon-magenta/90">{moeda(p.custo)}</span>
                    <span className="w-24 text-right font-semibold" style={{ color: p.margem >= 0 ? '#22c55e' : '#ff5d73' }}>{moeda(p.margem)}</span>
                    <span className="w-12 text-right font-mono text-xs text-white/55">{p.pct == null ? '—' : `${p.pct}%`}</span>
                  </div>
                )}
              />
            </div>
          </div>
        </div>
      )}

      {/* ============================== RECEITAS (parcelas) */}
      {view === 'parcelas' && (
        <div className="flex h-full min-h-0 flex-col gap-3">
          <div className="flex shrink-0 items-center justify-between">
            <span className="font-mono text-[10px] tracking-[0.2em] text-white/35 uppercase">{rows.length} parcela(s)</span>
            <div className="flex gap-2">
              <button onClick={() => exportCSV('receitas.csv', rows.map((p) => ({ ...p, status: statusMeta(p.status).label, dueDate: fmtDate(p.dueDate) })), [{ key: 'description', label: 'Descrição' }, { key: 'client', label: 'Cliente' }, { key: 'value', label: 'Valor' }, { key: 'dueDate', label: 'Vencimento' }, { key: 'status', label: 'Status' }])} className="rounded-full border border-white/15 px-4 py-2 font-mono text-[10px] tracking-[0.2em] text-white/60 uppercase hover:text-neon-cyan">↓ CSV</button>
              {!readOnly && <button onClick={() => setPModal({ status: 'a_receber', dueDate: todayISO() })} className="pill-button !px-4 !py-2 text-[11px]">+ Nova receita</button>}
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <AutoPaged
              items={rows}
              rowPx={58}
              empty={<div className="glass-panel flex h-full items-center justify-center rounded-2xl p-10 text-center font-mono text-xs text-white/40">Nenhuma parcela. Vincule condições de pagamento aos clientes/projetos.</div>}
              render={(p) => {
                const m = statusMeta(p.status);
                return (
                  <div key={p.id} className="glass-panel flex items-center gap-3 rounded-xl px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-white">{p.description}</div>
                      <div className="truncate font-mono text-[10px] text-white/45">{p.client || '—'} · vence {fmtDate(p.dueDate)}</div>
                    </div>
                    <span className="shrink-0 font-semibold text-white">{moeda(p.value)}</span>
                    <select value={p.status} disabled={readOnly} onChange={(e) => mudarStatus(p, e.target.value as ParcelaStatus)} className="shrink-0 rounded-full border bg-white/5 px-2.5 py-1 font-mono text-[10px] tracking-[0.12em] uppercase outline-none" style={{ color: m.color, borderColor: `${m.color}55` }}>{STATUS.map((s) => <option key={s.value} value={s.value} className="bg-void text-white">{s.label}</option>)}</select>
                    {!readOnly && <div className="flex shrink-0 gap-2"><button onClick={() => setPModal(p)} className="font-mono text-xs text-white/40 hover:text-neon-cyan">editar</button><button onClick={() => confirm('Excluir parcela?') && financeiroStore.remove(p.id)} className="font-mono text-white/40 hover:text-neon-magenta">✕</button></div>}
                  </div>
                );
              }}
            />
          </div>
        </div>
      )}

      {/* ============================== CUSTOS */}
      {view === 'custos' && (
        <div className="flex h-full min-h-0 flex-col gap-3">
          <div className="flex shrink-0 items-center justify-between">
            <span className="font-mono text-[10px] tracking-[0.2em] text-white/35 uppercase">{custos.length} custo(s)</span>
            <div className="flex gap-2">
              <button onClick={() => exportCSV('custos.csv', custos.map((c) => ({ ...c, category: catMeta(c.category).label, date: fmtDate(c.date) })), [{ key: 'description', label: 'Descrição' }, { key: 'project', label: 'Projeto' }, { key: 'category', label: 'Categoria' }, { key: 'value', label: 'Valor' }, { key: 'date', label: 'Data' }])} className="rounded-full border border-white/15 px-4 py-2 font-mono text-[10px] tracking-[0.2em] text-white/60 uppercase hover:text-neon-cyan">↓ CSV</button>
              {!readOnly && <button onClick={() => setCModal({ category: 'trafego', date: todayISO() })} className="pill-button !px-4 !py-2 text-[11px] !border-neon-magenta/50">+ Novo custo</button>}
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <AutoPaged
              items={custos}
              rowPx={58}
              empty={<div className="glass-panel flex h-full items-center justify-center rounded-2xl p-10 text-center font-mono text-xs text-white/40">Nenhum custo lançado. Inclua tráfego pago, ferramentas, equipe e terceiros para calcular a margem e o DRE.</div>}
              render={(c) => {
                const m = catMeta(c.category);
                return (
                  <div key={c.id} className="glass-panel flex items-center gap-3 rounded-xl px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-white">{c.description}{c.recurring && <span className="ml-2 font-mono text-[9px] text-white/35">↻ mensal</span>}</div>
                      <div className="truncate font-mono text-[10px] text-white/45">{c.project || '—'} · {fmtDate(c.date)}</div>
                    </div>
                    <span className="shrink-0 rounded-full px-2.5 py-1 font-mono text-[9px] tracking-[0.14em] uppercase" style={{ color: m.color, background: `${m.color}1f`, border: `1px solid ${m.color}55` }}>{m.label}</span>
                    <span className="shrink-0 font-semibold text-neon-magenta/90">{moeda(c.value)}</span>
                    {!readOnly && <div className="flex shrink-0 gap-2"><button onClick={() => setCModal(c)} className="font-mono text-xs text-white/40 hover:text-neon-cyan">editar</button><button onClick={() => confirm('Excluir custo?') && custosStore.remove(c.id)} className="font-mono text-white/40 hover:text-neon-magenta">✕</button></div>}
                  </div>
                );
              }}
            />
          </div>
        </div>
      )}

      </div>{/* fim da área da visão */}

      {/* modal parcela */}
      {pModal && (
        <Modal title={pModal.id ? 'Editar receita' : 'Nova receita'} onClose={() => setPModal(null)} onSave={salvarParcela}>
          <input className={INPUT} placeholder="Descrição (Entrada, Parcela 2/3…)" value={pModal.description ?? ''} onChange={(e) => setPModal({ ...pModal, description: e.target.value })} />
          <input className={INPUT} list="crm-contacts" placeholder="Cliente / projeto" value={pModal.client ?? ''} onChange={(e) => setPModal({ ...pModal, client: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <input type="number" className={INPUT} placeholder="Valor (R$)" value={pModal.value ?? ''} onChange={(e) => setPModal({ ...pModal, value: Number(e.target.value) })} />
            <input type="date" className={INPUT} value={pModal.dueDate ?? ''} onChange={(e) => setPModal({ ...pModal, dueDate: e.target.value })} />
          </div>
          <select className={INPUT} value={pModal.status} onChange={(e) => setPModal({ ...pModal, status: e.target.value as ParcelaStatus })}>{STATUS.map((s) => <option key={s.value} value={s.value} className="bg-void">{s.label}</option>)}</select>
        </Modal>
      )}

      {/* modal custo */}
      {cModal && (
        <Modal title={cModal.id ? 'Editar custo' : 'Novo custo'} onClose={() => setCModal(null)} onSave={salvarCusto}>
          <input className={INPUT} placeholder="Descrição (Meta Ads, Canva, Editor…)" value={cModal.description ?? ''} onChange={(e) => setCModal({ ...cModal, description: e.target.value })} />
          <input className={INPUT} list="crm-contacts" placeholder="Projeto / cliente" value={cModal.project ?? ''} onChange={(e) => setCModal({ ...cModal, project: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <select className={INPUT} value={cModal.category} onChange={(e) => setCModal({ ...cModal, category: e.target.value as CustoCategoria })}>{CATEGORIAS.map((s) => <option key={s.value} value={s.value} className="bg-void">{s.label}</option>)}</select>
            <input type="number" className={INPUT} placeholder="Valor (R$)" value={cModal.value ?? ''} onChange={(e) => setCModal({ ...cModal, value: Number(e.target.value) })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="date" className={INPUT} value={cModal.date ?? ''} onChange={(e) => setCModal({ ...cModal, date: e.target.value })} />
            <label className="flex items-center gap-2 px-1 text-sm text-white/70"><input type="checkbox" checked={!!cModal.recurring} onChange={(e) => setCModal({ ...cModal, recurring: e.target.checked })} className="h-4 w-4 accent-neon-cyan" /> Recorrente (mensal)</label>
          </div>
        </Modal>
      )}
    </div>
  );
}


function DreRow({ label, value, bold, color }: { label: string; value: number; bold?: boolean; color?: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className={`text-sm ${bold ? 'font-semibold text-white' : 'text-white/65'}`}>{label}</span>
      <span className={`font-mono text-sm ${bold ? 'font-bold' : ''}`} style={{ color: color ?? (value < 0 ? '#ff8a9b' : '#e7ecf5') }}>{moeda(value)}</span>
    </div>
  );
}

function Modal({ title, children, onClose, onSave }: { title: string; children: React.ReactNode; onClose: () => void; onSave: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="glass-panel w-full max-w-md rounded-2xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-xl tracking-wide text-white">{title}</h3>
          <button onClick={onClose} className="font-mono text-white/40 hover:text-white">✕</button>
        </div>
        <div className="flex flex-col gap-3">{children}</div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-white/15 px-4 py-2 font-mono text-[11px] tracking-[0.2em] text-white/60 uppercase hover:text-white">Cancelar</button>
          <button onClick={onSave} className="pill-button !px-4 !py-2 text-[11px]">Salvar</button>
        </div>
      </div>
    </div>
  );
}
