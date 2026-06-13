import { useState } from 'react';
import { adminSignOut } from '../lib/firebase';
import { siteContent } from '../data/siteContent';
import type { AdminUser, EditableContent } from '../types/admin';

interface AdminDashboardProps {
  user: AdminUser;
  onSignOut: () => void;
}

/**
 * Dashboard simples pós-login. Os campos são editáveis localmente
 * e já tipados (EditableContent) para futura persistência no
 * Firestore — basta implementar saveContent() abaixo.
 */
export function AdminDashboard({ user, onSignOut }: AdminDashboardProps) {
  const [content, setContent] = useState<EditableContent>({
    heroTitle: siteContent.hero.title,
    heroSubtitle: siteContent.hero.subtitle,
    services: siteContent.services.map((s) => ({ ...s })),
    contactCta: siteContent.final.ctaLabel,
  });
  const [savedFlash, setSavedFlash] = useState(false);

  const handleSignOut = async () => {
    await adminSignOut();
    onSignOut();
  };

  const saveContent = () => {
    /*
     * 🔧 FUTURO: persistir no Firestore, ex.:
     *   import { getFirestore, doc, setDoc } from 'firebase/firestore';
     *   await setDoc(doc(db, 'content', 'site'), {
     *     ...content, updatedAt: Date.now(), updatedBy: user.uid,
     *   });
     */
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  };

  const inputClass =
    'w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-neon-cyan/60';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-void" data-lenis-prevent>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.12),transparent_60%)]" />

      <div className="relative mx-auto max-w-4xl px-6 py-12">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] tracking-[0.4em] text-neon-cyan uppercase">
              {siteContent.company}
            </div>
            <h1 className="font-display text-4xl font-bold tracking-wide text-white uppercase">
              Admin Dashboard
            </h1>
            <p className="mt-1 font-mono text-xs text-white/45">
              {user.email ?? 'sem e-mail'}
            </p>
          </div>
          <button onClick={handleSignOut} className="pill-button">
            Sair
          </button>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="glass-panel rounded-2xl p-6">
            <h2 className="mb-4 font-mono text-[11px] tracking-[0.3em] text-white/55 uppercase">
              Hero Title
            </h2>
            <input
              value={content.heroTitle}
              onChange={(e) =>
                setContent((c) => ({ ...c, heroTitle: e.target.value }))
              }
              className={inputClass}
            />
          </section>

          <section className="glass-panel rounded-2xl p-6">
            <h2 className="mb-4 font-mono text-[11px] tracking-[0.3em] text-white/55 uppercase">
              Hero Subtitle
            </h2>
            <textarea
              value={content.heroSubtitle}
              rows={2}
              onChange={(e) =>
                setContent((c) => ({ ...c, heroSubtitle: e.target.value }))
              }
              className={`${inputClass} resize-none`}
            />
          </section>

          <section className="glass-panel rounded-2xl p-6 md:col-span-2">
            <h2 className="mb-4 font-mono text-[11px] tracking-[0.3em] text-white/55 uppercase">
              Services
            </h2>
            <div className="flex flex-col gap-3">
              {content.services.map((service, i) => (
                <div key={service.id} className="flex items-center gap-3">
                  <span className="w-8 font-mono text-xs text-neon-violet">
                    {service.id}
                  </span>
                  <input
                    value={service.title}
                    onChange={(e) =>
                      setContent((c) => {
                        const services = [...c.services];
                        services[i] = { ...services[i], title: e.target.value };
                        return { ...c, services };
                      })
                    }
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="glass-panel rounded-2xl p-6 md:col-span-2">
            <h2 className="mb-4 font-mono text-[11px] tracking-[0.3em] text-white/55 uppercase">
              Contact CTA
            </h2>
            <input
              value={content.contactCta}
              onChange={(e) =>
                setContent((c) => ({ ...c, contactCta: e.target.value }))
              }
              className={inputClass}
            />
          </section>
        </div>

        <footer className="mt-8 flex items-center gap-4">
          <button onClick={saveContent} className="pill-button">
            Salvar alterações
          </button>
          {savedFlash && (
            <span className="font-mono text-[11px] text-neon-acid">
              ✓ Pronto para conectar ao Firestore
            </span>
          )}
        </footer>
      </div>
    </div>
  );
}
