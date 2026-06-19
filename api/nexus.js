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

const ALLOWED = new Set(["health", "clients", "client"]);

export default async function handler(req, res) {
  const BRIDGE = process.env.NEXUS_BRIDGE;
  const BRIDGE_KEY = process.env.NEXUS_BRIDGE_KEY;
  const TARGET = process.env.NEXUS_BRIDGE_TARGET || "midia";
  const API = process.env.NEXUS_API;
  const KEY = process.env.NEXUS_KEY;

  const useBridge = !!(BRIDGE && BRIDGE_KEY);
  if (!useBridge && !(API && KEY)) {
    return res.status(503).json({ error: "integracao nao configurada (defina NEXUS_BRIDGE/NEXUS_BRIDGE_KEY ou NEXUS_API/NEXUS_KEY)" });
  }

  // path = "clients" | "client" | "client/<id>" | "health"
  const raw = String(req.query.path || "").replace(/^\/+|\/+$/g, "");
  const root = raw.split("/")[0];
  if (!ALLOWED.has(root)) return res.status(400).json({ error: "rota nao permitida" });

  // somente leitura + criacao de cliente (sem exclusao)
  if (!["GET", "POST"].includes(req.method)) return res.status(405).json({ error: "metodo nao permitido" });

  try {
    const target = useBridge
      ? `${BRIDGE.replace(/\/+$/, "")}/v1/route/${TARGET}/${raw}`
      : `${API}/api/integration/${raw}`;
    const headers = {
      "x-api-key": useBridge ? BRIDGE_KEY : KEY,
      "Content-Type": "application/json",
    };
    const init = { method: req.method, headers };
    if (req.method === "POST") init.body = JSON.stringify(req.body || {});
    const r = await fetch(target, init);
    const text = await r.text();
    res.status(r.status);
    res.setHeader("Content-Type", r.headers.get("content-type") || "application/json");
    res.send(text);
  } catch (e) {
    res.status(502).json({ error: "falha ao contatar a integracao: " + e.message });
  }
}
