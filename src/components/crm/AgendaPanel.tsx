import { useEffect, useMemo, useState } from 'react';
import { agendaStore, type Evento, type EventoTipo } from '../../lib/crm';
import { AutoPaged } from '../AutoPaged';

const TIPOS: { value: EventoTipo; label: string; color: string }[] = [
  { value: 'reuniao', label: 'Reunião', color: '#41e8ff' },
  { value: 'ligacao', label: 'Ligação', color: '#8b5cf6' },
  { value: 'apresentacao', label: 'Apresentação', color: '#a3ff6b' },
  { value: 'entrega', label: 'Entrega', color: '#ffd166' },
  { value: 'tarefa', label: 'Tarefa', color: '#8fa3c8' },
];
const tipoMeta = (t: EventoTipo) => TIPOS.find((x) => x.value === t) ?? TIPOS[0];

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const todayISO = () => new Date().toISOString().slice(0, 10);

const INPUT = 'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-neon-cyan/60';

/** Agenda — calendário mensal e lista de eventos do CRM. */
export function AgendaPanel({ readOnly = false }: { readOnly?: boolean }) {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [ref, setRef] = useState(() => { const d = new Date(); return { ano: d.getFullYear(), mes: d.getMonth() }; });
  const [vista, setVista] = useState<'mes' | 'lista'>('mes');
  const [modal, setModal] = useState<Partial<Evento> | null>(null);
  useEffect(() => agendaStore.subscribe(setEventos), []);

  const primeiroDia = new Date(ref.ano, ref.mes, 1).getDay();
  const diasNoMes = new Date(ref.ano, ref.mes + 1, 0).getDate();
  const celulas: (number | null)[] = [...Array(primeiroDia).fill(null), ...Array.from({ length: diasNoMes }, (_, i) => i + 1)];
  const isoDe = (dia: number) => `${ref.ano}-${String(ref.mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  const evDoDia = (dia: number) => eventos.filter((e) => e.date === isoDe(dia));
  const navMes = (delta: number) => setRef((r) => { const d = new Date(r.ano, r.mes + delta, 1); return { ano: d.getFullYear(), mes: d.getMonth() }; });

  const futuros = useMemo(
    () => [...eventos].filter((e) => e.date >= todayISO()).sort((a, b) => (a.date + (a.time ?? '')).localeCompare(b.date + (b.time ?? ''))),
    [eventos],
  );

  const salvar = async () => {
    if (!modal?.title || !modal.date) return;
    const data = { title: modal.title, type: modal.type ?? 'reuniao', date: modal.date, time: modal.time ?? '', owner: modal.owner ?? '', relatedTo: modal.relatedTo ?? '', notes: modal.notes ?? '' };
    if (modal.id) await agendaStore.update(modal.id, data);
    else await agendaStore.create(data);
    setModal(null);
  };
  const excluir = async () => { if (modal?.id && confirm('Excluir evento?')) { await agendaStore.remove(modal.id); setModal(null); } };

  const linhas = Math.ceil(celulas.length / 7);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-full border border-white/10 bg-black/30 p-1">
          {(['mes', 'lista'] as const).map((v) => (
            <button key={v} onClick={() => setVista(v)} className={`rounded-full px-4 py-1.5 font-mono text-[10px] tracking-[0.2em] uppercase transition-colors ${vista === v ? 'bg-white/12 text-white' : 'text-white/45 hover:text-white/80'}`}>
              {v === 'mes' ? 'Mês' : 'Lista'}
            </button>
          ))}
        </div>
        {vista === 'mes' && (
          <div className="flex items-center gap-2">
            <button onClick={() => navMes(-1)} className="rounded-full border border-white/10 px-3 py-1 text-white/60 hover:text-white">←</button>
            <h2 className="font-display text-lg tracking-wide text-white">{MESES[ref.mes]} {ref.ano}</h2>
            <button onClick={() => navMes(1)} className="rounded-full border border-white/10 px-3 py-1 text-white/60 hover:text-white">→</button>
          </div>
        )}
        {!readOnly && (
          <button onClick={() => setModal({ type: 'reuniao', date: todayISO() })} className="pill-button !px-4 !py-2 text-[11px]">+ Novo evento</button>
        )}
      </div>

      {vista === 'mes' ? (
        <div className="glass-panel flex min-h-0 flex-1 flex-col rounded-2xl p-3">
          <div className="grid shrink-0 grid-cols-7 gap-1.5">
            {DIAS.map((d) => <div key={d} className="py-1 text-center font-mono text-[10px] tracking-[0.15em] text-white/35 uppercase">{d}</div>)}
          </div>
          <div className="mt-1.5 grid min-h-0 flex-1 grid-cols-7 gap-1.5" style={{ gridTemplateRows: `repeat(${linhas}, minmax(0,1fr))` }}>
            {celulas.map((dia, i) => {
              if (!dia) return <div key={i} />;
              const evs = evDoDia(dia);
              const ehHoje = isoDe(dia) === todayISO();
              return (
                <div key={i} className={`flex min-h-0 flex-col overflow-hidden rounded-lg border p-1 ${ehHoje ? 'border-neon-cyan/40 bg-neon-cyan/5' : 'border-white/5 bg-white/[0.02]'}`}>
                  <div className={`shrink-0 font-mono text-[10px] ${ehHoje ? 'font-semibold text-neon-cyan' : 'text-white/40'}`}>{dia}</div>
                  <div className="mt-0.5 flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
                    {evs.slice(0, 3).map((e) => {
                      const m = tipoMeta(e.type);
                      return (
                        <button key={e.id} onClick={() => !readOnly && setModal(e)} className="w-full shrink-0 truncate rounded px-1.5 py-0.5 text-left text-[10px]" style={{ background: `${m.color}1f`, color: m.color }}>
                          {e.time && <span className="opacity-70">{e.time} </span>}{e.title}
                        </button>
                      );
                    })}
                    {evs.length > 3 && <span className="shrink-0 px-1 font-mono text-[9px] text-white/40">+{evs.length - 3}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1">
          <AutoPaged
            items={futuros}
            rowPx={62}
            colMinPx={360}
            empty={<div className="glass-panel flex h-full items-center justify-center rounded-2xl p-10 text-center font-mono text-xs text-white/40">Nenhum evento futuro.</div>}
            render={(e) => {
              const m = tipoMeta(e.type);
              return (
                <button key={e.id} onClick={() => !readOnly && setModal(e)} className="glass-panel flex w-full items-center justify-between gap-4 rounded-xl p-3.5 text-left transition-colors hover:bg-white/5">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="w-10 shrink-0 text-center">
                      <div className="font-display text-lg text-white">{e.date.slice(8, 10)}</div>
                      <div className="font-mono text-[9px] text-white/40 uppercase">{MESES[Number(e.date.slice(5, 7)) - 1].slice(0, 3)}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-white">{e.title}</div>
                      <div className="truncate font-mono text-[11px] text-white/45">{e.time ? `${e.time} · ` : ''}{e.owner || '—'}{e.relatedTo ? ` · ${e.relatedTo}` : ''}</div>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full px-2.5 py-1 font-mono text-[9px] tracking-[0.18em] uppercase" style={{ color: m.color, background: `${m.color}1f`, border: `1px solid ${m.color}55` }}>{m.label}</span>
                </button>
              );
            }}
          />
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="glass-panel w-full max-w-md rounded-2xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-xl tracking-wide text-white">{modal.id ? 'Editar evento' : 'Novo evento'}</h3>
              <button onClick={() => setModal(null)} className="font-mono text-white/40 hover:text-white">✕</button>
            </div>
            <div className="flex flex-col gap-3">
              <input className={INPUT} placeholder="Título" value={modal.title ?? ''} onChange={(e) => setModal({ ...modal, title: e.target.value })} />
              <div className="grid grid-cols-3 gap-3">
                <select className={INPUT} value={modal.type} onChange={(e) => setModal({ ...modal, type: e.target.value as EventoTipo })}>
                  {TIPOS.map((t) => <option key={t.value} value={t.value} className="bg-void">{t.label}</option>)}
                </select>
                <input type="date" className={INPUT} value={modal.date ?? ''} onChange={(e) => setModal({ ...modal, date: e.target.value })} />
                <input type="time" className={INPUT} value={modal.time ?? ''} onChange={(e) => setModal({ ...modal, time: e.target.value })} />
              </div>
              <input className={INPUT} placeholder="Responsável" value={modal.owner ?? ''} onChange={(e) => setModal({ ...modal, owner: e.target.value })} />
              <input className={INPUT} placeholder="Relacionado a (lead/cliente)" value={modal.relatedTo ?? ''} onChange={(e) => setModal({ ...modal, relatedTo: e.target.value })} />
              <textarea rows={2} className={`${INPUT} resize-none`} placeholder="Observações" value={modal.notes ?? ''} onChange={(e) => setModal({ ...modal, notes: e.target.value })} />
            </div>
            <div className="mt-5 flex items-center justify-between">
              <div>{modal.id && <button onClick={excluir} className="rounded-full border border-neon-magenta/40 px-4 py-2 font-mono text-[11px] tracking-[0.2em] text-neon-magenta/90 uppercase hover:bg-neon-magenta/10">Excluir</button>}</div>
              <div className="flex gap-2">
                <button onClick={() => setModal(null)} className="rounded-full border border-white/15 px-4 py-2 font-mono text-[11px] tracking-[0.2em] text-white/60 uppercase hover:text-white">Cancelar</button>
                <button onClick={salvar} className="pill-button !px-4 !py-2 text-[11px]">Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
