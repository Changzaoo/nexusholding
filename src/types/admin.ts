/**
 * Tipos do painel administrativo.
 * Preparados para futura persistência no Firestore:
 *   collection: "content" → doc: "site"   (EditableContent)
 *   collection: "admins"  → doc: <uid>    (AdminRecord, para autorização)
 */

export interface AdminUser {
  uid: string;
  email: string | null;
}

/** Conteúdo editável do site — espelha src/data/siteContent.ts */
export interface EditableContent {
  heroTitle: string;
  heroSubtitle: string;
  services: EditableService[];
  contactCta: string;
  /** epoch ms — preenchido ao salvar no Firestore */
  updatedAt?: number;
  updatedBy?: string;
}

export interface EditableService {
  id: string;
  title: string;
  tag: string;
}

/**
 * Registro de admin no Firestore (coleção "admins").
 * Usado para autorização real — ver comentário em src/lib/firebase.ts.
 */
export interface AdminRecord {
  uid: string;
  email: string;
  role: 'owner' | 'editor';
  createdAt: number;
}

export type AdminAuthState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'authenticated'; user: AdminUser }
  | { status: 'error'; message: string };
