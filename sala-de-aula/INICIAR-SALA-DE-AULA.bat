@echo off
title Minha sala de aula
cd /d "%~dp0"

echo.
echo  ==============================================
echo     MINHA SALA DE AULA
echo  ==============================================
echo.

rem --- 1. Node.js instalado? ---
where node >nul 2>nul
if errorlevel 1 goto semnode

rem --- 2. Chave da API ---
if not exist ".env" goto pedechave
findstr /b /c:"GEMINI_API_KEY=AIza" ".env" >nul 2>nul
if errorlevel 1 goto pedechave
goto instalar

:pedechave
echo  Falta a chave da API Gemini.
echo  Ela comeca com AIza... e voce copia em: https://aistudio.google.com/apikey
echo.
echo  Clique com o botao DIREITO do mouse nesta janela para colar a chave,
echo  e depois aperte ENTER.
echo.
set "CHAVE="
set /p "CHAVE=  Chave: "
if "%CHAVE%"=="" goto pedechave
echo %CHAVE%| findstr /b /c:"AIza" >nul
if errorlevel 1 (
  echo.
  echo  Essa chave nao parece certa: ela deveria comecar com AIza. Tente de novo.
  echo.
  goto pedechave
)
> ".env" echo GEMINI_API_KEY=%CHAVE%
>> ".env" echo PORT=5173
>> ".env" echo HOST=127.0.0.1
echo.
echo  Chave guardada neste computador (arquivo .env).
echo.

:instalar
rem --- 3. Instalar (so na primeira vez) ---
if exist "node_modules\express" goto preparar
echo  Instalando os componentes (so na primeira vez, pode levar alguns minutos)...
call npm install --no-fund --no-audit
if errorlevel 1 goto erroinstalar

:preparar
echo  Preparando o aplicativo...
call npm run build --silent
if errorlevel 1 goto errobuild

rem --- 4. Iniciar ---
echo.
echo  Abrindo a sala de aula no navegador...
echo  IMPORTANTE: deixe esta janela aberta enquanto o Luan estuda.
echo.
node server\index.js --producao --abrir
echo.
echo  A sala de aula foi desligada.
pause
exit /b

:semnode
echo  O Node.js ainda nao esta instalado neste computador.
echo.
echo  Vou abrir a pagina de download. Baixe a versao "LTS", instale
echo  (pode clicar em Avancar/Next em tudo) e depois de terminar
echo  de 2 cliques neste arquivo de novo.
echo.
start "" "https://nodejs.org/pt/download"
pause
exit /b

:erroinstalar
echo.
echo  Nao foi possivel instalar os componentes. Confira a internet e tente de novo.
echo  Se continuar, tire uma foto desta tela e mande para o Claude.
pause
exit /b

:errobuild
echo.
echo  Nao foi possivel preparar o aplicativo.
echo  Tire uma foto desta tela e mande para o Claude.
pause
exit /b
