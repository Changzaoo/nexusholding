/**
 * ============================================================
 *  Ponte segura: CRM Nexus  ->  Dashboard de Marketing
 * ============================================================
 *  Conecta o CRM (postflow) ao painel de marketing (garden-backup)
 *  via API de integração protegida por chave.
 *
 *  Configure em .env (NAO versionar):
 *    VITE_NEXUS_API=https://SEU-BACKEND.onrender.com   (ou http://localhost:5181 em dev)
 *    VITE_NEXUS_KEY=nxs_...                              (a mesma INTEGRATION_KEY do backend)
 *
 *  A API so expoe operacoes NAO destrutivas e dados escopados
 *  (sem conteudo dos materiais, sem exclusao), entao mesmo um
 *  vazamento da chave tem impacto limitado. Para seguranca maxima,
 *  use um proxy serverless guardando a chave no servidor.
 * ============================================================
 */
const API = (import.meta as any).env?.VITE_NEXUS_API || "";
const KEY = (import.meta as any).env?.VITE_NEXUS_KEY || "";
// Em produção: usa o proxy serverless /api/nexus (chave só no servidor).
// Em dev: se VITE_NEXUS_API + VITE_NEXUS_KEY existirem, chama o dashboard direto.
const DIRECT = !!(API && KEY);

async function j(r: Response) {
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((d as any).error || r.statusText);
  return d;
}

/** Roteia para o dashboard direto (dev) ou para o proxy serverless (prod). */
async function call(path: string, init: RequestInit = {}) {
  const url = DIRECT
    ? `${API}/api/integration/${path}`
    : `/api/nexus?path=${encodeURIComponent(path)}`;
  const headers: Record<string, string> = { "Content-Type": "application/json", ...((init.headers as any) || {}) };
  if (DIRECT) headers["x-api-key"] = KEY;
  return j(await fetch(url, { ...init, headers }));
}

export interface DashClient {
  id: string;
  nicho: string | null;
  cidade: string | null;
  telefone: string | null;
  responsavel: string | null;
  materiais: number;
  aguardandoAprovacao: number;
  etapasConcluidas: number;
  metrics: { ticket: number; verba: number; leads: number; vendas: number; receita: number; roas: number } | null;
  crmId: string | null;
}

/** Sempre disponível: usa proxy em prod, modo direto em dev. */
export const nexusEnabled = (): boolean => true;

export async function dashHealth() {
  return call("health");
}

export async function listDashClients(): Promise<DashClient[]> {
  const r = await call("clients");
  return (r as { clients: DashClient[] }).clients;
}

export async function getDashClient(id: string) {
  return call(`client/${encodeURIComponent(id)}`);
}

export async function upsertDashClient(input: {
  nome: string;
  crmId?: string;
  brief?: Record<string, unknown>;
}) {
  return call("client", { method: "POST", body: JSON.stringify(input) });
}

/* ----------------------------------------------------------------------------
 * URLs de entregáveis (miniatura / download / dossiê) — sempre pelo proxy
 * serverless (/api/nexus), que guarda a chave no servidor. Usadas direto em
 * <img src> e <a href>/window.open, por isso retornam URL (não fazem fetch).
 * -------------------------------------------------------------------------- */
function proxyUrl(path: string, params: Record<string, string> = {}): string {
  const sp = new URLSearchParams({ path, ...params });
  return `/api/nexus?${sp.toString()}`;
}

/** Byte bruto de um material da Mídia (miniatura/preview, ou download se `download`). */
export function entregaRawUrl(midiaId: string, folder: string, file: string, download = false): string {
  const p: Record<string, string> = { folder, file };
  if (download) p.download = '1';
  return proxyUrl(`client/${midiaId}/raw`, p);
}

/** Material .md renderizado como documento PDF-ready (abre para imprimir/salvar). */
export function entregaDocHtmlUrl(midiaId: string, folder: string, file: string): string {
  return proxyUrl(`client/${midiaId}/doc-html`, { folder, file });
}

/** Download em lote dos materiais (pdf = dossiê de textos, zip = tudo, md = textos). */
export function entregaBundleUrl(
  midiaId: string,
  items: { folder: string; file: string }[],
  format: 'pdf' | 'zip' | 'md',
): string {
  return proxyUrl(`client/${midiaId}/bundle`, { format, items: JSON.stringify(items) });
}