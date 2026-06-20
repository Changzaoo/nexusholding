/**
 * ============================================================
 *  FIREBASE — CONFIGURAÇÃO
 * ============================================================
 *  🔑 COLE SUAS CREDENCIAIS REAIS ABAIXO (Console Firebase →
 *  Configurações do projeto → Seus apps → SDK Web).
 *
 *  Enquanto os placeholders "YOUR_..." existirem, o app roda
 *  normalmente e o login admin exibe um aviso amigável.
 * ============================================================
 */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  onIdTokenChanged,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  type Auth,
  type User,
} from 'firebase/auth';
import { initializeFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyD-jy0zCN6v_I7yR7qBOj8X35MIezTE_n4',
  authDomain: 'postflow-b893f.firebaseapp.com',
  projectId: 'postflow-b893f',
  storageBucket: 'postflow-b893f.firebasestorage.app',
  messagingSenderId: '65425728755',
  appId: '1:65425728755:web:573851647b3c048c9b8386',
  measurementId: 'G-0PR75B07K1',
};

/** true somente quando todas as credenciais reais foram preenchidas */
export const isFirebaseConfigured = !Object.values(firebaseConfig).some((v) =>
  v.startsWith('YOUR_'),
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

function getFirebaseAuth(): Auth {
  if (!auth) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  }
  return auth;
}

/** Firestore (ou null se o Firebase não estiver configurado). */
export function getDb(): Firestore | null {
  if (!isFirebaseConfigured) return null;
  if (!db) {
    getFirebaseAuth(); // garante app inicializado
    // ignoreUndefinedProperties: campos `undefined` são ignorados em vez de
    // lançarem erro — evita que um create/update falhe e o store caia para
    // o modo local (o que faria registros "sumirem" da nuvem).
    db = initializeFirestore(app!, { ignoreUndefinedProperties: true });
  }
  return db;
}

/** Login do admin via e-mail/senha (Firebase Auth). */
export async function adminSignIn(
  email: string,
  password: string,
  remember = true,
): Promise<User> {
  if (!isFirebaseConfigured) {
    throw new Error(
      'Firebase não configurado. Preencha as credenciais em src/lib/firebase.ts.',
    );
  }
  // "manter conectado": local persiste após fechar o navegador; session só na aba atual.
  await setPersistence(
    getFirebaseAuth(),
    remember ? browserLocalPersistence : browserSessionPersistence,
  );
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('nexus_keep', remember ? '1' : '0');
  }
  const credential = await signInWithEmailAndPassword(
    getFirebaseAuth(),
    email,
    password,
  );

  /*
   * ============================================================
   *  🔒 AUTORIZAÇÃO REAL — ATIVAR DEPOIS
   * ============================================================
   *  O atalho da tecla "G" é apenas uma camada visual/oculta.
   *  A segurança de verdade vem daqui. Quando tiver Firestore,
   *  descomente o bloco abaixo para validar que o usuário está
   *  na coleção "admins" (ou use custom claims via Admin SDK):
   *
   *    import { getFirestore, doc, getDoc } from 'firebase/firestore';
   *    const db = getFirestore(app!);
   *    const adminDoc = await getDoc(doc(db, 'admins', credential.user.uid));
   *    if (!adminDoc.exists()) {
   *      await signOut(getFirebaseAuth());
   *      throw new Error('Esta conta não tem permissão de admin.');
   *    }
   *
   *  Alternativa com custom claims:
   *    const token = await credential.user.getIdTokenResult();
   *    if (!token.claims.admin) { ... }
   * ============================================================
   */

  return credential.user;
}

/** Observa o estado de autenticação. Retorna função de unsubscribe. */
export function watchAuth(callback: (user: User | null) => void): () => void {
  if (!isFirebaseConfigured) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(getFirebaseAuth(), callback);
}

/** ID token atual do admin logado (ou null). Usado para autenticar o proxy. */
export async function getIdToken(): Promise<string | null> {
  if (!isFirebaseConfigured) return null;
  const u = getFirebaseAuth().currentUser;
  return u ? u.getIdToken() : null;
}

/** Sincroniza o cookie de sessão httpOnly do proxy com o estado de login.
 *  Necessário para <img>/<a> dos entregáveis (não enviam header). */
async function syncSession(user: User | null): Promise<void> {
  try {
    if (user) {
      const token = await user.getIdToken();
      await fetch('/api/session', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    } else {
      await fetch('/api/session', { method: 'DELETE' });
    }
  } catch {
    /* não bloqueia a UI; o proxy ainda aceita Bearer nas chamadas fetch */
  }
}

/** Mantém o cookie de sessão do proxy em dia (login, logout e refresh de token,
 *  que ocorre a cada ~1h). Chamar uma vez no boot do app. */
export function startSessionSync(): () => void {
  if (!isFirebaseConfigured) return () => {};
  return onIdTokenChanged(getFirebaseAuth(), (u) => { void syncSession(u); });
}

export async function adminSignOut(): Promise<void> {
  if (!isFirebaseConfigured) return;
  await signOut(getFirebaseAuth());
}

/** Usuário autenticado atual (ou null). */
export function currentUser(): User | null {
  if (!isFirebaseConfigured) return null;
  return getFirebaseAuth().currentUser;
}

/** Atualiza o nome de exibição do usuário logado. */
export async function updateDisplayName(name: string): Promise<void> {
  const u = getFirebaseAuth().currentUser;
  if (!u) throw new Error('Ninguém autenticado.');
  await updateProfile(u, { displayName: name.trim() });
}

/** Troca a senha. O Firebase exige reautenticar com a senha atual antes. */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const u = getFirebaseAuth().currentUser;
  if (!u || !u.email) throw new Error('Ninguém autenticado.');
  const cred = EmailAuthProvider.credential(u.email, currentPassword);
  await reauthenticateWithCredential(u, cred);
  await updatePassword(u, newPassword);
}

/** Liga/desliga "manter conectado" neste dispositivo (vale a partir do próximo login/carregamento). */
export async function setKeepLogged(remember: boolean): Promise<void> {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('nexus_keep', remember ? '1' : '0');
  }
  if (isFirebaseConfigured) {
    await setPersistence(
      getFirebaseAuth(),
      remember ? browserLocalPersistence : browserSessionPersistence,
    );
  }
}

/** Lê a preferência "manter conectado" (padrão: ligado). */
export function isKeepLogged(): boolean {
  if (typeof localStorage === 'undefined') return true;
  return localStorage.getItem('nexus_keep') !== '0';
}
