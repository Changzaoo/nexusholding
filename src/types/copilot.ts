// Tipos do Nexus AI Copilot

export type CopilotMode = 'chat' | 'project' | 'meeting' | 'document' | 'ceo';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ProjectData {
  companyName: string;
  problem: string;
  currentSystem: string;
  technologies: string;
  deadline: string;
  budget: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  usersCount: string;
  integrations: string[];
  needsAI: boolean;
  needsApp: boolean;
  needsAdminPanel: boolean;
  needsAPI: boolean;
  needsDatabase: boolean;
  needsHosting: boolean;
  contact: {
    name: string;
    email: string;
    phone: string;
  };
}

export interface MeetingData {
  name: string;
  company: string;
  email: string;
  phone: string;
  objective: string;
  date: string;
  time: string;
  notes: string;
}

export interface DocumentFile {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
  status: 'pending' | 'uploading' | 'analyzing' | 'done' | 'error';
  progress: number;
}

export interface ConversationContext {
  mode: CopilotMode;
  projectData: Partial<ProjectData>;
  meetingData: Partial<MeetingData>;
  documents: DocumentFile[];
  ceoPhase: number;
  ceoResponses: string[];
}

export interface StreamingState {
  isStreaming: boolean;
  currentContent: string;
}

export interface CopilotState {
  isOpen: boolean;
  mode: CopilotMode;
  messages: Message[];
  context: ConversationContext;
  isTyping: boolean;
  streaming: StreamingState;
}

// Ações do reducer
export type CopilotAction =
  | { type: 'TOGGLE_WINDOW' }
  | { type: 'SET_MODE'; payload: CopilotMode }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_MESSAGE'; payload: { id: string; content: string } }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'SET_TYPING'; payload: boolean }
  | { type: 'SET_STREAMING'; payload: StreamingState }
  | { type: 'UPDATE_PROJECT_DATA'; payload: Partial<ProjectData> }
  | { type: 'UPDATE_MEETING_DATA'; payload: Partial<MeetingData> }
  | { type: 'ADD_DOCUMENT'; payload: DocumentFile }
  | { type: 'REMOVE_DOCUMENT'; payload: string }
  | { type: 'UPDATE_DOCUMENT'; payload: { id: string; updates: Partial<DocumentFile> } }
  | { type: 'SET_CEO_PHASE'; payload: number }
  | { type: 'ADD_CEO_RESPONSE'; payload: string }
  | { type: 'RESET_CONTEXT' };