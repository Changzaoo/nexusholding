import { useState } from 'react';
import { motion } from 'framer-motion';
import type { UseCopilotReturn } from '../../../hooks/useCopilot';
import type { MeetingData } from '../../../types/copilot';

export function MeetingMode({ copilot }: { copilot: UseCopilotReturn }) {
  const { state, updateMeetingData, sendMessage } = copilot;
  const [formData, setFormData] = useState<Partial<MeetingData>>(
    state.context.meetingData || {}
  );

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    updateMeetingData({ [field]: value });
  };

  const handleSubmit = async () => {
    const message = `## Solicitação de Reunião

### Dados do Solicitante
- **Nome:** ${formData.name || 'Não informado'}
- **Empresa:** ${formData.company || 'Não informado'}
- **Email:** ${formData.email || 'Não informado'}
- **Telefone:** ${formData.phone || 'Não informado'}

### Detalhes da Reunião
- **Objetivo:** ${formData.objective || 'Não informado'}
- **Data:** ${formData.date || 'A definir'}
- **Horário:** ${formData.time || 'A definir'}
- **Observações:** ${formData.notes || 'Nenhuma'}`;

    await sendMessage(message, '/api/meeting');
  };

  const integrations = [
    { name: 'Google Calendar', icon: '📅', status: 'coming' },
    { name: 'Outlook', icon: '📮', status: 'coming' },
    { name: 'Calendly', icon: '⏰', status: 'coming' },
    { name: 'API Própria', icon: '🔗', status: 'ready' },
  ];

  return (
    <div className="border-t" style={{ borderColor: 'rgba(65, 232, 255, 0.08)' }}>
      {/* Integrações futuras */}
      <div className="border-b px-4 py-2" style={{ borderColor: 'rgba(65, 232, 255, 0.05)' }}>
        <p className="mb-2 font-mono text-[10px] text-white/40">Integrações disponíveis</p>
        <div className="flex gap-2">
          {integrations.map((int) => (
            <div
              key={int.name}
              className="flex items-center gap-1 rounded-lg px-2 py-1 font-mono text-[10px] text-white/50"
              style={{ background: 'rgba(255, 255, 255, 0.03)' }}
            >
              <span>{int.icon}</span>
              <span>{int.name}</span>
              {int.status === 'coming' && (
                <span className="rounded bg-neon-cyan/20 px-1 text-neon-cyan">soon</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="max-h-[180px] overflow-y-auto p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <InputField
            label="Seu nome"
            value={formData.name || ''}
            onChange={(v) => updateField('name', v)}
            placeholder="João Silva"
          />
          <InputField
            label="Empresa"
            value={formData.company || ''}
            onChange={(v) => updateField('company', v)}
            placeholder="Empresa Ltda"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <InputField
            label="Email"
            value={formData.email || ''}
            onChange={(v) => updateField('email', v)}
            placeholder="joao@empresa.com"
            type="email"
          />
          <InputField
            label="Telefone"
            value={formData.phone || ''}
            onChange={(v) => updateField('phone', v)}
            placeholder="(11) 99999-9999"
            type="tel"
          />
        </div>

        <TextareaField
          label="Objetivo da reunião"
          value={formData.objective || ''}
          onChange={(v) => updateField('objective', v)}
          placeholder="Gostaria de discutir..."
        />

        <div className="grid grid-cols-2 gap-3">
          <InputField
            label="Data preferencial"
            value={formData.date || ''}
            onChange={(v) => updateField('date', v)}
            type="date"
          />
          <InputField
            label="Horário"
            value={formData.time || ''}
            onChange={(v) => updateField('time', v)}
            type="time"
          />
        </div>

        <TextareaField
          label="Observações"
          value={formData.notes || ''}
          onChange={(v) => updateField('notes', v)}
          placeholder="Informações adicionais..."
        />
      </div>

      {/* Submit */}
      <div className="border-t px-4 py-3" style={{ borderColor: 'rgba(65, 232, 255, 0.08)' }}>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          className="w-full rounded-lg py-2 font-mono text-xs font-medium transition-all"
          style={{
            background: 'linear-gradient(135deg, rgba(65, 232, 255, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)',
            border: '1px solid rgba(65, 232, 255, 0.4)',
          }}
        >
          Solicitar Reunião 📅
        </motion.button>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, type = 'text' }: any) {
  return (
    <div>
      <label className="mb-1 block font-mono text-[10px] text-white/50">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border bg-transparent px-3 py-2 font-mono text-sm text-white/80 placeholder-white/30 outline-none transition-colors focus:border-neon-cyan/50"
        style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
      />
    </div>
  );
}

function TextareaField({ label, value, onChange, placeholder }: any) {
  return (
    <div>
      <label className="mb-1 block font-mono text-[10px] text-white/50">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full resize-none rounded-lg border bg-transparent px-3 py-2 font-mono text-sm text-white/80 placeholder-white/30 outline-none transition-colors focus:border-neon-cyan/50"
        style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
      />
    </div>
  );
}