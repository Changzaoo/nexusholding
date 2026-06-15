import { useState, type FormEvent } from 'react';
import { submitLead } from '../lib/leads';
import { useSiteContent } from '../lib/content';

interface LeadFormProps {
  onClose: () => void;
}

const SEGMENTS = [
  'Comércio / Varejo',
  'Serviços',
  'Indústria',
  'Construção / Engenharia',
  'Saúde',
  'Alimentação',
  'Tecnologia',
  'Outro',
];

const REVENUES = [
  'Até R$ 20 mil/mês',
  'R$ 20–50 mil/mês',
  'R$ 50–100 mil/mês',
  'R$ 100–300 mil/mês',
  'Acima de R$ 300 mil/mês',
];

/**
 * Tela do botão "Quero um Raio-X Digital gratuito".
 * Captura o lead → grava via lib/leads (Firestore ou local) → os admins
 * veem tudo no CRM após login.
 */
export function LeadForm({ onClose }: LeadFormProps) {
  const siteContent = useSiteContent();
  const [form, setForm] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    segment: '',
    revenue: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    try {
      await submitLead({ ...form, source: 'raio-x' });
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  const inputClass =
    'w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-neon-cyan/60 placeholder:text-white/25';
  const labelClass =
    'font-mono text-[10px] tracking-[0.28em] text-white/45 uppercase';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      data-lenis-prevent
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="glass-panel relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl p-7 md:p-9">
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-4 top-4 font-mono text-lg text-white/40 transition-colors hover:text-white"
        >
          ✕
        </button>

        {status === 'done' ? (
          <div className="py-10 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-neon-acid/40 bg-neon-acid/10 text-3xl text-neon-acid">
              ✓
            </div>
            <h2 className="font-display text-3xl font-bold tracking-wide text-white uppercase">
              Recebido!
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-white/65">
              Obrigado, {form.name.split(' ')[0] || 'tudo certo'}. Nossa equipe vai
              preparar seu Raio-X Digital e entrar em contato em breve pelo e-mail ou
              WhatsApp informado.
            </p>
            <button onClick={onClose} className="pill-button mt-8 justify-center">
              Fechar
            </button>
          </div>
        ) : (
          <>
            <div className="mb-1 font-mono text-[10px] tracking-[0.4em] text-neon-cyan uppercase">
              {siteContent.company} — Programa Nexus Digital 90
            </div>
            <h2 className="font-display text-3xl font-bold leading-tight tracking-wide text-white uppercase md:text-4xl">
              Raio-X Digital gratuito
            </h2>
            <p className="mt-2 mb-6 text-sm leading-relaxed text-white/55">
              Conte sobre sua empresa. Vamos analisar sua presença digital e mostrar
              onde você está perdendo clientes — sem custo.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>Nome *</span>
                  <input required value={form.name} onChange={set('name')} className={inputClass} placeholder="Seu nome" />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>Empresa</span>
                  <input value={form.company} onChange={set('company')} className={inputClass} placeholder="Nome da empresa" />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>E-mail *</span>
                  <input required type="email" value={form.email} onChange={set('email')} className={inputClass} placeholder="voce@empresa.com" />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>WhatsApp / Telefone</span>
                  <input value={form.phone} onChange={set('phone')} className={inputClass} placeholder="(00) 00000-0000" />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>Segmento</span>
                  <select value={form.segment} onChange={set('segment')} className={inputClass}>
                    <option value="" className="bg-void">Selecione…</option>
                    {SEGMENTS.map((s) => (
                      <option key={s} value={s} className="bg-void">{s}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>Faturamento mensal</span>
                  <select value={form.revenue} onChange={set('revenue')} className={inputClass}>
                    <option value="" className="bg-void">Selecione…</option>
                    {REVENUES.map((r) => (
                      <option key={r} value={r} className="bg-void">{r}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Maior desafio hoje</span>
                <textarea value={form.message} onChange={set('message')} rows={3} className={`${inputClass} resize-none`} placeholder="Ex.: poucos clientes novos, processos desorganizados, equipe sem indicadores…" />
              </label>

              {status === 'error' && (
                <p className="font-mono text-[11px] text-neon-magenta">
                  Não foi possível enviar agora. Tente novamente.
                </p>
              )}

              <button
                type="submit"
                disabled={status === 'sending'}
                className="pill-button mt-1 justify-center !border-neon-cyan/50 disabled:opacity-40"
              >
                {status === 'sending' ? 'Enviando…' : 'Solicitar meu Raio-X gratuito'}
                <span className="text-neon-cyan">→</span>
              </button>
              <p className="text-center font-mono text-[9px] tracking-[0.25em] text-white/30 uppercase">
                Seus dados são usados apenas para contato.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
