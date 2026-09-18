$ErrorActionPreference = 'Stop'

$root = Join-Path $env:LOCALAPPDATA 'MAGASIN\BusinessOS\supervisor'
$stop = Join-Path $root 'STOP'
$pidFile = Join-Path $root 'supervisor.pid'

New-Item -ItemType Directory -Force -Path $root | Out-Null
Set-Content -Path $stop -Value 'STOP' -Encoding ascii

$pidValue = $null
if (Test-Path $pidFile) {
    $pidValue = Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1
}

if ($pidValue) {
    Write-Host "Cooperative STOP requested for Supervisor PID $pidValue."

    for ($i = 0; $i -lt 5; $i++) {
        if (-not (Get-Process -Id $pidValue -ErrorAction SilentlyContinue)) {
            break
        }
        Start-Sleep -Seconds 1
    }

    if (Get-Process -Id $pidValue -ErrorAction SilentlyContinue) {
        Write-Host "Grace period expired; forcing dedicated Supervisor process tree to stop."
        & taskkill.exe /PID $pidValue /T /F | Out-Host
    }
}

Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
Write-Host 'MAGASIN Supervisor stopped. STOP sentinel remains until next START.'
