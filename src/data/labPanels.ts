/**
 * Painéis holográficos da galeria-laboratório (LabHolographicGallery).
 * Edite títulos, dados técnicos, posições e cores aqui.
 * Os painéis ficam dispostos AO REDOR da coluna vertebral (eixo central
 * vertical em X≈0), descendo ao longo de -Y conforme a câmera viaja.
 */

export interface LabPanel {
  id: string;
  index: string;
  title: string;
  /** linhas técnicas pequenas (mono) exibidas no painel */
  data: string[];
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number];
  accent: string;
}

export const LAB_COLORS = {
  cyan: '#69F5FF',
  blue: '#287CFF',
  violet: '#8C4DFF',
  magenta: '#FF4FD8',
  green: '#80FF9F',
  orange: '#C47A3A',
  white: '#F4FBFF',
} as const;

export const labPanels: LabPanel[] = [
  {
    id: 'secret-sky',
    index: 'SYSTEM 01',
    title: 'SECRET SKY',
    data: ['SIGNAL ACTIVE', 'NEURAL DEPTH 87%', 'ORGANIC MOTION ENABLED'],
    position: [-5, 0.6, -1],
    rotation: [0, 0.5, 0.02],
    size: [4.6, 2.9],
    accent: LAB_COLORS.cyan,
  },
  {
    id: 'humanized-horizons',
    index: 'SYSTEM 02',
    title: 'HUMANIZED HORIZONS',
    data: ['HORIZON INDEX 12.8', 'LAB SEQUENCE ONLINE', 'SYNC 0.992'],
    position: [5, -1.1, -2],
    rotation: [0, -0.5, -0.02],
    size: [5, 3.1],
    accent: LAB_COLORS.violet,
  },
  {
    id: 'sustainable-horizons',
    index: 'SYSTEM 03',
    title: 'SUSTAINABLE HORIZONS',
    data: ['BIO-LOAD 41%', 'SIGNAL ACTIVE', 'THERMAL NOMINAL'],
    position: [-5.6, -2.7, -1.5],
    rotation: [0, 0.55, 0.03],
    size: [4.6, 2.8],
    accent: LAB_COLORS.green,
  },
  {
    id: 'creative-systems',
    index: 'SYSTEM 04',
    title: 'CREATIVE SYSTEMS',
    data: ['RENDER PIPE OK', 'NEURAL DEPTH 91%', 'LATENCY 4ms'],
    position: [5.6, -4.1, -2.4],
    rotation: [0, -0.6, 0.03],
    size: [4.4, 2.7],
    accent: LAB_COLORS.blue,
  },
  {
    id: 'digital-mission',
    index: 'SYSTEM 05',
    title: 'DIGITAL MISSION',
    data: ['MISSION LOCKED', 'HORIZON INDEX 18.2', 'ORGANIC MOTION ENABLED'],
    position: [-4.8, -5.6, -1],
    rotation: [0, 0.5, -0.02],
    size: [4.6, 2.8],
    accent: LAB_COLORS.orange,
  },
  {
    id: 'multidimensional-precision',
    index: 'SYSTEM 06',
    title: 'MULTIDIMENSIONAL PRECISION',
    data: ['PRECISION 99.4%', 'LAB SEQUENCE ONLINE', 'SIGNAL ACTIVE'],
    position: [5, -7, -2],
    rotation: [0, -0.5, 0.02],
    size: [5.2, 3.1],
    accent: LAB_COLORS.magenta,
  },
];

/** Índice técnico lateral (SideTechnicalIndex), atrelado ao progresso. */
export const technicalIndex = [
  { id: '01', label: 'COIN', at: 0.0 },
  { id: '02', label: 'SPINE', at: 0.18 },
  { id: '03', label: 'HORIZONS', at: 0.42 },
  { id: '04', label: 'LAB', at: 0.82 },
] as const;
