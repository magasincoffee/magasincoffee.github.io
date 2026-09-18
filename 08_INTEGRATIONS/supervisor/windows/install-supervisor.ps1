param(
    [string]$SourceRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)

$ErrorActionPreference = 'Stop'

$root = Join-Path $env:LOCALAPPDATA 'MAGASIN\BusinessOS\supervisor'
$runtime = Join-Path $root 'runtime'
$desktop = [Environment]::GetFolderPath('Desktop')

New-Item -ItemType Directory -Force -Path $root | Out-Null

if (Test-Path $runtime) {
    Remove-Item $runtime -Recurse -Force
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
