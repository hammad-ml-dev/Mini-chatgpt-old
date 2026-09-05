@echo off
setlocal EnableExtensions
REM ---------------------------------------------------------------------------
REM Mini ChatGPT — start all services on Windows
REM
REM Easiest use: in File Explorer go to this file's folder (scripts), then
REM double-click dev-windows.bat. See README.md "Easiest method on Windows".
REM
REM You must have Node.js, npm, and Python on PATH. Ollama optional but
REM recommended for local chat (ollama pull llama3.2).
REM ---------------------------------------------------------------------------
pushd "%~dp0.." || exit /b 1
set "ROOT=%CD%"

if not exist ".env" (
  if exist ".env.example" (
    copy /y ".env.example" ".env" >nul
    echo Created .env from .env.example. Edit .env if you change providers or ports.
  )
)

echo Starting Mini ChatGPT stack...

start "mini-chatgpt-ml" cmd /k cd /d "%ROOT%\ml-service" ^&^& python -m venv .venv 2^>nul ^&^& call .venv\Scripts\activate.bat ^&^& python -m pip install -q -r requirements.txt ^&^& python -m uvicorn main:app --host 127.0.0.1 --port 8000

timeout /t 3 /nobreak >nul

start "mini-chatgpt-api" cmd /k cd /d "%ROOT%\server" ^&^& npm install ^&^& npm run dev

timeout /t 2 /nobreak >nul

start "mini-chatgpt-web" cmd /k cd /d "%ROOT%\client" ^&^& npm install ^&^& npm run dev

timeout /t 6 /nobreak >nul

start "" "http://localhost:5173"

echo Browser opened at http://localhost:5173
echo Close the three terminal windows to stop all services.
popd
endlocal
