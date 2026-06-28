import type { UseCopilotReturn } from '../../../hooks/useCopilot';

export function ChatMode({ copilot }: { copilot: UseCopilotReturn }) {
  const quickActions = [
    { icon: '🏢', label: 'Sobre a Nexus', prompt: 'Conte-me sobre a Nexus Holding' },
    { icon: '🤖', label: 'Serviços de IA', prompt: 'Quais serviços de IA a Nexus oferece?' },
    { icon: '🔧', label: 'Automação', prompt: 'Como a Nexus pode ajudar com automação?' },
    { icon: '💰', label: 'Orçamento', prompt: 'Como funciona o orçamento de projetos?' },
    { icon: '📞', label: 'Contato', prompt: 'Como posso entrar em contato?' },
    { icon: '🌟', label: 'Diferenciais', prompt: 'Quais são os diferenciais da Nexus?' },
  ];

  const handleQuickAction = (prompt: string) => {
    copilot.sendMessage(prompt, '/api/chat');
  };

  return (
    <div className="border-t px-4 py-3" style={{ borderColor: 'rgba(65, 232, 255, 0.08)' }}>
      <p className="mb-3 font-mono text-xs text-white/40">Ações rápidas</p>
      <div className="grid grid-cols-2 gap-2">
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => handleQuickAction(action.prompt)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 font-mono text-xs text-white/70 transition-all hover:bg-white/5 hover:text-white/90"
            style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}
          >
            <span>{action.icon}</span>
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}