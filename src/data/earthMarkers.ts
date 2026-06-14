/**
 * Marcadores fixados sobre os CONTINENTES REAIS da Terra.
 * Cada ponto liga uma região geográfica a um conteúdo real da Nexus Holding.
 * lat/lon em graus (WGS84 aproximado da região-âncora).
 */
import { ACCENTS } from './galleryContent';

export interface EarthMarker {
  id: string;
  /** continente / âncora geográfica */
  region: string;
  /** título do conteúdo real */
  title: string;
  /** legenda curta */
  caption: string;
  lat: number;
  lon: number;
  accent: string;
}

export const earthMarkers: EarthMarker[] = [
  {
    id: 'hq',
    region: 'América do Sul · Brasil',
    title: 'Programa Nexus Digital 90',
    caption: 'Atrair · Operar · Evoluir — base de operações',
    lat: -23.55,
    lon: -46.63, // São Paulo
    accent: ACCENTS.cyan,
  },
  {
    id: 'atrair',
    region: 'América do Norte',
    title: 'ATRAIR',
    caption: 'Captação de clientes · Ads · Landing pages',
    lat: 39.5,
    lon: -98.35,
    accent: ACCENTS.violet,
  },
  {
    id: 'operar',
    region: 'Europa',
    title: 'OPERAR',
    caption: 'CRM · Financeiro · Software sob medida',
    lat: 50.1,
    lon: 9.0,
    accent: ACCENTS.acid,
  },
  {
    id: 'evoluir',
    region: 'Ásia',
    title: 'EVOLUIR',
    caption: 'Treinamento de equipe · Melhoria contínua',
    lat: 34.0,
    lon: 100.0,
    accent: ACCENTS.blue,
  },
  {
    id: 'ia',
    region: 'África',
    title: 'Interfaces com IA',
    caption: 'Sistemas inteligentes',
    lat: 2.0,
    lon: 21.0,
    accent: ACCENTS.magenta,
  },
  {
    id: 'realtime',
    region: 'Oceania',
    title: 'Sistemas Realtime',
    caption: 'Dados ao vivo · WebGL',
    lat: -25.0,
    lon: 134.0,
    accent: ACCENTS.white,
  },
];

/** lat/lon (graus) → posição na esfera (raio r), compatível com a UV
 *  equiretangular padrão do SphereGeometry do three.js. */
export function latLonToVec3(
  lat: number,
  lon: number,
  r: number,
): [number, number, number] {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return [
    -(r * Math.sin(phi) * Math.cos(theta)),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  ];
}
