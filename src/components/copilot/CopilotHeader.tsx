import { motion } from 'framer-motion';
import type { UseCopilotReturn } from '../../hooks/useCopilot';

const modeLabels: Record<string, string> = {
  chat: 'Conversar',
  project: 'Solicitar Projeto',
  meeting: 'Agendar Reunião',
  document: 'Analisar Documentos',
  ceo: 'CEO AI',
};

export function CopilotHeader({ copilot }: { copilot: UseCopilotReturn }) {
  const { state, closeWindow, clearMessages } = copilot;

  return (
    <div
      className="flex h-14 shrink-0 items-center justify-between border-b px-4"
      style={{ borderColor: 'rgba(65, 232, 255, 0.1)' }}
    >
      <div className="flex items-center gap-3">
        {/* Logo AI */}
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{
            background: 'linear-gradient(135deg, rgba(65, 232, 255, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="url(#headerGradient)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <defs>
              <linearGradient id="headerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#41e8ff" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
            <path d="M12 2a4 4 0 0 1 4 4v1a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
            <path d="M9 21v-2a3 3 0 0 1 6 0v2" />
            <path d="M12 12v5" />
            <path d="M9 17h6" />
          </svg>
        </div>

        <div>
          <h2 className="font-mono text-sm font-medium text-white/90">Nexus AI</h2>
          <p className="font-mono text-[10px] text-white/40">{modeLabels[state.mode]}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Botão limpar */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={clearMessages}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/5 hover:text-white/70"
          aria-label="Limpar conversa"
          title="Limpar conversa"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
        </motion.button>

        {/* Botão fechar */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={closeWindow}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/5 hover:text-white/70"
          aria-label="Fechar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </motion.button>
      </div>
    </div>
  );
}