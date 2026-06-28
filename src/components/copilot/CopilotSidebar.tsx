import { motion } from 'framer-motion';
import type { UseCopilotReturn } from '../../hooks/useCopilot';
import type { CopilotMode } from '../../types/copilot';

const modes: { id: CopilotMode; icon: string; label: string; description: string }[] = [
  { id: 'chat', icon: '💬', label: 'Conversar', description: 'Tire suas dúvidas' },
  { id: 'ceo', icon: '👑', label: 'CEO AI', description: 'Consultor estratégico' },
  { id: 'project', icon: '🚀', label: 'Projeto', description: 'Solicite um projeto' },
  { id: 'meeting', icon: '📅', label: 'Reunião', description: 'Agende uma reunião' },
  { id: 'document', icon: '📄', label: 'Documentos', description: 'Analise arquivos' },
];

export function CopilotSidebar({ copilot }: { copilot: UseCopilotReturn }) {
  const { state, setMode } = copilot;

  return (
    <div
      className="flex w-16 shrink-0 flex-col items-center border-r py-4 gap-2"
      style={{ borderColor: 'rgba(65, 232, 255, 0.1)' }}
    >
      {modes.map((mode) => (
        <motion.button
          key={mode.id}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setMode(mode.id)}
          className="group relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors"
          style={{
            background: state.mode === mode.id
              ? 'linear-gradient(135deg, rgba(65, 232, 255, 0.25) 0%, rgba(139, 92, 246, 0.25) 100%)'
              : 'transparent',
            border: state.mode === mode.id
              ? '1px solid rgba(65, 232, 255, 0.4)'
              : '1px solid transparent',
          }}
          aria-label={mode.label}
          title={mode.label}
        >
          <span className="text-lg">{mode.icon}</span>

          {/* Tooltip */}
          <div
            className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-lg px-3 py-2 font-mono text-xs opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
            style={{
              background: 'rgba(10, 15, 31, 0.95)',
              border: '1px solid rgba(65, 232, 255, 0.2)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <span className="text-white/90">{mode.label}</span>
            <br />
            <span className="text-white/40">{mode.description}</span>
          </div>

          {/* Indicador ativo */}
          {state.mode === mode.id && (
            <motion.div
              layoutId="activeMode"
              className="absolute -left-1 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-neon-cyan"
              initial={false}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          )}
        </motion.button>
      ))}
    </div>
  );
}