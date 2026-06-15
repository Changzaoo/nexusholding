import { useEffect, useMemo, useState } from 'react';
import { adminSignOut } from '../lib/firebase';
import { siteContent } from '../data/siteContent';
import { subscribeLeads, updateLead, deleteLead } from '../lib/leads';
import {
  PIPELINE,
  ROLES,
  ROLE_LABEL,
  ROLE_PERMISSIONS,
  MODULE_LABEL,
  SCHEMAS,
  STORE_BY_MODULE,
  historicoStore,
  usuariosStore,
  logHistorico,
  exportCSV,
  can,
  type Lead,
  type LeadStatus,
  type ModuleKey,
  type Role,
  type Historico,
  type Usuario,
} from '../lib/crm';
import { EntityManager } from './EntityManager';
import { OverviewPanel } from './crm/OverviewPanel';
import { AgendaPanel } from './crm/AgendaPanel';
import { FinanceiroPanel } from './crm/FinanceiroPanel';
import { ContentPanel } from './crm/ContentPanel';
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

const MODULE_ORDER: ModuleKey[] = ['visaogeral', 'pipeline', 'leads', 'clientes', 'empresas', 'propostas', 'agenda', 'financeiro', 'tarefas', 'campanhas', 'usuarios', 'historico', 'conteudo'];

export function AdminDashboard({ user, onSignOut }: AdminDashboardProps) {
  // papel do usuário logado (busca na tabela de usuários por e-mail) → admin por padrão
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  useEffect(() => usuariosStore.subscribe(setUsuarios), []);
  const role: Role = useMemo(() => {
    const me = usuarios.find((u) => u.email?.toLowerCase() === (user.email ?? '').toLowerCase());
    return me?.role ?? 'admin';
  }, [usuarios, user.email]);

  const tabs = useMemo(() => MODULE_ORDER.filter((m) => can(role, m)), [role]);
  const [tab, setTab] = useState<ModuleKey>('visaogeral');
  useEffect(() => {
    if (!tabs.includes(tab)) setTab(tabs[0]);
  }, [tabs, tab]);

  const handleSignOut = async () => {
    await adminSignOut();
    onSignOut();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-void" data-lenis-prevent>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.12),transparent_60%)]" />

      <div className="relative mx-auto max-w-6xl px-5 py-10 md:px-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] tracking-[0.4em] text-neon-cyan uppercase">{siteContent.company}</div>
            <h1 className="font-display text-4xl font-bold tracking-wide text-white uppercase">CRM Nexus</h1>
            <p className="mt-1 font-mono text-xs text-white/45">
              {user.email ?? 'admin'} · <span className="text-neon-cyan">{ROLE_LABEL[role]}</span>
            </p>
          </div>
          <button onClick={handleSignOut} className="pill-button">Sair</button>
        </header>

        {/* navegação de módulos (filtrada por permissão) */}
        <nav className="mb-7 flex flex-wrap gap-1.5 rounded-2xl border border-white/10 bg-black/30 p-1.5 backdrop-blur-md">
          {tabs.map((m) => (
            <button
              key={m}
              onClick={() => setTab(m)}
              className={`rounded-full px-3.5 py-1.5 font-mono text-[10px] tracking-[0.22em] uppercase transition-colors ${
                tab === m ? 'bg-white/12 text-white' : 'text-white/45 hover:text-white/80'
              }`}
            >
              {MODULE_LABEL[m]}
            </button>
          ))}
        </nav>

        {tab === 'visaogeral' && <OverviewPanel onGo={(m) => setTab(m as ModuleKey)} />}
        {tab === 'pipeline' && <PipelinePanel author={user.email ?? 'admin'} />}
        {tab === 'leads' && <LeadsPanel author={user.email ?? 'admin'} />}
        {tab === 'agenda' && <AgendaPanel readOnly={role === 'cliente'} />}
        {tab === 'financeiro' && <FinanceiroPanel readOnly={role === 'cliente'} />}
        {tab === 'historico' && <HistoricoPanel />}
        {tab === 'conteudo' && <ContentPanel readOnly={role === 'cliente'} />}
        {tab === 'usuarios' && (
          <div className="flex flex-col gap-8">
            <EntityManager schema={SCHEMAS.usuarios} store={STORE_BY_MODULE.usuarios!} readOnly={role === 'cliente'} />
            <PermissionsMatrix />
          </div>
        )}
        {(['clientes', 'empresas', 'propostas', 'tarefas', 'campanhas'] as ModuleKey[]).includes(tab) && (
          <EntityManager schema={SCHEMAS[tab]} store={STORE_BY_MODULE[tab]!} readOnly={role === 'cliente'} />
        )}
      </div>
    </div>
  );
}

/* ===================================================== PIPELINE (kanban) */
function PipelinePanel({ author }: { author: string }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<LeadStatus | null>(null);
  useEffect(() => subscribeLeads(setLeads), []);

  const open = leads.filter((l) => l.status !== 'fechado' && l.status !== 'perdido').length;
  const won = leads.filter((l) => l.status === 'fechado').length;
  const conv = leads.length ? Math.round((won / leads.length) * 100) : 0;
  const current = leads.find((l) => l.id === sel) ?? null;

  const move = (lead: Lead, status: LeadStatus) => {
    updateLead(lead.id, { status });
    logHistorico(lead.name || lead.email, 'status', `Pipeline → ${stageMeta(status).label}`, author);
  };

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Leads totais', value: leads.length, color: '#cfe2ff' },
          { label: 'Em aberto', value: open, color: '#41e8ff' },
          { label: 'Fechados', value: won, color: '#22c55e' },
          { label: 'Conversão', value: `${conv}%`, color: '#8b5cf6' },
        ].map((k) => (
          <div key={k.label} className="glass-panel rounded-2xl p-4">
            <div className="font-display text-3xl font-bold" style={{ color: k.color }}>{k.value}</div>
            <div className="mt-1 font-mono text-[9px] tracking-[0.25em] text-white/45 uppercase">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-[0.2em] text-white/35 uppercase">Arraste os cards entre os estágios</span>
        <button onClick={() => exportLeads(leads)} className={CSV_BTN}>↓ CSV</button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-3">
        {PIPELINE.map((stage) => {
          const col = leads.filter((l) => l.status === stage.value);
          const isOver = dragOver === stage.value;
          return (
            <div
              key={stage.value}
              className="flex w-[230px] shrink-0 flex-col rounded-xl p-1 transition-colors"
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
              <div className="mb-2 flex items-center justify-between rounded-lg px-2 py-1.5" style={{ background: `${stage.color}14`, border: `1px solid ${stage.color}40` }}>
                <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: stage.color }}>{stage.label}</span>
                <span className="font-mono text-[10px] text-white/45">{col.length}</span>
              </div>
              <div className="flex min-h-[60px] flex-col gap-2">
                {col.map((l) => (
                  <div
                    key={l.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', l.id)}
                    onClick={() => setSel(l.id)}
                    className="glass-panel cursor-grab rounded-lg p-3 text-left transition-colors hover:bg-white/5 active:cursor-grabbing"
                  >
                    <div className="truncate text-sm font-medium text-white">{l.name || l.email}</div>
                    {l.company && <div className="truncate font-mono text-[10px] text-white/45">{l.company}</div>}
                    <div className="mt-1 font-mono text-[9px] text-white/30">{fmtDate(l.createdAt)}</div>
                  </div>
                ))}
                {col.length === 0 && <div className="rounded-lg border border-dashed border-white/10 p-3 text-center font-mono text-[10px] text-white/25">vazio</div>}
              </div>
            </div>
          );
        })}
      </div>

      {current && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && setSel(null)}>
          <div className="w-full max-w-md">
            <LeadDetail lead={current} onClose={() => setSel(null)} onMove={move} author={author} />
          </div>
        </div>
      )}
    </>
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
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar lead…" className="min-w-[220px] flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-neon-cyan/60 placeholder:text-white/25" />
        <div className="flex flex-wrap gap-1.5">
          <Chip active={filter === 'all'} onClick={() => setFilter('all')} label="Todos" color="#cfe2ff" />
          {PIPELINE.map((s) => <Chip key={s.value} active={filter === s.value} onClick={() => setFilter(s.value)} label={s.label} color={s.color} />)}
        </div>
        <button onClick={() => exportLeads(filtered)} className={CSV_BTN}>↓ CSV</button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_minmax(320px,400px)]">
        <div className="flex flex-col gap-2.5">
          {filtered.length === 0 && <div className="glass-panel rounded-2xl p-10 text-center font-mono text-xs text-white/40">Nenhum lead.</div>}
          {filtered.map((l) => {
            const m = stageMeta(l.status);
            return (
              <button key={l.id} onClick={() => setSel(l.id)} className={`glass-panel rounded-xl p-4 text-left transition-colors ${sel === l.id ? 'ring-1 ring-neon-cyan/60' : 'hover:bg-white/5'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-white">{l.name || '—'}{l.company && <span className="text-white/40"> · {l.company}</span>}</div>
                    <div className="mt-0.5 truncate font-mono text-[11px] text-white/45">{l.email}{l.phone ? ` · ${l.phone}` : ''}</div>
                  </div>
                  <span className="shrink-0 rounded-full px-2.5 py-1 font-mono text-[9px] tracking-[0.18em] uppercase" style={{ color: m.color, background: `${m.color}1f`, border: `1px solid ${m.color}55` }}>{m.label}</span>
                </div>
              </button>
            );
          })}
        </div>
        <div className="lg:sticky lg:top-6 lg:self-start">
          {current ? <LeadDetail key={current.id} lead={current} onClose={() => setSel(null)} onMove={move} author={author} /> : <div className="glass-panel hidden rounded-2xl p-8 text-center font-mono text-xs text-white/35 lg:block">Selecione um lead.</div>}
        </div>
      </div>
    </>
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

/* ===================================================== HISTÓRICO */
function HistoricoPanel() {
  const [items, setItems] = useState<Historico[]>([]);
  useEffect(() => historicoStore.subscribe(setItems), []);
  const icon = (t: Historico['type']) => (t === 'status' ? '⟳' : t === 'nota' ? '✎' : t === 'contato' ? '☎' : '◷');
  return (
    <div className="flex flex-col gap-2.5">
      {items.length === 0 && <div className="glass-panel rounded-2xl p-10 text-center font-mono text-xs text-white/40">Sem registros de atendimento ainda. Mover leads no pipeline gera histórico automático.</div>}
      {items.map((h) => (
        <div key={h.id} className="glass-panel flex items-start gap-3 rounded-xl p-4">
          <span className="mt-0.5 text-neon-cyan">{icon(h.type)}</span>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-white"><span className="font-medium">{h.lead}</span> · <span className="text-white/60">{h.description}</span></div>
            <div className="mt-0.5 font-mono text-[10px] text-white/35">{h.author ?? 'sistema'} · {fmtDate(h.createdAt)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ===================================================== PERMISSÕES (matriz) */
function PermissionsMatrix() {
  const mods = Object.keys(MODULE_LABEL) as ModuleKey[];
  return (
    <div className="glass-panel rounded-2xl p-5">
      <h3 className="mb-4 font-mono text-[11px] tracking-[0.3em] text-white/55 uppercase">Permissões por papel</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              <th className="p-2 font-mono text-[10px] tracking-[0.2em] text-white/40 uppercase">Módulo</th>
              {ROLES.map((r) => <th key={r} className="p-2 text-center font-mono text-[10px] tracking-[0.2em] text-neon-cyan uppercase">{ROLE_LABEL[r]}</th>)}
            </tr>
          </thead>
          <tbody>
            {mods.map((m) => (
              <tr key={m} className="border-t border-white/5">
                <td className="p-2 text-sm text-white/75">{MODULE_LABEL[m]}</td>
                {ROLES.map((r) => (
                  <td key={r} className="p-2 text-center">
                    {ROLE_PERMISSIONS[r].includes(m) ? <span className="text-neon-acid">✓</span> : <span className="text-white/15">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ===================================================== CONTEÚDO */
