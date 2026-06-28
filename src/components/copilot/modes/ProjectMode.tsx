import { useState } from 'react';
import { motion } from 'framer-motion';
import type { UseCopilotReturn } from '../../../hooks/useCopilot';
import type { ProjectData } from '../../../types/copilot';

const steps = [
  { id: 'basics', label: 'Básico', fields: ['companyName', 'problem'] },
  { id: 'tech', label: 'Tecnologia', fields: ['currentSystem', 'technologies', 'integrations'] },
  { id: 'details', label: 'Detalhes', fields: ['deadline', 'budget', 'priority', 'usersCount'] },
  { id: 'features', label: 'Recursos', fields: ['needsAI', 'needsApp', 'needsAdminPanel', 'needsAPI', 'needsDatabase', 'needsHosting'] },
  { id: 'contact', label: 'Contato', fields: ['contact'] },
];

export function ProjectMode({ copilot }: { copilot: UseCopilotReturn }) {
  const { state, updateProjectData, sendMessage } = copilot;
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<ProjectData>>(
    state.context.projectData || {}
  );

  const updateField = (field: string, value: string | boolean | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    updateProjectData({ [field]: value });
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    const briefing = generateBriefing(formData as ProjectData);
    await sendMessage(briefing, '/api/project');
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <InputField
              label="Nome da empresa"
              value={formData.companyName || ''}
              onChange={(v) => updateField('companyName', v)}
              placeholder="Minha Empresa Ltda"
            />
            <TextareaField
              label="Qual problema deseja resolver?"
              value={formData.problem || ''}
              onChange={(v) => updateField('problem', v)}
              placeholder="Descreva o problema ou necessidade..."
            />
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <InputField
              label="Sistema atual (se houver)"
              value={formData.currentSystem || ''}
              onChange={(v) => updateField('currentSystem', v)}
              placeholder="ERP, planilhas, sistema propio..."
            />
            <InputField
              label="Tecnologias em uso"
              value={formData.technologies || ''}
              onChange={(v) => updateField('technologies', v)}
              placeholder="React, Node.js, PostgreSQL..."
            />
            <InputField
              label="Integrações necessárias"
              value={formData.integrations?.join(', ') || ''}
              onChange={(v) => updateField('integrations', v.split(',').map(s => s.trim()))}
              placeholder="Stripe, WhatsApp, SAP..."
            />
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <InputField
              label="Prazo desejado"
              value={formData.deadline || ''}
              onChange={(v) => updateField('deadline', v)}
              placeholder="3 meses, URGENTE, 6 meses..."
            />
            <InputField
              label="Orçamento estimado"
              value={formData.budget || ''}
              onChange={(v) => updateField('budget', v)}
              placeholder="R$ 50k, R$ 100k, A definir..."
            />
            <SelectField
              label="Prioridade"
              value={formData.priority || ''}
              onChange={(v) => updateField('priority', v)}
              options={[
                { value: 'low', label: 'Baixa' },
                { value: 'medium', label: 'Média' },
                { value: 'high', label: 'Alta' },
                { value: 'critical', label: 'Crítica' },
              ]}
            />
            <InputField
              label="Número de usuários"
              value={formData.usersCount || ''}
              onChange={(v) => updateField('usersCount', v)}
              placeholder="100, 500, 1000+..."
            />
          </div>
        );
      case 3:
        return (
          <div className="space-y-3">
            <p className="font-mono text-xs text-white/60">Quais recursos são necessários?</p>
            {[
              { key: 'needsAI', label: 'Inteligência Artificial' },
              { key: 'needsApp', label: 'Aplicativo Mobile' },
              { key: 'needsAdminPanel', label: 'Painel Administrativo' },
              { key: 'needsAPI', label: 'API própria' },
              { key: 'needsDatabase', label: 'Banco de dados' },
              { key: 'needsHosting', label: 'Hospedagem/Infraestrutura' },
            ].map((item) => (
              <ToggleField
                key={item.key}
                label={item.label}
                checked={formData[item.key as keyof ProjectData] as boolean || false}
                onChange={(v) => updateField(item.key, v)}
              />
            ))}
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <InputField
              label="Seu nome"
              value={formData.contact?.name || ''}
              onChange={(v) => updateField('contact', { ...formData.contact, name: v })}
              placeholder="João Silva"
            />
            <InputField
              label="Email"
              value={formData.contact?.email || ''}
              onChange={(v) => updateField('contact', { ...formData.contact, email: v })}
              placeholder="joao@empresa.com"
              type="email"
            />
            <InputField
              label="Telefone"
              value={formData.contact?.phone || ''}
              onChange={(v) => updateField('contact', { ...formData.contact, phone: v })}
              placeholder="(11) 99999-9999"
              type="tel"
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="border-t" style={{ borderColor: 'rgba(65, 232, 255, 0.08)' }}>
      {/* Progress */}
      <div className="flex gap-1 border-b px-4 py-2" style={{ borderColor: 'rgba(65, 232, 255, 0.05)' }}>
        {steps.map((step, i) => (
          <div
            key={step.id}
            className="h-1 flex-1 rounded-full transition-colors"
            style={{
              background: i <= currentStep
                ? 'linear-gradient(90deg, #41e8ff, #8b5cf6)'
                : 'rgba(255, 255, 255, 0.1)',
            }}
          />
        ))}
      </div>

      {/* Form */}
      <div className="max-h-[200px] overflow-y-auto p-4">
        {renderStep()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between border-t px-4 py-3" style={{ borderColor: 'rgba(65, 232, 255, 0.08)' }}>
        <button
          onClick={prevStep}
          disabled={currentStep === 0}
          className="rounded-lg px-4 py-2 font-mono text-xs text-white/60 transition-colors hover:bg-white/5 disabled:opacity-30"
        >
          ← Voltar
        </button>
        {currentStep === steps.length - 1 ? (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            className="rounded-lg px-4 py-2 font-mono text-xs font-medium transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(65, 232, 255, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)',
              border: '1px solid rgba(65, 232, 255, 0.4)',
            }}
          >
            Gerar Briefing →
          </motion.button>
        ) : (
          <button
            onClick={nextStep}
            className="rounded-lg px-4 py-2 font-mono text-xs text-white/80 transition-colors hover:bg-white/5"
            style={{ border: '1px solid rgba(255, 255, 255, 0.1)' }}
          >
            Próximo →
          </button>
        )}
      </div>
    </div>
  );
}

// Componentes de formulário
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
        rows={3}
        className="w-full resize-none rounded-lg border bg-transparent px-3 py-2 font-mono text-sm text-white/80 placeholder-white/30 outline-none transition-colors focus:border-neon-cyan/50"
        style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: any) {
  return (
    <div>
      <label className="mb-1 block font-mono text-[10px] text-white/50">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border bg-void px-3 py-2 font-mono text-sm text-white/80 outline-none transition-colors focus:border-neon-cyan/50"
        style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
      >
        <option value="">Selecione...</option>
        {options.map((opt: any) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function ToggleField({ label, checked, onChange }: any) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="font-mono text-xs text-white/70">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="relative h-6 w-11 rounded-full transition-colors"
        style={{
          background: checked
            ? 'linear-gradient(135deg, #41e8ff, #8b5cf6)'
            : 'rgba(255, 255, 255, 0.1)',
        }}
        role="switch"
        aria-checked={checked}
      >
        <span
          className="absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform"
          style={{ transform: checked ? 'translateX(22px)' : 'translateX(3px)' }}
        />
      </button>
    </label>
  );
}

function generateBriefing(data: ProjectData): string {
  return `## Solicitação de Projeto

### Dados da Empresa
- **Empresa:** ${data.companyName || 'Não informado'}
- **Problema:** ${data.problem || 'Não informado'}

### Infraestrutura Atual
- **Sistema Atual:** ${data.currentSystem || 'Nenhum'}
- **Tecnologias:** ${data.technologies || 'Não informado'}
- **Integrações:** ${data.integrations?.join(', ') || 'Nenhuma'}

### Detalhes do Projeto
- **Prazo:** ${data.deadline || 'A definir'}
- **Orçamento:** ${data.budget || 'A definir'}
- **Prioridade:** ${data.priority || 'Não informada'}
- **Usuários:** ${data.usersCount || 'Não informado'}

### Recursos Necessários
- IA: ${data.needsAI ? '✅ Sim' : '❌ Não'}
- App Mobile: ${data.needsApp ? '✅ Sim' : '❌ Não'}
- Painel Admin: ${data.needsAdminPanel ? '✅ Sim' : '❌ Não'}
- API: ${data.needsAPI ? '✅ Sim' : '❌ Não'}
- Banco de Dados: ${data.needsDatabase ? '✅ Sim' : '❌ Não'}
- Hospedagem: ${data.needsHosting ? '✅ Sim' : '❌ Não'}

### Contato
- Nome: ${data.contact?.name || 'Não informado'}
- Email: ${data.contact?.email || 'Não informado'}
- Telefone: ${data.contact?.phone || 'Não informado'}`;
}