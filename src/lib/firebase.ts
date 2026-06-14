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
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

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
    db = getFirestore(app!);
  }
  return db;
}

/** Login do admin via e-mail/senha (Firebase Auth). */
export async function adminSignIn(email: string, password: string): Promise<User> {
  if (!isFirebaseConfigured) {
    throw new Error(
      'Firebase não configurado. Preencha as credenciais em src/lib/firebase.ts.',
    );
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

export async function adminSignOut(): Promise<void> {
  if (!isFirebaseConfigured) return;
  await signOut(getFirebaseAuth());
}
