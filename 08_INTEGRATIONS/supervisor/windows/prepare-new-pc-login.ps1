$ErrorActionPreference = 'Stop'

$root = Join-Path $env:LOCALAPPDATA 'MAGASIN\BusinessOS\supervisor'
$profile = Join-Path $root 'browser_profile'
$stop = Join-Path $root 'STOP'
$autostartDisabled = Join-Path $root 'AUTOSTART_DISABLED'

New-Item -ItemType Directory -Force -Path $root | Out-Null
Set-Content -LiteralPath $stop -Value 'NEW_PC_LOGIN_PREP' -Encoding ascii
Set-Content -LiteralPath $autostartDisabled -Value 'NEW_PC_LOGIN_PREP' -Encoding ascii

$chromeCandidates = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)
$chrome = $chromeCandidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-not $chrome) { throw 'Google Chrome not found.' }

Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and $_.CommandLine -like "*$profile*" } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

Start-Process -FilePath $chrome -ArgumentList @(
    ('--user-data-dir="' + $profile + '"'),
    '--no-first-run',
    '--no-default-browser-check',
    'https://chatgpt.com/',
    'https://mail.google.com/',
    'https://github.com/'
)

Write-Host 'DEDICATED_ROBOT_CHROME_OPEN=True'
Write-Host 'OWNER_STOP_ACTIVE=True'
Write-Host 'ACTION=Sign in to ChatGPT, Gmail, and GitHub in this dedicated Chrome window. Do not start Robot yet.'
Write-Host 'When finished, close all windows of this dedicated Chrome profile before starting Supervisor.'
