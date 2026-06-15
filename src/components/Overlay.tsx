import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { GlitchText } from './GlitchText';
import { useSiteContent } from '../lib/content';
import { useScrollProgress } from '../hooks/useScrollProgress';

/** Fade por janela: 0 fora de [a,d]; sobe a→b, segura b→c, desce c→d. */
function fadeWindow(p: number, a: number, b: number, c: number, d: number) {
  if (p <= a || p >= d) return 0;
  if (p < b) return (p - a) / (b - a);
  if (p > c) return 1 - (p - c) / (d - c);
  return 1;
}

/**
 * Flash branco TOTALMENTE OPACO no clímax da viagem. Diferente do brilho
 * aditivo (que é translúcido), este cobre a tela por completo — é durante
 * esse instante 100% branco que os planetas são revelados na cena 3D
 * (ver ExperienceCanvas), garantindo que nunca sejam vistos "spawnando".
 *  sobe 0.165->0.20, segura opaco 0.20->0.245 e sai limpo em 0.252.
 *  A saida nao usa uma cauda semi-transparente longa para o branco nao
 *  virar cinza sobre o espaco escuro.
 */
function warpBlink(p: number) {
  if (p <= 0.165 || p >= 0.252) return 0;
  if (p < 0.2) return (p - 0.165) / (0.2 - 0.165);
  if (p <= 0.245) return 1;

  // A long translucent white overlay reads as gray over deep space.
  // Keep the travel climax white-hot, then reveal the scene cleanly.
  return 0;
}

/**
 * Camada HTML sobre o canvas: tagline inicial, título editorial gigante
 * ("CREATIVE DIGITAL EXPERIENCES", surge ~20%), hint de scroll e a cena
 * final ("BUILDING THE NEXT INTERFACE" + CTA, ~100%). Opacidade/posição
 * dirigidas pelo progresso de scroll (useScrollProgress).
 */
interface OverlayProps {
  onOpenLeadForm: () => void;
}

export function Overlay({ onOpenLeadForm }: OverlayProps) {
  const siteContent = useSiteContent();
  const p = useScrollProgress();
  const introRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({ delay: 0.3 });
    tl.from(introRef.current, { autoAlpha: 0, y: 30, duration: 1.4, ease: 'power3.out' });
    return () => {
      tl.kill();
    };
  }, []);

  // ---- janelas de opacidade
  // intro: tagline + hint visible from the very beginning (p=0), fades before warp
  const intro = Math.min(1, p < 0.08 ? 1 - (p / 0.08) : 0);
  // title appears AFTER the warp effect ends (~0.18), fades before first card (~0.28)
  const title = fadeWindow(p, 0.19, 0.22, 0.25, 0.28);
  const titleShift = -fadeWindow(p, 0.22, 0.28, 1, 1) * 220;
  const final = fadeWindow(p, 0.9, 0.96, 1.01, 1.02);

  return (
    <>
      {/* flash branco opaco do salto — cobre tudo enquanto os planetas
          são revelados por trás (sem o usuário ver eles renderizando) */}
      <div
        className="pointer-events-none fixed -inset-10 z-[45]"
        style={{ opacity: warpBlink(p), background: '#ffffff' }}
        aria-hidden
      />

      {/* ----------------------------------- tagline inicial (0%) */}
      <div
        ref={introRef}
        className="pointer-events-none fixed inset-x-0 bottom-[16vh] z-20 px-6 md:px-12"
        style={{ opacity: intro }}
      >
        <div className="mb-3 font-mono text-[10px] tracking-[0.5em] text-neon-cyan/80 uppercase">
          {siteContent.company} — Spatial Web Studio
        </div>
        <p className="max-w-xs font-body text-sm leading-relaxed font-light text-white/55">
          {siteContent.hero.subtitle}
        </p>
      </div>

      {/* ------------------------ Hero central com nome da empresa e mensagem principal */}
      <div
        className="fixed inset-0 z-20 flex items-center justify-center px-6 md:px-12"
        style={{ opacity: title, transform: `translateX(${titleShift}px)` }}
      >
        <div className="max-w-3xl text-center pointer-events-none">
          <div className="mb-4 font-mono text-[10px] tracking-[0.45em] text-neon-cyan/80 uppercase">
            {siteContent.hero.sideNote}
          </div>

          <h1 className="font-display text-[8vw] md:text-[5.5rem] leading-tight font-bold tracking-tight text-white uppercase">
            {siteContent.company}
          </h1>

          <p className="mt-4 text-lg md:text-xl text-white/90 font-medium">
            {siteContent.hero.title}
          </p>

          <p className="mt-2 text-sm md:text-base text-white/70">
            {siteContent.hero.subtitle}
          </p>

          <div className="mt-6 flex gap-4 items-center justify-center pointer-events-auto">
            <button onClick={onOpenLeadForm} className="pill-button !border-neon-cyan/50">
              {siteContent.hero.exploreLabel}
              <span className="text-neon-cyan">→</span>
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------ hint de scroll */}
      <div
        className="fixed bottom-6 left-1/2 z-20 -translate-x-1/2 font-mono text-[9px] tracking-[0.5em] text-white/35 uppercase"
        style={{ opacity: intro }}
      >
        role para baixo para iniciar a viagem
        <span className="ml-2 inline-block animate-bounce text-neon-cyan">▾</span>
      </div>

      {/* -------------------------------------- cena final (~100%) */}
      <div
        id="contact"
        className="fixed inset-0 z-20 flex flex-col items-center justify-end pb-[14vh]"
        style={{ opacity: final, pointerEvents: final > 0.5 ? 'auto' : 'none' }}
      >
        <div className="mb-4 font-mono text-[10px] tracking-[0.5em] text-neon-cyan/70 uppercase">
          {siteContent.mission.caption}
        </div>
        <h2 className="font-display max-w-4xl px-6 text-center text-5xl leading-[0.92] font-bold tracking-[-0.02em] text-white uppercase md:text-7xl">
          <GlitchText>{siteContent.final.title}</GlitchText>
        </h2>
        <button
          onClick={onOpenLeadForm}
          className="pill-button mt-10 !border-neon-cyan/50 !px-10 !py-4"
        >
          {siteContent.final.ctaLabel}
          <span className="text-neon-cyan">→</span>
        </button>
        <div className="mt-8 font-mono text-[9px] tracking-[0.4em] text-white/30 uppercase">
          {siteContent.company} © 2026
        </div>
      </div>
    </>
  );
}
