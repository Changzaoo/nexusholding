#!/bin/bash
# ================================================
# Nexus AI Agent Server - Script de Deploy
# Uso: ./deploy.sh
# ================================================

set -e  # Parar em caso de erro

# Cores para terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Nexus AI Agent Server - Deploy${NC}"
echo -e "${GREEN}========================================${NC}"

# 1. Verificar Docker
echo -e "\n${YELLOW}[1/5] Verificando Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker não encontrado. Instale com:${NC}"
    echo "curl -fsSL https://get.docker.com | sh"
    exit 1
fi
echo -e "${GREEN}✓ Docker encontrado${NC}"

# 2. Verificar Docker Compose
echo -e "\n${YELLOW}[2/5] Verificando Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose não encontrado.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose encontrado${NC}"

# 3. Verificar/Criar .env
echo -e "\n${YELLOW}[3/5] Verificando configuração...${NC}"
if [ ! -f .env ]; then
    echo -e "${YELLOW}Arquivo .env não encontrado. Criando...${NC}"
    cat > .env << 'EOF'
# Nexus AI Agent Server
NVIDIA_API_KEY=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
NVIDIA_MODEL=nvidia/llama-3.3-nemotron-70b-instruct
MAX_TOKENS=2048
TEMPERATURE=0.7
PORT=8000
HOST=0.0.0.0
EOF
    echo -e "${YELLOW}⚠️  Lembre-se de configurar sua NVIDIA_API_KEY no arquivo .env${NC}"
else
    echo -e "${GREEN}✓ Arquivo .env encontrado${NC}"
fi

# 4. Build e Start
echo -e "\n${YELLOW}[4/5] Iniciando containers...${NC}"
docker-compose down 2>/dev/null || true
docker-compose up -d --build

# 5. Verificar status
echo -e "\n${YELLOW}[5/5] Verificando status...${NC}"
sleep 5
docker-compose ps

# Health check
echo -e "\n${YELLOW}Testando health check...${NC}"
sleep 2
curl -s http://localhost:8000/health || echo -e "${RED}Health check falhou${NC}"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Deploy concluído!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\nAcesse:"
echo -e "  Agent Server: http://localhost:8000"
echo -e "  API Docs:     http://localhost:8000/docs"
echo -e "\nLogs: docker-compose logs -f"
echo -e "Parar: docker-compose down"