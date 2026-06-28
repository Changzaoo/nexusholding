// Nexus AI Copilot - Exportação de componentes
// Arquitetura desacoplada e plug-and-play

export { FloatingButton } from './FloatingButton';
export { CopilotWindow } from './CopilotWindow';
export { CopilotHeader } from './CopilotHeader';
export { CopilotSidebar } from './CopilotSidebar';
export { CopilotConversation } from './CopilotConversation';
export { CopilotChatInput } from './CopilotChatInput';
export { TypingIndicator } from './TypingIndicator';

// Modos do Copilot
export { ChatMode } from './modes/ChatMode';
export { ProjectMode } from './modes/ProjectMode';
export { MeetingMode } from './modes/MeetingMode';
export { DocumentMode } from './modes/DocumentMode';
export { CeoMode } from './modes/CeoMode';

// Hook principal
export { useCopilot } from '../../hooks/useCopilot';
export type { UseCopilotReturn } from '../../hooks/useCopilot';

// Tipos
export type {
  CopilotMode,
  Message,
  ProjectData,
  MeetingData,
  DocumentFile,
  ConversationContext,
  StreamingState,
  CopilotState,
  CopilotAction,
} from '../../types/copilot';