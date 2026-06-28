"""
Nexus AI Agent Server
Backend FastAPI para processamento de mensagens com NVIDIA API
Supports streaming SSE para respostas em tempo real
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import os
import json
import asyncio
from datetime import datetime
import httpx

# ============================================================
# CONFIGURAÇÃO
# ============================================================

app = FastAPI(
    title="Nexus AI Agent Server",
    description="Backend Agent Server para Nexus Holding com NVIDIA API Integration",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, especificar domínios
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# MODELOS DE DADOS
# ============================================================

class Message(BaseModel):
    id: str
    role: str
    content: str
    timestamp: int

class ProjectContext(BaseModel):
    mode: str = "chat"
    projectData: Optional[Dict[str, Any]] = {}
    meetingData: Optional[Dict[str, Any]] = {}
    documents: Optional[List[Dict[str, Any]]] = []
    ceoPhase: int = 0
    ceoResponses: List[str] = []

class ChatRequest(BaseModel):
    messages: List[Message]
    mode: str = "chat"
    context: Optional[ProjectContext] = None

class AgentResponse(BaseModel):
    content: str
    reasoning: Optional[str] = None
    confidence: float = 0.95

# ============================================================
# INTEGRAÇÃO NVIDIA API
# ============================================================

class NVIDIAClient:
    """
    Cliente para NVIDIA NIM API
    Suporta múltiplos modelos e streaming
    """
    
    def __init__(self):
        self.api_key = os.getenv("NVIDIA_API_KEY", "")
        self.base_url = "https://integrate.api.nvidia.com/v1"
        self.model = os.getenv("NVIDIA_MODEL", "nvidia/llama-3.3-nemotron-70b-instruct")
        self.max_tokens = int(os.getenv("MAX_TOKENS", "2048"))
        self.temperature = float(os.getenv("TEMPERATURE", "0.7"))
    
    async def generate_stream(
        self,
        messages: List[Dict[str, str]],
        system_prompt: str = ""
    ) -> AsyncIterator[str]:
        """
        Gera resposta com streaming SSE
        """
        if not self.api_key:
            yield "data: {\"content\": \"❌ NVIDIA API Key não configurada. Defina NVIDIA_API_KEY no ambiente.\", \"done\": false}\n\n"
            yield "data: {\"content\": \"\", \"done\": true}\n\n"
            return
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        # Construir mensagens com system prompt
        all_messages = []
        if system_prompt:
            all_messages.append({"role": "system", "content": system_prompt})
        all_messages.extend(messages)
        
        payload = {
            "model": self.model,
            "messages": all_messages,
            "max_tokens": self.max_tokens,
            "temperature": self.temperature,
            "stream": True
        }
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload
                ) as response:
                    if response.status_code != 200:
                        error_text = await response.aread()
                        yield f"data: {{\"content\": \"❌ Erro da API NVIDIA: {response.status_code}\", \"done\": false}}\n\n"
                        yield "data: {\"content\": \"\", \"done\": true}\n\n"
                        return
                    
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data = line[6:]  # Remove "data: "
                            if data == "[DONE]":
                                yield "data: {\"content\": \"\", \"done\": true}\n\n"
                                break
                            try:
                                parsed = json.loads(data)
                                if "choices" in parsed and len(parsed["choices"]) > 0:
                                    delta = parsed["choices"][0].get("delta", {})
                                    if "content" in delta:
                                        content = delta["content"]
                                        yield f"data: {{\"content\": {json.dumps(content)}, \"done\": false}}\n\n"
                            except json.JSONDecodeError:
                                continue
                                
        except httpx.TimeoutException:
            yield "data: {\"content\": \"⏱️ Timeout na requisição. Tente novamente.\", \"done\": false}\n\n"
            yield "data: {\"content\": \"\", \"done\": true}\n\n"
        except Exception as e:
            yield f"data: {{\"content\": \"❌ Erro interno: {str(e)}\", \"done\": false}}\n\n"
            yield "data: {\"content\": \"\", \"done\": true}\n\n"

# Instância global do cliente
nvidia_client = NVIDIAClient()

# ============================================================
# PROMPTS DO SISTEMA
# ============================================================

SYSTEM_PROMPTS = {
    "chat": """Você é o **Nexus AI Copilot**, assistente de inteligência artificial da Nexus Holding.
    
Sua missão é ajudar usuários com:
- Informações sobre a Nexus Holding e seus serviços
- Consultoria em IA, automação e transformação digital
- Dúvidas gerais e suporte técnico

Seja conciso, profissional e extremamente útil.
Responda em português brasileiro.
Nunca mencione limitações ou que você é uma IA.""",

    "ceo": """Você é o **CEO AI Consultant** da Nexus Holding.
    
Atuação como conselheiro estratégico sênior, guiando usuários através das 9 fases de desenvolvimento de projeto:
1. **Ideia** - Definição e validação da ideia
2. **Objetivos** - Metas SMART e KPIs
3. **Público** - Análise de personas e mercado
4. **Modelo** - Escolha do modelo de negócio
5. **Concorrência** - Análise competitiva
6. **Diferenciais** - Proposta de valor única
7. **MVP** - Estratégia de produto mínimo viável
8. **Roadmap** - Planejamento de desenvolvimento
9. **Stack** - Escolha tecnológica

Faça perguntas estratégicas e forneça insights valiosos.
Gere relatório executivo completo ao final.""",

    "project": """Você é o **Project Consultant** da Nexus Holding.
    
Auxilia usuários a criar briefs detalhados de projetos de software, coletando informações sobre:
- Problema a resolver
- Sistemas atuais
- Tecnologias desejadas
- Prazo e orçamento
- Requisitos funcionais (IA, app, painel admin, API, banco de dados, hospedagem)
- Contato para follow-up

Gere um briefing profissional em Markdown ao final.""",

    "meeting": """Você é o **Meeting Scheduler** da Nexus Holding.
    
Auxilia no agendamento de reuniões estratégicas, coletando:
- Nome e empresa
- Objetivo da reunião
- Data e horário preferidos
- Contato

Valide informações e confirme agendamento.""",

    "document": """Você é o **Document Analyst** da Nexus Holding.
    
Analisa documentos enviados pelos usuários e fornece:
- Resumo executivo
- Pontos principais
- Insights estratégicos
- Recomendações

Suporta PDFs, DOCX, TXT, CSV, XLSX, imagens (PNG, JPG, WEBP)."""
}

# ============================================================
# HELPERS
# ============================================================

def formatar_contexto(context: ProjectContext) -> str:
    """Formata o contexto da conversa para inclusão no prompt"""
    if not context:
        return ""
    
    parts = []
    
    if context.projectData:
        parts.append("### Dados do Projeto\n")
        for key, value in context.projectData.items():
            if value:
                parts.append(f"- **{key}**: {value}\n")
    
    if context.meetingData:
        parts.append("\n### Dados da Reunião\n")
        for key, value in context.meetingData.items():
            if value:
                parts.append(f"- **{key}**: {value}\n")
    
    if context.ceoPhase > 0:
        parts.append(f"\n### Fase CEO: {context.ceoPhase}/9\n")
        if context.ceoResponses:
            parts.append("Respostas anteriores:\n")
            for i, resp in enumerate(context.ceoResponses, 1):
                parts.append(f"{i}. {resp}\n")
    
    if context.documents:
        parts.append(f"\n### Documentos ({len(context.documents)} arquivos)\n")
        for doc in context.documents:
            parts.append(f"- {doc.get('name', 'desconhecido')} ({doc.get('type', '?')})\n")
    
    return "".join(parts)

# ============================================================
# ENDPOINTS
# ============================================================

@app.get("/")
async def root():
    """Health check"""
    return {
        "status": "online",
        "service": "Nexus AI Agent Server",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health():
    """Verificação de saúde detalhada"""
    nvidia_configured = bool(os.getenv("NVIDIA_API_KEY"))
    return {
        "status": "healthy",
        "nvidia_configured": nvidia_configured,
        "model": nvidia_client.model,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/chat")
async def chat(request: ChatRequest):
    """
    Endpoint principal para chat com streaming SSE
    
    Recebe:
    - messages: histórico de mensagens
    - mode: modo de operação (chat, ceo, project, meeting, document)
    - context: dados de contexto (projeto, reunião, etc.)
    
    Retorna:
    - StreamingResponse com Server-Sent Events
    """
    # Validação
    if not request.messages:
        raise HTTPException(status_code=400, detail="Lista de mensagens vazia")
    
    # Obter prompt do sistema baseado no modo
    system_prompt = SYSTEM_PROMPTS.get(request.mode, SYSTEM_PROMPTS["chat"])
    
    # Adicionar contexto se disponível
    if request.context:
        contexto_texto = formatar_contexto(request.context)
        if contexto_texto:
            system_prompt += f"\n\n## Contexto Atual\n{contexto_texto}"
    
    # Preparar mensagens para a API
    api_messages = [
        {"role": msg.role if msg.role in ["user", "assistant", "system"] else "user", "content": msg.content}
        for msg in request.messages
    ]
    
    # Streaming response
    async def generate():
        async for chunk in nvidia_client.generate_stream(api_messages, system_prompt):
            yield chunk
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@app.post("/api/analyze-document")
async def analyze_document(request: ChatRequest):
    """
    Endpoint específico para análise de documentos
    Retorna JSON estruturado em vez de streaming
    """
    if not request.context or not request.context.documents:
        raise HTTPException(status_code=400, detail="Nenhum documento fornecido")
    
    system_prompt = SYSTEM_PROMPTS["document"] + f"""
    
    Documentos a analisar: {len(request.context.documents)}
    - {', '.join([d.get('name', '?') for d in request.context.documents])}
    
    IMPORTANTE: Como este é um endpoint de análise de documento (não streaming),
    forneça uma análise estruturada em JSON no seguinte formato:
    {{
        "summary": "Resumo em 2-3 frases",
        "key_points": ["ponto 1", "ponto 2", ...],
        "insights": ["insight estratégico 1", ...],
        "recommendations": ["recomendação 1", ...]
    }}
    """
    
    api_messages = [{"role": "user", "content": "Analise os documentos enviados."}]
    
    # Para análise, usamos streaming também (mais responsivo)
    async def generate():
        async for chunk in nvidia_client.generate_stream(api_messages, system_prompt):
            yield chunk
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream"
    )

# ============================================================
# INICIALIZAÇÃO
# ============================================================

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)