# 🚀 Nexus AI Copilot - Guia de Integração Completo

## Visão Geral

O **Nexus AI Copilot** é um sistema de assistente virtual inteligente para a Nexus Holding, composto por:

- **Frontend React** - Interface de chat premium com 5 modos de operação
- **Backend FastAPI** - Agent Server com NVIDIA NIM API
- **Arquitetura Desacoplada** - Componentes plug-and-play

---

## 📁 Estrutura do Projeto

```
Nexus Holding/
├── src/
│   ├── components/
│   │   └── copilot/              # Componentes do Copilot
│   │       ├── FloatingButton.tsx
│   │       ├── CopilotWindow.tsx
│   │       ├── CopilotHeader.tsx
│   │       ├── CopilotSidebar.tsx
│   │       ├── CopilotConversation.tsx
│   │       ├── CopilotChatInput.tsx
│   │       ├── TypingIndicator.tsx
│   │       ├── modes/            # Modos de operação
│   │       │   ├── ChatMode.tsx
│   │       │   ├── ProjectMode.tsx
│   │       │   ├── MeetingMode.tsx
│   │       │   ├── DocumentMode.tsx
│   │       │   └── CeoMode.tsx
│   │       └── index.ts          # Exportações
│   ├── hooks/
│   │   └── useCopilot.ts         # Hook principal
│   ├── types/
│   │   └── copilot.ts            # Tipos TypeScript
│   └── App.tsx                   # Integração
│
└── server/
    └── agent-server/             # Backend
        ├── app.py                # FastAPI
        ├── requirements.txt
        ├── Dockerfile
        ├── docker-compose.yml
        └── nginx/
            └── nginx.conf
```

---

## 🔧 Instalação e Configuração

### 1. Backend (Agent Server)

```bash
# Entrar no diretório
cd server/agent-server

# Instalar dependências
pip install -r requirements.txt

# Configurar variáveis de ambiente
cp .env.example .env
# Edite .env e adicione: NVIDIA_API_KEY=sua_chave

# Iniciar servidor
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend

```bash
# Na raiz do projeto
npm install
npm run dev
```

---

## 🎯 Modos de Operação

### 1. Chat Mode
- **Propósito**: Conversa livre com IA
- **Ações rápidas**: Sobre Nexus, Serviços IA, Automação, Orçamento, Contato, Diferenciais

### 2. CEO Mode
- **Propósito**: Consultoria estratégica como CEO
- **9 fases**: Ideia → Objetivos → Público → Modelo → Concorrência → Diferenciais → MVP → Roadmap → Stack
- **Resultado**: Relatório executivo completo

### 3. Project Mode
- **Propósito**: Criar briefing de projeto detalhado
- **5 etapas**: Básico → Tecnologia → Detalhes → Recursos → Contato
- **Resultado**: Briefing profissional em Markdown

### 4. Meeting Mode
- **Propósito**: Agendar reuniões estratégicas
- **Campos**: Nome, Empresa, Objetivo, Data, Horário, Contato

### 5. Document Mode
- **Propósito**: Analisar documentos com IA
- **Suporta**: PDF, DOCX, TXT, CSV, XLSX, PNG, JPG, WEBP
- **Limite**: 10MB por arquivo

---

## 🔌 API Endpoints

### Chat (Streaming SSE)

```bash
POST /api/chat
```

**Request:**
```json
{
  "messages": [
    {
      "id": "timestamp-random",
      "role": "user",
      "content": "Olá!",
      "timestamp": 1234567890
    }
  ],
  "mode": "chat",
  "context": {
    "mode": "chat",
    "projectData": {},
    "meetingData": {},
    "documents": [],
    "ceoPhase": 0,
    "ceoResponses": []
  }
}
```

**Response (SSE):**
```
data: {"content": "Olá", "done": false}
data: {"content": "! Como posso", "done": false}
data: {"content": " ajudar?", "done": false}
data: {"done": true}
```

### Health Check

```bash
GET /health
```

---

## ⚙️ Configuração de Variáveis

### Frontend (.env)

```env
VITE_API_URL=http://localhost:8000
```

### Backend (.env)

```env
NVIDIA_API_KEY=sua_chave_nvidia
NVIDIA_MODEL=nvidia/llama-3.3-nemotron-70b-instruct
MAX_TOKENS=2048
TEMPERATURE=0.7
PORT=8000
```

---

## 🐳 Deploy com Docker

```bash
cd server/agent-server

# Build
docker-compose up -d --build

# Verificar
docker-compose ps

# Logs
docker-compose logs -f agent-server
```

---

## 🔐 Segurança

### Backend
- ✅ Variáveis de ambiente para credenciais
- ✅ Usuário não-root no Docker
- ✅ Rate limiting no Nginx
- ✅ Headers de segurança
- ✅ CORS configurável

### Produção Checklist
- [ ] NVIDIA API Key configurada
- [ ] HTTPS habilitado
- [ ] CORS para domínios específicos
- [ ] Rate limiting configurado
- [ ] Backup automático
- [ ] Monitoramento (Prometheus/Grafana)

---

## 🧪 Testes

### Testar Backend

```bash
# Health
curl http://localhost:8000/health

# Chat
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"id":"1","role":"user","content":"Olá","timestamp":123}]}'
```

### Testar Frontend

```bash
npm run dev
# Abrir http://localhost:5173
# Clicar no botão flutuante "Nexus AI"
```

---

## 🐛 Solução de Problemas

### "NVIDIA API Key não configurada"
```bash
# Verificar variáveis
docker-compose exec agent-server env | grep NVIDIA
```

### "Conexão recusada"
```bash
# Verificar containers
docker-compose ps

# Reiniciar
docker-compose restart agent-server
```

### Streaming não funciona
```bash
# Verificar porta
lsof -i :8000

# Testar diretamente
curl -N http://localhost:8000/health
```

---

## 📊 Arquitetura de Streaming

```
[Frontend React] 
     │
     │ fetch() com ReadableStream
     ▼
[Nginx Proxy] ─── rate limiting, cache
     │
     ▼
[FastAPI Backend]
     │
     │ httpx AsyncClient
     ▼
[NVIDIA NIM API]
     │
     ▼
[StreamingResponse SSE] ───► [Frontend atualiza em tempo real]
```

---

## 🎨 Customização

### Cores (CSS)

```css
/* src/styles/globals.css */
:root {
  --nexus-cyan: #41e8ff;
  --nexus-purple: #8b5cf6;
  --nexus-bg: linear-gradient(145deg, rgba(10, 15, 31, 0.95), rgba(6, 9, 20, 0.98));
}
```

### Modelos NVIDIA

Edite `NVIDIA_MODEL` no `.env`:

```env
# Opções disponíveis
NVIDIA_MODEL=nvidia/llama-3.3-nemotron-70b-instruct
NVIDIA_MODEL=meta/llama-3.1-405b-instruct
NVIDIA_MODEL=google/gemma-2-27b-it
NVIDIA_MODEL=mistralai/mixtral-8x7b-instruct-v0.1
```

---

## 📞 Suporte

Para dúvidas técnicas:
- Email: suporte@nexusholding.com
- Docs: `/server/agent-server/README.md`

---

## 📋 Resumo de Arquivos Criados

| Arquivo | Descrição |
|---------|-----------|
| `src/components/copilot/index.ts` | Exportações dos componentes |
| `src/App.tsx` | Integração com App principal |
| `src/hooks/useCopilot.ts` | Hook de gerenciamento de estado |
| `src/types/copilot.ts` | Tipos TypeScript |
| `server/agent-server/app.py` | Backend FastAPI |
| `server/agent-server/requirements.txt` | Dependências Python |
| `server/agent-server/Dockerfile` | Build Docker |
| `server/agent-server/docker-compose.yml` | Orquestração Docker |
| `server/agent-server/nginx/nginx.conf` | Proxy Nginx |
| `server/agent-server/README.md` | Documentação do servidor |
| `NEXUS-COPILOT.md` | Este guia de integração |

---

## ✅ Checklist de Implementação

- [x] Frontend components (FloatingButton, Window, Modes)
- [x] useCopilot hook com reducer pattern
- [x] Persistência em localStorage
- [x] Streaming com AbortController
- [x] 5 modos de operação (Chat, CEO, Project, Meeting, Document)
- [x] Backend FastAPI com NVIDIA API
- [x] Docker & Docker Compose
- [x] Nginx proxy configuration
- [x] Documentação completa

---

*Nexus Holding - Transformação Digital com Inteligência Artificial*