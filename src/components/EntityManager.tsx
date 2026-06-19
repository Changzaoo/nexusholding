import { useEffect, useMemo, useState } from 'react';
import { clientesStore, exportCSV, leadsStore, type BaseRecord, type EntitySchema, type FieldDef, type Store } from '../lib/crm';

interface Props<T extends BaseRecord> {
  schema: EntitySchema;
  store: Store<T>;
  /** somente leitura (papel sem permissão de editar) */
  readOnly?: boolean;
}

const inputClass =
  'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-neon-cyan/60 placeholder:text-white/25';

function emptyValues(fields: FieldDef[]): Record<string, any> {
  const v: Record<string, any> = {};
  fields.forEach((f) => (v[f.key] = f.type === 'checkbox' ? false : f.type === 'number' ? '' : ''));
  return v;
}

function Field({ field, value, onChange }: { field: FieldDef; value: any; onChange: (v: any) => void }) {
  const common = { className: inputClass, value: value ?? '' };
  if (field.type === 'ref') {
    return <input {...common} list="crm-contacts" placeholder="Vincular a um lead/cliente…" onChange={(e) => onChange(e.target.value)} />;
  }
  if (field.type === 'textarea') {
    return <textarea {...common} rows={2} onChange={(e) => onChange(e.target.value)} className={`${inputClass} resize-none`} />;
  }
  if (field.type === 'checkbox') {
    return (
      <label className="flex h-[38px] items-center gap-2 px-1">
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-neon-cyan" />
        <span className="text-sm text-white/70">{value ? 'Sim' : 'Não'}</span>
      </label>
    );
  }
  if (field.type === 'select') {
    return (
      <select {...common} onChange={(e) => onChange(e.target.value)}>
        <option value="" className="bg-void">—</option>
        {field.options?.map((o) => (
          <option key={o.value} value={o.value} className="bg-void">{o.label}</option>
        ))}
      </select>
    );
  }
  return (
    <input
      {...common}
      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : 'text'}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function RecordForm({ schema, initial, onSave, onCancel }: { schema: EntitySchema; initial: Record<string, any>; onSave: (v: Record<string, any>) => void; onCancel: () => void }) {
  const [values, setValues] = useState(initial);
  const set = (k: string, v: any) => setValues((s) => ({ ...s, [k]: v }));

  const submit = () => {
    const out: Record<string, any> = {};
    schema.fields.forEach((f) => {
      let v = values[f.key];
      if (f.type === 'number') v = v === '' || v == null ? 0 : Number(v);
      if (f.type === 'checkbox') v = !!v;
      out[f.key] = v ?? '';
    });
    onSave(out);
  };

  return (
    <div className="glass-panel rounded-xl p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {schema.fields.map((f) => (
          <label key={f.key} className={f.type === 'textarea' ? 'sm:col-span-2 flex flex-col gap-1.5' : 'flex flex-col gap-1.5'}>
            <span className="font-mono text-[10px] tracking-[0.22em] text-white/45 uppercase">
              {f.label}{f.required && ' *'}
            </span>
            <Field field={f} value={values[f.key]} onChange={(v) => set(f.key, v)} />
          </label>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={submit} className="pill-button !px-5 !py-2 text-[11px] !border-neon-cyan/50">Salvar</button>
        <button onClick={onCancel} className="rounded-full px-5 py-2 font-mono text-[11px] tracking-[0.2em] text-white/45 uppercase hover:text-white">Cancelar</button>
      </div>
    </div>
  );
}

function badge(field: FieldDef | undefined, value: any) {
  const opt = field?.options?.find((o) => o.value === value);
  if (!opt) return null;
  const color = opt.color ?? '#8fa3c8';
  return (
    <span className="rounded-full px-2.5 py-1 font-mono text-[9px] tracking-[0.16em] uppercase" style={{ color, background: `${color}1f`, border: `1px solid ${color}55` }}>
      {opt.label}
    </span>
  );
}

export function EntityManager<T extends BaseRecord>({ schema, store, readOnly = false }: Props<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState<string[]>([]);

  useEffect(() => store.subscribe(setItems), [store]);

  // opções de relacionamento (leads + clientes) p/ campos do tipo "ref"
  const hasRef = schema.fields.some((f) => f.type === 'ref');
  useEffect(() => {
    if (!hasRef) return;
    const acc = { leads: [] as any[], clientes: [] as any[] };
    const build = () =>
      setContacts(
        Array.from(
          new Set(
            [...acc.leads, ...acc.clientes]
              .map((c) => [c.name, c.company].filter(Boolean).join(' · '))
              .filter(Boolean),
          ),
        ),
      );
    const u1 = leadsStore.subscribe((l) => { acc.leads = l; build(); });
    const u2 = clientesStore.subscribe((c) => { acc.clientes = c; build(); });
    return () => { u1(); u2(); };
  }, [hasRef]);

  const fieldByKey = useMemo(() => Object.fromEntries(schema.fields.map((f) => [f.key, f])), [schema]);
  const titleKey = schema.fields[0]?.key ?? 'name';
  const subKeys = schema.fields.slice(1, 4).map((f) => f.key);
  const selectFields = schema.fields.filter((f) => f.type === 'select');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) =>
      schema.fields.some((f) => String((it as any)[f.key] ?? '').toLowerCase().includes(q)),
    );
  }, [items, search, schema]);

  const exportNow = () =>
    exportCSV(
      `${schema.title.toLowerCase()}.csv`,
      filtered as any[],
      [...schema.fields.map((f) => ({ key: f.key, label: f.label })), { key: 'createdAt', label: 'Criado em' }],
    );

  return (
    <div className="flex h-full flex-col gap-4">
      {hasRef && (
        <datalist id="crm-contacts">
          {contacts.map((c) => <option key={c} value={c} />)}
        </datalist>
      )}
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Buscar em ${schema.title.toLowerCase()}…`} className="min-w-[200px] flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-neon-cyan/60 placeholder:text-white/25" />
        <span className="font-mono text-[11px] text-white/40">{items.length} registro(s)</span>
        <button onClick={exportNow} className="rounded-full border border-white/15 px-4 py-2 font-mono text-[10px] tracking-[0.2em] text-white/60 uppercase transition-colors hover:text-neon-cyan">↓ CSV</button>
        {!readOnly && (
          <button onClick={() => { setAdding((a) => !a); setEditId(null); }} className="pill-button !px-5 !py-2 text-[11px] !border-neon-acid/50">
            {adding ? 'Fechar' : `+ Novo ${schema.singular}`}
          </button>
        )}
      </div>

      {adding && !readOnly && (
        <div className="shrink-0">
          <RecordForm
            schema={schema}
            initial={emptyValues(schema.fields)}
            onCancel={() => setAdding(false)}
            onSave={(v) => { store.create(v as any); setAdding(false); }}
          />
        </div>
      )}

      <div className="crm-scroll flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
        {filtered.length === 0 && (
          <div className="glass-panel rounded-2xl p-8 text-center font-mono text-xs text-white/40">
            Nenhum registro. {readOnly ? '' : `Clique em “+ Novo ${schema.singular}”.`}
          </div>
        )}
        {filtered.map((it) =>
          editId === it.id && !readOnly ? (
            <RecordForm
              key={it.id}
              schema={schema}
              initial={{ ...(it as any) }}
              onCancel={() => setEditId(null)}
              onSave={(v) => { store.update(it.id, v as any); setEditId(null); }}
            />
          ) : (
            <div key={it.id} className="glass-panel flex items-center justify-between gap-3 rounded-xl p-4">
              <div className="min-w-0">
                <div className="truncate font-medium text-white">{String((it as any)[titleKey] || '—')}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-white/45">
                  {subKeys.map((k) =>
                    fieldByKey[k]?.type === 'select' ? (
                      <span key={k}>{badge(fieldByKey[k], (it as any)[k])}</span>
                    ) : (
                      (it as any)[k] !== '' && (it as any)[k] != null && (
                        <span key={k} className="truncate">{fieldByKey[k]?.type === 'checkbox' ? ((it as any)[k] ? '✓' : '—') : String((it as any)[k])}</span>
                      )
                    ),
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {selectFields
                  .filter((f) => !subKeys.includes(f.key))
                  .map((f) => <span key={f.key}>{badge(f, (it as any)[f.key])}</span>)}
                {!readOnly && (
                  <>
                    <button onClick={() => { setEditId(it.id); setAdding(false); }} className="font-mono text-[10px] tracking-[0.2em] text-white/45 uppercase hover:text-neon-cyan">Editar</button>
                    <button onClick={() => confirm('Excluir este registro?') && store.remove(it.id)} className="font-mono text-[10px] tracking-[0.2em] text-neon-magenta/80 uppercase hover:text-neon-magenta">Excluir</button>
                  </>
                )}
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
