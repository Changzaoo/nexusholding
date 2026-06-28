import { useState, useRef, useCallback, KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import type { UseCopilotReturn } from '../../hooks/useCopilot';

const API_URL = import.meta.env.VITE_AGENT_API_URL || '/api';

export function CopilotChatInput({ copilot }: { copilot: UseCopilotReturn }) {
  const { state, sendMessage, addMessage, abortStream } = copilot;
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || state.isTyping) return;

    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Selecionar endpoint baseado no modo
    const endpoint = state.mode === 'ceo' 
      ? `${API_URL}/ceo`
      : state.mode === 'project'
      ? `${API_URL}/project`
      : `${API_URL}/chat`;

    await sendMessage(trimmed, endpoint);
  }, [input, state.isTyping, state.mode, sendMessage]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, []);

  return (
    <div
      className="shrink-0 border-t p-3"
      style={{ borderColor: 'rgba(65, 232, 255, 0.1)' }}
    >
      <div
        className="flex items-end gap-2 rounded-xl p-2"
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua mensagem..."
          className="flex-1 resize-none bg-transparent font-mono text-sm text-white/80 placeholder-white/30 outline-none"
          rows={1}
          disabled={state.isTyping}
          style={{ maxHeight: '120px' }}
          aria-label="Mensagem"
        />

        <div className="flex items-center gap-1">
          {/* Botão cancelar streaming */}
          {state.streaming.isStreaming && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={abortStream}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 transition-colors hover:bg-red-400/10"
              aria-label="Cancelar"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </motion.button>
          )}

          {/* Botão enviar */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmit}
            disabled={!input.trim() || state.isTyping}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-all disabled:opacity-30"
            style={{
              background: input.trim()
                ? 'linear-gradient(135deg, rgba(65, 232, 255, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)'
                : 'rgba(255, 255, 255, 0.05)',
              border: input.trim()
                ? '1px solid rgba(65, 232, 255, 0.4)'
                : '1px solid rgba(255, 255, 255, 0.1)',
            }}
            aria-label="Enviar mensagem"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={input.trim() ? '#41e8ff' : '#ffffff60'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </motion.button>
        </div>
      </div>

      {/* Dica de atalho */}
      <p className="mt-1 text-center font-mono text-[10px] text-white/20">
        Enter para enviar · Shift+Enter para quebra de linha
      </p>
    </div>
  );
}