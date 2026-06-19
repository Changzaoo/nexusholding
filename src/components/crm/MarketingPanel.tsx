import { useEffect, useState } from 'react';
import { clientesStore, type Cliente } from '../../lib/crm';
import { syncMidia, listEntregaveis, FOLDER_LABEL, type SyncResult, type Entregavel } from '../../lib/midiaSync';

const moeda = (v: number) =>
  (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export function MarketingPanel() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [entregaveis, setEntregaveis] = useState<Record<string, Entregavel[]>>({});
  const [loadingEnt, setLoadingEnt] = useState<string | null>(null);

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

  const toggle = async (c: Cliente) => {
    if (!c.midiaId) return;
    if (expanded === c.id) { setExpanded(null); return; }
    setExpanded(c.id);
    if (!entregaveis[c.id]) {
      setLoadingEnt(c.id);
      try {
        const items = await listEntregaveis(c.midiaId);
        setEntregaveis((m) => ({ ...m, [c.id]: items }));
      } catch { setEntregaveis((m) => ({ ...m, [c.id]: [] })); }
      setLoadingEnt(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-wide text-white">Marketing · Fábrica de Mídia</h2>
          <p className="mt-1 font-mono text-xs text-white/45">Clientes e entregáveis do Nexus Digital 90, sincronizados nos dois sentidos com o CRM via Nexus Bridge.</p>
        </div>
        <button
          onClick={sincronizar}
          disabled={syncing}
          className="rounded-full border border-neon-cyan/40 px-4 py-2 font-mono text-[10px] tracking-[0.2em] text-neon-cyan uppercase transition-colors hover:bg-neon-cyan/10 disabled:opacity-50"
        >
          {syncing ? 'Sincronizando…' : '↻ Sincronizar agora'}
        </button>
      </div>

      {result?.error && (
        <div className="glass-panel rounded-2xl border border-neon-magenta/30 p-5 text-sm text-neon-magenta/90">
          Não foi possível sincronizar com a Mídia: {result.error}
          <div className="mt-1 font-mono text-[10px] text-white/40">Verifique a Nexus Bridge (api.nexusholding.xyz) e as chaves de integração.</div>
        </div>
      )}

      {result && !result.error && (
        <div className="glass-panel rounded-2xl p-4 font-mono text-[11px] text-white/55">
          Última sincronização: {result.pulledCriados} cliente(s) trazido(s) da Mídia, {result.pulledAtualizados} atualizado(s),
          {' '}{result.pushed} enviado(s) do CRM para a Mídia · {result.total} no total na fábrica.
        </div>
      )}

      {/* clientes vinculados à Mídia, com entregáveis */}
      <div>
        <div className="mb-3 font-mono text-[10px] tracking-[0.25em] text-white/40 uppercase">Na fábrica de mídia ({naMidia.length})</div>
        {naMidia.length === 0 ? (
          <div className="glass-panel rounded-2xl p-8 text-center font-mono text-xs text-white/35">Nenhum cliente sincronizado ainda. Crie clientes no CRM ou na fábrica e clique em “Sincronizar agora”.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {naMidia.map((c) => {
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

                  <button onClick={() => toggle(c)} className="mt-3 w-full rounded-lg border border-white/12 px-3 py-1.5 font-mono text-[9px] tracking-[0.2em] text-white/55 uppercase transition-colors hover:text-neon-cyan">
                    {expanded === c.id ? '▲ ocultar entregáveis' : '▼ ver entregáveis'}
                  </button>

                  {expanded === c.id && (
                    <div className="mt-3 border-t border-white/10 pt-3">
                      {loadingEnt === c.id ? (
                        <div className="font-mono text-[10px] text-white/35">Carregando entregáveis…</div>
                      ) : (entregaveis[c.id]?.length ? (
                        <EntregaveisList items={entregaveis[c.id]} />
                      ) : (
                        <div className="font-mono text-[10px] text-white/35">Nenhum material gerado ainda.</div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* clientes do CRM que serão enviados à fábrica no próximo sync */}
      {soCrm.length > 0 && (
        <div>
          <div className="mb-2 font-mono text-[10px] tracking-[0.25em] text-white/40 uppercase">Só no CRM — serão enviados à fábrica ({soCrm.length})</div>
          <div className="flex flex-wrap gap-2">
            {soCrm.slice(0, 20).map((c) => (
              <span key={c.id} className="rounded-full border border-white/12 px-3 py-1 font-mono text-[10px] text-white/55">{c.name}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Agrupa os entregáveis por pasta/etapa e lista os arquivos. */
function EntregaveisList({ items }: { items: Entregavel[] }) {
  const byFolder = items.reduce<Record<string, string[]>>((acc, it) => {
    (acc[it.folder] ??= []).push(it.file);
    return acc;
  }, {});
  return (
    <div className="flex flex-col gap-2">
      {Object.entries(byFolder).map(([folder, files]) => (
        <div key={folder}>
          <div className="font-mono text-[9px] tracking-[0.2em] text-neon-violet uppercase">{FOLDER_LABEL[folder] || folder}</div>
          <ul className="mt-1 flex flex-col gap-0.5">
            {files.map((f) => (
              <li key={f} className="truncate font-mono text-[10px] text-white/60">· {f}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
