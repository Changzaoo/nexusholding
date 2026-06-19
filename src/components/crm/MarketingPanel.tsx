import { useEffect, useState } from 'react';
import { clientesStore, type Cliente } from '../../lib/crm';
import { syncMidia, listEntregaveis, FOLDER_LABEL, type SyncResult, type Entregavel } from '../../lib/midiaSync';
import { AutoPaged } from '../AutoPaged';

const moeda = (v: number) =>
  (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export function MarketingPanel() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [modal, setModal] = useState<Cliente | null>(null);
  const [entregaveis, setEntregaveis] = useState<Record<string, Entregavel[]>>({});
  const [loadingEnt, setLoadingEnt] = useState(false);

  useEffect(() => clientesStore.subscribe(setClientes), []);

  const sincronizar = async () => {
    setSyncing(true);
    const r = await syncMidia();
    setResult(r);
    setSyncing(false);
  };
  // sincroniza uma vez ao abrir a aba
  useEffect(() => { sincronizar(); }, []);

  const naMidia = clientes
    .filter((c) => c.midiaId)
    .sort((a, b) => (b.midiaSyncedAt || 0) - (a.midiaSyncedAt || 0));
  const soCrm = clientes.filter((c) => !c.midiaId && c.name?.trim());

  const abrirEntregaveis = async (c: Cliente) => {
    if (!c.midiaId) return;
    setModal(c);
    if (!entregaveis[c.id]) {
      setLoadingEnt(true);
      try {
        const items = await listEntregaveis(c.midiaId);
        setEntregaveis((m) => ({ ...m, [c.id]: items }));
      } catch { setEntregaveis((m) => ({ ...m, [c.id]: [] })); }
      setLoadingEnt(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-xs text-white/45">Clientes e entregáveis do Nexus Digital 90, sincronizados nos dois sentidos via Nexus Bridge.</p>
        <button
          onClick={sincronizar}
          disabled={syncing}
          className="rounded-full border border-neon-cyan/40 px-4 py-2 font-mono text-[10px] tracking-[0.2em] text-neon-cyan uppercase transition-colors hover:bg-neon-cyan/10 disabled:opacity-50"
        >
          {syncing ? 'Sincronizando…' : '↻ Sincronizar agora'}
        </button>
      </div>

      {result?.error && (
        <div className="glass-panel shrink-0 rounded-2xl border border-neon-magenta/30 p-4 text-sm text-neon-magenta/90">
          Não foi possível sincronizar com a Mídia: {result.error}
        </div>
      )}
      {result && !result.error && (
        <div className="glass-panel shrink-0 rounded-2xl p-3 font-mono text-[11px] text-white/55">
          {result.pulledCriados} trazido(s), {result.pulledAtualizados} atualizado(s), {result.pushed} enviado(s), {result.leadsCriados} novo(s) lead(s) · {result.total} na fábrica.
        </div>
      )}

      <div className="shrink-0 font-mono text-[10px] tracking-[0.25em] text-white/40 uppercase">Na fábrica de mídia ({naMidia.length})</div>

      <div className="min-h-0 flex-1">
        <AutoPaged
          items={naMidia}
          rowPx={200}
          colMinPx={260}
          empty={<div className="glass-panel flex h-full items-center justify-center rounded-2xl p-8 text-center font-mono text-xs text-white/35">Nenhum cliente sincronizado ainda. Crie clientes no CRM ou na fábrica e clique em “Sincronizar agora”.</div>}
          render={(c) => {
            const etapas = c.midiaEtapas ?? 0;
            return (
              <div key={c.id} className="glass-panel rounded-2xl p-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate font-medium text-white">{c.name}</div>
                  {(c.midiaAguardando ?? 0) > 0 && <span className="shrink-0 rounded-full bg-neon-acid/15 px-2 py-0.5 font-mono text-[9px] text-neon-acid">{c.midiaAguardando} p/ aprovar</span>}
                </div>
                <div className="mt-1 font-mono text-[10px] text-white/40">{[c.segment, c.city].filter(Boolean).join(' · ') || '—'}</div>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <div className="font-display text-xl font-bold text-neon-cyan">{c.midiaReceita != null ? moeda(c.midiaReceita) : '—'}</div>
                    <div className="font-mono text-[9px] tracking-[0.2em] text-white/35 uppercase">receita proj./mês{c.midiaRoas != null ? ` · ${c.midiaRoas}x` : ''}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-lg font-bold text-white">{c.midiaMateriais ?? 0}</div>
                    <div className="font-mono text-[9px] tracking-[0.2em] text-white/35 uppercase">materiais</div>
                  </div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-neon-cyan" style={{ width: `${Math.round((etapas / 8) * 100)}%` }} />
                </div>
                <div className="mt-1 font-mono text-[9px] text-white/35">{etapas}/8 etapas concluídas</div>
                <button onClick={() => abrirEntregaveis(c)} className="mt-3 w-full rounded-lg border border-white/12 px-3 py-1.5 font-mono text-[9px] tracking-[0.2em] text-white/55 uppercase transition-colors hover:text-neon-cyan">ver entregáveis</button>
              </div>
            );
          }}
        />
      </div>

      {soCrm.length > 0 && (
        <div className="shrink-0">
          <div className="mb-1.5 font-mono text-[10px] tracking-[0.25em] text-white/40 uppercase">Só no CRM — irão à fábrica ({soCrm.length})</div>
          <div className="flex flex-wrap gap-2">
            {soCrm.slice(0, 12).map((c) => (
              <span key={c.id} className="rounded-full border border-white/12 px-3 py-1 font-mono text-[10px] text-white/55">{c.name}</span>
            ))}
            {soCrm.length > 12 && <span className="px-2 py-1 font-mono text-[10px] text-white/35">+{soCrm.length - 12}</span>}
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="glass-panel flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl p-6">
            <div className="mb-3 flex shrink-0 items-center justify-between">
              <h3 className="font-display text-xl tracking-wide text-white">Entregáveis · {modal.name}</h3>
              <button onClick={() => setModal(null)} className="font-mono text-white/40 hover:text-white">✕</button>
            </div>
            <div className="min-h-0 flex-1">
              {loadingEnt ? (
                <div className="font-mono text-[11px] text-white/40">Carregando…</div>
              ) : entregaveis[modal.id]?.length ? (
                <AutoPaged items={entregaveis[modal.id]} rowPx={26} render={(e) => (
                  <div key={e.folder + e.file} className="flex items-center justify-between gap-2 border-b border-white/5 py-1">
                    <span className="truncate font-mono text-[11px] text-white/70">{e.file}</span>
                    <span className="shrink-0 font-mono text-[9px] tracking-[0.15em] text-neon-violet uppercase">{FOLDER_LABEL[e.folder] || e.folder}</span>
                  </div>
                )} />
              ) : (
                <div className="font-mono text-[11px] text-white/40">Nenhum material gerado ainda.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

