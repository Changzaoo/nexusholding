import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { Header } from './components/Header';
import { Overlay } from './components/Overlay';
import { SideIndex } from './components/SideIndex';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { useSecretAdminTrigger } from './hooks/useSecretAdminTrigger';
import { useDeviceProfile } from './hooks/useDeviceProfile';
import { watchAuth } from './lib/firebase';
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

  useEffect(
    () =>
      watchAuth((u) =>
        setUser(u ? { uid: u.uid, email: u.email } : null),
      ),
    [],
  );

  // segurar "G" por 10s → login (ou direto ao dashboard se já logado).
  // SILENCIOSO: nenhum indicador aparece enquanto segura; só dispara aos 10s.
  useSecretAdminTrigger(() => {
    if (user) setDashboardOpen(true);
    else setShowLogin(true);
  });

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
    if (showLogin || dashboardOpen) lenis.stop();
    else lenis.start();
  }, [showLogin, dashboardOpen]);

  return (
    <div id="top">
      {/* cena 3D fixa atrás de tudo */}
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

      {/* overlays atmosféricos: scanlines + ruído + vignette (CSS, leve) */}
      <div className="fx-overlay" aria-hidden />

      <Header />
      <Overlay />
      <SideIndex />

      {/* trilho de scroll — a altura define a duração da viagem 3D */}
      <div
        style={{ height: profile.isMobile ? '800vh' : '1000vh' }}
        aria-hidden
      />

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
