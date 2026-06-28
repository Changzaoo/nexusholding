@echo off
REM ================================================
REM Deploy Completo - Windows para Linux
REM ================================================

echo Copiando arquivos e executando deploy no servidor...

REM Copiar arquivos e executar no servidor em um comando
scp -r server\agent-server\* v@192.168.0.100:/home/v/nexusholding/server/agent-server/ && ssh v@192.168.0.100 "cd /home/v/nexusholding/server/agent-server && chmod +x sync-deploy.sh && ./sync-deploy.sh"

echo.
echo Deploy concluido!
pause