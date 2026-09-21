@echo off
setlocal EnableExtensions
title MAGASIN NEW PC CONNECTOR

net session >nul 2>&1
if not "%errorlevel%"=="0" (
  echo.
  echo [MAGASIN] Please run Command Prompt as Administrator.
  echo.
  pause
  exit /b 1
)

set "PSHOST="
where powershell.exe >nul 2>&1
if "%errorlevel%"=="0" set "PSHOST=powershell.exe"

if not defined PSHOST (
  where pwsh.exe >nul 2>&1
  if "%errorlevel%"=="0" set "PSHOST=pwsh.exe"
)

if not defined PSHOST (
  echo [MAGASIN] PowerShell was not found. Trying to install PowerShell 7 with winget...
  where winget.exe >nul 2>&1
  if not "%errorlevel%"=="0" (
    echo [MAGASIN] winget is also unavailable. Install Microsoft App Installer first, then rerun.
    pause
    exit /b 2
  )
  winget install --id Microsoft.PowerShell --exact --silent --accept-source-agreements --accept-package-agreements
  if not "%errorlevel%"=="0" (
    echo [MAGASIN] PowerShell 7 installation failed.
    pause
    exit /b 3
  )
  set "PSHOST=%ProgramFiles%\PowerShell\7\pwsh.exe"
)

set "SCRIPT=%TEMP%\magasin-connect-new-pc.ps1"
set "URL=https://raw.githubusercontent.com/magasincoffee/magasincoffee.github.io/refs/heads/migration/new-pc-bootstrap-v1/08_INTEGRATIONS/supervisor/windows/connect-new-pc.ps1"

echo.
echo [MAGASIN] Downloading secure connector...
curl.exe -L --fail --silent --show-error "%URL%" -o "%SCRIPT%"
if not "%errorlevel%"=="0" (
  echo [MAGASIN] Download failed.
  pause
  exit /b 4
)

echo [MAGASIN] Starting connector...
"%PSHOST%" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%"
set "RC=%errorlevel%"

echo.
if "%RC%"=="0" (
  echo [MAGASIN] Connection bootstrap finished.
  echo Keep the GitHub Runner window open.
) else (
  echo [MAGASIN] Connector stopped with exit code %RC%.
)
echo.
pause
exit /b %RC%
