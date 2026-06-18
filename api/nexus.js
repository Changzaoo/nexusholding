// Proxy serverless (Vercel) — CRM -> Dashboard de Marketing.
// A chave de integracao fica SO no servidor (env NEXUS_KEY), nunca no frontend.
// Env vars no projeto Vercel do CRM:
//   NEXUS_API = https://SEU-BACKEND.onrender.com
//   NEXUS_KEY = nxs_...   (mesma INTEGRATION_KEY do backend)

const ALLOWED = new Set(["health", "clients", "client"]);

export default async function handler(req, res) {
  const API = process.env.NEXUS_API;
  const KEY = process.env.NEXUS_KEY;
  if (!API || !KEY) return res.status(503).json({ error: "integracao nao configurada (NEXUS_API / NEXUS_KEY)" });

  // path = "clients" | "client" | "client/<id>" | "health"
  const raw = String(req.query.path || "").replace(/^\/+|\/+$/g, "");
  const root = raw.split("/")[0];
  if (!ALLOWED.has(root)) return res.status(400).json({ error: "rota nao permitida" });

  // somente leitura + criacao de cliente (sem exclusao)
  if (!["GET", "POST"].includes(req.method)) return res.status(405).json({ error: "metodo nao permitido" });

  try {
    const target = `${API}/api/integration/${raw}`;
    const init = { method: req.method, headers: { "x-api-key": KEY, "Content-Type": "application/json" } };
    if (req.method === "POST") init.body = JSON.stringify(req.body || {});
    const r = await fetch(target, init);
    const text = await r.text();
    res.status(r.status);
    res.setHeader("Content-Type", r.headers.get("content-type") || "application/json");
    res.send(text);
  } catch (e) {
    res.status(502).json({ error: "falha ao contatar o dashboard: " + e.message });
  }
}