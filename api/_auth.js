// Verificacao de Firebase ID token no serverless (sem service account):
// jose valida a assinatura RS256 contra as chaves publicas do Google e checa
// issuer/audience do projeto. Usado pelo proxy /api/nexus e por /api/session.
//
// Arquivos com prefixo "_" NAO viram rota na Vercel — e so um helper.
import { jwtVerify, createRemoteJWKSet } from "jose";

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "postflow-b893f";
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "vinicius@nexus.com")
  .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

// Quando "true", o proxy EXIGE admin autenticado. Deixe desligado ate confirmar
// (nos logs) que os tokens chegam validos; depois ative para impor.
export const ENFORCE = process.env.ENFORCE_AUTH === "true";

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

export async function verifyFirebaseToken(token) {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `https://securetoken.google.com/${PROJECT_ID}`,
    audience: PROJECT_ID,
  });
  return payload; // { sub, email, ... }
}

/** Le o token de Authorization: Bearer OU do cookie de sessao nx_sess. */
export function readToken(req) {
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
  const cookie = req.headers.cookie || "";
  const m = cookie.match(/(?:^|;\s*)nx_sess=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function isAdminEmail(email) {
  return !!email && ADMIN_EMAILS.includes(String(email).toLowerCase());
}

/** { ok:true, user } | { ok:false, status, error } */
export async function authAdmin(req) {
  const token = readToken(req);
  if (!token) return { ok: false, status: 401, error: "nao autenticado" };
  try {
    const p = await verifyFirebaseToken(token);
    if (!isAdminEmail(p.email)) return { ok: false, status: 403, error: "sem permissao" };
    return { ok: true, user: p };
  } catch {
    return { ok: false, status: 401, error: "token invalido" };
  }
}
