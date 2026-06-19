/**
 * ============================================================
 *  Central de notificações do CRM
 * ------------------------------------------------------------
 *  Notificações DERIVADAS do estado atual de todos os módulos —
 *  conectando tudo num só lugar: leads novos, parcelas atrasadas/
 *  a vencer, propostas aguardando, conteúdo em aprovação, tarefas
 *  atrasadas, compromissos de hoje e itens aguardando aprovação na
 *  fábrica de mídia.
 *
 *  O "lido" é guardado por id em localStorage, então cada item novo
 *  (cada lead, cada parcela…) gera um alerta não lido próprio.
 * ============================================================
 */
import { useEffect, useMemo, useState } from 'react';
import {
  leadsStore,
  financeiroStore,
  propostasStore,
  tarefasStore,
  agendaStore,
  clientesStore,
  moeda,
  type Lead,
  type Parcela,
  type Proposta,
  type Tarefa,
  type Evento,
  type Cliente,
  type ModuleKey,
} from './crm';

export type Severity = 'info' | 'warn' | 'urgent';
export interface AppNotification {
  id: string;
  module: ModuleKey; // para onde navegar ao clicar
  severity: Severity;
  title: string;
  body?: string;
  ts: number; // para ordenação
}

const SEV_RANK: Record<Severity, number> = { urgent: 0, warn: 1, info: 2 };
const READ_KEY = 'nexus_notif_read';
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDaysISO = (iso: string, d: number) => {
  const dt = new Date(iso + 'T00:00:00');
  dt.setDate(dt.getDate() + d);
  return dt.toISOString().slice(0, 10);
};
const DAY = 86_400_000;

function readSetFromStorage(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]')); } catch { return new Set(); }
}

/** Constrói a lista de notificações a partir do estado das coleções. */
function build(d: {
  leads: Lead[]; parcelas: Parcela[]; propostas: Proposta[];
  tarefas: Tarefa[]; eventos: Evento[]; clientes: Cliente[];
}): AppNotification[] {
  const out: AppNotification[] = [];
  const today = todayISO();
  const limite7 = addDaysISO(today, 7);
  const now = Date.now();

  // Leads novos (aguardando triagem)
  d.leads.filter((l) => l.status === 'novo').forEach((l) =>
    out.push({ id: `lead:${l.id}`, module: 'visaogeral', severity: 'info', title: 'Novo lead', body: [l.name, l.company].filter(Boolean).join(' · ') || l.email, ts: l.createdAt }));

  // Parcelas atrasadas / a vencer
  d.parcelas.filter((p) => p.status !== 'recebido').forEach((p) => {
    if (p.dueDate && p.dueDate < today) out.push({ id: `parcela:${p.id}`, module: 'financeiro', severity: 'urgent', title: 'Parcela atrasada', body: `${p.client} · ${moeda(p.value)} · venceu ${fmt(p.dueDate)}`, ts: p.createdAt });
    else if (p.dueDate && p.dueDate <= limite7) out.push({ id: `parcela-due:${p.id}`, module: 'financeiro', severity: 'warn', title: 'Parcela a vencer', body: `${p.client} · ${moeda(p.value)} · vence ${fmt(p.dueDate)}`, ts: p.createdAt });
  });

  // Propostas enviadas aguardando resposta há mais de 3 dias
  d.propostas.forEach((p) => {
    if (p.status === 'enviada' && now - p.createdAt > 3 * DAY) out.push({ id: `proposta:${p.id}`, module: 'propostas', severity: 'warn', title: 'Proposta aguardando resposta', body: `${p.title} · ${p.client} · ${moeda(p.value)}`, ts: p.createdAt });
    if (p.status === 'aceita') out.push({ id: `proposta-aceita:${p.id}`, module: 'financeiro', severity: 'info', title: 'Proposta aceita — gerar cobrança', body: `${p.title} · ${p.client} · ${moeda(p.value)}`, ts: p.createdAt });
  });

  // Tarefas atrasadas / para hoje
  d.tarefas.filter((t) => !t.done && t.dueDate).forEach((t) => {
    if (t.dueDate! < today) out.push({ id: `tarefa:${t.id}`, module: 'tarefas', severity: 'urgent', title: 'Tarefa atrasada', body: `${t.title} · venceu ${fmt(t.dueDate!)}`, ts: t.createdAt });
    else if (t.dueDate === today) out.push({ id: `tarefa-hoje:${t.id}`, module: 'tarefas', severity: 'warn', title: 'Tarefa para hoje', body: t.title, ts: t.createdAt });
  });

  // Compromissos de hoje
  d.eventos.filter((e) => e.date === today).forEach((e) =>
    out.push({ id: `evento:${e.id}`, module: 'agenda', severity: 'info', title: 'Compromisso hoje', body: [e.title, e.time].filter(Boolean).join(' · '), ts: e.createdAt }));

  // Fábrica de mídia: itens aguardando aprovação
  d.clientes.filter((c) => (c.midiaAguardando ?? 0) > 0).forEach((c) =>
    out.push({ id: `midia:${c.id}`, module: 'marketing', severity: 'warn', title: 'Aprovação pendente na fábrica', body: `${c.name} · ${c.midiaAguardando} item(ns) aguardando`, ts: c.midiaSyncedAt ?? c.createdAt }));

  return out.sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity] || b.ts - a.ts);
}

function fmt(iso: string) { return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`; }

/** Hook que assina todas as coleções e devolve as notificações + estado de leitura. */
export function useNotifications() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [readSet, setReadSet] = useState<Set<string>>(readSetFromStorage);

  useEffect(() => {
    const unsubs = [
      leadsStore.subscribe(setLeads),
      financeiroStore.subscribe(setParcelas),
      propostasStore.subscribe(setPropostas),
      tarefasStore.subscribe(setTarefas),
      agendaStore.subscribe(setEventos),
      clientesStore.subscribe(setClientes),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const items = useMemo(
    () => build({ leads, parcelas, propostas, tarefas, eventos, clientes }),
    [leads, parcelas, propostas, tarefas, eventos, clientes],
  );

  const persist = (s: Set<string>) => {
    setReadSet(new Set(s));
    try { localStorage.setItem(READ_KEY, JSON.stringify([...s])); } catch { /* ignore */ }
  };
  const markRead = (id: string) => { const s = new Set(readSet); s.add(id); persist(s); };
  const markAllRead = () => { const s = new Set(readSet); items.forEach((i) => s.add(i.id)); persist(s); };

  const unread = items.filter((i) => !readSet.has(i.id)).length;
  return { items, unread, readSet, markRead, markAllRead };
}
