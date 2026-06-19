/**
 * ============================================================
 *  CRM — camada de dados (banco + "API")
 * ============================================================
 *  "Tabelas" = coleções Firestore; "API" = funções tipadas de
 *  create/subscribe/update/delete. Tudo com fallback automático
 *  para localStorage quando o Firestore não estiver acessível,
 *  então o CRM funciona localmente sempre.
 *
 *  Tabelas: clientes · leads · empresas · propostas · tarefas ·
 *           campanhas · usuários · histórico de atendimento.
 *  Permissões por papel: admin · comercial · cliente · operador.
 */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { getDb, isFirebaseConfigured } from './firebase';

/* ----------------------------------------------- PIPELINE de vendas */
export type LeadStatus =
  | 'novo'
  | 'qualificacao'
  | 'reuniao'
  | 'proposta'
  | 'negociacao'
  | 'fechado'
  | 'perdido';

export const PIPELINE: { value: LeadStatus; label: string; color: string }[] = [
  { value: 'novo', label: 'Novo lead', color: '#41e8ff' },
  { value: 'qualificacao', label: 'Qualificação', color: '#8b5cf6' },
  { value: 'reuniao', label: 'Reunião marcada', color: '#3b82f6' },
  { value: 'proposta', label: 'Proposta enviada', color: '#a3ff6b' },
  { value: 'negociacao', label: 'Negociação', color: '#ffd166' },
  { value: 'fechado', label: 'Fechado', color: '#22c55e' },
  { value: 'perdido', label: 'Perdido', color: '#ff5d73' },
];
/** compat: usado pela UI antiga */
export const LEAD_STATUSES = PIPELINE;

/* ----------------------------------------------- PAPÉIS e PERMISSÕES */
export const ROLES = ['admin'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Dono',
};

export type ModuleKey =
  | 'visaogeral'
  | 'pipeline'
  | 'leads'
  | 'clientes'
  | 'empresas'
  | 'propostas'
  | 'agenda'
  | 'financeiro'
  | 'tarefas'
  | 'campanhas'
  | 'usuarios'
  | 'historico'
  | 'conteudo'
  | 'marketing'
  | 'midias'
  | 'config';

export const MODULE_LABEL: Record<ModuleKey, string> = {
  visaogeral: 'Visão geral',
  pipeline: 'Pipeline',
  leads: 'Leads',
  clientes: 'Clientes',
  empresas: 'Empresas',
  propostas: 'Propostas',
  agenda: 'Agenda',
  financeiro: 'Financeiro',
  tarefas: 'Tarefas',
  campanhas: 'Campanhas',
  usuarios: 'Usuários',
  historico: 'Histórico',
  conteudo: 'Conteúdo',
  marketing: 'Marketing',
  midias: 'Mídia produzida',
  config: 'Configurações',
};

/** Matriz de permissões: quais módulos cada papel acessa. */
export const ROLE_PERMISSIONS: Record<Role, ModuleKey[]> = {
  admin: ['visaogeral', 'pipeline', 'leads', 'clientes', 'propostas', 'agenda', 'financeiro', 'tarefas', 'campanhas', 'marketing', 'midias', 'historico', 'conteudo', 'config'],
};

export function can(role: Role, mod: ModuleKey): boolean {
  return ROLE_PERMISSIONS[role].includes(mod);
}

/* ----------------------------------------------- TIPOS das tabelas */
export interface BaseRecord {
  id: string;
  createdAt: number;
}

export interface Lead extends BaseRecord {
  name: string;
  company?: string;
  email: string;
  phone?: string;
  segment?: string;
  revenue?: string;
  message?: string;
  source: string;
  status: LeadStatus;
  owner?: string;
  notes?: string;
}

export interface Cliente extends BaseRecord {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  segment?: string;
  cnpj?: string;
  site?: string;
  city?: string;
  owner?: string;
  notes?: string;
}

export interface Empresa extends BaseRecord {
  name: string;
  cnpj?: string;
  segment?: string;
  site?: string;
  city?: string;
  notes?: string;
}

export interface Proposta extends BaseRecord {
  title: string;
  client: string;
  value: number;
  status: 'rascunho' | 'enviada' | 'aceita' | 'recusada';
  validUntil?: string;
  notes?: string;
}

export interface Tarefa extends BaseRecord {
  title: string;
  relatedTo?: string;
  assignedTo?: string;
  dueDate?: string;
  priority: 'baixa' | 'media' | 'alta';
  done: boolean;
  notes?: string;
}

export interface Campanha extends BaseRecord {
  name: string;
  channel: 'google' | 'meta' | 'email' | 'organico' | 'outro';
  budget: number;
  status: 'ativa' | 'pausada' | 'encerrada';
  leads?: number;
}

export interface Usuario extends BaseRecord {
  name: string;
  email: string;
  role: Role;
  active: boolean;
}

/** Evento de agenda — reunião, ligação, entrega, visita, etc. */
export type EventoTipo = 'reuniao' | 'ligacao' | 'apresentacao' | 'entrega' | 'tarefa';
export interface Evento extends BaseRecord {
  title: string;
  type: EventoTipo;
  date: string; // ISO yyyy-mm-dd
  time?: string; // HH:mm
  owner?: string;
  relatedTo?: string; // lead/cliente
  notes?: string;
}

/** Parcela financeira vinculada a uma proposta/cliente. */
export type ParcelaStatus = 'a_receber' | 'recebido' | 'atrasado';
export interface Parcela extends BaseRecord {
  description: string;
  client: string;
  value: number;
  dueDate: string; // ISO yyyy-mm-dd
  status: ParcelaStatus;
  paidAt?: string;
}

export interface Historico extends BaseRecord {
  lead: string;
  type: 'status' | 'nota' | 'contato' | 'tarefa';
  description: string;
  author?: string;
}

/**
 * Mídia/conteúdo produzido pela fábrica (máquina de money) ou pelo painel de
 * marketing (Nexus Digital 90), espelhado no banco central para aparecer no CRM.
 * O vínculo com o cliente do CRM é feito pelo campo `crmId`.
 */
export type MidiaTipo = 'post' | 'reel' | 'ebook' | 'legenda' | 'outro';
export type MidiaStatus = 'rascunho' | 'aguardando' | 'aprovado' | 'publicado';
export interface Midia extends BaseRecord {
  titulo: string;
  tipo: MidiaTipo;
  crmId?: string; // id do cliente/empresa no CRM (a "cola" entre os apps)
  cliente?: string; // nome legível do cliente/alvo
  campanhaId?: string; // campanha relacionada (opcional)
  arquivoUrl?: string; // link do arquivo final (Storage/Netlify/Drive…)
  status: MidiaStatus;
  origem?: string; // 'fabrica' | 'nexus-digital-90' | 'manual'
  notes?: string;
}

/* ----------------------------------------------- STORE genérico */
export interface Store<T extends BaseRecord> {
  subscribe(cb: (items: T[]) => void): () => void;
  create(data: Omit<T, 'id' | 'createdAt'> & { createdAt?: number }): Promise<void>;
  update(id: string, patch: Partial<T>): Promise<void>;
  remove(id: string): Promise<void>;
}

function normalize<T extends BaseRecord>(id: string, d: any): T {
  const createdAt =
    d.createdAt instanceof Timestamp
      ? d.createdAt.toMillis()
      : typeof d.createdAt === 'number'
        ? d.createdAt
        : Date.now();
  return { ...d, id, createdAt } as T;
}

export function createStore<T extends BaseRecord>(name: string): Store<T> {
  const LS_KEY = `nexus_${name}`;
  let localMode = !isFirebaseConfigured;

  const readLocal = (): T[] => {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || '[]') as T[];
    } catch {
      return [];
    }
  };
  const writeLocal = (items: T[]) => {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event(`nexus_${name}_changed`));
  };
  const uid = () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : String(Date.now() + Math.random());

  return {
    subscribe(cb) {
      let cleanup = () => {};
      const startLocal = () => {
        const emit = () => cb(readLocal());
        emit();
        const h = () => emit();
        window.addEventListener(`nexus_${name}_changed`, h);
        window.addEventListener('storage', h);
        cleanup = () => {
          window.removeEventListener(`nexus_${name}_changed`, h);
          window.removeEventListener('storage', h);
        };
      };
      if (!localMode) {
        try {
          const db = getDb()!;
          const qq = query(collection(db, name), orderBy('createdAt', 'desc'));
          const unsub = onSnapshot(
            qq,
            (snap) => cb(snap.docs.map((dd) => normalize<T>(dd.id, dd.data()))),
            (err) => {
              console.warn(`[crm:${name}] leitura falhou → local`, err);
              localMode = true;
              unsub();
              startLocal();
            },
          );
          cleanup = () => unsub();
        } catch (e) {
          console.warn(`[crm:${name}] indisponível → local`, e);
          localMode = true;
          startLocal();
        }
      } else {
        startLocal();
      }
      return () => cleanup();
    },

    async create(data) {
      if (!localMode) {
        try {
          await addDoc(collection(getDb()!, name), {
            ...data,
            createdAt: serverTimestamp(),
          });
          return;
        } catch (e) {
          console.warn(`[crm:${name}] create falhou → local`, e);
          localMode = true;
        }
      }
      const items = readLocal();
      items.unshift({ ...(data as any), id: uid(), createdAt: Date.now() });
      writeLocal(items);
    },

    async update(id, patch) {
      if (!localMode) {
        try {
          await updateDoc(doc(getDb()!, name, id), patch as any);
          return;
        } catch (e) {
          console.warn(`[crm:${name}] update falhou → local`, e);
        }
      }
      writeLocal(readLocal().map((it) => (it.id === id ? { ...it, ...patch } : it)));
    },

    async remove(id) {
      if (!localMode) {
        try {
          await deleteDoc(doc(getDb()!, name, id));
          return;
        } catch (e) {
          console.warn(`[crm:${name}] delete falhou → local`, e);
        }
      }
      writeLocal(readLocal().filter((it) => it.id !== id));
    },
  };
}

/* ----------------------------------------------- STORES (tabelas) */
export const leadsStore = createStore<Lead>('leads');
export const clientesStore = createStore<Cliente>('clientes');
export const empresasStore = createStore<Empresa>('empresas');
export const propostasStore = createStore<Proposta>('propostas');
export const tarefasStore = createStore<Tarefa>('tarefas');
export const campanhasStore = createStore<Campanha>('campanhas');
export const usuariosStore = createStore<Usuario>('usuarios');
export const historicoStore = createStore<Historico>('historico');
export const agendaStore = createStore<Evento>('agenda');
export const financeiroStore = createStore<Parcela>('financeiro');
export const midiasStore = createStore<Midia>('midias');

/** registra um evento no histórico de atendimento. */
export function logHistorico(
  lead: string,
  type: Historico['type'],
  description: string,
  author?: string,
) {
  return historicoStore.create({ lead, type, description, author });
}

/* ----------------------------------------------- SCHEMAS p/ a UI genérica */
export interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'textarea' | 'date' | 'checkbox' | 'select' | 'ref';
  options?: { value: string; label: string; color?: string }[];
  required?: boolean;
}

/** Formata um número como moeda brasileira (R$). */
export function moeda(v: number): string {
  return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Exporta registros para um arquivo CSV (com BOM p/ Excel). */
export function exportCSV(
  filename: string,
  rows: Record<string, any>[],
  columns: { key: string; label: string }[],
) {
  const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = columns.map((c) => esc(c.label)).join(',');
  const body = rows.map((r) => columns.map((c) => esc(r[c.key])).join(',')).join('\n');
  const blob = new Blob(['﻿' + head + '\n' + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export interface EntitySchema {
  module: ModuleKey;
  title: string;
  singular: string;
  fields: FieldDef[];
}

const segmentField: FieldDef = { key: 'segment', label: 'Segmento', type: 'text' };

export const SCHEMAS: Record<string, EntitySchema> = {
  clientes: {
    module: 'clientes',
    title: 'Clientes',
    singular: 'Cliente',
    fields: [
      { key: 'name', label: 'Nome / Razão social', type: 'text', required: true },
      { key: 'company', label: 'Empresa / Marca', type: 'text' },
      { key: 'email', label: 'E-mail', type: 'email' },
      { key: 'phone', label: 'Telefone', type: 'text' },
      { key: 'cnpj', label: 'CNPJ', type: 'text' },
      segmentField,
      { key: 'site', label: 'Site', type: 'text' },
      { key: 'city', label: 'Cidade', type: 'text' },
      { key: 'owner', label: 'Responsável', type: 'text' },
      { key: 'notes', label: 'Observações', type: 'textarea' },
    ],
  },
  empresas: {
    module: 'empresas',
    title: 'Empresas',
    singular: 'Empresa',
    fields: [
      { key: 'name', label: 'Nome', type: 'text', required: true },
      { key: 'cnpj', label: 'CNPJ', type: 'text' },
      segmentField,
      { key: 'site', label: 'Site', type: 'text' },
      { key: 'city', label: 'Cidade', type: 'text' },
      { key: 'notes', label: 'Observações', type: 'textarea' },
    ],
  },
  propostas: {
    module: 'propostas',
    title: 'Propostas',
    singular: 'Proposta',
    fields: [
      { key: 'title', label: 'Título', type: 'text', required: true },
      { key: 'client', label: 'Cliente/Lead', type: 'ref', required: true },
      { key: 'value', label: 'Valor (R$)', type: 'number' },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'rascunho', label: 'Rascunho', color: '#8fa3c8' },
          { value: 'enviada', label: 'Enviada', color: '#41e8ff' },
          { value: 'aceita', label: 'Aceita', color: '#22c55e' },
          { value: 'recusada', label: 'Recusada', color: '#ff5d73' },
        ],
      },
      { key: 'validUntil', label: 'Válida até', type: 'date' },
      { key: 'notes', label: 'Observações', type: 'textarea' },
    ],
  },
  tarefas: {
    module: 'tarefas',
    title: 'Tarefas',
    singular: 'Tarefa',
    fields: [
      { key: 'title', label: 'Tarefa', type: 'text', required: true },
      { key: 'relatedTo', label: 'Relacionado a (lead/cliente)', type: 'ref' },
      { key: 'assignedTo', label: 'Responsável', type: 'text' },
      { key: 'dueDate', label: 'Prazo', type: 'date' },
      {
        key: 'priority',
        label: 'Prioridade',
        type: 'select',
        options: [
          { value: 'baixa', label: 'Baixa', color: '#8fa3c8' },
          { value: 'media', label: 'Média', color: '#ffd166' },
          { value: 'alta', label: 'Alta', color: '#ff5d73' },
        ],
      },
      { key: 'done', label: 'Concluída', type: 'checkbox' },
      { key: 'notes', label: 'Observações', type: 'textarea' },
    ],
  },
  campanhas: {
    module: 'campanhas',
    title: 'Campanhas',
    singular: 'Campanha',
    fields: [
      { key: 'name', label: 'Nome', type: 'text', required: true },
      {
        key: 'channel',
        label: 'Canal',
        type: 'select',
        options: [
          { value: 'google', label: 'Google Ads' },
          { value: 'meta', label: 'Meta Ads' },
          { value: 'email', label: 'E-mail' },
          { value: 'organico', label: 'Orgânico' },
          { value: 'outro', label: 'Outro' },
        ],
      },
      { key: 'budget', label: 'Orçamento (R$)', type: 'number' },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'ativa', label: 'Ativa', color: '#22c55e' },
          { value: 'pausada', label: 'Pausada', color: '#ffd166' },
          { value: 'encerrada', label: 'Encerrada', color: '#8fa3c8' },
        ],
      },
      { key: 'leads', label: 'Leads gerados', type: 'number' },
    ],
  },
  midias: {
    module: 'midias',
    title: 'Mídia produzida',
    singular: 'Mídia',
    fields: [
      { key: 'titulo', label: 'Título', type: 'text', required: true },
      {
        key: 'tipo',
        label: 'Tipo',
        type: 'select',
        options: [
          { value: 'post', label: 'Post' },
          { value: 'reel', label: 'Reel/Vídeo' },
          { value: 'ebook', label: 'E-book' },
          { value: 'legenda', label: 'Legenda' },
          { value: 'outro', label: 'Outro' },
        ],
      },
      { key: 'cliente', label: 'Cliente/Alvo', type: 'text' },
      { key: 'crmId', label: 'Vínculo CRM (id)', type: 'text' },
      { key: 'campanhaId', label: 'Campanha (id)', type: 'text' },
      { key: 'arquivoUrl', label: 'Link do arquivo', type: 'text' },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'rascunho', label: 'Rascunho', color: '#8fa3c8' },
          { value: 'aguardando', label: 'Aguardando aprovação', color: '#ffd166' },
          { value: 'aprovado', label: 'Aprovado', color: '#41e8ff' },
          { value: 'publicado', label: 'Publicado', color: '#22c55e' },
        ],
      },
      { key: 'origem', label: 'Origem', type: 'text' },
      { key: 'notes', label: 'Observações', type: 'textarea' },
    ],
  },
  usuarios: {
    module: 'usuarios',
    title: 'Usuários',
    singular: 'Usuário',
    fields: [
      { key: 'name', label: 'Nome', type: 'text', required: true },
      { key: 'email', label: 'E-mail', type: 'email', required: true },
      {
        key: 'role',
        label: 'Papel',
        type: 'select',
        options: ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] })),
      },
      { key: 'active', label: 'Ativo', type: 'checkbox' },
    ],
  },
};

export const STORE_BY_MODULE: Partial<Record<ModuleKey, Store<any>>> = {
  clientes: clientesStore,
  empresas: empresasStore,
  propostas: propostasStore,
  tarefas: tarefasStore,
  campanhas: campanhasStore,
  usuarios: usuariosStore,
  midias: midiasStore,
};
