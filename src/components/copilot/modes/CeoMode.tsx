import { useState } from 'react';
import { motion } from 'framer-motion';
import type { UseCopilotReturn } from '../../../hooks/useCopilot';

const phases = [
  { id: 0, icon: '💡', label: 'Ideia', question: 'Descreva sua ideia ou problema de negócio:' },
  { id: 1, icon: '🎯', label: 'Objetivos', question: 'Quais são os principais objetivos do projeto?' },
  { id: 2, icon: '👥', label: 'Público', question: 'Quem é o público-alvo?' },
  { id: 3, icon: '💰', label: 'Modelo', question: 'Como você planeja monetizar?' },
  { id: 4, icon: '🏆', label: 'Concorrência', question: 'Quem são os principais concorrentes?' },
  { id: 5, icon: '✨', label: 'Diferenciais', question: 'O que vai diferenciar seu projeto?' },
  { id: 6, icon: '🚀', label: 'MVP', question: 'Quais funcionalidades são essenciais para o MVP?' },
  { id: 7, icon: '📋', label: 'Roadmap', question: 'Qual timeline você espera para o desenvolvimento?' },
  { id: 8, icon: '🛠️', label: 'Stack', question: 'Você tem alguma preferência de tecnologia?' },
];

export function CeoMode({ copilot }: { copilot: UseCopilotReturn }) {
  const { state, setCeoPhase, addCeoResponse, sendMessage } = copilot;
  const [input, setInput] = useState('');
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [showReport, setShowReport] = useState(false);

  const currentPhase = state.context.ceoPhase;

  const handleNext = async (response: string) => {
    if (!response.trim()) return;

    // Salvar resposta
    setResponses((prev) => ({ ...prev, [currentPhase]: response }));
    addCeoResponse(response);

    if (currentPhase < phases.length - 1) {
      // Avançar para próxima fase
      setCeoPhase(currentPhase + 1);
    } else {
      // Gerar relatório final
      setShowReport(true);
      await generateFinalReport();
    }

    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleNext(input);
    }
  };

  const generateFinalReport = async () => {
    const context = phases
      .map((p, i) => `${p.icon} ${p.label}: ${responses[i] || responses[currentPhase]}`)
      .join('\n');

    const prompt = `## Análise Estratégica Completa

${context}

Com base nessas informações, gere um relatório executivo completo incluindo:

1. **Resumo Executivo**
2. **Análise de Oportunidade**
3. **Arquitetura Recomendada**
4. **Stack Tecnológica**
5. **MVP Features**
6. **Roadmap de Desenvolvimento**
7. **Estimativa de Complexidade**
8. **Riscos Identificados**
9. **Próximos Passos**

Seja detalhado e profissional.`;

    await sendMessage(prompt, '/api/ceo');
  };

  if (showReport) {
    return (
      <div className="border-t p-4" style={{ borderColor: 'rgba(65, 232, 255, 0.08)' }}>
        <div className="mb-3 flex items-center justify-between">
          <p className="font-mono text-xs text-neon-cyan">📊 Relatório Gerado</p>
          <button
            onClick={() => {
              setShowReport(false);
              setResponses({});
              setCeoPhase(0);
            }}
            className="font-mono text-[10px] text-white/40 hover:text-white/70"
          >
            Novo projeto →
          </button>
        </div>
        <div className="rounded-lg p-3 font-mono text-xs text-white/60" style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
          <p>Seu relatório estratégico está sendo gerado pela IA...</p>
          <p className="mt-1 text-white/40">Aguarde a resposta no chat.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t" style={{ borderColor: 'rgba(65, 232, 255, 0.08)' }}>
      {/* Progress bar */}
      <div className="border-b px-4 py-2" style={{ borderColor: 'rgba(65, 232, 255, 0.05)' }}>
        <div className="flex justify-between mb-1">
          <span className="font-mono text-[10px] text-white/40">
            Etapa {currentPhase + 1} de {phases.length}
          </span>
          <span className="font-mono text-[10px] text-white/40">
            {Math.round(((currentPhase) / phases.length) * 100)}%
          </span>
        </div>
        <div className="h-1 rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #41e8ff, #8b5cf6)' }}
            initial={{ width: 0 }}
            animate={{ width: `${((currentPhase) / phases.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Phase indicator */}
      <div className="flex gap-1 border-b px-4 py-2 overflow-x-auto" style={{ borderColor: 'rgba(65, 232, 255, 0.05)' }}>
        {phases.map((phase) => (
          <div
            key={phase.id}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm transition-all"
            style={{
              background: phase.id === currentPhase
                ? 'linear-gradient(135deg, rgba(65, 232, 255, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)'
                : phase.id < currentPhase
                ? 'rgba(65, 232, 255, 0.1)'
                : 'rgba(255, 255, 255, 0.03)',
              border: phase.id === currentPhase
                ? '1px solid rgba(65, 232, 255, 0.4)'
                : '1px solid transparent',
            }}
            title={phase.label}
          >
            {phase.id < currentPhase ? '✓' : phase.icon}
          </div>
        ))}
      </div>

      {/* Current phase */}
      <div className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xl">{phases[currentPhase].icon}</span>
          <span className="font-mono text-sm font-medium text-white/80">
            {phases[currentPhase].label}
          </span>
        </div>
        <p className="mb-3 font-mono text-xs text-white/60">
          {phases[currentPhase].question}
        </p>

        {/* Input */}
        <div
          className="flex items-end gap-2 rounded-xl p-2"
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Descreva..."
            className="flex-1 resize-none bg-transparent font-mono text-sm text-white/80 placeholder-white/30 outline-none"
            rows={2}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleNext(input)}
            disabled={!input.trim()}
            className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg transition-all disabled:opacity-30"
            style={{
              background: input.trim()
                ? 'linear-gradient(135deg, rgba(65, 232, 255, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)'
                : 'rgba(255, 255, 255, 0.05)',
              border: input.trim()
                ? '1px solid rgba(65, 232, 255, 0.4)'
                : '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={input.trim() ? '#41e8ff' : '#ffffff60'} strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </motion.button>
        </div>
      </div>

      {/* Skip/Prior answers */}
      {Object.keys(responses).length > 0 && (
        <div className="border-t px-4 py-2" style={{ borderColor: 'rgba(65, 232, 255, 0.05)' }}>
          <p className="mb-2 font-mono text-[10px] text-white/40">Respostas anteriores:</p>
          <div className="space-y-1 max-h-[80px] overflow-y-auto">
            {Object.entries(responses).map(([idx, response]) => (
              <div key={idx} className="flex items-start gap-2 text-xs">
                <span>{phases[parseInt(idx)].icon}</span>
                <span className="font-mono text-white/50 truncate flex-1">
                  {response.substring(0, 50)}...
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}