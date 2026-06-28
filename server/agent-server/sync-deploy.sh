#!/bin/bash
# ================================================
# Nexus Agent Server - Sincronizar Git + Deploy
# Uso: ./sync-deploy.sh
# ================================================

set -e

echo -e "\033[0;32m========================================\033[0m"
echo -e "\033[0;32m  Sincronizando Git + Deploy\033[0m"
echo -e "\033[0;32m========================================\033[0m"

# 1. Sincronizar com Git
echo -e "\n\033[1;33m[1/4] Sincronizando com repositório...\033[0m"
cd /var/www/nexusholding
git pull origin main

# 2. Entrar no diretório
echo -e "\n\033[1;33m[2/4] Entrando no diretório agent-server...\033[0m"
cd /var/www/nexusholding/server/agent-server

# 3. Criar .env se não existir
echo -e "\n\033[1;33m[3/4] Verificando configuração...\033[0m"
if [ ! -f .env ]; then
    echo -e "\033[1;33mCriando arquivo .env com sua NVIDIA API Key...\033[0m"
    cat > .env << 'EOF'
NVIDIA_API_KEY=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
NVIDIA_MODEL=nvidia/llama-3.3-nemotron-70b-instruct
MAX_TOKENS=2048
TEMPERATURE=0.7
PORT=8000
HOST=0.0.0.0
EOF
fi

# 4. Build e start
echo -e "\n\033[1;33m[4/4] Iniciando containers...\033[0m"
docker-compose down 2>/dev/null || true
docker-compose up -d --build

# Aguardar inicialização
echo -e "\n\033[1;33mAguardando 15 segundos para inicialização...\033[0m"
sleep 15

# Health check
echo -e "\n\033[1;33mTestandohealth check...\033[0m"
curl -s http://localhost:8000/health

echo -e "\n\033[0;32m========================================\033[0m"
echo -e "\033[0;32m  Deploy concluído!\033[0m"
echo -e "\033[0;32m========================================\033[0m"
echo -e "\nAcesse:"
echo -e "  http://localhost:8000/health"
echo -e "  http://localhost:8000/docs"
echo -e "\nLogs: docker-compose logs -f"