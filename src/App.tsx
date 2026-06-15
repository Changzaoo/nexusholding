import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { Header } from './components/Header';
import { Overlay } from './components/Overlay';
import { SideIndex } from './components/SideIndex';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { LeadForm } from './components/LeadForm';
import { useSecretKeyboardLogin } from './hooks/useSecretKeyboardLogin';
import { useDeviceProfile } from './hooks/useDeviceProfile';
import { adminSignIn, watchAuth } from './lib/firebase';
import { scrollState } from './lib/scrollState';
import type { AdminUser } from './types/admin';

gsap.registerPlugin(ScrollTrigger);

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

// cena 3D em lazy load — o shell HTML aparece instantaneamente
const ExperienceCanvas = lazy(() => import('./scene/ExperienceCanvas'));

export default function App() {
  const profile = useDeviceProfile();
  const lenisRef = useRef<Lenis | null>(null);

  // ------------------------------------------------ estado do admin
  const [user, setUser] = useState<AdminUser | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);

  useEffect(
    () =>
      watchAuth((u) =>
        setUser(u ? { uid: u.uid, email: u.email } : null),
      ),
    [],
  );

  // login secreto por teclado: e-mail + Enter → senha + Enter → entra direto.
  useSecretKeyboardLogin(async (email, password) => {
    if (user) {
      setDashboardOpen(true);
      return;
    }
    try {
      await adminSignIn(email, password);
      setDashboardOpen(true);
    } catch {
      // falha silenciosa (credenciais inválidas) — mantém o acesso oculto
    }
  }, !dashboardOpen);

  // ------------------------------------------- smooth scroll (Lenis)
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.25,
      smoothWheel: true,
      wheelMultiplier: 0.9,
    });
    lenisRef.current = lenis;

    lenis.on('scroll', ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // único ScrollTrigger global → alimenta a cena 3D (lido em useFrame)
    // e a UI HTML (via useScrollProgress). Sem seções verticais.
    const trigger = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        scrollState.progress = self.progress;
        scrollState.velocity = clamp(self.getVelocity() / 4000, -3, 3);
      },
    });

    return () => {
      trigger.kill();
      gsap.ticker.remove(raf);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // pausa o scroll da experiência quando modal/dashboard estão abertos
  useEffect(() => {
    const lenis = lenisRef.current;
    if (!lenis) return;
    if (showLogin || dashboardOpen || showLeadForm) lenis.stop();
    else lenis.start();
  }, [showLogin, dashboardOpen, showLeadForm]);

  // ao SAIR do CRM, volta a experiência para o topo (e reativa o scroll)
  const wasDashboardOpen = useRef(false);
  useEffect(() => {
    if (wasDashboardOpen.current && !dashboardOpen) {
      scrollState.progress = 0;
      scrollState.velocity = 0;
      const lenis = lenisRef.current;
      if (lenis) lenis.scrollTo(0, { immediate: true });
      else window.scrollTo(0, 0);
      ScrollTrigger.refresh();
    }
    wasDashboardOpen.current = dashboardOpen;
  }, [dashboardOpen]);

  return (
    <div id="top">
      {/* cena 3D fixa atrás de tudo — escondida enquanto o CRM está aberto */}
      {!dashboardOpen && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-0 flex items-center justify-center bg-void">
              <span className="animate-pulse font-mono text-[10px] tracking-[0.5em] text-white/40 uppercase">
                Inicializando experiência…
              </span>
            </div>
          }
        >
          <ExperienceCanvas />
        </Suspense>
      )}

      {/* overlays atmosféricos: scanlines + ruído + vignette (CSS, leve) */}
      <div className="fx-overlay" aria-hidden />

      <Header />
      <Overlay onOpenLeadForm={() => setShowLeadForm(true)} />
      <SideIndex />

      {/* trilho de scroll — a altura define a duração da viagem 3D.
          some enquanto o CRM está aberto (sem objetos 3D, sem scroll) */}
      {!dashboardOpen && (
        <div
          style={{ height: profile.isMobile ? '800vh' : '1000vh' }}
          aria-hidden
        />
      )}

      {/* formulário de captação (Raio-X Digital) */}
      {showLeadForm && <LeadForm onClose={() => setShowLeadForm(false)} />}

      {/* ------------------------------------------ camada do admin */}
      {showLogin && !dashboardOpen && (
        <AdminLogin
          onClose={() => setShowLogin(false)}
          onSuccess={() => {
            setShowLogin(false);
            setDashboardOpen(true);
          }}
        />
      )}

      {dashboardOpen && user && (
        <AdminDashboard user={user} onSignOut={() => setDashboardOpen(false)} />
      )}
    </div>
  );
}
