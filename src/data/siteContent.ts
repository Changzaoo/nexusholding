/**
 * Conteúdo central do site.
 * Edite textos, serviços e CTAs aqui — toda a experiência lê deste arquivo.
 * Futuramente este objeto pode ser hidratado a partir do Firestore
 * (ver src/types/admin.ts → EditableContent).
 */

export const siteContent = {
  company: 'NEXUS HOLDING',

  hero: {
    title:
      'Sua empresa já entrega qualidade. A Nexus faz ela ser encontrada, escolhida e preparada para crescer.',
    subtitle:
      'Marketing, software e gestão em um parceiro só. Aceleramos empresas tradicionais com captação de clientes, sistemas sob medida e treinamento de equipe.',
    sideNote: 'Programa Nexus Digital 90 — Atrair. Operar. Evoluir.',
    exploreLabel: 'Quero um Raio-X Digital gratuito',
  },

  nav: [
    { label: 'INÍCIO', href: '#top' },
    { label: 'PROGRAMA', href: '#program' },
    { label: 'CONTATO', href: '#contact' },
  ],

  services: [
    { id: '01', title: 'Experiências Web', tag: 'FRONTEND IMERSIVO' },
    { id: '02', title: 'Instalações', tag: 'FÍSICO × DIGITAL' },
    { id: '03', title: 'Interfaces com IA', tag: 'SISTEMAS INTELIGENTES' },
    { id: '04', title: 'Sistemas Realtime', tag: 'DADOS AO VIVO / WEBGL' },
    { id: '05', title: 'Soluções Corporativas', tag: 'SOFTWARE SOB MEDIDA' },
  ],

  horizon: {
    title: 'HORIZONTES DIGITAIS HUMANIZADOS',
    caption: 'PROJETAMOS PROFUNDIDADE, NÃO PÁGINAS',
  },

  mission: {
    title: 'MISSÃO DE PRECISÃO MULTIDIMENSIONAL',
    caption: 'ATMOSFERAS ENGENHEIRADAS / RESULTADOS MEDIDOS',
  },

  final: {
    title: 'CONSTRUINDO A PRÓXIMA INTERFACE',
    ctaLabel: 'Solicitar meu Raio-X Digital gratuito',
    contactEmail: 'hello@nexusholding.studio',
  },
} as const;

export type SiteContent = typeof siteContent;
