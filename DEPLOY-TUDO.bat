@echo off
REM ================================================
REM Deploy Completo - Windows para Linux
REM ================================================

echo =========================================
echo   Deploy Nexus Agent Server
echo =========================================

SET SERVER_IP=192.168.0.100
SET SERVER_USER=v
SET SERVER_PATH=/home/v/nexusholding/server/agent-server

echo.
echo [1/4] Criando estrutura de diretorios no servidor...
ssh %SERVER_USER%@%SERVER_IP% "mkdir -p %SERVER_PATH%"

echo.
echo [2/4] Copiando arquivos...
scp -r server\agent-server\* %SERVER_USER%@%SERVER_IP%:%SERVER_PATH%/

echo.
echo [3/4] Executando deploy no servidor...
ssh %SERVER_USER%@%SERVER_IP% "cd %SERVER_PATH% && chmod +x *.sh && ./sync-deploy.sh"

echo.
echo =========================================
echo   Deploy concluido!
echo =========================================
pause