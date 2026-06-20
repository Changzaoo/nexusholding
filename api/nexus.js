// Proxy serverless (Vercel) — CRM -> Nexus Bridge -> Dashboard de Marketing.
// A chave fica SO no servidor (env), nunca no frontend.
//
// Modo preferido (via Nexus Bridge, api.nexusholding.xyz):
//   NEXUS_BRIDGE     = https://api.nexusholding.xyz
//   NEXUS_BRIDGE_KEY = nxb_...   (chave de entrada do CRM na Bridge = KEY_CRM)
//   NEXUS_BRIDGE_TARGET = midia  (opcional; default "midia")
//
// Modo legado (direto no backend da Midia, sem Bridge) — fallback:
//   NEXUS_API = https://nexus-midia-api.onrender.com
//   NEXUS_KEY = nxs_...   (a INTEGRATION_KEY do backend)
//
// SEGURANCA: a allowlist valida o PATH INTEIRO (nao so o 1o segmento),
// e cada parametro (folder/file/items/format/download) e validado antes
// de ir ao upstream — impede path traversal, route confusion (../ que
// escaparia do target na Bridge) e IDOR de arquivos arbitrarios.

import { authAdmin, ENFORCE } from "./_auth.js";

// Rotas exatas permitidas. O slug do cliente e restrito a [a-z0-9-].
const PATH_OK = /^(health|clients|client|client\/[a-z0-9][a-z0-9-]{0,63}(\/(raw|doc-html|bundle))?)$/;
const SAFE_FOLDER = /^[A-Za-z0-9_()][A-Za-z0-9 _()-]{0,63}$/; // sem "/", "\" nem ".."
const SAFE_FILE = /^[A-Za-z0-9][A-Za-z0-9 ._-]{0,127}$/;       // idem
const FORMATS = new Set(["pdf", "zip", "md"]);
// content-types que o browser RENDERIZA como documento (vetor de XSS armazenado)
const RENDERABLE = /^(text\/html|image\/svg\+xml|application\/xhtml\+xml)/i;

const bad = (v) => v == null || v.includes("..") || v.includes("/") || v.includes("\\");

export default async function handler(req, res) {
  const BRIDGE = process.env.NEXUS_BRIDGE;
  const BRIDGE_KEY = process.env.NEXUS_BRIDGE_KEY;
  const TARGET = process.env.NEXUS_BRIDGE_TARGET || "midia";
  const API = process.env.NEXUS_API;
  const KEY = process.env.NEXUS_KEY;

  const useBridge = !!(BRIDGE && BRIDGE_KEY);
  if (!useBridge && !(API && KEY)) {
    return res.status(503).json({ error: "integracao nao configurada" });
  }

  if (!["GET", "POST"].includes(req.method)) return res.status(405).json({ error: "metodo nao permitido" });

  // --- autenticacao do chamador (admin Firebase) ---
  // health e publico (checagem de saude). Demais rotas exigem admin quando
  // ENFORCE_AUTH=true. Em modo transicao (flag off) so registra a ausencia.
  const rawPath = String(req.query.path || "").replace(/^\/+|\/+$/g, "");
  if (rawPath !== "health") {
    const auth = await authAdmin(req);
    if (!auth.ok) {
      if (ENFORCE) return res.status(auth.status).json({ error: auth.error });
      console.warn("[api/nexus] sem auth valida (ENFORCE_AUTH off):", auth.error);
    }
  }

  // --- valida o PATH inteiro contra a allowlist (nao so o 1o segmento) ---
  const raw = String(req.query.path || "").replace(/^\/+|\/+$/g, "");
  if (!PATH_OK.test(raw)) return res.status(400).json({ error: "rota nao permitida" });
  // POST so e aceito na criacao de cliente (rota "client")
  if (req.method === "POST" && raw !== "client") return res.status(405).json({ error: "metodo nao permitido nesta rota" });

  // --- valida e reconstroi a query extra (so chaves conhecidas) ---
  const q = req.query;
  const one = (v) => (Array.isArray(v) ? v[0] : v);
  const extra = new URLSearchParams();
  if (q.folder != null) {
    const folder = String(one(q.folder));
    if (!SAFE_FOLDER.test(folder)) return res.status(400).json({ error: "folder invalido" });
    extra.set("folder", folder);
  }
  if (q.file != null) {
    const file = String(one(q.file));
    if (!SAFE_FILE.test(file) || bad(file)) return res.status(400).json({ error: "file invalido" });
    extra.set("file", file);
  }
  if (q.format != null) {
    const format = String(one(q.format));
    if (!FORMATS.has(format)) return res.status(400).json({ error: "format invalido" });
    extra.set("format", format);
  }
  if (q.download != null) extra.set("download", one(q.download) ? "1" : "0");
  if (q.items != null) {
    let items;
    try { items = JSON.parse(String(one(q.items))); } catch { return res.status(400).json({ error: "items invalido" }); }
    if (!Array.isArray(items) || items.length > 200) return res.status(400).json({ error: "items invalido" });
    const clean = [];
    for (const it of items) {
      const folder = String(it?.folder ?? "");
      const file = String(it?.file ?? "");
      if (!SAFE_FOLDER.test(folder) || !SAFE_FILE.test(file) || bad(file)) return res.status(400).json({ error: "items invalido" });
      clean.push({ folder, file });
    }
    extra.set("items", JSON.stringify(clean));
  }
  const qs = extra.toString();

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const base = useBridge
      ? `${BRIDGE.replace(/\/+$/, "")}/v1/route/${TARGET}/${raw}`
      : `${API}/api/integration/${raw}`;
    const target = base + (qs ? `?${qs}` : "");
    const headers = {
      "x-api-key": useBridge ? BRIDGE_KEY : KEY,
      "Content-Type": "application/json",
    };
    const init = { method: req.method, headers, redirect: "manual", signal: ctrl.signal };
    if (req.method === "POST") init.body = JSON.stringify(req.body || {});
    const r = await fetch(target, init);
    // le como binario para nao corromper imagens/ZIP/PDF (e tambem serve texto/JSON)
    const buf = Buffer.from(await r.arrayBuffer());
    res.status(r.status);
    const ct = r.headers.get("content-type") || "application/json";
    res.setHeader("Content-Type", ct);
    res.setHeader("X-Content-Type-Options", "nosniff");
    // entregaveis sao conteudo NAO confiavel (vem da fabrica/IA). Se o tipo for
    // renderizavel (HTML/SVG), isola num sandbox sem scripts -> mata XSS armazenado.
    if (RENDERABLE.test(ct)) res.setHeader("Content-Security-Policy", "sandbox allow-downloads");
    const cd = r.headers.get("content-disposition");
    if (cd) res.setHeader("Content-Disposition", cd);
    res.send(buf);
  } catch (e) {
    const aborted = e?.name === "AbortError";
    console.error("[api/nexus] falha:", e?.message);
    res.status(aborted ? 504 : 502).json({ error: aborted ? "tempo esgotado" : "falha ao contatar a integracao" });
  } finally {
    clearTimeout(timer);
  }
}
