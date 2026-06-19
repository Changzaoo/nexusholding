/**
 * ============================================================
 *  Conteúdo dos tutoriais (tour em foco / spotlight)
 * ------------------------------------------------------------
 *  - globalTour: passa por CADA categoria do menu, destacando o
 *    item e explicando o que faz (roda 1x no primeiro acesso).
 *  - tabTours: tour curto por aba, focado no que importa ali.
 *  O destaque é feito por `target` (atributo data-tour no elemento).
 * ============================================================
 */
import type { ModuleKey } from './crm';

export interface TourStep {
  /** chave do data-tour a destacar; ausente = card centralizado */
  target?: string;
  title: string;
  body: string;
  /** se definido, o tour troca para esta aba antes de mostrar o passo */
  module?: ModuleKey;
}

const SEEN_KEY = 'nexus_tour_seen_v2';
export const hasSeenTour = (): boolean => {
  try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return false; }
};
export const markTourSeen = (): void => {
  try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* ignore */ }
};

/** Tour de boas-vindas: um foco por categoria do menu. */
export const globalTour: TourStep[] = [
  { title: 'Bem-vindo ao CRM Nexus 👋', body: 'Em 1 minuto eu te mostro cada área. Pode pular quando quiser e refazer pelo botão “?” no topo.' },
  { target: 'nav-visaogeral', module: 'visaogeral', title: 'Visão geral', body: 'Seu painel executivo: indicadores, funil comercial, próximos compromissos e a lista de leads (a captação do site cai aqui).' },
  { target: 'nav-pipeline', module: 'pipeline', title: 'Pipeline', body: 'O kanban do comercial — arraste os leads entre os estágios, de “novo” até “fechado”.' },
  { target: 'nav-clientes', module: 'clientes', title: 'Clientes', body: 'Sua base de clientes. Sincroniza automaticamente, nos dois sentidos, com a fábrica de mídia.' },
  { target: 'nav-projetos', module: 'projetos', title: 'Projetos', body: 'Cada contrato/implantação (valor, status, escopo). É o elo que liga cliente, campanha, financeiro e conteúdo.' },
  { target: 'nav-propostas', module: 'propostas', title: 'Propostas', body: 'Orçamentos enviados e aceitos. As propostas enviadas viram “receita a fechar” no Financeiro.' },
  { target: 'nav-agenda', module: 'agenda', title: 'Agenda', body: 'Reuniões, ligações e entregas. Os compromissos de hoje viram notificação no sino.' },
  { target: 'nav-financeiro', module: 'financeiro', title: 'Financeiro', body: 'Receitas, custos por projeto, DRE simplificada, fluxo de caixa, margem e a previsão de entrada (quanto ainda tem a entrar).' },
  { target: 'nav-tarefas', module: 'tarefas', title: 'Tarefas', body: 'To-dos da equipe. Tarefas atrasadas ou de hoje aparecem nas notificações.' },
  { target: 'nav-campanhas', module: 'campanhas', title: 'Campanhas', body: 'Captação por canal (Google/Meta/TikTok): investimento, leads, vendas e métricas — CPL, CPA, CTR e ROAS.' },
  { target: 'nav-conteudos', module: 'conteudos', title: 'Conteúdo', body: 'Calendário editorial dos clientes (posts, reels, criativos), do rascunho ao publicado.' },
  { target: 'nav-marketing', module: 'marketing', title: 'Marketing', body: 'Clientes e entregáveis gerados na fábrica de mídia (Nexus Digital 90), sincronizados pela Nexus Bridge.' },
  { target: 'nav-historico', module: 'historico', title: 'Histórico', body: 'A linha do tempo dos atendimentos — gerada automaticamente quando você move leads no pipeline.' },
  { target: 'nav-config', module: 'config', title: 'Configurações', body: 'Sua conta, senha, equipe e o editor de conteúdo do site público.' },
  { target: 'notif', title: 'Notificações 🔔', body: 'O sino reúne tudo que precisa de atenção: leads novos, parcelas a vencer/atrasadas, aprovações, tarefas e compromissos.' },
  { title: 'Pronto! 🚀', body: 'É isso. Para rever qualquer aba, clique no “?” no topo a qualquer momento.' },
];

/** Tour curto e específico de cada aba. */
export const tabTours: Partial<Record<ModuleKey, TourStep[]>> = {
  visaogeral: [
    { target: 'nav-visaogeral', title: 'Visão geral', body: 'Resumo de tudo: leads, conversão, dinheiro a receber e a fechar, funil e agenda.' },
    { title: 'Indicadores', body: 'Os cards no topo são clicáveis e levam direto ao módulo correspondente. “A fechar” soma as propostas enviadas.' },
    { title: 'Leads', body: 'A lista de leads vive aqui embaixo. Os que chegam pelo site entram como “novo”. Clique para ver detalhes e mudar o estágio.' },
  ],
  pipeline: [
    { target: 'nav-pipeline', title: 'Pipeline (kanban)', body: 'Arraste cada lead entre as colunas para mover o estágio. Cada movimento registra no Histórico automaticamente.' },
  ],
  clientes: [
    { target: 'nav-clientes', title: 'Clientes', body: 'Cadastre e gerencie seus clientes. Quem vem da fábrica de mídia aparece aqui com as métricas; e os daqui são enviados para lá.' },
  ],
  projetos: [
    { target: 'nav-projetos', title: 'Projetos', body: 'Cada projeto/contrato com valor, status e escopo. Use o mesmo nome de cliente nas receitas e custos para a margem por projeto bater no Financeiro.' },
  ],
  propostas: [
    { target: 'nav-propostas', title: 'Propostas', body: 'Crie orçamentos com valor e status. Ao marcar como “enviada”, ela entra na previsão “a fechar”; “aceita” vira cobrança a faturar.' },
  ],
  agenda: [
    { target: 'nav-agenda', title: 'Agenda', body: 'Agende reuniões, ligações e entregas vinculadas a um cliente/lead. O que é hoje aparece na Visão geral e nas notificações.' },
  ],
  financeiro: [
    { target: 'nav-financeiro', title: 'Financeiro', body: 'Três visões: DRE & Fluxo, Receitas (parcelas) e Custos. Lance custos por projeto para ver margem e DRE.' },
    { title: 'Previsão de entrada', body: 'Soma o que tem a entrar: a receber (contratado), aceitas a faturar e a fechar (propostas enviadas).' },
  ],
  tarefas: [
    { target: 'nav-tarefas', title: 'Tarefas', body: 'Liste os to-dos com prazo e prioridade. Marque como concluída ao terminar — atrasadas viram alerta.' },
  ],
  campanhas: [
    { target: 'nav-campanhas', title: 'Campanhas & Captação', body: 'Cadastre investimento e resultados por canal (Google Ads, Meta Ads…). O painel calcula CPL, CPC, CPA, CTR e ROAS, por canal e no total.' },
  ],
  conteudos: [
    { target: 'nav-conteudos', title: 'Conteúdo', body: 'Planeje os conteúdos de cada cliente por tipo e canal, do status “ideia” até “publicado”. Os em “aprovação” viram notificação.' },
  ],
  marketing: [
    { target: 'nav-marketing', title: 'Marketing (fábrica de mídia)', body: 'Veja os clientes e entregáveis produzidos no Nexus Digital 90. Use “Sincronizar agora” para puxar/empurrar tudo pela Nexus Bridge.' },
  ],
  historico: [
    { target: 'nav-historico', title: 'Histórico', body: 'Registro automático dos atendimentos. Mover leads no pipeline e editar notas alimenta esta linha do tempo.' },
  ],
  config: [
    { target: 'nav-config', title: 'Configurações', body: 'Edite sua conta e senha, cadastre a equipe (donos) e altere todos os textos do site público na seção “Conteúdo do site”.' },
  ],
};
