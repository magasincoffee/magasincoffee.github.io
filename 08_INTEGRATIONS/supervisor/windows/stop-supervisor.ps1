$ErrorActionPreference = 'Stop'

$root = Join-Path $env:LOCALAPPDATA 'MAGASIN\BusinessOS\supervisor'
$stop = Join-Path $root 'STOP'
$pidFile = Join-Path $root 'supervisor.pid'

New-Item -ItemType Directory -Force -Path $root | Out-Null
Set-Content -Path $stop -Value 'STOP' -Encoding ascii

if (Test-Path $pidFile) {
    $pidValue = Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($pidValue) {
        $proc = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "Stop requested for Supervisor PID $pidValue."
        }
    }
}

Write-Host 'MAGASIN Supervisor STOP sentinel created.'
