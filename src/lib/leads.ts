/**
 * API de leads (formulário "Raio-X") — agora apoiada na camada CRM
 * (src/lib/crm.ts). Mantém as funções usadas pela UI pública e pelo CRM.
 */
import { leadsStore as store, type Lead, type LeadStatus } from './crm';

export type { Lead, LeadStatus } from './crm';
export { PIPELINE as LEAD_STATUSES } from './crm';

export type NewLead = Omit<
  Lead,
  'id' | 'status' | 'createdAt' | 'source' | 'notes'
> & { source?: string };

/** Cadastro de lead (API pública do formulário). Entra no pipeline em "novo".
 *  noLocalFallback: se a escrita na nuvem falhar (ex.: regras do Firestore
 *  bloqueando visitante deslogado), o erro é relançado e o formulário mostra
 *  "tente novamente" — em vez de salvar só no navegador do visitante (onde o
 *  admin nunca veria) e fingir sucesso. */
export async function submitLead(data: NewLead): Promise<void> {
  await store.create(
    {
      ...data,
      source: data.source ?? 'raio-x',
      status: 'novo' as LeadStatus,
      notes: '',
    } as Omit<Lead, 'id' | 'createdAt'>,
    { noLocalFallback: true },
  );
}

/** Assina os leads em tempo real (ordenados por data, desc). */
export function subscribeLeads(cb: (leads: Lead[]) => void): () => void {
  return store.subscribe(cb);
}

/** Atualiza status do lead / outros campos. */
export function updateLead(id: string, patch: Partial<Lead>): Promise<void> {
  return store.update(id, patch);
}

export function deleteLead(id: string): Promise<void> {
  return store.remove(id);
}
