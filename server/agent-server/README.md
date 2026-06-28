# 🤖 Nexus AI Agent Server

Backend FastAPI para processamento de mensagens com **NVIDIA NIM API** e streaming SSE em tempo real.

## ✨ Funcionalidades

- 🚀 **Streaming SSE** - Respostas em tempo real com Server-Sent Events
- 🤖 **NVIDIA NIM Integration** - Suporte a múltiplos modelos (Llama, Gemma, Mistral)
- 💬 **5 Modos de Operação** - Chat, CEO, Projeto, Reunião, Documentos
- 🔒 **Arquitetura Desacoplada** - Pronto para integração com frontend React
- 🐳 **Docker Ready** - Deploy facilitado com Docker Compose

## 📋 Pré-requisitos

- Python 3.11+
- Chave NVIDIA API (obtenha em [developer.nvidia.com/nim](https://developer.nvidia.com/nim))
- Docker & Docker Compose (opcional)

## 🚀 Instalação

### Opção 1: Python Local

```bash
# Entrar no diretório
cd server/agent-server

# Criar ambiente virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou: venv\Scripts\activate  # Windows

# Instalar dependências
pip install -r requirements.txt

# Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env e adicione sua NVIDIA_API_KEY

# Iniciar servidor
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### Opção 2: Docker

```bash
# Entrar no diretório
cd server/agent-server

# Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env e adicione sua NVIDIA_API_KEY

# Build e iniciar
docker-compose up -d --build

# Ver logs
docker-compose logs -f agent-server
```

## ⚙️ Configuração

### Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `NVIDIA_API_KEY` | Chave da API NVIDIA (obrigatório) | - |
| `NVIDIA_MODEL` | Modelo a ser usado | `nvidia/llama-3.3-nemotron-70b-instruct` |
| `MAX_TOKENS` | Tokens máximos por resposta | `2048` |
| `TEMPERATURE` | Temperatura (0.0-1.0) | `0.7` |
| `PORT` | Porta do servidor | `8000` |

### Modelos NVIDIA Disponíveis

- `nvidia/llama-3.3-nemotron-70b-instruct` (padrão)
- `meta/llama-3.1-405b-instruct`
- `google/gemma-2-27b-it`
- `mistralai/mixtral-8x7b-instruct-v0.1`

## 🔌 Endpoints da API

### Health Check

```bash
GET /health
```

Resposta:
```json
{
  "status": "healthy",
  "nvidia_configured": true,
  "model": "nvidia/llama-3.3-nemotron-70b-instruct",
  "timestamp": "2024-01-01T00:00:00"
}
```

### Chat (Streaming SSE)

```bash
POST /api/chat
Content-Type: application/json

{
  "messages": [
    {"id": "1", "role": "user", "content": "Olá!", "timestamp": 1234567890}
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

Resposta (SSE):
```
data: {"content": "Olá", "done": false}

data: {"content": "! Como", "done": false}

data: {"content": " posso", "done": false}

data: {"content": " ajudar?", "done": false}

data: {"content": "", "done": true}
```

### Analisar Documento

```bash
POST /api/analyze-document
Content-Type: application/json

{
  "messages": [...],
  "mode": "document",
  "context": {
    "documents": [
      {"name": "relatorio.pdf", "type": "application/pdf"}
    ]
  }
}
```

## 🐳 Deploy com Docker

### Build Local

```bash
cd server/agent-server
docker build -t nexus-agent-server .
docker run -d -p 8000:8000 --env-file .env nexus-agent-server
```

### Deploy com Docker Compose

```bash
# Editar .env com suas credenciais
nano .env

# Iniciar todos os serviços
docker-compose up -d

# Verificar status
docker-compose ps

# Logs
docker-compose logs -f
```

### Deploy Producao com Nginx

1. Configure os certificados SSL em `nginx/ssl/`
2. Descomente o bloco HTTPS em `nginx/nginx.conf`
3. Atualize `server_name` para seu domínio

```bash
# Iniciar com Nginx
docker-compose up -d nginx

# Verificar Nginx
docker-compose logs nginx
```

## 🧪 Testes

### Testar Health

```bash
curl http://localhost:8000/health
```

### Testar Chat

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"id":"1","role":"user","content":"Olá","timestamp":123}]}'
```

### Testar com Cliente Python

```python
import httpx
import sseclient
import json

def test_chat():
    url = "http://localhost:8000/api/chat"
    payload = {
        "messages": [
            {"id": "1", "role": "user", "content": "Olá!", "timestamp": 123}
        ],
        "mode": "chat"
    }
    
    with httpx.stream("POST", url, json=payload, timeout=60) as response:
        client = sseclient.SSEClient(response)
        for event in client.events():
            if event.data:
                data = json.loads(event.data)
                print(data.get('content', ''), end='', flush=True)
                if data.get('done'):
                    break
```

## 📊 Monitoramento

### Logs

```bash
# Docker
docker-compose logs -f agent-server

# Python local
tail -f uvicorn.log
```

### Métricas

O servidor expõe endpoint `/metrics` (para integração futura com Prometheus):

```bash
curl http://localhost:8000/metrics
```

## 🔒 Segurança

- ✅ Variáveis de ambiente para credenciais
- ✅ Usuário não-root no Docker
- ✅ Rate limiting no Nginx
- ✅ Headers de segurança (X-Frame-Options, X-Content-Type-Options)
- ✅ CORS configurável

### Producao Checklist

- [ ] Usar HTTPS
- [ ] Configurar CORS para domínios específicos
- [ ] Implementar autenticação (JWT/API Key)
- [ ] Configurar rate limiting agressivo
- [ ] Usar variáveis de ambiente (não hardcoded)
- [ ] Configurar backup automático
- [ ] Implementar logging avançado

## 📁 Estrutura de Arquivos

```
server/agent-server/
├── app.py              # Aplicação principal FastAPI
├── requirements.txt    # Dependências Python
├── .env.example        # Template de variáveis de ambiente
├── Dockerfile          # Build Docker
├── docker-compose.yml  # Orquestração Docker
├── .dockerignore       # Arquivos ignorados no build
└── nginx/
    └── nginx.conf      # Configuração Nginx
```

## 🤝 Integração com Frontend

O frontend React já está configurado para se comunicar com este backend. Configure a URL da API:

```typescript
// src/lib/api.ts
export const API_URL = process.env.VITE_API_URL || 'http://localhost:8000';
```

Consulte `src/components/copilot/` para ver a integração completa.

## 🐛 Solução de Problemas

### "NVIDIA API Key não configurada"

```bash
# Verificar se a variável está setada
echo $NVIDIA_API_KEY

# No Docker
docker-compose exec agent-server env | grep NVIDIA
```

### "Conexão recusada"

```bash
# Verificar se o container está rodando
docker-compose ps

# Ver logs
docker-compose logs agent-server

# Reiniciar
docker-compose restart agent-server
```

### Streaming não funciona

```bash
# Verificar se a porta está liberada
lsof -i :8000

# Testar localmente
curl -N http://localhost:8000/health
```

## 📝 Licença

Proprietário - Nexus Holding

## 🔗 Links Úteis

- [NVIDIA NIM API](https://developer.nvidia.com/nim)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Docker Documentation](https://docs.docker.com/)
- [Nginx Documentation](https://nginx.org/en/docs/)