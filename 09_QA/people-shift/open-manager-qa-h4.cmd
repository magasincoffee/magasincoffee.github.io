@echo off
setlocal EnableExtensions
set "QA_ROOT=D:\MAGASIN-QA"
if not exist "D:\" set "QA_ROOT=%LOCALAPPDATA%\MAGASIN-QA"
if not exist "%QA_ROOT%" mkdir "%QA_ROOT%"
set "CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" (
 echo Chrome not found. Please install Chrome or report to the QA coordinator.
 pause
 exit /b 1
)
echo Starting MAGASIN Manager QA in an isolated Chrome profile.
echo DO NOT publish or modify real schedules. Browser starts at the live read-only review site.
start "MAGASIN QA Manager" "%CHROME%" --no-first-run --user-data-dir="%QA_ROOT%\Manager-Chrome-Profile" --new-window "https://magasincoffee.github.io/manager/scheduling/"
echo You may sign in as Manager in the newly opened window.
exit /b 0
