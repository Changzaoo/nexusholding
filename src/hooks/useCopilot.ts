import { useReducer, useCallback, useEffect, useRef } from 'react';
import type {
  CopilotState,
  CopilotAction,
  Message,
  CopilotMode,
  ProjectData,
  MeetingData,
  DocumentFile,
} from '../types/copilot';

const STORAGE_KEY = 'nexus-copilot-messages';

const initialState: CopilotState = {
  isOpen: false,
  mode: 'chat',
  messages: [],
  context: {
    mode: 'chat',
    projectData: {},
    meetingData: {},
    documents: [],
    ceoPhase: 0,
    ceoResponses: [],
  },
  isTyping: false,
  streaming: {
    isStreaming: false,
    currentContent: '',
  },
};

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function loadMessages(): Message[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveMessages(messages: Message[]): void {
  try {
    const trimmed = messages.slice(-100);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage pode estar indisponível
  }
}

function copilotReducer(state: CopilotState, action: CopilotAction): CopilotState {
  switch (action.type) {
    case 'TOGGLE_WINDOW':
      return { ...state, isOpen: !state.isOpen };

    case 'SET_MODE':
      return {
        ...state,
        mode: action.payload,
        context: { ...state.context, mode: action.payload },
      };

    case 'ADD_MESSAGE': {
      const newMessages = [...state.messages, action.payload];
      saveMessages(newMessages);
      return { ...state, messages: newMessages };
    }

    case 'UPDATE_MESSAGE': {
      const newMessages = state.messages.map((msg) =>
        msg.id === action.payload.id ? { ...msg, content: action.payload.content } : msg
      );
      saveMessages(newMessages);
      return { ...state, messages: newMessages };
    }

    case 'CLEAR_MESSAGES':
      saveMessages([]);
      return { ...state, messages: [] };

    case 'SET_TYPING':
      return { ...state, isTyping: action.payload };

    case 'SET_STREAMING':
      return { ...state, streaming: action.payload };

    case 'UPDATE_PROJECT_DATA':
      return {
        ...state,
        context: { ...state.context, projectData: { ...state.context.projectData, ...action.payload } },
      };

    case 'UPDATE_MEETING_DATA':
      return {
        ...state,
        context: { ...state.context, meetingData: { ...state.context.meetingData, ...action.payload } },
      };

    case 'ADD_DOCUMENT':
      return {
        ...state,
        context: { ...state.context, documents: [...state.context.documents, action.payload] },
      };

    case 'REMOVE_DOCUMENT':
      return {
        ...state,
        context: {
          ...state.context,
          documents: state.context.documents.filter((doc) => doc.id !== action.payload),
        },
      };

    case 'UPDATE_DOCUMENT': {
      const docs = state.context.documents.map((doc) =>
        doc.id === action.payload.id ? { ...doc, ...action.payload.updates } : doc
      );
      return { ...state, context: { ...state.context, documents: docs } };
    }

    case 'SET_CEO_PHASE':
      return { ...state, context: { ...state.context, ceoPhase: action.payload } };

    case 'ADD_CEO_RESPONSE':
      return {
        ...state,
        context: {
          ...state.context,
          ceoResponses: [...state.context.ceoResponses, action.payload],
        },
      };

    case 'RESET_CONTEXT':
      return {
        ...state,
        context: {
          mode: state.mode,
          projectData: {},
          meetingData: {},
          documents: [],
          ceoPhase: 0,
          ceoResponses: [],
        },
      };

    default:
      return state;
  }
}

export function useCopilot() {
  const [state, dispatch] = useReducer(copilotReducer, initialState, (initial) => ({
    ...initial,
    messages: loadMessages(),
  }));

  const abortControllerRef = useRef<AbortController | null>(null);

  const toggleWindow = useCallback(() => dispatch({ type: 'TOGGLE_WINDOW' }), []);
  const closeWindow = useCallback(() => dispatch({ type: 'TOGGLE_WINDOW' }), []);
  const openWindow = useCallback(() => {
    if (!state.isOpen) dispatch({ type: 'TOGGLE_WINDOW' });
  }, [state.isOpen]);

  const setMode = useCallback((mode: CopilotMode) => dispatch({ type: 'SET_MODE', payload: mode }), []);

  const addMessage = useCallback((content: string, role: 'user' | 'assistant' = 'assistant'): Message => {
    const message: Message = {
      id: generateId(),
      role,
      content,
      timestamp: Date.now(),
    };
    dispatch({ type: 'ADD_MESSAGE', payload: message });
    return message;
  }, []);

  const updateMessage = useCallback((id: string, content: string) => {
    dispatch({ type: 'UPDATE_MESSAGE', payload: { id, content } });
  }, []);

  const clearMessages = useCallback(() => dispatch({ type: 'CLEAR_MESSAGES' }), []);

  const setTyping = useCallback((isTyping: boolean) => dispatch({ type: 'SET_TYPING', payload: isTyping }), []);

  const updateProjectData = useCallback((data: Partial<ProjectData>) => {
    dispatch({ type: 'UPDATE_PROJECT_DATA', payload: data });
  }, []);

  const updateMeetingData = useCallback((data: Partial<MeetingData>) => {
    dispatch({ type: 'UPDATE_MEETING_DATA', payload: data });
  }, []);

  const addDocument = useCallback((file: DocumentFile) => {
    dispatch({ type: 'ADD_DOCUMENT', payload: file });
  }, []);

  const removeDocument = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_DOCUMENT', payload: id });
  }, []);

  const updateDocument = useCallback((id: string, updates: Partial<DocumentFile>) => {
    dispatch({ type: 'UPDATE_DOCUMENT', payload: { id, updates } });
  }, []);

  const setCeoPhase = useCallback((phase: number) => {
    dispatch({ type: 'SET_CEO_PHASE', payload: phase });
  }, []);

  const addCeoResponse = useCallback((response: string) => {
    dispatch({ type: 'ADD_CEO_RESPONSE', payload: response });
  }, []);

  const resetContext = useCallback(() => dispatch({ type: 'RESET_CONTEXT' }), []);

  const sendMessage = useCallback(
    async (content: string, apiEndpoint: string) => {
      addMessage(content, 'user');

      const userMessageId = generateId();
      const assistantMessage = addMessage('', 'assistant');
      const messageId = assistantMessage.id;

      setTyping(true);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      dispatch({
        type: 'SET_STREAMING',
        payload: { isStreaming: true, currentContent: '' },
      });

      try {
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: state.messages.concat([
              { id: userMessageId, role: 'user' as const, content, timestamp: Date.now() },
            ]),
            mode: state.mode,
            context: state.context,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`Erro HTTP: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('Stream não disponível');

        const decoder = new TextDecoder();
        let fullContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullContent += parsed.content;
                  updateMessage(messageId, fullContent);
                  dispatch({
                    type: 'SET_STREAMING',
                    payload: { isStreaming: true, currentContent: fullContent },
                  });
                }
              } catch {
                // JSON inválido no chunk
              }
            }
          }
        }

        dispatch({
          type: 'SET_STREAMING',
          payload: { isStreaming: false, currentContent: fullContent },
        });
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return;
        }
        updateMessage(messageId, '❌ Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.');
        dispatch({
          type: 'SET_STREAMING',
          payload: { isStreaming: false, currentContent: '' },
        });
      } finally {
        setTyping(false);
      }
    },
    [state.messages, state.mode, state.context, addMessage, updateMessage, setTyping]
  );

  const abortStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setTyping(false);
      dispatch({
        type: 'SET_STREAMING',
        payload: { isStreaming: false, currentContent: '' },
      });
    }
  }, [setTyping]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    state,
    toggleWindow,
    closeWindow,
    openWindow,
    setMode,
    addMessage,
    updateMessage,
    clearMessages,
    setTyping,
    updateProjectData,
    updateMeetingData,
    addDocument,
    removeDocument,
    updateDocument,
    setCeoPhase,
    addCeoResponse,
    resetContext,
    sendMessage,
    abortStream,
  };
}

export type UseCopilotReturn = ReturnType<typeof useCopilot>;