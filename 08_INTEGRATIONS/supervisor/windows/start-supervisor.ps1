param(
    [switch]$DryRun,
    [switch]$Hidden
)

$ErrorActionPreference = 'Stop'

$root = Join-Path $env:LOCALAPPDATA 'MAGASIN\BusinessOS\supervisor'
$runtime = Join-Path $root 'runtime'
$runScript = Join-Path $runtime 'windows\run-supervisor.ps1'
$pidFile = Join-Path $root 'supervisor.pid'
$stop = Join-Path $root 'STOP'
$autostartDisabled = Join-Path $root 'AUTOSTART_DISABLED'

if (-not (Test-Path $runScript)) {
    throw "Supervisor runtime is not installed: $runScript"
}

$existingWrapper = Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
    Where-Object {
        $_.CommandLine -and
        $_.CommandLine -like '*run-supervisor.ps1*' -and
        $_.CommandLine -like "*$root*"
    } |
    Select-Object -First 1

if ($existingWrapper) {
    Set-Content -Path $pidFile -Value $existingWrapper.ProcessId -Encoding ascii
    Write-Host "Supervisor wrapper already running (PID $($existingWrapper.ProcessId))."
    exit 0
}

if (Test-Path $pidFile) {
    $existing = Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($existing -and (Get-Process -Id $existing -ErrorAction SilentlyContinue)) {
        Write-Host "Supervisor already running (PID $existing)."
        exit 0
    }
}

Remove-Item $stop -Force -ErrorAction SilentlyContinue
Remove-Item $autostartDisabled -Force -ErrorAction SilentlyContinue

# Prevent GitHub Actions orphan-process cleanup from claiming the persistent Supervisor shell.
$env:RUNNER_TRACKING_ID = 'MAGASIN_SUPERVISOR_PERSISTENT'

$args = @(
    '-NoLogo',
    '-ExecutionPolicy', 'Bypass',
    '-File', ('"' + $runScript + '"')
)
if ($DryRun) { $args += '-DryRun' }

if ($Hidden) {
    Start-Process powershell.exe -WindowStyle Hidden -ArgumentList $args
    Write-Host 'MAGASIN Supervisor started in background mode.'
} else {
    $visibleArgs = @('-NoLogo', '-NoExit', '-ExecutionPolicy', 'Bypass', '-File', ('"' + $runScript + '"'))
    if ($DryRun) { $visibleArgs += '-DryRun' }
    Start-Process powershell.exe -ArgumentList $visibleArgs
    Write-Host 'MAGASIN Supervisor started in a separate PowerShell window.'
}
