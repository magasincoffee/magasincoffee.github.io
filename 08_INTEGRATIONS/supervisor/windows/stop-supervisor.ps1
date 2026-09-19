$ErrorActionPreference = 'Stop'

$root = Join-Path $env:LOCALAPPDATA 'MAGASIN\BusinessOS\supervisor'
$stop = Join-Path $root 'STOP'
$pidFile = Join-Path $root 'supervisor.pid'
$autostartDisabled = Join-Path $root 'AUTOSTART_DISABLED'

New-Item -ItemType Directory -Force -Path $root | Out-Null
Set-Content -Path $stop -Value 'STOP' -Encoding ascii
Set-Content -Path $autostartDisabled -Value 'OWNER_STOP' -Encoding ascii

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

$rootPattern = "*$root*"

Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
    Where-Object {
        $_.CommandLine -and
        $_.CommandLine -like '*run-supervisor.ps1*' -and
        $_.CommandLine -like $rootPattern
    } |
    ForEach-Object {
        Write-Host "Stopping orphaned Supervisor wrapper PID $($_.ProcessId)."
        & taskkill.exe /PID $_.ProcessId /T /F | Out-Host
    }

Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and $_.CommandLine -match '(supervisor-loop-cli|brain-worker-cli|three-lane-cli)\.mjs' } |
    ForEach-Object {
        Write-Host "Stopping orphaned Supervisor Node PID $($_.ProcessId)."
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }

Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
Write-Host 'MAGASIN Supervisor stopped. Owner STOP latch disables automatic reboot/logon restart until next explicit START.'
