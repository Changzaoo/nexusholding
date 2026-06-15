import { useMemo, useState } from 'react';
import {
  getOverrides,
  resolveSite,
  resolveCards,
  saveContent,
  type ContentOverrides,
} from '../../lib/content';

const INPUT = 'w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-neon-cyan/60 placeholder:text-white/25';
const LABEL = 'mb-1.5 block font-mono text-[10px] tracking-[0.22em] text-white/45 uppercase';

/** Forma plana e editável montada a partir do conteúdo resolvido. */
function buildDraft() {
  const s = resolveSite();
  const cards = resolveCards(false); // desktop = mesma cópia de texto
  return {
    company: s.company,
    hero: { ...s.hero },
    horizon: { ...s.horizon },
    mission: { ...s.mission },
    final: { ...s.final },
    services: s.services.map((x) => ({ ...x })),
    cards: cards.map((c) => ({ id: c.id, accent: c.accent, index: c.index, title: c.title, tag: c.tag, body: c.body ?? '' })),
  };
}
type Draft = ReturnType<typeof buildDraft>;

/**
 * Conteúdo — editor de TODOS os textos do site:
 * cabeçalho/hero, serviços, seções (horizonte/missão), rodapé/CTA
 * e os títulos, tags e corpos dos cards 3D da galeria.
 * Salva em localStorage + Firestore e reflete ao vivo no site.
 */
export function ContentPanel({ readOnly = false }: { readOnly?: boolean }) {
  const [draft, setDraft] = useState<Draft>(buildDraft);
  const [flash, setFlash] = useState<'idle' | 'saved'>('idle');
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(buildDraft()), [draft]);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const salvar = async () => {
    const overrides: ContentOverrides = {
      ...getOverrides(),
      company: draft.company,
      hero: { ...draft.hero },
      horizon: { ...draft.horizon },
      mission: { ...draft.mission },
      final: { ...draft.final },
      services: draft.services.map((s) => ({ id: s.id, title: s.title, tag: s.tag })),
      cards: Object.fromEntries(draft.cards.map((c) => [c.id, { title: c.title, tag: c.tag, body: c.body }])),
    };
    await saveContent(overrides);
    setFlash('saved');
    setTimeout(() => setFlash('idle'), 2200);
  };

  const restaurar = async () => {
    if (!confirm('Restaurar todos os textos para o padrão original?')) return;
    await saveContent({}); // limpa overrides
    setDraft(buildDraft());
    setFlash('saved');
    setTimeout(() => setFlash('idle'), 2200);
  };

  return (
    <div className="flex flex-col gap-5 pb-24">
      <p className="font-mono text-[11px] leading-relaxed text-white/45">
        Edite qualquer texto do site. As mudanças aparecem ao vivo e ficam salvas
        (localmente e na nuvem, quando configurada). A geometria/posição dos cards 3D
        permanece intacta — só os textos mudam.
      </p>

      {/* ---------------------------------------- Identidade & Hero */}
      <Section title="Marca & abertura (Hero)">
        <Grid>
          <Field label="Nome da empresa">
            <input className={INPUT} value={draft.company} disabled={readOnly} onChange={(e) => set({ company: e.target.value })} />
          </Field>
          <Field label="Nota lateral (HUD)">
            <input className={INPUT} value={draft.hero.sideNote} disabled={readOnly} onChange={(e) => set({ hero: { ...draft.hero, sideNote: e.target.value } })} />
          </Field>
        </Grid>
        <Field label="Título principal">
          <textarea rows={2} className={`${INPUT} resize-none`} value={draft.hero.title} disabled={readOnly} onChange={(e) => set({ hero: { ...draft.hero, title: e.target.value } })} />
        </Field>
        <Field label="Subtítulo">
          <textarea rows={2} className={`${INPUT} resize-none`} value={draft.hero.subtitle} disabled={readOnly} onChange={(e) => set({ hero: { ...draft.hero, subtitle: e.target.value } })} />
        </Field>
        <Field label="Texto do botão (CTA do hero)">
          <input className={INPUT} value={draft.hero.exploreLabel} disabled={readOnly} onChange={(e) => set({ hero: { ...draft.hero, exploreLabel: e.target.value } })} />
        </Field>
      </Section>

      {/* ---------------------------------------- Cards 3D */}
      <Section title="Cards 3D da galeria">
        <div className="flex flex-col gap-4">
          {draft.cards.map((c, i) => (
            <div key={c.id} className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.accent }} />
                <span className="font-mono text-[11px] tracking-[0.2em] text-white/55 uppercase">Card {c.index} · {c.id}</span>
              </div>
              <Field label="Título">
                <input className={INPUT} value={c.title} disabled={readOnly} onChange={(e) => { const cards = [...draft.cards]; cards[i] = { ...c, title: e.target.value }; set({ cards }); }} />
              </Field>
              <Field label="Subtítulo / tag">
                <input className={INPUT} value={c.tag} disabled={readOnly} onChange={(e) => { const cards = [...draft.cards]; cards[i] = { ...c, tag: e.target.value }; set({ cards }); }} />
              </Field>
              <Field label="Corpo (uma linha por item — use Enter)">
                <textarea rows={4} className={`${INPUT} resize-none`} value={c.body} disabled={readOnly} onChange={(e) => { const cards = [...draft.cards]; cards[i] = { ...c, body: e.target.value }; set({ cards }); }} />
              </Field>
            </div>
          ))}
        </div>
      </Section>

      {/* ---------------------------------------- Serviços */}
      <Section title="Serviços">
        <div className="flex flex-col gap-3">
          {draft.services.map((s, i) => (
            <div key={s.id} className="grid grid-cols-[auto_1fr_1fr] items-center gap-3">
              <span className="w-8 font-mono text-xs text-neon-violet">{s.id}</span>
              <input className={INPUT} placeholder="Título" value={s.title} disabled={readOnly} onChange={(e) => { const services = [...draft.services]; services[i] = { ...s, title: e.target.value }; set({ services }); }} />
              <input className={INPUT} placeholder="Tag" value={s.tag} disabled={readOnly} onChange={(e) => { const services = [...draft.services]; services[i] = { ...s, tag: e.target.value }; set({ services }); }} />
            </div>
          ))}
        </div>
      </Section>

      {/* ---------------------------------------- Seções */}
      <Section title="Seções (Horizonte & Missão)">
        <Grid>
          <Field label="Horizonte — título"><input className={INPUT} value={draft.horizon.title} disabled={readOnly} onChange={(e) => set({ horizon: { ...draft.horizon, title: e.target.value } })} /></Field>
          <Field label="Horizonte — legenda"><input className={INPUT} value={draft.horizon.caption} disabled={readOnly} onChange={(e) => set({ horizon: { ...draft.horizon, caption: e.target.value } })} /></Field>
          <Field label="Missão — título"><input className={INPUT} value={draft.mission.title} disabled={readOnly} onChange={(e) => set({ mission: { ...draft.mission, title: e.target.value } })} /></Field>
          <Field label="Missão — legenda"><input className={INPUT} value={draft.mission.caption} disabled={readOnly} onChange={(e) => set({ mission: { ...draft.mission, caption: e.target.value } })} /></Field>
        </Grid>
      </Section>

      {/* ---------------------------------------- Fechamento */}
      <Section title="Fechamento & contato">
        <Field label="Título final"><input className={INPUT} value={draft.final.title} disabled={readOnly} onChange={(e) => set({ final: { ...draft.final, title: e.target.value } })} /></Field>
        <Grid>
          <Field label="Texto do botão final"><input className={INPUT} value={draft.final.ctaLabel} disabled={readOnly} onChange={(e) => set({ final: { ...draft.final, ctaLabel: e.target.value } })} /></Field>
          <Field label="E-mail de contato"><input className={INPUT} value={draft.final.contactEmail} disabled={readOnly} onChange={(e) => set({ final: { ...draft.final, contactEmail: e.target.value } })} /></Field>
        </Grid>
      </Section>

      {/* ---------------------------------------- barra de ações fixa */}
      {!readOnly && (
        <div className="fixed inset-x-0 bottom-0 z-[55] border-t border-white/10 bg-void/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 md:px-8">
            <span className="font-mono text-[11px] text-white/45">
              {flash === 'saved' ? <span className="text-neon-acid">✓ Conteúdo salvo e publicado</span> : dirty ? 'Alterações não salvas' : 'Tudo salvo'}
            </span>
            <div className="flex gap-2">
              <button onClick={restaurar} className="rounded-full border border-white/15 px-4 py-2 font-mono text-[10px] tracking-[0.2em] text-white/55 uppercase hover:text-white">Restaurar padrão</button>
              <button onClick={salvar} disabled={!dirty} className="pill-button disabled:cursor-not-allowed disabled:opacity-40">Salvar alterações</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------- helpers visuais */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass-panel rounded-2xl p-6">
      <h2 className="mb-4 font-mono text-[11px] tracking-[0.3em] text-neon-cyan uppercase">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className={LABEL}>{label}</span>
      {children}
    </div>
  );
}
