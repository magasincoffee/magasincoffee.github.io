param(
    [switch]$DryRun,
    [switch]$Hidden,
    [switch]$Recovery
)

$ErrorActionPreference = 'Stop'

$root = Join-Path $env:LOCALAPPDATA 'MAGASIN\BusinessOS\supervisor'
$runtime = Join-Path $root 'runtime'
$runScript = Join-Path $runtime 'windows\run-supervisor.ps1'
$lifecycleScript = Join-Path $runtime 'windows\lifecycle-truth.ps1'
$pidFile = Join-Path $root 'supervisor.pid'
$stop = Join-Path $root 'STOP'
$autostartDisabled = Join-Path $root 'AUTOSTART_DISABLED'

if (-not (Test-Path $runScript)) {
    throw "Supervisor runtime is not installed: $runScript"
}
if (-not (Test-Path $lifecycleScript)) {
    throw "Lifecycle truth helper is not installed: $lifecycleScript"
}

. $lifecycleScript

$existingWrapper = Get-LifecycleSupervisorWrapper -Root $root
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

if ($Recovery) {
    $ownerStop = Get-LifecycleOwnerStopState -Root $root
    if ($ownerStop.blocked) {
        Write-Host 'RECOVERY_START_BLOCKED_OWNER_STOP=True'
        exit 0
    }

    $enabledLaneCount = Get-EnabledLaneCount -Root $root
    if ($enabledLaneCount -lt 1) {
        Write-Host 'RECOVERY_START_SKIPPED_ALL_LANES_DISABLED=True'
        exit 0
    }
} else {
    # Only an explicit Owner START may clear the Owner STOP latches.
    Remove-Item $stop -Force -ErrorAction SilentlyContinue
    Remove-Item $autostartDisabled -Force -ErrorAction SilentlyContinue
    Write-Host 'OWNER_START_LATCH_CLEAR=True'
}

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
