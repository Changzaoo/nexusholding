#!/bin/bash
# Script de Diagnóstico para Nexus Agent Server

echo "=========================================="
echo "  Nexus Agent Server - Diagnóstico"
echo "=========================================="

# 1. Status dos containers
echo -e "\n[1] Status dos Containers:"
docker-compose ps 2>&1 || echo "docker-compose não está funcionando"

# 2. Logs do agent-server
echo -e "\n[2] Logs do Agent Server (últimas 50 linhas):"
docker-compose logs --tail=50 agent-server 2>&1

# 3. Verificar Docker
echo -e "\n[3] Versão do Docker:"
docker --version
docker-compose --version

# 4. Portas em uso
echo -e "\n[4] Portas em uso:"
netstat -tlnp 2>/dev/null | grep -E ':(8000|80|443)' || ss -tlnp | grep -E ':(8000|80|443)'

# 5. Imagens Docker
echo -e "\n[5] Imagens Docker:"
docker images | grep -E 'nexus|nginx|agent'

# 6. Reiniciar e testar
echo -e "\n[6] Tentando reiniciar..."
docker-compose down
docker-compose up -d --build

echo -e "\n[Aguardando 10 segundos para iniciar...]"
sleep 10

echo -e "\n[7] Teste de Health Check:"
curl -v http://localhost:8000/health 2>&1

echo -e "\n=========================================="
echo "Fim do diagnóstico"
echo "=========================================="