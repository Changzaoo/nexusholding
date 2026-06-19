import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { adminSignOut, updateDisplayName, changePassword, setKeepLogged, isKeepLogged } from '../lib/firebase';
import { siteContent } from '../data/siteContent';
import { subscribeLeads, updateLead, deleteLead } from '../lib/leads';
import {
  PIPELINE,
  ROLE_LABEL,
  MODULE_LABEL,
  SCHEMAS,
  STORE_BY_MODULE,
  logHistorico,
  exportCSV,
  can,
  type Lead,
  type LeadStatus,
  type ModuleKey,
} from '../lib/crm';
import { EntityManager } from './EntityManager';
import { OverviewPanel } from './crm/OverviewPanel';
import { AgendaPanel } from './crm/AgendaPanel';
import { FinanceiroPanel } from './crm/FinanceiroPanel';
import { ContentPanel } from './crm/ContentPanel';
import { ClientesPanel } from './crm/ClientesPanel';
import { CampanhasPanel } from './crm/CampanhasPanel';
import { NotificationBell } from './NotificationBell';
import { Tour } from './Tour';
import { AutoPaged } from './AutoPaged';
import { syncMidia } from '../lib/midiaSync';
import { useIsNarrow } from '../hooks/useIsNarrow';
import { globalTour, tabTours, hasSeenTour, markTourSeen, type TourStep } from '../lib/tutorial';
import type { AdminUser } from '../types/admin';

interface AdminDashboardProps {
  user: AdminUser;
  onSignOut: () => void;
}

const stageMeta = (s: LeadStatus) => PIPELINE.find((x) => x.value === s) ?? PIPELINE[0];

function fmtDate(ms: number) {
  return new Date(ms).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function onlyDigits(s?: string) {
  return (s ?? '').replace(/\D/g, '');
}

function exportLeads(leads: Lead[]) {
  exportCSV(
    'leads.csv',
    leads.map((l) => ({ ...l, status: stageMeta(l.status).label, createdAt: fmtDate(l.createdAt) })),
    [
      { key: 'name', label: 'Nome' },
      { key: 'company', label: 'Empresa' },
      { key: 'email', label: 'E-mail' },
      { key: 'phone', label: 'Telefone' },
      { key: 'segment', label: 'Segmento' },
      { key: 'revenue', label: 'Faturamento' },
      { key: 'status', label: 'Estágio' },
      { key: 'source', label: 'Origem' },
      { key: 'message', label: 'Desafio' },
      { key: 'notes', label: 'Notas' },
      { key: 'createdAt', label: 'Recebido' },
    ],
  );
}

const CSV_BTN = 'rounded-full border border-white/15 px-4 py-2 font-mono text-[10px] tracking-[0.2em] text-white/60 uppercase transition-colors hover:text-neon-cyan';

// "conteudo" saiu da navegação — agora vive dentro de "Configurações".
// Menu enxuto: Clientes engloba Projetos (e Propostas/Histórico vivem no
// detalhe do cliente); Campanhas engloba a produção da Mídia; Conteúdo e
// Marketing deixaram de ser abas. Leads ficam na Visão geral.
const MODULE_ORDER: ModuleKey[] = ['visaogeral', 'pipeline', 'clientes', 'agenda', 'financeiro', 'tarefas', 'campanhas', 'config'];

export function AdminDashboard({ user, onSignOut }: AdminDashboardProps) {
  // Equipe enxuta: papel único "Dono" com acesso total.
  const role = 'admin' as const;
  const author = user.email ?? user.displayName ?? 'Dono';

  const tabs = MODULE_ORDER.filter((m) => can(role, m));
  // a aba ativa vive no hash da URL (#/financeiro etc.): cada item tem URL
  // própria, dá pra entrar direto e o reload NÃO reseta para a Visão geral.
  const readHashTab = (): ModuleKey | null => {
    const h = (typeof window !== 'undefined' ? window.location.hash : '').replace(/^#\/?/, '');
    return (tabs as string[]).includes(h) ? (h as ModuleKey) : null;
  };
  const [tab, setTab] = useState<ModuleKey>(() => readHashTab() ?? 'visaogeral');
  const [tour, setTour] = useState<TourStep[] | null>(null);

  // mantém o hash em sincronia com a aba (sem empilhar histórico)
  useEffect(() => {
    const target = `#/${tab}`;
    if (window.location.hash !== target) window.history.replaceState(null, '', target);
  }, [tab]);
  // responde a navegação manual / voltar-avançar
  useEffect(() => {
    const onHash = () => { const t = readHashTab(); if (t) setTab(t); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincroniza os clientes com a fábrica de mídia uma vez por sessão,
  // para que os clientes/entregáveis da Mídia já apareçam no CRM.
  useEffect(() => { syncMidia().catch(() => {}); }, []);

  // Tutorial de boas-vindas no primeiro acesso.
  useEffect(() => { if (!hasSeenTour()) setTour(globalTour); }, []);
  const fecharTour = () => { setTour(null); markTourSeen(); };
  const abrirTutorialDaAba = () => setTour(tabTours[tab] ?? globalTour);

  const handleSignOut = async () => {
    await adminSignOut();
    onSignOut();
  };

  const navItem = (m: ModuleKey) => (
    <button
      key={m}
      data-tour={`nav-${m}`}
      onClick={() => setTab(m)}
      className={`shrink-0 rounded-lg px-3 py-2 text-left font-mono text-[11px] tracking-[0.16em] whitespace-nowrap uppercase transition-colors ${
        tab === m ? 'bg-white/12 text-white' : 'text-white/45 hover:bg-white/5 hover:text-white/80'
      }`}
    >
      {MODULE_LABEL[m]}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex bg-void" data-lenis-prevent>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.12),transparent_60%)]" />

      {/* SIDEBAR (desktop) */}
      <aside className="relative z-10 hidden w-60 shrink-0 flex-col border-r border-white/10 bg-black/40 backdrop-blur-md md:flex">
        <div className="border-b border-white/10 px-5 py-5">
          <div className="font-mono text-[10px] tracking-[0.4em] text-neon-cyan uppercase">{siteContent.company}</div>
          <div className="font-display text-xl font-bold tracking-wide text-white uppercase">CRM Nexus</div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
          {tabs.map(navItem)}
        </nav>
        <div className="border-t border-white/10 px-4 py-4">
          <div className="mb-2 min-w-0">
            <div className="truncate text-sm font-medium text-white">{user.displayName || user.email || 'Dono'}</div>
            <div className="truncate font-mono text-[10px] text-white/40">{user.email} · {ROLE_LABEL[role]}</div>
          </div>
          <button onClick={handleSignOut} className="w-full rounded-lg border border-white/15 px-3 py-2 font-mono text-[10px] tracking-[0.2em] text-white/60 uppercase transition-colors hover:border-neon-magenta/40 hover:text-neon-magenta">Sair</button>
        </div>
      </aside>

      {/* MAIN — painel fixo: a página não rola; o conteúdo de cada aba
          ocupa a altura disponível e as listas rolam dentro do próprio card. */}
      <main className="relative z-10 flex-1 overflow-hidden">
        <div className="flex h-full w-full flex-col px-4 py-4 md:px-6 md:py-5 xl:px-8">
          {/* topo mobile: marca + sair + nav horizontal */}
          <div className="mb-4 flex items-center justify-between md:hidden">
            <div className="font-display text-xl font-bold tracking-wide text-white uppercase">CRM Nexus</div>
            <button onClick={handleSignOut} className="rounded-lg border border-white/15 px-3 py-1.5 font-mono text-[10px] tracking-[0.2em] text-white/60 uppercase">Sair</button>
          </div>
          <nav className="mb-6 flex gap-1.5 overflow-x-auto pb-1 md:hidden">
            {tabs.map(navItem)}
          </nav>

          <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
            <h1 className="font-display text-2xl font-bold tracking-wide text-white md:text-3xl">{MODULE_LABEL[tab]}</h1>
            <div className="flex shrink-0 items-center gap-2">
              <NotificationBell onNavigate={(m) => setTab(m)} />
              <button
                data-tour="help"
                onClick={abrirTutorialDaAba}
                aria-label="Tutorial desta aba"
                title="Tutorial desta aba"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 font-display text-base font-bold text-white/70 transition-colors hover:border-neon-cyan/40 hover:text-neon-cyan"
              >
                ?
              </button>
            </div>
          </div>

          {/* área de conteúdo: preenche o resto da tela; a rolagem (quando há)
              acontece AQUI dentro, nunca na página inteira. */}
          <div className="min-h-0 flex-1 overflow-hidden">
            {tab === 'visaogeral' && (
              <div className="flex h-full min-h-0 flex-col gap-4">
                <div className="shrink-0">
                  <OverviewPanel onGo={(m) => setTab(m as ModuleKey)} />
                </div>
                <div className="flex min-h-0 flex-1 flex-col">
                  <h2 className="mb-2 shrink-0 font-mono text-[11px] tracking-[0.3em] text-white/55 uppercase">Leads</h2>
                  <div className="min-h-0 flex-1"><LeadsPanel author={author} /></div>
                </div>
              </div>
            )}
            {tab === 'pipeline' && <div className="h-full overflow-hidden"><PipelinePanel author={author} /></div>}
            {tab === 'clientes' && <ClientesPanel />}
            {tab === 'agenda' && <div className="crm-scroll h-full overflow-y-auto pr-1"><AgendaPanel readOnly={false} /></div>}
            {tab === 'financeiro' && <FinanceiroPanel readOnly={false} />}
            {tab === 'campanhas' && <CampanhasPanel />}
            {tab === 'config' && <div className="crm-scroll h-full overflow-y-auto pr-1"><SettingsPanel user={user} /></div>}
            {tab === 'tarefas' && <EntityManager schema={SCHEMAS.tarefas} store={STORE_BY_MODULE.tarefas!} />}
          </div>
        </div>
      </main>

      {tour && (
        <Tour
          steps={tour}
          onClose={fecharTour}
          onStep={(s) => { if (s.module) setTab(s.module); }}
        />
      )}
    </div>
  );
}

/* ===================================================== PIPELINE (kanban) */
function PipelinePanel({ author }: { author: string }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<LeadStatus | null>(null);
  const [selStage, setSelStage] = useState<LeadStatus>('novo');
  const narrow = useIsNarrow(900); // kanban completo só quando cabe (>= 900px)
  useEffect(() => subscribeLeads(setLeads), []);

  const open = leads.filter((l) => l.status !== 'fechado' && l.status !== 'perdido').length;
  const won = leads.filter((l) => l.status === 'fechado').length;
  const conv = leads.length ? Math.round((won / leads.length) * 100) : 0;
  const current = leads.find((l) => l.id === sel) ?? null;

  const move = (lead: Lead, status: LeadStatus) => {
    updateLead(lead.id, { status });
    logHistorico(lead.name || lead.email, 'status', `Pipeline → ${stageMeta(status).label}`, author);
  };

  // quantos cards cabem por coluna sem rolar (medido pela altura disponível)
  const colsRef = useRef<HTMLDivElement>(null);
  const [rowsFit, setRowsFit] = useState(5);
  useLayoutEffect(() => {
    const measure = () => {
      const h = colsRef.current?.clientHeight ?? 0;
      setRowsFit(Math.max(1, Math.floor((h - 40) / 56))); // ~40 cabeçalho, ~56 por card
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (colsRef.current) ro.observe(colsRef.current);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Leads totais', value: leads.length, color: '#cfe2ff' },
          { label: 'Em aberto', value: open, color: '#41e8ff' },
          { label: 'Fechados', value: won, color: '#22c55e' },
          { label: 'Conversão', value: `${conv}%`, color: '#8b5cf6' },
        ].map((k) => (
          <div key={k.label} className="glass-panel rounded-2xl p-3">
            <div className="font-display text-2xl font-bold" style={{ color: k.color }}>{k.value}</div>
            <div className="mt-1 font-mono text-[9px] tracking-[0.25em] text-white/45 uppercase">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="flex shrink-0 items-center justify-between">
        <span className="font-mono text-[10px] tracking-[0.2em] text-white/35 uppercase">{narrow ? 'Toque num estágio para filtrar' : 'Arraste os cards entre os estágios'}</span>
        <button onClick={() => exportLeads(leads)} className={CSV_BTN}>↓ CSV</button>
      </div>

      {/* MOBILE: seletor de estágio + lista do estágio (sem kanban apertado) */}
      {narrow ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="flex shrink-0 flex-wrap gap-1.5">
            {PIPELINE.map((s) => {
              const n = leads.filter((l) => l.status === s.value).length;
              return <Chip key={s.value} active={selStage === s.value} onClick={() => setSelStage(s.value)} label={`${s.label} (${n})`} color={s.color} />;
            })}
          </div>
          <div className="min-h-0 flex-1">
            <AutoPaged
              items={leads.filter((l) => l.status === selStage)}
              rowPx={64}
              colMinPx={320}
              empty={<div className="glass-panel flex h-full items-center justify-center rounded-2xl p-8 text-center font-mono text-xs text-white/40">Nenhum lead neste estágio.</div>}
              render={(l) => {
                const m = stageMeta(l.status);
                return (
                  <button key={l.id} onClick={() => setSel(l.id)} className="glass-panel rounded-xl p-3.5 text-left transition-colors hover:bg-white/5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-white">{l.name || l.email || '—'}</div>
                        {l.company && <div className="truncate font-mono text-[10px] text-white/45">{l.company}</div>}
                      </div>
                      <span className="shrink-0 rounded-full px-2.5 py-1 font-mono text-[9px] tracking-[0.18em] uppercase" style={{ color: m.color, background: `${m.color}1f`, border: `1px solid ${m.color}55` }}>{m.label}</span>
                    </div>
                  </button>
                );
              }}
            />
          </div>
        </div>
      ) : (
      <div ref={colsRef} className="flex min-h-0 flex-1 gap-2">
        {PIPELINE.map((stage) => {
          const col = leads.filter((l) => l.status === stage.value);
          const shown = col.slice(0, rowsFit);
          const extra = col.length - shown.length;
          const isOver = dragOver === stage.value;
          return (
            <div
              key={stage.value}
              className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl p-1 transition-colors"
              style={{ background: isOver ? `${stage.color}1a` : 'transparent', outline: isOver ? `1px dashed ${stage.color}` : 'none' }}
              onDragOver={(e) => { e.preventDefault(); if (dragOver !== stage.value) setDragOver(stage.value); }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null); }}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData('text/plain');
                const lead = leads.find((x) => x.id === id);
                if (lead && lead.status !== stage.value) move(lead, stage.value);
                setDragOver(null);
              }}
            >
              <div className="mb-2 flex shrink-0 items-center justify-between rounded-lg px-2 py-1.5" style={{ background: `${stage.color}14`, border: `1px solid ${stage.color}40` }}>
                <span className="truncate font-mono text-[9px] tracking-[0.16em] uppercase" style={{ color: stage.color }}>{stage.label}</span>
                <span className="font-mono text-[10px] text-white/45">{col.length}</span>
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
                {shown.map((l) => (
                  <div
                    key={l.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', l.id)}
                    onClick={() => setSel(l.id)}
                    className="glass-panel cursor-grab rounded-lg p-2.5 text-left transition-colors hover:bg-white/5 active:cursor-grabbing"
                  >
                    <div className="truncate text-sm font-medium text-white">{l.name || l.email || '—'}</div>
                    {l.company && <div className="truncate font-mono text-[10px] text-white/45">{l.company}</div>}
                  </div>
                ))}
                {col.length === 0 && <div className="rounded-lg border border-dashed border-white/10 p-3 text-center font-mono text-[10px] text-white/25">vazio</div>}
                {extra > 0 && <button onClick={() => setSel(shown[shown.length - 1]?.id ?? null)} className="shrink-0 rounded-lg border border-white/10 py-1 text-center font-mono text-[9px] tracking-[0.15em] text-white/45 uppercase hover:text-neon-cyan">+{extra} mais</button>}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {current && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && setSel(null)}>
          <div className="w-full max-w-md">
            <LeadDetail lead={current} onClose={() => setSel(null)} onMove={move} author={author} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================================================== LEADS (lista) */
function LeadsPanel({ author }: { author: string }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<LeadStatus | 'all'>('all');
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => subscribeLeads(setLeads), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (filter !== 'all' && l.status !== filter) return false;
      if (!q) return true;
      return [l.name, l.company, l.email, l.phone, l.segment, l.message].filter(Boolean).some((v) => v!.toLowerCase().includes(q));
    });
  }, [leads, search, filter]);
  const current = filtered.find((l) => l.id === sel) ?? null;

  const move = (lead: Lead, status: LeadStatus) => {
    updateLead(lead.id, { status });
    logHistorico(lead.name || lead.email, 'status', `Status → ${stageMeta(status).label}`, author);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar lead…" className="min-w-[200px] flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none focus:border-neon-cyan/60 placeholder:text-white/25" />
        <div className="flex flex-wrap gap-1.5">
          <Chip active={filter === 'all'} onClick={() => setFilter('all')} label="Todos" color="#cfe2ff" />
          {PIPELINE.map((s) => <Chip key={s.value} active={filter === s.value} onClick={() => setFilter(s.value)} label={s.label} color={s.color} />)}
        </div>
        <button onClick={() => exportLeads(filtered)} className={CSV_BTN}>↓ CSV</button>
      </div>

      <div className="min-h-0 flex-1">
        <AutoPaged
          items={filtered}
          rowPx={64}
          colMinPx={320}
          empty={<div className="glass-panel flex h-full items-center justify-center rounded-2xl p-10 text-center font-mono text-xs text-white/40">Nenhum lead.</div>}
          render={(l) => {
            const m = stageMeta(l.status);
            return (
              <button key={l.id} onClick={() => setSel(l.id)} className="glass-panel rounded-xl p-3.5 text-left transition-colors hover:bg-white/5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-white">{l.name || '—'}{l.company && <span className="text-white/40"> · {l.company}</span>}</div>
                    <div className="mt-0.5 truncate font-mono text-[11px] text-white/45">{l.email || '—'}{l.phone ? ` · ${l.phone}` : ''}</div>
                  </div>
                  <span className="shrink-0 rounded-full px-2.5 py-1 font-mono text-[9px] tracking-[0.18em] uppercase" style={{ color: m.color, background: `${m.color}1f`, border: `1px solid ${m.color}55` }}>{m.label}</span>
                </div>
              </button>
            );
          }}
        />
      </div>

      {current && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && setSel(null)}>
          <div className="w-full max-w-md">
            <LeadDetail key={current.id} lead={current} onClose={() => setSel(null)} onMove={move} author={author} />
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color: string }) {
  return (
    <button onClick={onClick} className="rounded-full px-3 py-1.5 font-mono text-[10px] tracking-[0.18em] uppercase transition-colors" style={{ color: active ? '#04060f' : color, background: active ? color : `${color}14`, border: `1px solid ${color}55` }}>{label}</button>
  );
}

function LeadDetail({ lead, onClose, onMove, author }: { lead: Lead; onClose: () => void; onMove: (l: Lead, s: LeadStatus) => void; author: string }) {
  const [notes, setNotes] = useState(lead.notes ?? '');
  const m = stageMeta(lead.status);
  const wa = onlyDigits(lead.phone);

  return (
    <div className="glass-panel rounded-2xl p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-2xl font-bold tracking-wide text-white">{lead.name || '—'}</h3>
          {lead.company && <p className="text-sm text-white/50">{lead.company}</p>}
        </div>
        <button onClick={onClose} className="font-mono text-white/40 hover:text-white">✕</button>
      </div>

      <div className="mt-5">
        <label className="font-mono text-[10px] tracking-[0.28em] text-white/45 uppercase">Estágio do pipeline</label>
        <select value={lead.status} onChange={(e) => onMove(lead, e.target.value as LeadStatus)} className="mt-2 w-full rounded-lg border bg-white/5 px-3 py-2.5 text-sm text-white outline-none" style={{ borderColor: `${m.color}66` }}>
          {PIPELINE.map((s) => <option key={s.value} value={s.value} className="bg-void">{s.label}</option>)}
        </select>
      </div>

      <dl className="mt-5 space-y-2 text-sm">
        <Row label="E-mail" value={lead.email} />
        <Row label="Telefone" value={lead.phone || '—'} />
        <Row label="Segmento" value={lead.segment || '—'} />
        <Row label="Faturamento" value={lead.revenue || '—'} />
        <Row label="Origem" value={lead.source} />
        <Row label="Recebido" value={fmtDate(lead.createdAt)} />
      </dl>

      {lead.message && (
        <div className="mt-4">
          <div className="font-mono text-[10px] tracking-[0.28em] text-white/45 uppercase">Desafio</div>
          <p className="mt-1.5 rounded-lg bg-white/5 p-3 text-sm leading-relaxed text-white/75">{lead.message}</p>
        </div>
      )}

      <div className="mt-4">
        <div className="font-mono text-[10px] tracking-[0.28em] text-white/45 uppercase">Notas internas</div>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== (lead.notes ?? '') && (updateLead(lead.id, { notes }), logHistorico(lead.name || lead.email, 'nota', 'Nota atualizada', author))} rows={3} placeholder="Anotações da equipe…" className="mt-1.5 w-full resize-none rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white outline-none focus:border-neon-cyan/60" />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {lead.email && <a href={`mailto:${lead.email}`} className="pill-button !px-4 !py-2 text-[11px]">E-mail</a>}
        {wa && <a href={`https://wa.me/${wa.length <= 11 ? '55' + wa : wa}`} target="_blank" rel="noreferrer" className="pill-button !px-4 !py-2 text-[11px] !border-neon-acid/40">WhatsApp</a>}
        <button onClick={() => { if (confirm('Excluir este lead?')) { deleteLead(lead.id); onClose(); } }} className="ml-auto rounded-full border border-neon-magenta/40 px-4 py-2 font-mono text-[11px] tracking-[0.2em] text-neon-magenta/90 uppercase hover:bg-neon-magenta/10">Excluir</button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="font-mono text-[10px] tracking-[0.2em] text-white/35 uppercase">{label}</dt>
      <dd className="text-right text-white/75 break-all">{value}</dd>
    </div>
  );
}

/* ===================================================== CONFIGURAÇÕES */
function SettingsPanel({ user }: { user: AdminUser }) {
  const [name, setName] = useState(user.displayName ?? '');
  const [nameMsg, setNameMsg] = useState<string | null>(null);
  const [curPwd, setCurPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);
  const [keep, setKeep] = useState(isKeepLogged());

  const saveName = async () => {
    setNameMsg(null);
    try {
      await updateDisplayName(name);
      setNameMsg('Nome atualizado. Recarregue a página para vê-lo em todo o painel.');
    } catch (e) {
      setNameMsg((e as Error).message);
    }
  };

  const savePwd = async () => {
    setPwdMsg(null);
    if (newPwd.length < 6) {
      setPwdMsg('A nova senha precisa ter ao menos 6 caracteres.');
      return;
    }
    try {
      await changePassword(curPwd, newPwd);
      setCurPwd('');
      setNewPwd('');
      setPwdMsg('Senha alterada com sucesso.');
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';
      setPwdMsg(
        code.includes('wrong-password') || code.includes('invalid-credential')
          ? 'Senha atual incorreta.'
          : (e as Error).message,
      );
    }
  };

  const toggleKeep = async (v: boolean) => {
    setKeep(v);
    await setKeepLogged(v);
  };

  const LABEL = 'mb-1.5 block font-mono text-[10px] tracking-[0.22em] text-white/45 uppercase';
  const INPUT = 'w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-neon-cyan/60 placeholder:text-white/25';

  return (
    <div className="flex flex-col gap-6">
      <div className="glass-panel rounded-2xl p-6">
        <h3 className="mb-1 font-display text-lg font-bold text-white">Sua conta</h3>
        <p className="mb-4 font-mono text-[11px] text-white/40">{user.email}</p>
        <label className={LABEL}>Nome de exibição</label>
        <div className="flex flex-wrap gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" className={`${INPUT} flex-1`} />
          <button onClick={saveName} className="pill-button !px-5 !py-2 text-[11px] !border-neon-cyan/50">Salvar</button>
        </div>
        {nameMsg && <p className="mt-2 font-mono text-[11px] text-neon-acid">{nameMsg}</p>}
      </div>

      <div className="glass-panel rounded-2xl p-6">
        <h3 className="mb-4 font-display text-lg font-bold text-white">Trocar senha</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={LABEL}>Senha atual</label>
            <input type="password" value={curPwd} onChange={(e) => setCurPwd(e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Nova senha</label>
            <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} className={INPUT} />
          </div>
        </div>
        <button onClick={savePwd} className="pill-button mt-4 !px-5 !py-2 text-[11px] !border-neon-cyan/50">Alterar senha</button>
        {pwdMsg && <p className="mt-2 font-mono text-[11px] text-neon-acid">{pwdMsg}</p>}
      </div>

      <div className="glass-panel rounded-2xl p-6">
        <h3 className="mb-1 font-display text-lg font-bold text-white">Sessão</h3>
        <label className="mt-3 flex items-center gap-3">
          <input type="checkbox" checked={keep} onChange={(e) => toggleKeep(e.target.checked)} className="h-4 w-4 accent-neon-cyan" />
          <span className="text-sm text-white/75">Manter-me conectado neste dispositivo</span>
        </label>
        <p className="mt-2 font-mono text-[11px] text-white/40">Ligado: você continua logado mesmo fechando o navegador. Desligue em computadores compartilhados.</p>
      </div>

      <div className="glass-panel rounded-2xl p-6">
        <h3 className="mb-1 font-display text-lg font-bold text-white">Donos / equipe</h3>
        <p className="mb-4 font-mono text-[11px] text-white/40">Cadastro dos donos do CRM. O login de acesso de cada um é criado no Firebase Authentication.</p>
        <EntityManager schema={SCHEMAS.usuarios} store={STORE_BY_MODULE.usuarios!} />
      </div>

      {/* Conteúdo do site (antiga aba "Conteúdo", agora dentro de Configurações) */}
      <div className="glass-panel rounded-2xl p-6">
        <h3 className="mb-1 font-display text-lg font-bold text-white">Conteúdo do site</h3>
        <p className="mb-4 font-mono text-[11px] text-white/40">Edite todos os textos do site público (hero, serviços, seções, cards 3D e rodapé). As mudanças publicam ao vivo.</p>
        <ContentPanel readOnly={false} />
      </div>
    </div>
  );
}

/* ===================================================== CONTEÚDO */
