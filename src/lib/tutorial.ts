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
  { target: 'nav-clientes', module: 'clientes', title: 'Clientes', body: 'Sua base de clientes (já com os dados de projeto). Abra um cliente para ver Dados, Propostas, Histórico e Entregáveis num lugar só. Sincroniza com a fábrica de mídia.' },
  { target: 'nav-agenda', module: 'agenda', title: 'Agenda', body: 'Reuniões, ligações e entregas. Os compromissos de hoje viram notificação no sino.' },
  { target: 'nav-financeiro', module: 'financeiro', title: 'Financeiro', body: 'Receitas, custos por projeto, DRE simplificada, fluxo de caixa, margem e a previsão de entrada (quanto ainda tem a entrar).' },
  { target: 'nav-tarefas', module: 'tarefas', title: 'Tarefas', body: 'To-dos da equipe. Tarefas atrasadas ou de hoje aparecem nas notificações.' },
  { target: 'nav-campanhas', module: 'campanhas', title: 'Campanhas', body: 'Captação por canal (Google/Meta/TikTok) com CPL, CPA, CTR e ROAS — e a produção que vem da fábrica de mídia aparece aqui como cards (◆ Mídia), com etapas e entregáveis.' },
  { target: 'nav-config', module: 'config', title: 'Configurações', body: 'Sua conta, senha, equipe e o editor de conteúdo do site público.' },
  { target: 'notif', title: 'Notificações 🔔', body: 'O sino reúne tudo que precisa de atenção: leads novos, parcelas a vencer/atrasadas, propostas, tarefas e compromissos.' },
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
    { target: 'nav-clientes', title: 'Clientes', body: 'Cada cliente reúne tudo: dados + projeto (valor, status, escopo). Abra um cliente para as abas Dados, Propostas, Histórico e Entregáveis.' },
    { title: 'Propostas e Histórico', body: 'As propostas (que viram “receita a fechar”) e a linha do tempo de atendimento agora ficam dentro de cada cliente.' },
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
    { target: 'nav-campanhas', title: 'Campanhas & Captação', body: 'Cadastre investimento e resultados por canal (Google Ads, Meta Ads…) — CPL, CPC, CPA, CTR e ROAS. Os clientes da fábrica de mídia entram como cards ◆ Mídia, com etapas e entregáveis.' },
    { title: 'Produção da Mídia', body: 'Use o botão “↻ Mídia” para sincronizar a produção do Nexus Digital 90 pela Nexus Bridge. Clique em “ver entregáveis” num card ◆ Mídia para os arquivos.' },
  ],
  config: [
    { target: 'nav-config', title: 'Configurações', body: 'Edite sua conta e senha, cadastre a equipe (donos) e altere todos os textos do site público na seção “Conteúdo do site”.' },
  ],
};
