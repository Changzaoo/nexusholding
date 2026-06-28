import { motion, AnimatePresence } from 'framer-motion';
import { CopilotHeader } from './CopilotHeader';
import { CopilotSidebar } from './CopilotSidebar';
import { CopilotConversation } from './CopilotConversation';
import { CopilotChatInput } from './CopilotChatInput';
import { ChatMode } from './modes/ChatMode';
import { ProjectMode } from './modes/ProjectMode';
import { MeetingMode } from './modes/MeetingMode';
import { DocumentMode } from './modes/DocumentMode';
import { CeoMode } from './modes/CeoMode';
import type { UseCopilotReturn } from '../../hooks/useCopilot';

interface CopilotWindowProps {
  copilot: UseCopilotReturn;
}

export function CopilotWindow({ copilot }: CopilotWindowProps) {
  const { state } = copilot;

  if (!state.isOpen) return null;

  const renderMode = () => {
    switch (state.mode) {
      case 'chat':
        return <ChatMode copilot={copilot} />;
      case 'project':
        return <ProjectMode copilot={copilot} />;
      case 'meeting':
        return <MeetingMode copilot={copilot} />;
      case 'document':
        return <DocumentMode copilot={copilot} />;
      case 'ceo':
        return <CeoMode copilot={copilot} />;
      default:
        return <ChatMode copilot={copilot} />;
    }
  };

  return (
    <>
      {/* Backdrop para mobile */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9998] bg-black/50 sm:hidden"
        onClick={copilot.closeWindow}
        aria-hidden
      />

      {/* Janela principal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="fixed bottom-24 right-6 z-[9999] flex h-[85vh] max-h-[720px] w-[420px] max-w-[calc(100vw-48px)] flex-col overflow-hidden rounded-2xl shadow-2xl sm:bottom-6"
        style={{
          background: 'linear-gradient(145deg, rgba(10, 15, 31, 0.95) 0%, rgba(6, 9, 20, 0.98) 100%)',
          backdropFilter: 'blur(40px)',
          border: '1px solid rgba(65, 232, 255, 0.15)',
          boxShadow: '0 0 40px rgba(65, 232, 255, 0.1), 0 25px 80px rgba(0, 0, 0, 0.6)',
        }}
        role="dialog"
        aria-label="Nexus AI Copilot"
      >
        <CopilotHeader copilot={copilot} />
        <div className="flex flex-1 overflow-hidden">
          <CopilotSidebar copilot={copilot} />
          <div className="flex flex-1 flex-col">
            <CopilotConversation copilot={copilot} />
            {renderMode()}
            <CopilotChatInput copilot={copilot} />
          </div>
        </div>
      </motion.div>
    </>
  );
}