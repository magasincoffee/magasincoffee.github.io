param(
    [string]$SourceRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)

$ErrorActionPreference = 'Stop'

$root = Join-Path $env:LOCALAPPDATA 'MAGASIN\BusinessOS\supervisor'
$runtime = Join-Path $root 'runtime'
$pidFile = Join-Path $root 'supervisor.pid'
$stopFile = Join-Path $root 'STOP'
$desktop = [Environment]::GetFolderPath('Desktop')

New-Item -ItemType Directory -Force -Path $root | Out-Null

# Upgrades are allowed only after stopping the dedicated Supervisor process.
if (Test-Path $pidFile) {
    $pidValue = Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($pidValue -and (Get-Process -Id $pidValue -ErrorAction SilentlyContinue)) {
        Write-Host "Stopping existing Supervisor PID $pidValue before runtime upgrade."
        & taskkill.exe /PID $pidValue /T /F | Out-Host
        Start-Sleep -Seconds 1
    }
}
Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
Remove-Item $stopFile -Force -ErrorAction SilentlyContinue

if (Test-Path $runtime) {
    $removed = $false
    for ($i = 0; $i -lt 8; $i++) {
        try {
            Remove-Item $runtime -Recurse -Force -ErrorAction Stop
            $removed = $true
            break
        } catch {
            if ($i -ge 7) { throw }
            Start-Sleep -Milliseconds 750
        }
    }
    if (-not $removed -and (Test-Path $runtime)) {
        throw "Could not replace Supervisor runtime after bounded retries."
    }
}

New-Item -ItemType Directory -Force -Path $runtime | Out-Null

Copy-Item (Join-Path $SourceRoot 'src') (Join-Path $runtime 'src') -Recurse -Force
Copy-Item (Join-Path $SourceRoot 'windows') (Join-Path $runtime 'windows') -Recurse -Force
Copy-Item (Join-Path $SourceRoot 'package.json') (Join-Path $runtime 'package.json') -Force

Push-Location $runtime
try {
    npm install --omit=dev --ignore-scripts --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'npm install failed' }
} finally {
    Pop-Location
}

$startTarget = Join-Path $runtime 'windows\start-supervisor.ps1'
$stopTarget = Join-Path $runtime 'windows\stop-supervisor.ps1'

$startCmd = Join-Path $desktop 'START_MAGASIN_SUPERVISOR.cmd'
$stopCmd = Join-Path $desktop 'STOP_MAGASIN_SUPERVISOR.cmd'

Set-Content -Path $startCmd -Encoding ascii -Value "@echo off`r`npowershell -NoLogo -ExecutionPolicy Bypass -File `"$startTarget`"`r`n"
Set-Content -Path $stopCmd -Encoding ascii -Value "@echo off`r`npowershell -NoLogo -ExecutionPolicy Bypass -File `"$stopTarget`"`r`n"

Write-Host "Installed runtime: $runtime"
Write-Host "Desktop START: $startCmd"
Write-Host "Desktop STOP: $stopCmd"
