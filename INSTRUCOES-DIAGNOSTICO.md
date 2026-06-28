# Diagnóstico do Nexus Agent Server

## Execute estes comandos no seu servidor Linux:

```bash
# 1. Entre na pasta do agent-server
cd /var/www/nexusholding/server/agent-server

# 2. Verifique se tem os arquivos necessários
ls -la

# 3. Execute o diagnóstico
chmod +x diagnostic.sh
./diagnostic.sh
```

## Ou execute manualmente passo a passo:

```bash
# Ver status dos containers
docker-compose ps

# Ver logs
docker-compose logs

# Reiniciar
docker-compose down
docker-compose up -d --build

# Aguardar 15 segundos
sleep 15

# Testar novamente
curl http://localhost:8000/health
```

## Se der erro no docker-compose:

```bash
# Verificar se o Docker está rodando
sudo systemctl status docker
sudo systemctl start docker

# Tentar novamente
docker-compose up -d
```

## Resultados esperados:

- `docker-compose ps` deve mostrar containers em "Up"
- `curl http://localhost:8000/health` deve retornar JSON com status

## Se ainda não funcionar, me envie a saída de:

```bash
docker-compose logs
```

Assim posso identificar o problema específico.