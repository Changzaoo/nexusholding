interface SecretAdminProgressProps {
  progress: number; // 0 → 1
}

const RADIUS = 14;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Indicador discreto no canto inferior direito enquanto a tecla G
 * está pressionada: anel de progresso + "Admin access…".
 */
export function SecretAdminProgress({ progress }: SecretAdminProgressProps) {
  return (
    <div className="fixed right-6 bottom-6 z-50 flex items-center gap-3 rounded-full border border-white/10 bg-black/60 py-2 pr-5 pl-2 backdrop-blur-md">
      <svg width="36" height="36" viewBox="0 0 36 36" className="-rotate-90">
        <circle
          cx="18"
          cy="18"
          r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="2"
        />
        <circle
          cx="18"
          cy="18"
          r={RADIUS}
          fill="none"
          stroke="#41e8ff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
        />
      </svg>
      <div className="font-mono text-[10px] tracking-[0.25em] text-white/60 uppercase">
        Admin access…{' '}
        <span className="text-neon-cyan">{Math.round(progress * 100)}%</span>
      </div>
    </div>
  );
}
