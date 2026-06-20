// Troca o Firebase ID token (header Authorization: Bearer) por um cookie de
// sessao httpOnly same-origin. Necessario porque <img>/<a> dos entregaveis nao
// enviam header — mas enviam o cookie. O proxy /api/nexus aceita os dois.
import { authAdmin } from "./_auth.js";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const r = await authAdmin(req); // valida o Bearer
    if (!r.ok) return res.status(r.status).json({ error: r.error });
    const token = (req.headers.authorization || "").slice(7).trim();
    // Max-Age ~ vida do ID token (1h). O front renova via onIdTokenChanged.
    res.setHeader(
      "Set-Cookie",
      `nx_sess=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3500`
    );
    return res.status(200).json({ ok: true });
  }
  if (req.method === "DELETE") {
    res.setHeader("Set-Cookie", "nx_sess=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0");
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: "metodo nao permitido" });
}
