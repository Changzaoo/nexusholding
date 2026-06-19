/**
 * ============================================================
 *  Sincronização CRM Nexus  <->  Fábrica de Mídia (Nexus Digital 90)
 * ------------------------------------------------------------
 *  O CRM é o único lado com acesso aos dois mundos (Firestore +
 *  Nexus Bridge), então ele orquestra a sincronização NOS DOIS
 *  SENTIDOS, pela Bridge:
 *
 *   • Mídia -> CRM : puxa os clientes da fábrica e cria/atualiza
 *                    em `clientes` do CRM (casando por crmId/midiaId).
 *   • CRM  -> Mídia: empurra clientes do CRM que ainda não existem
 *                    na fábrica (POST client, vinculando o crmId).
 *
 *  É idempotente: rodar várias vezes não duplica. A ligação é o par
 *  (Cliente.midiaId no CRM) <-> (briefing.crmId na fábrica), e
 *  converge — um cliente empurrado do CRM volta no próximo pull já
 *  com crmId, e aí ganha o midiaId.
 * ============================================================
 */
import {
  clientesStore,
  leadsStore,
  type Cliente,
  type Lead,
  type BaseRecord,
  type Store,
} from './crm';
import {
  listDashClients,
  upsertDashClient,
  getDashClient,
  type DashClient,
} from './nexusBridge';

/** Lê o estado atual de uma coleção uma única vez (subscribe + unsubscribe). */
function readOnce<T extends BaseRecord>(store: Store<T>): Promise<T[]> {
  return new Promise((resolve) => {
    let unsub: (() => void) | null = null;
    let done = false;
    const finish = (items: T[]) => {
      if (done) return;
      done = true;
      // o unsub pode ainda não ter sido atribuído (emissão síncrona): adia.
      queueMicrotask(() => unsub?.());
      resolve(items);
    };
    unsub = store.subscribe(finish);
  });
}

/** Transforma um slug ("marcenaria-silva") num nome legível ("Marcenaria Silva"). */
function prettify(slug: string): string {
  return slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

/** Normaliza um nome para casamento (sem acentos, só letras/números). */
function norm(s?: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');
}

/**
 * Métricas/contadores da Mídia projetados nos campos do Cliente.
 * NÃO inclui chaves `undefined` — o Firestore as rejeita e isso derrubaria
 * o store para o modo local (fazendo registros "sumirem" da nuvem).
 */
function midiaSnapshot(d: DashClient): Partial<Cliente> {
  const snap: Partial<Cliente> = {
    midiaId: d.id,
    midiaEtapas: d.etapasConcluidas,
    midiaMateriais: d.materiais,
    midiaAguardando: d.aguardandoAprovacao,
    midiaSyncedAt: Date.now(),
  };
  if (d.metrics) {
    snap.midiaReceita = d.metrics.receita;
    snap.midiaRoas = d.metrics.roas;
  }
  return snap;
}

export interface SyncResult {
  pulledCriados: number; // clientes da Mídia criados no CRM
  pulledAtualizados: number; // clientes vinculados/atualizados no CRM
  pushed: number; // clientes do CRM enviados para a Mídia
  leadsCriados: number; // leads "novo" criados no pipeline a partir da Mídia
  total: number; // total de clientes na Mídia após o sync
  error?: string;
}

/**
 * Executa a sincronização bidirecional completa.
 * Seguro chamar de tempos em tempos / em todo carregamento.
 */
export async function syncMidia(): Promise<SyncResult> {
  const res: SyncResult = { pulledCriados: 0, pulledAtualizados: 0, pushed: 0, leadsCriados: 0, total: 0 };
  try {
    const [dash, crm, leadsAtuais] = await Promise.all([
      listDashClients(),
      readOnce(clientesStore),
      readOnce(leadsStore),
    ]);
    res.total = dash.length;

    // índices para casar os dois lados
    const crmById = new Map(crm.map((c) => [c.id, c]));
    const crmByMidia = new Map(crm.filter((c) => c.midiaId).map((c) => [c.midiaId as string, c]));
    const crmByNome = new Map(crm.filter((c) => c.name?.trim()).map((c) => [norm(c.name), c]));
    const midiaLinkedCrmIds = new Set(dash.map((d) => (d.crmId || '').trim()).filter(Boolean));
    const midiaSlugs = new Set(dash.map((d) => d.id));

    /* ---------- Mídia -> CRM ---------- */
    for (const d of dash) {
      const snap = midiaSnapshot(d);
      // 1) já vinculado por midiaId
      const byMidia = crmByMidia.get(d.id);
      if (byMidia) {
        await clientesStore.update(byMidia.id, snap);
        res.pulledAtualizados++;
        continue;
      }
      // 2) a Mídia aponta para um cliente do CRM (crmId) ainda sem midiaId
      const linked = d.crmId ? crmById.get(d.crmId.trim()) : undefined;
      if (linked) {
        await clientesStore.update(linked.id, {
          ...snap,
          segment: linked.segment || d.nicho || undefined,
          city: linked.city || d.cidade || undefined,
        });
        res.pulledAtualizados++;
        continue;
      }
      // 3) já existe um cliente no CRM com o mesmo nome -> vincula (não duplica)
      const byNome = crmByNome.get(norm(d.id)) || crmByNome.get(norm(prettify(d.id)));
      if (byNome) {
        await clientesStore.update(byNome.id, snap);
        res.pulledAtualizados++;
        continue;
      }
      // 4) cliente que só existe na Mídia -> cria no CRM
      await clientesStore.create({
        name: prettify(d.id),
        segment: d.nicho || undefined,
        city: d.cidade || undefined,
        origin: 'midia',
        ...snap,
      } as Omit<Cliente, 'id' | 'createdAt'>);
      res.pulledCriados++;
    }

    /* ---------- CRM -> Mídia ---------- */
    for (const c of crm) {
      const jaNaMidia = (c.midiaId && midiaSlugs.has(c.midiaId)) || midiaLinkedCrmIds.has(c.id);
      if (jaNaMidia || !c.name?.trim()) continue;
      await upsertDashClient({
        nome: c.name,
        crmId: c.id,
        brief: { nicho: c.segment, cidade: c.city },
      });
      res.pushed++;
    }

    /* ---------- pipeline: cada cliente da Mídia vira um lead "novo" ----------
       (idempotente: não duplica nem reseta quem já foi reclassificado) */
    const leadByMidia = new Map(leadsAtuais.filter((l) => l.midiaId).map((l) => [l.midiaId as string, l]));
    const leadByNome = new Map(leadsAtuais.filter((l) => l.name?.trim()).map((l) => [norm(l.name), l]));
    for (const d of dash) {
      if (leadByMidia.has(d.id)) continue;
      if (leadByNome.has(norm(d.id)) || leadByNome.has(norm(prettify(d.id)))) continue;
      await leadsStore.create({
        name: prettify(d.id),
        email: '',
        segment: d.nicho || undefined,
        source: 'midia',
        status: 'novo',
        midiaId: d.id,
        notes: '',
      } as Omit<Lead, 'id' | 'createdAt'>);
      res.leadsCriados++;
    }
  } catch (e: any) {
    res.error = e?.message || String(e);
  }
  return res;
}

/** Entregáveis (pastas/arquivos) gerados na Mídia para um cliente. */
export interface Entregavel {
  folder: string;
  file: string;
}
export async function listEntregaveis(midiaId: string): Promise<Entregavel[]> {
  const r = (await getDashClient(midiaId)) as { materiais?: Entregavel[] };
  return (r.materiais || []).filter((m) => m.file);
}

/** Rótulo amigável das pastas/etapas da fábrica. */
export const FOLDER_LABEL: Record<string, string> = {
  '00-diagnostico': 'Diagnóstico (Raio-X)',
  '01-proposta': 'Proposta',
  '02-presenca-digital': 'Presença digital',
  '03-conteudo': 'Conteúdo',
  '04-artes': 'Artes / Assets',
  '05-atendimento': 'Atendimento / CRM',
  '06-treinamento': 'Treinamento',
  '07-campanha': 'Campanha',
  '_aguardando-board': 'Aguardando aprovação',
  '(raiz)': 'Geral',
};
