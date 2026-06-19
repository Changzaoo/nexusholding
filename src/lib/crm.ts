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
  | 'projetos'
  | 'empresas'
  | 'propostas'
  | 'agenda'
  | 'financeiro'
  | 'tarefas'
  | 'campanhas'
  | 'conteudos'
  | 'usuarios'
  | 'historico'
  | 'conteudo'
  | 'marketing'
  | 'config';

export const MODULE_LABEL: Record<ModuleKey, string> = {
  visaogeral: 'Visão geral',
  pipeline: 'Pipeline',
  leads: 'Leads',
  clientes: 'Clientes',
  projetos: 'Projetos',
  empresas: 'Empresas',
  propostas: 'Propostas',
  agenda: 'Agenda',
  financeiro: 'Financeiro',
  tarefas: 'Tarefas',
  campanhas: 'Campanhas',
  conteudos: 'Conteúdo',
  usuarios: 'Usuários',
  historico: 'Histórico',
  conteudo: 'Conteúdo do site',
  marketing: 'Marketing',
  config: 'Configurações',
};

/** Matriz de permissões: quais módulos cada papel acessa. */
export const ROLE_PERMISSIONS: Record<Role, ModuleKey[]> = {
  admin: ['visaogeral', 'pipeline', 'leads', 'clientes', 'projetos', 'propostas', 'agenda', 'financeiro', 'tarefas', 'campanhas', 'conteudos', 'marketing', 'historico', 'conteudo', 'config'],
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
  /* ---- vínculo com a fábrica de mídia (Nexus Digital 90), via Nexus Bridge ---- */
  /** slug do cliente na fábrica de mídia (chave de ligação). */
  midiaId?: string;
  /** de onde o cliente nasceu: criado no CRM ou trazido da Mídia. */
  origin?: 'crm' | 'midia';
  /** snapshot dos entregáveis/métricas da Mídia (atualizado a cada sync). */
  midiaEtapas?: number; // etapas concluídas (de 8)
  midiaMateriais?: number; // nº de materiais gerados
  midiaAguardando?: number; // itens aguardando aprovação
  midiaReceita?: number; // receita projetada/mês
  midiaRoas?: number; // ROAS projetado
  midiaSyncedAt?: number; // ms da última sincronização
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

export type CampanhaCanal = 'google' | 'meta' | 'tiktok' | 'email' | 'organico' | 'outro';
export interface Campanha extends BaseRecord {
  name: string;
  channel: CampanhaCanal;
  budget: number;
  status: 'ativa' | 'pausada' | 'encerrada';
  client?: string; // cliente/projeto atendido
  project?: string;
  startDate?: string;
  endDate?: string;
  /* ---- captação / performance (Google Ads, Meta Ads, etc.) ---- */
  spend?: number; // investimento realizado
  impressions?: number; // impressões
  clicks?: number; // cliques
  leads?: number; // leads captados
  sales?: number; // vendas/conversões
  revenue?: number; // receita gerada
  notes?: string;
}

/** Projeto: a espinha dorsal que liga cliente, campanha, financeiro e conteúdo. */
export type ProjetoStatus = 'ativo' | 'pausado' | 'concluido' | 'cancelado';
export interface Projeto extends BaseRecord {
  name: string;
  client: string; // ref a cliente/lead
  status: ProjetoStatus;
  startDate?: string;
  endDate?: string;
  contractValue?: number; // valor do contrato/fechamento
  scope?: string; // escopo / serviços contratados
  midiaId?: string; // vínculo com a implantação na fábrica de mídia
  owner?: string;
  notes?: string;
}

/** Custo / despesa lançada (opcionalmente) num projeto — base da margem e do DRE. */
export type CustoCategoria = 'trafego' | 'ferramenta' | 'equipe' | 'terceiros' | 'imposto' | 'outro';
export interface Custo extends BaseRecord {
  description: string;
  project?: string; // projeto/cliente
  category: CustoCategoria;
  value: number;
  date: string; // ISO yyyy-mm-dd
  recurring?: boolean; // recorrente (mensal)
}

/** Conteúdo produzido para um cliente (calendário editorial / criativos). */
export type ConteudoStatus = 'ideia' | 'producao' | 'aprovacao' | 'agendado' | 'publicado';
export interface ConteudoCliente extends BaseRecord {
  title: string;
  client: string; // ref
  type: 'post' | 'reel' | 'story' | 'criativo' | 'video' | 'artigo' | 'email';
  channel: 'instagram' | 'facebook' | 'google' | 'tiktok' | 'youtube' | 'blog' | 'email' | 'outro';
  status: ConteudoStatus;
  date?: string; // publicação/agendamento
  link?: string;
  notes?: string;
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

/* ----------------------------------------------- STORE genérico */
export interface CreateOpts {
  /** Não cair para localStorage se a escrita na nuvem falhar — relança o erro.
   *  Usado em escrita pública (formulário de lead): salvar só no navegador do
   *  visitante é inútil (o admin nunca veria), então é melhor falhar e avisar. */
  noLocalFallback?: boolean;
}
export interface Store<T extends BaseRecord> {
  subscribe(cb: (items: T[]) => void): () => void;
  create(data: Omit<T, 'id' | 'createdAt'> & { createdAt?: number }, opts?: CreateOpts): Promise<void>;
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

    async create(data, opts) {
      if (!localMode) {
        try {
          await addDoc(collection(getDb()!, name), {
            ...data,
            createdAt: serverTimestamp(),
          });
          return;
        } catch (e) {
          // Em escrita pública não escondemos a falha no localStorage do visitante.
          if (opts?.noLocalFallback) throw e;
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
export const projetosStore = createStore<Projeto>('projetos');
export const custosStore = createStore<Custo>('custos');
export const conteudosStore = createStore<ConteudoCliente>('conteudos');

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
  projetos: {
    module: 'projetos',
    title: 'Projetos',
    singular: 'Projeto',
    fields: [
      { key: 'name', label: 'Projeto', type: 'text', required: true },
      { key: 'client', label: 'Cliente', type: 'ref', required: true },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'ativo', label: 'Ativo', color: '#22c55e' },
          { value: 'pausado', label: 'Pausado', color: '#ffd166' },
          { value: 'concluido', label: 'Concluído', color: '#41e8ff' },
          { value: 'cancelado', label: 'Cancelado', color: '#ff5d73' },
        ],
      },
      { key: 'contractValue', label: 'Valor do contrato (R$)', type: 'number' },
      { key: 'startDate', label: 'Início', type: 'date' },
      { key: 'endDate', label: 'Fim previsto', type: 'date' },
      { key: 'scope', label: 'Escopo / serviços', type: 'textarea' },
      { key: 'owner', label: 'Responsável', type: 'text' },
      { key: 'notes', label: 'Observações', type: 'textarea' },
    ],
  },
  conteudos: {
    module: 'conteudos',
    title: 'Conteúdo',
    singular: 'Conteúdo',
    fields: [
      { key: 'title', label: 'Título', type: 'text', required: true },
      { key: 'client', label: 'Cliente', type: 'ref', required: true },
      {
        key: 'type',
        label: 'Tipo',
        type: 'select',
        options: [
          { value: 'post', label: 'Post' },
          { value: 'reel', label: 'Reel' },
          { value: 'story', label: 'Story' },
          { value: 'criativo', label: 'Criativo (anúncio)' },
          { value: 'video', label: 'Vídeo' },
          { value: 'artigo', label: 'Artigo / Blog' },
          { value: 'email', label: 'E-mail' },
        ],
      },
      {
        key: 'channel',
        label: 'Canal',
        type: 'select',
        options: [
          { value: 'instagram', label: 'Instagram' },
          { value: 'facebook', label: 'Facebook' },
          { value: 'google', label: 'Google' },
          { value: 'tiktok', label: 'TikTok' },
          { value: 'youtube', label: 'YouTube' },
          { value: 'blog', label: 'Blog' },
          { value: 'email', label: 'E-mail' },
          { value: 'outro', label: 'Outro' },
        ],
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'ideia', label: 'Ideia', color: '#8fa3c8' },
          { value: 'producao', label: 'Em produção', color: '#ffd166' },
          { value: 'aprovacao', label: 'Aprovação', color: '#41e8ff' },
          { value: 'agendado', label: 'Agendado', color: '#8b5cf6' },
          { value: 'publicado', label: 'Publicado', color: '#22c55e' },
        ],
      },
      { key: 'date', label: 'Data', type: 'date' },
      { key: 'link', label: 'Link', type: 'text' },
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
  projetos: projetosStore,
  conteudos: conteudosStore,
  usuarios: usuariosStore,
};
