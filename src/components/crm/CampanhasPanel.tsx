import { useEffect, useMemo, useState } from 'react';
import { campanhasStore, clientesStore, moeda, exportCSV, type Campanha, type CampanhaCanal, type Cliente } from '../../lib/crm';
import { AutoPaged } from '../AutoPaged';

const CANAIS: { value: CampanhaCanal; label: string; color: string }[] = [
  { value: 'google', label: 'Google Ads', color: '#41e8ff' },
  { value: 'meta', label: 'Meta Ads', color: '#8b5cf6' },
  { value: 'tiktok', label: 'TikTok Ads', color: '#ff5d73' },
  { value: 'email', label: 'E-mail', color: '#a3ff6b' },
  { value: 'organico', label: 'Orgânico', color: '#ffd166' },
  { value: 'outro', label: 'Outro', color: '#8fa3c8' },
];
const canalMeta = (c: CampanhaCanal) => CANAIS.find((x) => x.value === c) ?? CANAIS[5];
const STATUS = [
  { value: 'ativa', label: 'Ativa', color: '#22c55e' },
  { value: 'pausada', label: 'Pausada', color: '#ffd166' },
  { value: 'encerrada', label: 'Encerrada', color: '#8fa3c8' },
] as const;

const todayISO = () => new Date().toISOString().slice(0, 10);
const INPUT = 'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-neon-cyan/60';
const n = (v: any) => (v == null || v === '' ? 0 : Number(v));
const money = (v: number) => moeda(v);
const num = (v: number) => (v || 0).toLocaleString('pt-BR');
const ratio = (a: number, b: number) => (b > 0 ? a / b : 0);

/** Métricas de captação derivadas de uma campanha (ou de um agregado). */
function metrics(c: Pick<Campanha, 'spend' | 'impressions' | 'clicks' | 'leads' | 'sales' | 'revenue'>) {
  const spend = n(c.spend), imp = n(c.impressions), clk = n(c.clicks), leads = n(c.leads), sales = n(c.sales), rev = n(c.revenue);
  return {
    spend, imp, clk, leads, sales, rev,
    ctr: ratio(clk, imp) * 100, // %
    cpc: ratio(spend, clk),
    cpl: ratio(spend, leads),
    cpa: ratio(spend, sales),
    roas: ratio(rev, spend),
    conv: ratio(sales, leads) * 100, // % lead→venda
  };
}
const sum = (arr: Campanha[]) => arr.reduce((a, c) => ({
  spend: a.spend + n(c.spend), impressions: a.impressions + n(c.impressions), clicks: a.clicks + n(c.clicks),
  leads: a.leads + n(c.leads), sales: a.sales + n(c.sales), revenue: a.revenue + n(c.revenue),
}), { spend: 0, impressions: 0, clicks: 0, leads: 0, sales: 0, revenue: 0 });

/** Campanhas & Captação: investimento e performance por canal (Google Ads, Meta Ads, etc.). */
export function CampanhasPanel({ readOnly = false }: { readOnly?: boolean }) {
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [modal, setModal] = useState<Partial<Campanha> | null>(null);

  useEffect(() => campanhasStore.subscribe(setCampanhas), []);
  useEffect(() => clientesStore.subscribe(setClientes), []);

  const totais = useMemo(() => metrics(sum(campanhas)), [campanhas]);
  const porCanal = useMemo(() =>
    CANAIS.map((canal) => {
      const arr = campanhas.filter((c) => c.channel === canal.value);
      return { canal, qtd: arr.length, m: metrics(sum(arr)) };
    }).filter((x) => x.qtd > 0),
  [campanhas]);

  const salvar = async () => {
    if (!modal?.name) return;
    const data: Omit<Campanha, 'id' | 'createdAt'> = {
      name: modal.name, channel: (modal.channel ?? 'google') as CampanhaCanal, status: (modal.status ?? 'ativa') as Campanha['status'],
      budget: n(modal.budget), client: modal.client ?? '', startDate: modal.startDate ?? '', endDate: modal.endDate ?? '',
      spend: n(modal.spend), impressions: n(modal.impressions), clicks: n(modal.clicks), leads: n(modal.leads), sales: n(modal.sales), revenue: n(modal.revenue), notes: modal.notes ?? '',
    };
    if (modal.id) await campanhasStore.update(modal.id, data); else await campanhasStore.create(data);
    setModal(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {/* KPIs de captação */}
      <div className="grid shrink-0 grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Investimento', value: money(totais.spend), color: '#ff5d73' },
          { label: 'Leads', value: num(totais.leads), color: '#41e8ff' },
          { label: 'Vendas', value: num(totais.sales), color: '#22c55e' },
          { label: 'CPL médio', value: money(totais.cpl), color: '#8b5cf6' },
          { label: 'CPA médio', value: money(totais.cpa), color: '#ffd166' },
          { label: 'ROAS', value: `${totais.roas.toFixed(2)}x`, color: '#a3ff6b' },
        ].map((k) => (
          <div key={k.label} className="glass-panel rounded-2xl p-4">
            <div className="font-display text-xl font-bold" style={{ color: k.color }}>{k.value}</div>
            <div className="mt-1 font-mono text-[9px] tracking-[0.2em] text-white/45 uppercase">{k.label}</div>
          </div>
        ))}
      </div>

      {/* desempenho por canal */}
      {porCanal.length > 0 && (
        <div className="glass-panel shrink-0 overflow-x-auto rounded-2xl">
          <h3 className="px-5 pt-4 font-mono text-[11px] tracking-[0.25em] text-neon-cyan uppercase">Captação por canal</h3>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left font-mono text-[10px] tracking-[0.14em] text-white/35 uppercase">
                <th className="px-5 py-2.5">Canal</th>
                <th className="px-3 py-2.5 text-right">Invest.</th>
                <th className="px-3 py-2.5 text-right">Leads</th>
                <th className="px-3 py-2.5 text-right">Vendas</th>
                <th className="px-3 py-2.5 text-right">CPL</th>
                <th className="px-3 py-2.5 text-right">CPA</th>
                <th className="px-3 py-2.5 text-right">CTR</th>
                <th className="px-5 py-2.5 text-right">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {porCanal.map(({ canal, m }) => (
                <tr key={canal.value} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                  <td className="px-5 py-2.5"><span className="rounded-full px-2.5 py-1 font-mono text-[9px] tracking-[0.14em] uppercase" style={{ color: canal.color, background: `${canal.color}1f`, border: `1px solid ${canal.color}55` }}>{canal.label}</span></td>
                  <td className="px-3 py-2.5 text-right text-neon-magenta/90">{money(m.spend)}</td>
                  <td className="px-3 py-2.5 text-right text-white">{num(m.leads)}</td>
                  <td className="px-3 py-2.5 text-right text-white">{num(m.sales)}</td>
                  <td className="px-3 py-2.5 text-right text-white/70">{money(m.cpl)}</td>
                  <td className="px-3 py-2.5 text-right text-white/70">{money(m.cpa)}</td>
                  <td className="px-3 py-2.5 text-right text-white/70">{m.ctr.toFixed(1)}%</td>
                  <td className="px-5 py-2.5 text-right font-semibold" style={{ color: m.roas >= 1 ? '#22c55e' : '#ff5d73' }}>{m.roas.toFixed(2)}x</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* lista de campanhas */}
      <div className="flex shrink-0 items-center justify-between">
        <span className="font-mono text-[10px] tracking-[0.2em] text-white/35 uppercase">{campanhas.length} campanha(s)</span>
        <div className="flex gap-2">
          <button onClick={() => exportCSV('campanhas.csv', campanhas.map((c) => { const m = metrics(c); return { ...c, channel: canalMeta(c.channel).label, cpl: m.cpl.toFixed(2), cpa: m.cpa.toFixed(2), roas: m.roas.toFixed(2) }; }), [{ key: 'name', label: 'Campanha' }, { key: 'channel', label: 'Canal' }, { key: 'client', label: 'Cliente' }, { key: 'spend', label: 'Investimento' }, { key: 'leads', label: 'Leads' }, { key: 'sales', label: 'Vendas' }, { key: 'revenue', label: 'Receita' }, { key: 'cpl', label: 'CPL' }, { key: 'roas', label: 'ROAS' }])} className="rounded-full border border-white/15 px-4 py-2 font-mono text-[10px] tracking-[0.2em] text-white/60 uppercase hover:text-neon-cyan">↓ CSV</button>
          {!readOnly && <button onClick={() => setModal({ channel: 'google', status: 'ativa', startDate: todayISO() })} className="pill-button !px-4 !py-2 text-[11px] !border-neon-acid/50">+ Nova campanha</button>}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <AutoPaged
          items={campanhas}
          rowPx={158}
          colMinPx={320}
          empty={<div className="glass-panel flex h-full items-center justify-center rounded-2xl p-10 text-center font-mono text-xs text-white/40">Nenhuma campanha. Cadastre o investimento e os resultados (Google Ads, Meta Ads…) para acompanhar a captação.</div>}
          render={(c) => {
          const m = metrics(c);
          const canal = canalMeta(c.channel);
          const st = STATUS.find((s) => s.value === c.status) ?? STATUS[0];
          return (
            <div key={c.id} className="glass-panel rounded-2xl p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-medium text-white">{c.name}</div>
                  <div className="mt-0.5 font-mono text-[10px] text-white/40">{[c.client, st.label].filter(Boolean).join(' · ')}</div>
                </div>
                <span className="shrink-0 rounded-full px-2.5 py-1 font-mono text-[9px] tracking-[0.14em] uppercase" style={{ color: canal.color, background: `${canal.color}1f`, border: `1px solid ${canal.color}55` }}>{canal.label}</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Metric label="Invest." value={money(m.spend)} />
                <Metric label="Leads" value={num(m.leads)} />
                <Metric label="Vendas" value={num(m.sales)} />
                <Metric label="CPL" value={money(m.cpl)} />
                <Metric label="CPA" value={money(m.cpa)} />
                <Metric label="ROAS" value={`${m.roas.toFixed(2)}x`} color={m.roas >= 1 ? '#22c55e' : '#ff5d73'} />
              </div>
              {!readOnly && (
                <div className="mt-3 flex justify-end gap-2">
                  <button onClick={() => setModal(c)} className="font-mono text-[10px] tracking-[0.2em] text-white/45 uppercase hover:text-neon-cyan">Editar</button>
                  <button onClick={() => confirm('Excluir campanha?') && campanhasStore.remove(c.id)} className="font-mono text-[10px] tracking-[0.2em] text-neon-magenta/80 uppercase hover:text-neon-magenta">Excluir</button>
                </div>
              )}
            </div>
          );
          }}
        />
      </div>

      {modal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6">
            <datalist id="camp-clientes">{clientes.map((c) => <option key={c.id} value={c.name} />)}</datalist>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-xl tracking-wide text-white">{modal.id ? 'Editar campanha' : 'Nova campanha'}</h3>
              <button onClick={() => setModal(null)} className="font-mono text-white/40 hover:text-white">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input className={`${INPUT} col-span-2`} placeholder="Nome da campanha" value={modal.name ?? ''} onChange={(e) => setModal({ ...modal, name: e.target.value })} />
              <input className={INPUT} list="camp-clientes" placeholder="Cliente / projeto" value={modal.client ?? ''} onChange={(e) => setModal({ ...modal, client: e.target.value })} />
              <select className={INPUT} value={modal.channel} onChange={(e) => setModal({ ...modal, channel: e.target.value as CampanhaCanal })}>{CANAIS.map((s) => <option key={s.value} value={s.value} className="bg-void">{s.label}</option>)}</select>
              <select className={INPUT} value={modal.status} onChange={(e) => setModal({ ...modal, status: e.target.value as Campanha['status'] })}>{STATUS.map((s) => <option key={s.value} value={s.value} className="bg-void">{s.label}</option>)}</select>
              <input type="number" className={INPUT} placeholder="Orçamento (R$)" value={modal.budget ?? ''} onChange={(e) => setModal({ ...modal, budget: Number(e.target.value) })} />
              <div className="col-span-2 mt-1 font-mono text-[10px] tracking-[0.2em] text-white/40 uppercase">Captação / performance</div>
              <input type="number" className={INPUT} placeholder="Investimento (R$)" value={modal.spend ?? ''} onChange={(e) => setModal({ ...modal, spend: Number(e.target.value) })} />
              <input type="number" className={INPUT} placeholder="Impressões" value={modal.impressions ?? ''} onChange={(e) => setModal({ ...modal, impressions: Number(e.target.value) })} />
              <input type="number" className={INPUT} placeholder="Cliques" value={modal.clicks ?? ''} onChange={(e) => setModal({ ...modal, clicks: Number(e.target.value) })} />
              <input type="number" className={INPUT} placeholder="Leads" value={modal.leads ?? ''} onChange={(e) => setModal({ ...modal, leads: Number(e.target.value) })} />
              <input type="number" className={INPUT} placeholder="Vendas" value={modal.sales ?? ''} onChange={(e) => setModal({ ...modal, sales: Number(e.target.value) })} />
              <input type="number" className={INPUT} placeholder="Receita gerada (R$)" value={modal.revenue ?? ''} onChange={(e) => setModal({ ...modal, revenue: Number(e.target.value) })} />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="rounded-full border border-white/15 px-4 py-2 font-mono text-[11px] tracking-[0.2em] text-white/60 uppercase hover:text-white">Cancelar</button>
              <button onClick={salvar} className="pill-button !px-4 !py-2 text-[11px]">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] p-2">
      <div className="font-display text-sm font-bold" style={{ color: color ?? '#e7ecf5' }}>{value}</div>
      <div className="font-mono text-[8px] tracking-[0.18em] text-white/40 uppercase">{label}</div>
    </div>
  );
}
