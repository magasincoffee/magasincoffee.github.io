param(
    [switch]$StartNow
)

$ErrorActionPreference = 'Stop'

$root = Join-Path $env:LOCALAPPDATA 'MAGASIN\BusinessOS\supervisor'
$runtime = Join-Path $root 'runtime'
$bootstrap = Join-Path $runtime 'windows\autostart-bootstrap.ps1'
$disabled = Join-Path $root 'AUTOSTART_DISABLED'
$statusPath = Join-Path $root 'autostart-install-status.json'
$runKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
$runName = 'MAGASINBusinessOSAutostart'

if (-not (Test-Path $bootstrap)) {
    throw "Autostart bootstrap is missing from installed runtime: $bootstrap"
}

New-Item -ItemType Directory -Force -Path $root | Out-Null
New-Item -Path $runKey -Force | Out-Null

$command = 'powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $bootstrap + '"'
Set-ItemProperty -Path $runKey -Name $runName -Value $command -Type String

# Installation/explicit enable means future unexpected reboot/logon may resume.
Remove-Item $disabled -Force -ErrorAction SilentlyContinue

$stored = (Get-ItemProperty -Path $runKey -Name $runName -ErrorAction Stop).$runName
if ($stored -ne $command) {
    throw 'Failed to verify HKCU Run autostart registration.'
}

$status = [ordered]@{
    installed_at = [DateTimeOffset]::UtcNow.ToString('o')
    mechanism = 'HKCU_RUN_AT_USER_LOGON'
    registry_name = $runName
    bootstrap_path = $bootstrap
    owner_stop_latch = $disabled
    windows_session_required = $true
    bypass_windows_login = $false
    verified = $true
}
$status | ConvertTo-Json | Set-Content -Path $statusPath -Encoding UTF8

Write-Host "Autostart registered: $runName"
Write-Host 'Recovery boundary: Windows user logon is required for Chrome/ChatGPT automation.'
Write-Host 'Owner STOP creates AUTOSTART_DISABLED; explicit START/install clears it.'

if ($StartNow) {
    & powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File $bootstrap
    if ($LASTEXITCODE -ne 0) {
        throw "Autostart bootstrap StartNow failed with exit code $LASTEXITCODE."
    }
}
