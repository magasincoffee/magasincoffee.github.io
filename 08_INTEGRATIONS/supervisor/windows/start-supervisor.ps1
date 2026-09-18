param(
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$root = Join-Path $env:LOCALAPPDATA 'MAGASIN\BusinessOS\supervisor'
$runtime = Join-Path $root 'runtime'
$runScript = Join-Path $runtime 'windows\run-supervisor.ps1'
$pidFile = Join-Path $root 'supervisor.pid'
$stop = Join-Path $root 'STOP'

if (-not (Test-Path $runScript)) {
    throw "Supervisor runtime is not installed: $runScript"
}

if (Test-Path $pidFile) {
    $existing = Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($existing -and (Get-Process -Id $existing -ErrorAction SilentlyContinue)) {
        Write-Host "Supervisor already running (PID $existing)."
        exit 0
    }
}

Remove-Item $stop -Force -ErrorAction SilentlyContinue

# Prevent GitHub Actions orphan-process cleanup from claiming the persistent Supervisor shell.
$env:RUNNER_TRACKING_ID = 'MAGASIN_SUPERVISOR_PERSISTENT'

$args = @(
    '-NoLogo',
    '-NoExit',
    '-ExecutionPolicy', 'Bypass',
    '-File', "`"$runScript`""
)
if ($DryRun) { $args += '-DryRun' }

Start-Process powershell.exe -ArgumentList $args

Write-Host 'MAGASIN Supervisor started in a separate PowerShell window.'
