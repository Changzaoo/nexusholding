import { useEffect, useMemo, useState } from 'react';
import {
  clientesStore,
  propostasStore,
  historicoStore,
  moeda,
  type Cliente,
  type Proposta,
  type Historico,
  type ProjetoStatus,
} from '../../lib/crm';
import { listEntregaveis, FOLDER_LABEL, type Entregavel } from '../../lib/midiaSync';
import { entregaRawUrl, entregaDocHtmlUrl, entregaBundleUrl } from '../../lib/nexusBridge';
import { AutoPaged } from '../AutoPaged';

const PROJ_STATUS: { value: ProjetoStatus; label: string; color: string }[] = [
  { value: 'ativo', label: 'Ativo', color: '#22c55e' },
  { value: 'pausado', label: 'Pausado', color: '#ffd166' },
  { value: 'concluido', label: 'Concluído', color: '#41e8ff' },
  { value: 'cancelado', label: 'Cancelado', color: '#ff5d73' },
];
const projMeta = (s?: ProjetoStatus) => PROJ_STATUS.find((x) => x.value === s);
const PROP_STATUS: { value: Proposta['status']; label: string; color: string }[] = [
  { value: 'rascunho', label: 'Rascunho', color: '#8fa3c8' },
  { value: 'enviada', label: 'Enviada', color: '#41e8ff' },
  { value: 'aceita', label: 'Aceita', color: '#22c55e' },
  { value: 'recusada', label: 'Recusada', color: '#ff5d73' },
];

const fmtDate = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—');
const fmtTs = (ms: number) => new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
const INPUT = 'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-neon-cyan/60';
const LABEL = 'mb-1 block font-mono text-[9px] tracking-[0.2em] text-white/45 uppercase';

/** Clientes (unificado com Projetos): lista + detalhe do cliente em abas. */
export function ClientesPanel() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const [novo, setNovo] = useState(false);
  useEffect(() => clientesStore.subscribe(setClientes), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) => [c.name, c.company, c.segment, c.city, c.email].filter(Boolean).some((v) => v!.toLowerCase().includes(q)));
  }, [clientes, search]);
  const current = clientes.find((c) => c.id === sel) ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente…" className="min-w-[200px] flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none focus:border-neon-cyan/60 placeholder:text-white/25" />
        <span className="font-mono text-[11px] text-white/40">{clientes.length} cliente(s)</span>
        <button onClick={() => setNovo(true)} className="pill-button !px-5 !py-2 text-[11px] !border-neon-acid/50">+ Novo cliente</button>
      </div>

      <div className="min-h-0 flex-1">
        <AutoPaged
          items={filtered}
          rowPx={66}
          colMinPx={340}
          empty={<div className="glass-panel flex h-full items-center justify-center rounded-2xl p-8 text-center font-mono text-xs text-white/40">Nenhum cliente. Clique em “+ Novo cliente”.</div>}
          render={(c) => {
            const st = projMeta(c.projectStatus);
            return (
              <button key={c.id} onClick={() => setSel(c.id)} className="glass-panel rounded-xl p-3.5 text-left transition-colors hover:bg-white/5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-white">{c.name}{c.midiaId && <span className="ml-2 font-mono text-[9px] text-neon-violet">◆ mídia</span>}</div>
                    <div className="truncate font-mono text-[10px] text-white/45">{[c.segment, c.city].filter(Boolean).join(' · ') || '—'}{c.contractValue ? ` · ${moeda(c.contractValue)}` : ''}</div>
                  </div>
                  {st && <span className="shrink-0 rounded-full px-2.5 py-1 font-mono text-[9px] tracking-[0.16em] uppercase" style={{ color: st.color, background: `${st.color}1f`, border: `1px solid ${st.color}55` }}>{st.label}</span>}
                </div>
              </button>
            );
          }}
        />
      </div>

      {novo && <ClienteForm onClose={() => setNovo(false)} onSave={(data) => { clientesStore.create(data as any); setNovo(false); }} />}
      {current && <ClienteDetalhe cliente={current} onClose={() => setSel(null)} />}
    </div>
  );
}

/* ---------------------------------------------- detalhe com abas */
type DetTab = 'dados' | 'propostas' | 'historico' | 'entregaveis';
function ClienteDetalhe({ cliente, onClose }: { cliente: Cliente; onClose: () => void }) {
  const [tab, setTab] = useState<DetTab>('dados');
  const TABS: { k: DetTab; label: string }[] = [
    { k: 'dados', label: 'Dados' },
    { k: 'propostas', label: 'Propostas' },
    { k: 'historico', label: 'Histórico' },
    { k: 'entregaveis', label: 'Entregáveis' },
  ];
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="glass-panel flex h-[82vh] w-full max-w-2xl flex-col rounded-2xl p-5">
        <div className="flex shrink-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-display text-2xl font-bold tracking-wide text-white">{cliente.name}</h3>
            <p className="truncate font-mono text-[11px] text-white/45">{[cliente.segment, cliente.city].filter(Boolean).join(' · ') || '—'}</p>
          </div>
          <button onClick={onClose} className="font-mono text-white/40 hover:text-white">✕</button>
        </div>
        <div className="mt-3 flex shrink-0 gap-1.5">
          {TABS.map((t) => (
            <button key={t.k} onClick={() => setTab(t.k)} className={`rounded-full px-3.5 py-1.5 font-mono text-[10px] tracking-[0.18em] uppercase transition-colors ${tab === t.k ? 'bg-white/12 text-white' : 'text-white/45 hover:text-white/80'}`}>{t.label}</button>
          ))}
        </div>
        <div className="mt-4 min-h-0 flex-1 overflow-hidden">
          {tab === 'dados' && <DadosTab cliente={cliente} onClose={onClose} />}
          {tab === 'propostas' && <PropostasTab cliente={cliente} />}
          {tab === 'historico' && <HistoricoTab cliente={cliente} />}
          {tab === 'entregaveis' && <EntregaveisTab cliente={cliente} />}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------- aba Dados (edição) */
function DadosTab({ cliente, onClose }: { cliente: Cliente; onClose: () => void }) {
  const [f, setF] = useState<Cliente>(cliente);
  const set = (k: keyof Cliente, v: any) => setF((s) => ({ ...s, [k]: v }));
  const salvar = () => { clientesStore.update(cliente.id, f); };
  const excluir = () => { if (confirm('Excluir este cliente?')) { clientesStore.remove(cliente.id); onClose(); } };
  return (
    <div className="flex h-full flex-col">
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-hidden">
        <div className="col-span-2"><label className={LABEL}>Nome / Razão social</label><input className={INPUT} value={f.name ?? ''} onChange={(e) => set('name', e.target.value)} /></div>
        <div><label className={LABEL}>Empresa / Marca</label><input className={INPUT} value={f.company ?? ''} onChange={(e) => set('company', e.target.value)} /></div>
        <div><label className={LABEL}>Responsável / Contato</label><input className={INPUT} value={f.owner ?? ''} onChange={(e) => set('owner', e.target.value)} /></div>
        <div><label className={LABEL}>Segmento</label><input className={INPUT} value={f.segment ?? ''} onChange={(e) => set('segment', e.target.value)} /></div>
        <div><label className={LABEL}>E-mail</label><input className={INPUT} value={f.email ?? ''} onChange={(e) => set('email', e.target.value)} /></div>
        <div><label className={LABEL}>Telefone</label><input className={INPUT} value={f.phone ?? ''} onChange={(e) => set('phone', e.target.value)} /></div>
        <div><label className={LABEL}>Cidade</label><input className={INPUT} value={f.city ?? ''} onChange={(e) => set('city', e.target.value)} /></div>
        <div><label className={LABEL}>Valor do contrato (R$)</label><input type="number" className={INPUT} value={f.contractValue ?? ''} onChange={(e) => set('contractValue', Number(e.target.value))} /></div>
        <div>
          <label className={LABEL}>Status do projeto</label>
          <select className={INPUT} value={f.projectStatus ?? ''} onChange={(e) => set('projectStatus', e.target.value || undefined)}>
            <option value="" className="bg-void">—</option>
            {PROJ_STATUS.map((s) => <option key={s.value} value={s.value} className="bg-void">{s.label}</option>)}
          </select>
        </div>
        <div><label className={LABEL}>Início</label><input type="date" className={INPUT} value={f.startDate ?? ''} onChange={(e) => set('startDate', e.target.value)} /></div>
        <div className="col-span-2"><label className={LABEL}>Escopo / serviços</label><textarea rows={2} className={`${INPUT} resize-none`} value={f.scope ?? ''} onChange={(e) => set('scope', e.target.value)} /></div>
      </div>
      <div className="mt-3 flex shrink-0 items-center justify-between">
        <button onClick={excluir} className="font-mono text-[10px] tracking-[0.2em] text-neon-magenta/80 uppercase hover:text-neon-magenta">Excluir</button>
        <button onClick={salvar} className="pill-button !px-5 !py-2 text-[11px] !border-neon-cyan/50">Salvar</button>
      </div>
    </div>
  );
}

/* ---------------------------------------------- aba Propostas (CRUD por cliente) */
function PropostasTab({ cliente }: { cliente: Cliente }) {
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [form, setForm] = useState<Partial<Proposta> | null>(null);
  useEffect(() => propostasStore.subscribe(setPropostas), []);
  const minhas = propostas.filter((p) => (p.client || '').trim().toLowerCase() === cliente.name.trim().toLowerCase());

  const salvar = () => {
    if (!form?.title) return;
    const data = { title: form.title, client: cliente.name, value: Number(form.value) || 0, status: (form.status ?? 'rascunho') as Proposta['status'], validUntil: form.validUntil ?? '', notes: form.notes ?? '' };
    if (form.id) propostasStore.update(form.id, data); else propostasStore.create(data);
    setForm(null);
  };

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex shrink-0 justify-end">
        <button onClick={() => setForm({ status: 'rascunho' })} className="pill-button !px-4 !py-1.5 text-[10px]">+ Nova proposta</button>
      </div>
      <div className="min-h-0 flex-1">
        <AutoPaged
          items={minhas}
          rowPx={56}
          empty={<div className="flex h-full items-center justify-center font-mono text-xs text-white/40">Nenhuma proposta para este cliente.</div>}
          render={(p) => {
            const m = PROP_STATUS.find((s) => s.value === p.status)!;
            return (
              <div key={p.id} className="glass-panel flex items-center gap-3 rounded-xl px-3.5 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-white">{p.title}</div>
                  <div className="font-mono text-[10px] text-white/45">{moeda(p.value)}{p.validUntil ? ` · até ${fmtDate(p.validUntil)}` : ''}</div>
                </div>
                <span className="shrink-0 rounded-full px-2.5 py-1 font-mono text-[9px] tracking-[0.14em] uppercase" style={{ color: m.color, background: `${m.color}1f`, border: `1px solid ${m.color}55` }}>{m.label}</span>
                <button onClick={() => setForm(p)} className="shrink-0 font-mono text-xs text-white/40 hover:text-neon-cyan">editar</button>
                <button onClick={() => confirm('Excluir proposta?') && propostasStore.remove(p.id)} className="shrink-0 font-mono text-white/40 hover:text-neon-magenta">✕</button>
              </div>
            );
          }}
        />
      </div>
      {form && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && setForm(null)}>
          <div className="glass-panel w-full max-w-sm rounded-2xl p-5">
            <h4 className="mb-3 font-display text-lg text-white">{form.id ? 'Editar proposta' : 'Nova proposta'} · {cliente.name}</h4>
            <div className="flex flex-col gap-2.5">
              <input className={INPUT} placeholder="Título" value={form.title ?? ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <div className="grid grid-cols-2 gap-2.5">
                <input type="number" className={INPUT} placeholder="Valor (R$)" value={form.value ?? ''} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
                <select className={INPUT} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Proposta['status'] })}>{PROP_STATUS.map((s) => <option key={s.value} value={s.value} className="bg-void">{s.label}</option>)}</select>
              </div>
              <input type="date" className={INPUT} value={form.validUntil ?? ''} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setForm(null)} className="rounded-full border border-white/15 px-4 py-2 font-mono text-[11px] tracking-[0.2em] text-white/60 uppercase hover:text-white">Cancelar</button>
              <button onClick={salvar} className="pill-button !px-4 !py-2 text-[11px]">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------- aba Histórico (somente leitura) */
function HistoricoTab({ cliente }: { cliente: Cliente }) {
  const [items, setItems] = useState<Historico[]>([]);
  useEffect(() => historicoStore.subscribe(setItems), []);
  const key = cliente.name.trim().toLowerCase();
  const meus = items.filter((h) => (h.lead || '').trim().toLowerCase() === key || (cliente.email && (h.lead || '').trim().toLowerCase() === cliente.email.trim().toLowerCase()));
  const icon = (t: Historico['type']) => (t === 'status' ? '⟳' : t === 'nota' ? '✎' : t === 'contato' ? '☎' : '◷');
  return (
    <AutoPaged
      items={meus}
      rowPx={48}
      empty={<div className="flex h-full items-center justify-center font-mono text-xs text-white/40">Sem histórico para este cliente ainda.</div>}
      render={(h) => (
        <div key={h.id} className="glass-panel flex items-start gap-3 rounded-xl p-3">
          <span className="mt-0.5 text-neon-cyan">{icon(h.type)}</span>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-white/85">{h.description}</div>
            <div className="font-mono text-[10px] text-white/35">{h.author ?? 'sistema'} · {fmtTs(h.createdAt)}</div>
          </div>
        </div>
      )}
    />
  );
}

/* ---------------------------------------------- aba Entregáveis (Mídia) */
const isImg = (f: string) => /\.(svg|png|jpe?g|gif|webp)$/i.test(f);
const isDoc = (f: string) => /\.md$/i.test(f);
const fileExt = (f: string) => (f.split('.').pop() || '').toUpperCase();
const prettyFile = (f: string) =>
  f.replace(/\.(md|svg|html|png|jpe?g|gif|webp|json)$/i, '').replace(/^BOARD_/, '').replace(/[-_]+/g, ' ').trim();
const DL_FORMATS: { id: 'pdf' | 'zip' | 'md'; label: string; hint: string }[] = [
  { id: 'pdf', label: 'PDF', hint: 'Dossiê dos documentos de texto (abre para imprimir/salvar)' },
  { id: 'zip', label: 'ZIP', hint: 'Todos os arquivos no formato original (artes, páginas e textos)' },
  { id: 'md', label: 'Markdown', hint: 'Documentos de texto reunidos num único .md' },
];

function EntregaveisTab({ cliente }: { cliente: Cliente }) {
  const [items, setItems] = useState<Entregavel[] | null>(null);
  const [erro, setErro] = useState(false);
  const [fmt, setFmt] = useState<'pdf' | 'zip' | 'md'>('pdf');
  useEffect(() => {
    let vivo = true;
    if (!cliente.midiaId) { setItems([]); return; }
    listEntregaveis(cliente.midiaId).then((r) => vivo && setItems(r)).catch(() => vivo && setErro(true));
    return () => { vivo = false; };
  }, [cliente.midiaId]);

  // materiais reais (esconde os .json de configuração)
  const visiveis = useMemo(() => (items ?? []).filter((e) => !/\.json$/i.test(e.file)), [items]);
  const id = cliente.midiaId!;

  const baixarTodos = () => {
    const lote = visiveis.map(({ folder, file }) => ({ folder, file }));
    if (!lote.length) return;
    const url = entregaBundleUrl(id, lote, fmt);
    if (fmt === 'pdf') {
      window.open(url, '_blank', 'noopener');
    } else {
      const a = document.createElement('a');
      a.href = url; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
    }
  };

  if (!cliente.midiaId) return <div className="flex h-full items-center justify-center text-center font-mono text-xs text-white/40">Este cliente não está vinculado à fábrica de mídia.</div>;
  if (erro) return <div className="flex h-full items-center justify-center text-center font-mono text-xs text-neon-magenta/80">Não foi possível carregar os entregáveis.</div>;
  if (items === null) return <div className="flex h-full items-center justify-center font-mono text-xs text-white/40">Carregando…</div>;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] text-white/45">{visiveis.length} material(is)</span>
        <div className="ml-auto flex items-center gap-1">
          {DL_FORMATS.map((f) => (
            <button key={f.id} onClick={() => setFmt(f.id)} title={f.hint}
              className={`rounded-full px-2.5 py-1 font-mono text-[9px] tracking-[0.16em] uppercase transition-colors ${fmt === f.id ? 'bg-white/12 text-white' : 'text-white/45 hover:text-white/80'}`}>{f.label}</button>
          ))}
        </div>
        <button onClick={baixarTodos} disabled={!visiveis.length}
          className="pill-button !px-4 !py-1.5 text-[10px] !border-neon-cyan/50 disabled:opacity-40">↓ Baixar todos</button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto pr-1">
        {visiveis.length === 0 ? (
          <div className="flex h-full items-center justify-center font-mono text-xs text-white/40">Nenhum material gerado ainda.</div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {visiveis.map((e) => (
              <div key={e.folder + e.file} className="glass-panel flex flex-col gap-2 rounded-xl p-2.5">
                <a href={entregaRawUrl(id, e.folder, e.file)} target="_blank" rel="noreferrer"
                  className="flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-white/5 bg-white/5">
                  {isImg(e.file)
                    ? <img src={entregaRawUrl(id, e.folder, e.file)} alt={e.file} loading="lazy" className="h-full w-full object-contain" />
                    : <span className="font-mono text-base tracking-[0.2em] text-white/35">{fileExt(e.file)}</span>}
                </a>
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium text-white capitalize" title={e.file}>{prettyFile(e.file)}</div>
                  <div className="truncate font-mono text-[9px] tracking-[0.14em] text-neon-violet uppercase">{FOLDER_LABEL[e.folder] || e.folder}</div>
                </div>
                <div className="mt-auto flex gap-1.5">
                  {isDoc(e.file) && (
                    <a href={entregaDocHtmlUrl(id, e.folder, e.file)} target="_blank" rel="noreferrer"
                      className="flex-1 rounded-lg border border-white/10 bg-white/5 py-1 text-center font-mono text-[9px] tracking-[0.14em] text-white/70 uppercase transition-colors hover:border-neon-cyan/50 hover:text-white">PDF</a>
                  )}
                  <a href={entregaRawUrl(id, e.folder, e.file, true)}
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 py-1 text-center font-mono text-[9px] tracking-[0.14em] text-white/70 uppercase transition-colors hover:border-neon-acid/50 hover:text-white">Baixar</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------- formulário de novo cliente */
function ClienteForm({ onClose, onSave }: { onClose: () => void; onSave: (data: Partial<Cliente>) => void }) {
  const [f, setF] = useState<Partial<Cliente>>({ origin: 'crm' });
  const set = (k: keyof Cliente, v: any) => setF((s) => ({ ...s, [k]: v }));
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="glass-panel w-full max-w-md rounded-2xl p-6">
        <h3 className="mb-4 font-display text-xl tracking-wide text-white">Novo cliente</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className={LABEL}>Nome / Razão social *</label><input className={INPUT} value={f.name ?? ''} onChange={(e) => set('name', e.target.value)} /></div>
          <div><label className={LABEL}>Segmento</label><input className={INPUT} value={f.segment ?? ''} onChange={(e) => set('segment', e.target.value)} /></div>
          <div><label className={LABEL}>Cidade</label><input className={INPUT} value={f.city ?? ''} onChange={(e) => set('city', e.target.value)} /></div>
          <div><label className={LABEL}>E-mail</label><input className={INPUT} value={f.email ?? ''} onChange={(e) => set('email', e.target.value)} /></div>
          <div><label className={LABEL}>Telefone</label><input className={INPUT} value={f.phone ?? ''} onChange={(e) => set('phone', e.target.value)} /></div>
          <div><label className={LABEL}>Valor do contrato (R$)</label><input type="number" className={INPUT} value={f.contractValue ?? ''} onChange={(e) => set('contractValue', Number(e.target.value))} /></div>
          <div>
            <label className={LABEL}>Status</label>
            <select className={INPUT} value={f.projectStatus ?? ''} onChange={(e) => set('projectStatus', e.target.value || undefined)}>
              <option value="" className="bg-void">—</option>
              {PROJ_STATUS.map((s) => <option key={s.value} value={s.value} className="bg-void">{s.label}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-white/15 px-4 py-2 font-mono text-[11px] tracking-[0.2em] text-white/60 uppercase hover:text-white">Cancelar</button>
          <button onClick={() => f.name?.trim() && onSave(f)} className="pill-button !px-4 !py-2 text-[11px]">Salvar</button>
        </div>
      </div>
    </div>
  );
}
