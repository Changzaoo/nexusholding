# Deploy Nexus AI Agent Server - Guia para Servidor Linux

## OPÇÃO 1: Usando Git (Recomendado - Mais Fácil)

### No seu servidor Linux, execute:

```bash
# 1. Acesse o diretório onde deseja instalar
cd /var/www

# 2. Clone o repositório
git clone https://github.com/Changzaoo/nexusholding.git

# 3. Entre na pasta do agent-server
cd nexusholding/server/agent-server

# 4. Crie o arquivo .env (você pode criar manualmente ou copiar o de .env.example)
nano .env

# Cole o conteúdo:
# NVIDIA_API_KEY=sua_chave_aqui
# NVIDIA_MODEL=nvidia/llama-3.3-nemotron-70b-instruct
# MAX_TOKENS=2048
# TEMPERATURE=0.7
# PORT=8000

# 5. Execute com Docker
docker-compose up -d

# 6. Verifique se está rodando
docker-compose ps
docker-compose logs -f
```

---

## OPÇÃO 2: Upload Manual via SCP/SFTP

### No Windows (PowerShell ou CMD), crie o ZIP:

```powershell
# Navegue até a pasta do projeto
cd d:\NexusHolding

# Entre na pasta do agent-server
cd server\agent-server

# Crie um arquivo compactado
Compress-Archive -Path * -DestinationPath ..\..\nexus-agent-server.zip -Force

# O arquivo será criado em: d:\NexusHolding\nexus-agent-server.zip
```

### Depois, no Linux, baixe ou faça upload:

```bash
# Opção A: Se o arquivo estiver em um servidor web
cd /tmp
wget https://seu-servidor.com/nexus-agent-server.zip

# Opção B: Use SCP do Windows (abra novo terminal PowerShell)
# scp nexus-agent-server.zip usuario@seu-servidor:/tmp/

# Extraia no servidor
cd /var/www
unzip /tmp/nexus-agent-server.zip -d nexus-agent-server
cd nexus-agent-server
```

---

## APÓS O DEPLOY - Comandos Essenciais

```bash
# Ver status dos containers
docker-compose ps

# Ver logs em tempo real
docker-compose logs -f

# Reiniciar serviços
docker-compose restart

# Parar serviços
docker-compose down

# Rebuild (após mudanças)
docker-compose up -d --build
```

## Verificar se está funcionando

```bash
# Teste local
curl http://localhost:8000/health

# Resposta esperada:
# {"status":"healthy","nvidia_configured":true,...}
```

---

## URLs de Acesso

| Serviço | URL |
|---------|-----|
| Agent Server | http://SEU_IP:8000 |
| Health Check | http://SEU_IP:8000/health |
| API Docs | http://SEU_IP:8000/docs |

---

## Atualizar para nova versão (Git)

```bash
cd /var/www/nexusholding
git pull origin main
cd server/agent-server
docker-compose up -d --build
```

---

## Problemas Comuns

**1. Docker não está instalado:**
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

**2. Permissão negada:**
```bash
sudo chmod +x deploy.sh
sudo ./deploy.sh
```

**3. Porta já em uso:**
```bash
# Pare outros serviços na porta 8000
sudo lsof -i :8000
# ou mude a porta no .env e docker-compose.yml
```

---

## Suporte

Se precisar de ajuda adicional, verifique:
- `docker-compose logs agent-server` para erros
- `docker exec -it nexus-agent-server sh` para acessar o container