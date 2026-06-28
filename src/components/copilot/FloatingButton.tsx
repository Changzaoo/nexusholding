import { motion } from 'framer-motion';
import type { UseCopilotReturn } from '../../hooks/useCopilot';

interface FloatingButtonProps {
  copilot: UseCopilotReturn;
}

export function FloatingButton({ copilot }: FloatingButtonProps) {
  const { state, toggleWindow } = copilot;

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 1 }}
      onClick={toggleWindow}
      className="fixed bottom-6 right-6 z-[9999] flex h-14 w-14 items-center justify-center rounded-full shadow-lg"
      style={{
        background: 'linear-gradient(135deg, rgba(65, 232, 255, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(65, 232, 255, 0.3)',
        boxShadow: state.isOpen
          ? '0 0 30px rgba(65, 232, 255, 0.4), 0 0 60px rgba(65, 232, 255, 0.2), inset 0 0 20px rgba(65, 232, 255, 0.1)'
          : '0 0 20px rgba(65, 232, 255, 0.2), 0 0 40px rgba(65, 232, 255, 0.1)',
      }}
      aria-label={state.isOpen ? 'Fechar Nexus AI Copilot' : 'Abrir Nexus AI Copilot'}
      aria-expanded={state.isOpen}
    >
      {/* Ícone de AI */}
      <motion.svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="url(#nexusGradient)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={state.isOpen ? { rotate: 180 } : { rotate: 0 }}
        transition={{ duration: 0.3 }}
      >
        <defs>
          <linearGradient id="nexusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#41e8ff" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        {/* Cérebro/AI */}
        <path d="M12 2a4 4 0 0 1 4 4v1a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
        <path d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
        <path d="M16 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
        <path d="M9 21v-2a3 3 0 0 1 6 0v2" />
        <path d="M12 12v5" />
        <path d="M9 17h6" />
      </motion.svg>

      {/* Halo pulsante */}
      {!state.isOpen && (
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{
            background: 'transparent',
            border: '2px solid rgba(65, 232, 255, 0.5)',
          }}
          animate={{ scale: [1, 1.4, 1], opacity: [0.8, 0, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Ripple no hover */}
      {state.isOpen && (
        <motion.span
          className="absolute inset-0 rounded-full bg-neon-cyan/20"
          initial={{ scale: 0, opacity: 0 }}
          whileHover={{ scale: 1.2, opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}
    </motion.button>
  );
}