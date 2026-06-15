import { useEffect, useMemo, useState } from 'react';
import { financeiroStore, moeda, exportCSV, type Parcela, type ParcelaStatus } from '../../lib/crm';

const STATUS: { value: ParcelaStatus; label: string; color: string }[] = [
  { value: 'a_receber', label: 'A receber', color: '#41e8ff' },
  { value: 'recebido', label: 'Recebido', color: '#22c55e' },
  { value: 'atrasado', label: 'Atrasado', color: '#ff5d73' },
];
const statusMeta = (s: ParcelaStatus) => STATUS.find((x) => x.value === s) ?? STATUS[0];

const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDate = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—');
const INPUT = 'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-neon-cyan/60';

/** Financeiro — parcelas a receber, com indicadores e tabela. */
export function FinanceiroPanel({ readOnly = false }: { readOnly?: boolean }) {
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [modal, setModal] = useState<Partial<Parcela> | null>(null);
  useEffect(() => financeiroStore.subscribe(setParcelas), []);

  // marca parcelas vencidas e não pagas como "atrasado" (visual)
  const rows = useMemo(() => {
    const t = todayISO();
    return parcelas.map((p) => (p.status === 'a_receber' && p.dueDate < t ? { ...p, status: 'atrasado' as ParcelaStatus } : p));
  }, [parcelas]);

  const aReceber = rows.filter((p) => p.status !== 'recebido').reduce((s, p) => s + p.value, 0);
  const atrasado = rows.filter((p) => p.status === 'atrasado').reduce((s, p) => s + p.value, 0);
  const recebidoMes = rows
    .filter((p) => p.status === 'recebido' && (p.paidAt ?? p.dueDate).slice(0, 7) === todayISO().slice(0, 7))
    .reduce((s, p) => s + p.value, 0);

  const mudarStatus = (p: Parcela, status: ParcelaStatus) =>
    financeiroStore.update(p.id, { status, paidAt: status === 'recebido' ? todayISO() : '' });

  const salvar = async () => {
    if (!modal?.description || !modal.client) return;
    const data = { description: modal.description, client: modal.client, value: Number(modal.value) || 0, dueDate: modal.dueDate ?? todayISO(), status: (modal.status ?? 'a_receber') as ParcelaStatus, paidAt: '' };
    if (modal.id) await financeiroStore.update(modal.id, data);
    else await financeiroStore.create(data);
    setModal(null);
  };
  const excluir = (p: Parcela) => { if (confirm('Excluir parcela?')) financeiroStore.remove(p.id); };

  const kpis = [
    { label: 'A receber (em aberto)', value: moeda(aReceber), color: '#41e8ff' },
    { label: 'Atrasado', value: moeda(atrasado), color: '#ff5d73' },
    { label: 'Recebido no mês', value: moeda(recebidoMes), color: '#22c55e' },
  ];

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        {kpis.map((k) => (
          <div key={k.label} className="glass-panel rounded-2xl p-4">
            <div className="font-display text-2xl font-bold" style={{ color: k.color }}>{k.value}</div>
            <div className="mt-1 font-mono text-[9px] tracking-[0.25em] text-white/45 uppercase">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-[0.2em] text-white/35 uppercase">{rows.length} parcela(s)</span>
        <div className="flex gap-2">
          <button
            onClick={() => exportCSV('financeiro.csv', rows.map((p) => ({ ...p, status: statusMeta(p.status).label, dueDate: fmtDate(p.dueDate) })), [
              { key: 'description', label: 'Descrição' }, { key: 'client', label: 'Cliente' }, { key: 'value', label: 'Valor' }, { key: 'dueDate', label: 'Vencimento' }, { key: 'status', label: 'Status' },
            ])}
            className="rounded-full border border-white/15 px-4 py-2 font-mono text-[10px] tracking-[0.2em] text-white/60 uppercase transition-colors hover:text-neon-cyan"
          >↓ CSV</button>
          {!readOnly && <button onClick={() => setModal({ status: 'a_receber', dueDate: todayISO() })} className="pill-button !px-4 !py-2 text-[11px]">+ Nova parcela</button>}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="glass-panel rounded-2xl p-10 text-center font-mono text-xs text-white/40">Nenhuma parcela cadastrada. Vincule condições de pagamento aos seus clientes/propostas.</div>
      ) : (
        <div className="glass-panel overflow-hidden rounded-2xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left font-mono text-[10px] tracking-[0.15em] text-white/35 uppercase">
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Vencimento</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const m = statusMeta(p.status);
                return (
                  <tr key={p.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                    <td className="px-4 py-3 font-medium text-white">{p.description}</td>
                    <td className="px-4 py-3 text-white/60">{p.client}</td>
                    <td className="px-4 py-3 text-white/55">{fmtDate(p.dueDate)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-white">{moeda(p.value)}</td>
                    <td className="px-4 py-3">
                      <select
                        value={p.status}
                        disabled={readOnly}
                        onChange={(e) => mudarStatus(p, e.target.value as ParcelaStatus)}
                        className="rounded-full border bg-white/5 px-2.5 py-1 font-mono text-[10px] tracking-[0.12em] uppercase outline-none"
                        style={{ color: m.color, borderColor: `${m.color}55` }}
                      >
                        {STATUS.map((s) => <option key={s.value} value={s.value} className="bg-void text-white">{s.label}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!readOnly && (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setModal(p)} className="font-mono text-xs text-white/40 hover:text-neon-cyan">editar</button>
                          <button onClick={() => excluir(p)} className="font-mono text-white/40 hover:text-neon-magenta">✕</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="glass-panel w-full max-w-md rounded-2xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-xl tracking-wide text-white">{modal.id ? 'Editar parcela' : 'Nova parcela'}</h3>
              <button onClick={() => setModal(null)} className="font-mono text-white/40 hover:text-white">✕</button>
            </div>
            <div className="flex flex-col gap-3">
              <input className={INPUT} placeholder="Descrição (Entrada, Parcela 2/3…)" value={modal.description ?? ''} onChange={(e) => setModal({ ...modal, description: e.target.value })} />
              <input className={INPUT} placeholder="Cliente / proposta" value={modal.client ?? ''} onChange={(e) => setModal({ ...modal, client: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" className={INPUT} placeholder="Valor (R$)" value={modal.value ?? ''} onChange={(e) => setModal({ ...modal, value: Number(e.target.value) })} />
                <input type="date" className={INPUT} value={modal.dueDate ?? ''} onChange={(e) => setModal({ ...modal, dueDate: e.target.value })} />
              </div>
              <select className={INPUT} value={modal.status} onChange={(e) => setModal({ ...modal, status: e.target.value as ParcelaStatus })}>
                {STATUS.map((s) => <option key={s.value} value={s.value} className="bg-void">{s.label}</option>)}
              </select>
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
