import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { UseCopilotReturn } from '../../hooks/useCopilot';
import { TypingIndicator } from './TypingIndicator';

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function MarkdownContent({ content }: { content: string }) {
  // Parse simples de markdown para renderização
  const html = content
    // Código inline
    .replace(/`([^`]+)`/g, '<code class="bg-white/10 rounded px-1 py-0.5 font-mono text-sm text-neon-cyan">$1</code>')
    // Blocos de código
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => 
      `<pre class="bg-void rounded-lg p-3 my-2 overflow-x-auto border border-white/10"><code class="font-mono text-sm text-white/80">${code.trim()}</code></pre>`
    )
    // Negrito
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    // Itálico
    .replace(/\*([^*]+)\*/g, '<em class="text-white/80">$1</em>')
    // Tabelas simples
    .replace(/\|(.+)\|/g, (match) => {
      const cells = match.split('|').filter(Boolean);
      if (cells.every(c => c.trim().match(/^-+$/))) {
        return ''; // Linha de separador
      }
      return `<div class="flex gap-2 my-1">${cells.map(c => `<span class="flex-1 text-sm">${c.trim()}</span>`).join('')}</div>`;
    })
    // Listas
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-sm text-white/80">$1</li>')
    // Linhas
    .replace(/\n\n/g, '</p><p class="my-2">')
    // heading
    .replace(/^### (.+)$/gm, '<h3 class="text-white font-semibold mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-white font-semibold mt-4 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-neon-cyan font-bold mt-4 mb-2">$1</h1>');

  return <p className="my-2 text-sm leading-relaxed text-white/80" dangerouslySetInnerHTML={{ __html: html }} />;
}

export function CopilotConversation({ copilot }: { copilot: UseCopilotReturn }) {
  const { state } = copilot;
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para últimas mensagens
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [state.messages, state.streaming.currentContent]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 crm-scroll"
      style={{ scrollbarWidth: 'thin' }}
    >
      {state.messages.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {state.messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'rounded-br-md'
                    : 'rounded-bl-md'
                }`}
                style={{
                  background: message.role === 'user'
                    ? 'linear-gradient(135deg, rgba(65, 232, 255, 0.2) 0%, rgba(65, 232, 255, 0.1) 100%)'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: message.role === 'user'
                    ? '1px solid rgba(65, 232, 255, 0.3)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                {message.role === 'assistant' ? (
                  <MarkdownContent content={message.content} />
                ) : (
                  <p className="text-sm text-white/90">{message.content}</p>
                )}
                <span
                  className="mt-1 block text-[10px] text-white/30"
                  style={{ direction: 'ltr' }}
                >
                  {formatTime(message.timestamp)}
                </span>
              </div>
            </motion.div>
          ))}

          {state.isTyping && <TypingIndicator />}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(65, 232, 255, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
        }}
      >
        <span className="text-3xl">🤖</span>
      </div>
      <h3 className="mb-2 font-mono text-sm font-medium text-white/80">
        Bem-vindo ao Nexus AI
      </h3>
      <p className="max-w-[200px] font-mono text-xs text-white/40">
        Como posso ajudá-lo hoje?
      </p>
    </div>
  );
}