@echo off
REM ================================================
REM Nexus Agent Server - Upload para Servidor Linux
REM ================================================

echo =========================================
echo   Upload Nexus Agent Server para Linux
echo =========================================

SET SERVER_IP=192.168.0.100
SET SERVER_USER=v
SET SERVER_DIR=/home/v

echo.
echo [1/3] Compactando arquivos...
cd /d "%~dp0"
powershell -command "Compress-Archive -Path 'server\agent-server\*' -DestinationPath 'nexus-agent-server.zip' -Force"

echo.
echo [2/3] Enviando para servidor %SERVER_IP%...
scp nexus-agent-server.zip %SERVER_USER%@%SERVER_IP%:/tmp/

echo.
echo [3/3] Extraindo e configurando no servidor...
ssh %SERVER_USER%@%SERVER_IP% "cd /tmp && unzip -o nexus-agent-server.zip && rm -rf %SERVER_DIR%/nexusholding/server/agent-server && mkdir -p %SERVER_DIR%/nexusholding/server/agent-server && cp -r /tmp/agent-server/* %SERVER_DIR%/nexusholding/server/agent-server/ && rm -rf /tmp/agent-server /tmp/nexus-agent-server.zip"

echo.
echo =========================================
echo   Upload concluido!
echo =========================================
echo.
echo Para executar o deploy, rode no servidor:
echo   cd %SERVER_DIR%/nexusholding/server/agent-server
echo   chmod +x sync-deploy.sh
echo   ./sync-deploy.sh
echo.
pause