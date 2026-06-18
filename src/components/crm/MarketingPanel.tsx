import { useEffect, useState } from 'react';
import { listDashClients, upsertDashClient, type DashClient } from '../../lib/nexusBridge';
import { clientesStore, empresasStore, type Cliente, type Empresa } from '../../lib/crm';

const moeda = (v: number) =>
  (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export function MarketingPanel() {
  const [clients, setClients] = useState<DashClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [crmClientes, setCrmClientes] = useState<Cliente[]>([]);
  const [crmEmpresas, setCrmEmpresas] = useState<Empresa[]>([]);

  const load = () => {
    setLoading(true);
    listDashClients()
      .then((c) => { setClients(c); setError(null); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);
  useEffect(() => clientesStore.subscribe(setCrmClientes), []);
  useEffect(() => empresasStore.subscribe(setCrmEmpresas), []);

  // entidades do CRM que ainda não têm cliente no painel de marketing
  const vinculados = new Set(clients.map((c) => (c.crmId || '').trim()).filter(Boolean));
  const candidatos = [
    ...crmEmpresas.map((e) => ({ id: e.id, nome: (e as any).nome || (e as any).razaoSocial || '', tipo: 'Empresa', brief: { nicho: (e as any).segmento, cidade: (e as any).cidade } })),
    ...crmClientes.map((c) => ({ id: c.id, nome: (c as any).nome || '', tipo: 'Cliente', brief: { nicho: (c as any).segmento, cidade: (c as any).cidade } })),
  ].filter((x) => x.nome && !vinculados.has(x.id));

  const produzir = async (nome: string, crmId: string, brief: Record<string, unknown>) => {
    setBusy(crmId);
    try { await upsertDashClient({ nome, crmId, brief }); load(); }
    catch (e: any) { setError(e.message); }
    setBusy(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-wide text-white">Marketing</h2>
          <p className="mt-1 font-mono text-xs text-white/45">Clientes e materiais do painel de marketing (Nexus Digital 90), conectados ao CRM.</p>
        </div>
        <button onClick={load} className="rounded-full border border-white/15 px-4 py-2 font-mono text-[10px] tracking-[0.2em] text-white/60 uppercase transition-colors hover:text-neon-cyan">↻ Atualizar</button>
      </div>

      {error && (
        <div className="glass-panel rounded-2xl border border-neon-magenta/30 p-5 text-sm text-neon-magenta/90">
          Não foi possível conectar ao painel de marketing: {error}
          <div className="mt-1 font-mono text-[10px] text-white/40">Verifique NEXUS_API / NEXUS_KEY (proxy) ou se o backend está no ar.</div>
        </div>
      )}

      {loading ? (
        <div className="glass-panel rounded-2xl p-10 text-center font-mono text-xs text-white/40">Carregando…</div>
      ) : (
        <>
          {/* clientes já no painel de marketing */}
          <div>
            <div className="mb-3 font-mono text-[10px] tracking-[0.25em] text-white/40 uppercase">No painel de marketing ({clients.length})</div>
            {clients.length === 0 ? (
              <div className="glass-panel rounded-2xl p-8 text-center font-mono text-xs text-white/35">Nenhum cliente no painel ainda. Use “Produzir marketing” abaixo para criar a partir do CRM.</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {clients.map((c) => (
                  <div key={c.id} className="glass-panel rounded-2xl p-5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate font-medium capitalize text-white">{c.id.replace(/-/g, ' ')}</div>
                      {c.aguardandoAprovacao > 0 && <span className="shrink-0 rounded-full bg-neon-acid/15 px-2 py-0.5 font-mono text-[9px] text-neon-acid">{c.aguardandoAprovacao} p/ aprovar</span>}
                    </div>
                    <div className="mt-1 font-mono text-[10px] text-white/40">{[c.nicho, c.cidade].filter(Boolean).join(' · ') || '—'}{c.crmId ? ` · CRM #${c.crmId}` : ''}</div>
                    <div className="mt-3 flex items-end justify-between">
                      <div>
                        <div className="font-display text-xl font-bold text-neon-cyan">{c.metrics ? moeda(c.metrics.receita) : '—'}</div>
                        <div className="font-mono text-[9px] tracking-[0.2em] text-white/35 uppercase">receita proj./mês{c.metrics ? ` · ${c.metrics.roas}x` : ''}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-lg font-bold text-white">{c.materiais}</div>
                        <div className="font-mono text-[9px] tracking-[0.2em] text-white/35 uppercase">materiais</div>
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-neon-cyan" style={{ width: `${Math.round((c.etapasConcluidas / 8) * 100)}%` }} />
                    </div>
                    <div className="mt-1 font-mono text-[9px] text-white/35">{c.etapasConcluidas}/8 etapas concluídas</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* enviar empresas/clientes do CRM para o marketing */}
          {candidatos.length > 0 && (
            <div>
              <div className="mb-3 font-mono text-[10px] tracking-[0.25em] text-white/40 uppercase">Produzir marketing a partir do CRM</div>
              <div className="flex flex-col gap-2.5">
                {candidatos.slice(0, 12).map((x) => (
                  <div key={x.tipo + x.id} className="glass-panel flex items-center justify-between gap-3 rounded-xl p-4">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-white">{x.nome} <span className="font-mono text-[10px] text-white/35">· {x.tipo}</span></div>
                    </div>
                    <button
                      onClick={() => produzir(x.nome, x.id, x.brief as Record<string, unknown>)}
                      disabled={busy === x.id}
                      className="shrink-0 rounded-full border border-neon-cyan/40 px-4 py-2 font-mono text-[10px] tracking-[0.2em] text-neon-cyan uppercase transition-colors hover:bg-neon-cyan/10 disabled:opacity-50"
                    >
                      {busy === x.id ? '…' : 'Produzir marketing'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}