/**
 * ============================================================
 *  Conteúdo editável do site (camada de overrides)
 * ============================================================
 *  Os textos padrão vivem em src/data/siteContent.ts e
 *  src/data/galleryContent.ts. Aqui guardamos APENAS as edições
 *  feitas no CRM (aba "Conteúdo") e as mesclamos sobre os padrões.
 *
 *  Persistência: localStorage (instantâneo, offline) + Firestore
 *  best-effort (doc content/site) para sincronizar entre dispositivos.
 *  Os componentes leem via os hooks useSiteContent / useGalleryContent
 *  e re-renderizam ao salvar.
 */
import { useEffect, useState } from 'react';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { siteContent as DEFAULTS } from '../data/siteContent';
import {
  galleryCards as DEFAULT_CARDS,
  galleryCardsMobile as DEFAULT_CARDS_MOBILE,
  type GalleryCard,
} from '../data/galleryContent';
import { getDb, isFirebaseConfigured } from './firebase';

/** Texto editável de um card 3D (somente título/tag/corpo — geometria fica fixa). */
export interface CardText {
  title?: string;
  tag?: string;
  body?: string;
}

/** Overrides — todo campo é opcional; o que faltar usa o padrão. */
export interface ContentOverrides {
  company?: string;
  hero?: { title?: string; subtitle?: string; sideNote?: string; exploreLabel?: string };
  services?: { id: string; title: string; tag: string }[];
  horizon?: { title?: string; caption?: string };
  mission?: { title?: string; caption?: string };
  final?: { title?: string; ctaLabel?: string; contactEmail?: string };
  /** textos dos cards 3D, indexados pelo id do card */
  cards?: Record<string, CardText>;
  updatedAt?: number;
}

/** siteContent resolvido (mesma forma do padrão, porém mutável). */
export type ResolvedSite = {
  company: string;
  hero: { title: string; subtitle: string; sideNote: string; exploreLabel: string };
  nav: readonly { label: string; href: string }[];
  services: { id: string; title: string; tag: string }[];
  horizon: { title: string; caption: string };
  mission: { title: string; caption: string };
  final: { title: string; ctaLabel: string; contactEmail: string };
};

const LS_KEY = 'nexus_site_content';
const EVENT = 'nexus_content_changed';

let overrides: ContentOverrides = readLocal();

function readLocal(): ContentOverrides {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}') as ContentOverrides;
  } catch {
    return {};
  }
}

function writeLocal(next: ContentOverrides) {
  overrides = next;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
  window.dispatchEvent(new Event(EVENT));
}

/* --------------------------------------------------- merge → resolvido */
export function resolveSite(o: ContentOverrides = overrides): ResolvedSite {
  const byId = new Map((o.services ?? []).map((s) => [s.id, s]));
  return {
    company: o.company ?? DEFAULTS.company,
    hero: {
      title: o.hero?.title ?? DEFAULTS.hero.title,
      subtitle: o.hero?.subtitle ?? DEFAULTS.hero.subtitle,
      sideNote: o.hero?.sideNote ?? DEFAULTS.hero.sideNote,
      exploreLabel: o.hero?.exploreLabel ?? DEFAULTS.hero.exploreLabel,
    },
    nav: DEFAULTS.nav,
    services: DEFAULTS.services.map((s) => ({
      id: s.id,
      title: byId.get(s.id)?.title ?? s.title,
      tag: byId.get(s.id)?.tag ?? s.tag,
    })),
    horizon: {
      title: o.horizon?.title ?? DEFAULTS.horizon.title,
      caption: o.horizon?.caption ?? DEFAULTS.horizon.caption,
    },
    mission: {
      title: o.mission?.title ?? DEFAULTS.mission.title,
      caption: o.mission?.caption ?? DEFAULTS.mission.caption,
    },
    final: {
      title: o.final?.title ?? DEFAULTS.final.title,
      ctaLabel: o.final?.ctaLabel ?? DEFAULTS.final.ctaLabel,
      contactEmail: o.final?.contactEmail ?? DEFAULTS.final.contactEmail,
    },
  };
}

function applyCardText(cards: GalleryCard[], o: ContentOverrides): GalleryCard[] {
  const map = o.cards ?? {};
  return cards.map((c) => {
    const t = map[c.id];
    if (!t) return c;
    return {
      ...c,
      title: t.title ?? c.title,
      tag: t.tag ?? c.tag,
      body: t.body ?? c.body,
    };
  });
}

export function resolveCards(isMobile: boolean, o: ContentOverrides = overrides): GalleryCard[] {
  return applyCardText(isMobile ? DEFAULT_CARDS_MOBILE : DEFAULT_CARDS, o);
}

/* --------------------------------------------------- leitura/escrita */
export function getOverrides(): ContentOverrides {
  return overrides;
}

/** lista de cards padrão (id/title/tag/body) p/ montar o editor */
export const editableCards = DEFAULT_CARDS.map((c) => ({
  id: c.id,
  title: c.title,
  tag: c.tag,
  body: c.body ?? '',
  accent: c.accent,
}));

/** Salva os overrides (mescla local + Firestore best-effort). */
export async function saveContent(next: ContentOverrides): Promise<void> {
  const payload = { ...next, updatedAt: Date.now() };
  writeLocal(payload);
  if (isFirebaseConfigured) {
    try {
      const db = getDb();
      if (db) await setDoc(doc(db, 'content', 'site'), payload, { merge: true });
    } catch {
      /* offline → fica só no localStorage */
    }
  }
}

/** Hidrata do Firestore na carga (uma vez) e mantém sincronizado. */
function subscribe(cb: () => void): () => void {
  const onLocal = () => cb();
  window.addEventListener(EVENT, onLocal);
  window.addEventListener('storage', onLocal);

  let unsub = () => {};
  if (isFirebaseConfigured) {
    try {
      const db = getDb();
      if (db) {
        const ref = doc(db, 'content', 'site');
        // primeira leitura para hidratar mesmo sem mudanças
        getDoc(ref)
          .then((snap) => {
            if (snap.exists()) {
              overrides = snap.data() as ContentOverrides;
              window.dispatchEvent(new Event(EVENT));
            }
          })
          .catch(() => {});
        const u = onSnapshot(
          ref,
          (snap) => {
            if (snap.exists()) {
              overrides = snap.data() as ContentOverrides;
              cb();
            }
          },
          () => {},
        );
        unsub = () => u();
      }
    } catch {
      /* ignore */
    }
  }

  return () => {
    window.removeEventListener(EVENT, onLocal);
    window.removeEventListener('storage', onLocal);
    unsub();
  };
}

/* --------------------------------------------------- hooks React */
export function useSiteContent(): ResolvedSite {
  const [site, setSite] = useState<ResolvedSite>(() => resolveSite());
  useEffect(() => subscribe(() => setSite(resolveSite())), []);
  return site;
}

export function useGalleryContent(isMobile: boolean): GalleryCard[] {
  const [cards, setCards] = useState<GalleryCard[]>(() => resolveCards(isMobile));
  useEffect(() => subscribe(() => setCards(resolveCards(isMobile))), [isMobile]);
  return cards;
}
