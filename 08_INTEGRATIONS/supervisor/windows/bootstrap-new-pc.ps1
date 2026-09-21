param(
    [string]$PinnedSha = "18e6d5025429cb1aaee986a8033d8b47169a54c3",
    [string]$RepoUrl = "https://github.com/magasincoffee/magasincoffee.github.io.git",
    [string]$InstallRoot = "C:\MAGASIN\magasincoffee.github.io",
    [string]$StateBundle = "D:\MAGASIN_MIGRATION\supervisor-state"
)

$ErrorActionPreference = 'Stop'

function Write-Step([string]$Text) {
    Write-Host ""
    Write-Host "=== $Text ==="
}

function Refresh-Path {
    $machine = [Environment]::GetEnvironmentVariable('Path','Machine')
    $user = [Environment]::GetEnvironmentVariable('Path','User')
    $env:Path = "$machine;$user"
}

function Ensure-WingetPackage([string]$Id,[string]$CommandName) {
    if (Get-Command $CommandName -ErrorAction SilentlyContinue) {
        Write-Host "$CommandName already available."
        return
    }

    if (-not (Get-Command winget.exe -ErrorAction SilentlyContinue)) {
        throw "winget is required to install $Id automatically. Install App Installer from Microsoft Store, then rerun."
    }

    & winget.exe install --id $Id --exact --silent --accept-source-agreements --accept-package-agreements
    if ($LASTEXITCODE -ne 0) {
        throw "winget install failed for $Id with exit code $LASTEXITCODE."
    }
    Refresh-Path
    if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
        throw "$CommandName is still unavailable after installing $Id."
    }
}

function Get-ChromePath {
    $candidates = @(
        "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
        "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
    )
    return ($candidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1)
}

Write-Step "PRE-FLIGHT"
$os = Get-CimInstance Win32_OperatingSystem
$cs = Get-CimInstance Win32_ComputerSystem
$c = Get-Volume -DriveLetter C -ErrorAction Stop
Write-Host ("Windows=" + $os.Caption + " build " + $os.BuildNumber)
Write-Host ("RAM_GB=" + [math]::Round($cs.TotalPhysicalMemory/1GB,2))
Write-Host ("C_FREE_GB=" + [math]::Round($c.SizeRemaining/1GB,2))
if ($cs.TotalPhysicalMemory -lt 12GB) {
    Write-Warning "Recommended for 3-lane Robot: 16 GB RAM or more."
}
if ($c.SizeRemaining -lt 25GB) {
    Write-Warning "Recommended: at least 25 GB free on C before long-run soak."
}

Write-Step "INSTALL PREREQUISITES"
Ensure-WingetPackage -Id "Git.Git" -CommandName "git.exe"
Ensure-WingetPackage -Id "OpenJS.NodeJS.LTS" -CommandName "node.exe"
if (-not (Get-ChromePath)) {
    if (-not (Get-Command winget.exe -ErrorAction SilentlyContinue)) {
        throw "Google Chrome missing and winget unavailable."
    }
    & winget.exe install --id "Google.Chrome" --exact --silent --accept-source-agreements --accept-package-agreements
    if ($LASTEXITCODE -ne 0) { throw "Google Chrome installation failed." }
}
Refresh-Path

$nodeVersion = (& node --version)
Write-Host ("Node=" + $nodeVersion)
if (-not $nodeVersion -or [int](($nodeVersion -replace '^v','').Split('.')[0]) -lt 20) {
    throw "Node 20+ is required."
}
Write-Host ("Git=" + (& git --version))
Write-Host ("Chrome=" + (Get-ChromePath))

Write-Step "SYNC CANONICAL REPOSITORY"
$parent = Split-Path -Parent $InstallRoot
New-Item -ItemType Directory -Force -Path $parent | Out-Null
if (-not (Test-Path (Join-Path $InstallRoot ".git"))) {
    if (Test-Path $InstallRoot) {
        $items = @(Get-ChildItem -LiteralPath $InstallRoot -Force -ErrorAction SilentlyContinue)
        if ($items.Count -gt 0) {
            throw "InstallRoot exists and is not an empty Git repository: $InstallRoot"
        }
    }
    & git clone $RepoUrl $InstallRoot
    if ($LASTEXITCODE -ne 0) { throw "git clone failed." }
}

Push-Location $InstallRoot
try {
    & git fetch origin --prune
    if ($LASTEXITCODE -ne 0) { throw "git fetch failed." }
    & git cat-file -e "$PinnedSha^{commit}"
    if ($LASTEXITCODE -ne 0) { throw "Pinned SHA not found after fetch: $PinnedSha" }
    & git checkout --detach $PinnedSha
    if ($LASTEXITCODE -ne 0) { throw "git checkout pinned SHA failed." }
} finally {
    Pop-Location
}

Write-Step "INSTALL SUPERVISOR FAIL-CLOSED"
$supervisorRoot = Join-Path $env:LOCALAPPDATA "MAGASIN\BusinessOS\supervisor"
New-Item -ItemType Directory -Force -Path $supervisorRoot | Out-Null

Set-Content -LiteralPath (Join-Path $supervisorRoot "STOP") -Value "NEW_PC_MIGRATION_OWNER_STOP" -Encoding ascii
Set-Content -LiteralPath (Join-Path $supervisorRoot "AUTOSTART_DISABLED") -Value "NEW_PC_MIGRATION_OWNER_STOP" -Encoding ascii

$sourceSupervisor = Join-Path $InstallRoot "08_INTEGRATIONS\supervisor"
$installer = Join-Path $sourceSupervisor "windows\install-supervisor.ps1"
$autostartInstaller = Join-Path $sourceSupervisor "windows\install-autostart.ps1"
if (-not (Test-Path $installer)) { throw "Supervisor installer missing." }
if (-not (Test-Path $autostartInstaller)) { throw "Autostart installer missing." }

& powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File $installer -SourceRoot $sourceSupervisor
if ($LASTEXITCODE -ne 0) { throw "Supervisor install failed with exit code $LASTEXITCODE." }

& powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File $autostartInstaller
if ($LASTEXITCODE -ne 0) { throw "Autostart install failed with exit code $LASTEXITCODE." }

Write-Step "OPTIONAL LANE CONFIG IMPORT"
$bundleLaneConfig = Join-Path $StateBundle "lanes.json"
if (Test-Path $bundleLaneConfig) {
    $laneConfig = Get-Content -LiteralPath $bundleLaneConfig -Raw -Encoding UTF8 | ConvertFrom-Json
    if ([string]$laneConfig.mode -ne "THREE_LANE_V1") {
        throw "State bundle lanes.json is not THREE_LANE_V1."
    }
    foreach ($lane in @($laneConfig.lanes)) {
        $lane.enabled = $false
    }
    $laneConfig | ConvertTo-Json -Depth 20 |
        Set-Content -LiteralPath (Join-Path $supervisorRoot "lanes.json") -Encoding UTF8
    Write-Host "Imported lane names/Brain/Work targets with ALL lanes forced disabled."
} else {
    Write-Host "No local state bundle found. Control Panel will initialize a fresh lane config."
}

Write-Step "VERIFY INSTALL"
$runtime = Join-Path $supervisorRoot "runtime"
$required = @(
    (Join-Path $runtime "windows\control-panel.ps1"),
    (Join-Path $runtime "windows\start-supervisor.ps1"),
    (Join-Path $runtime "src\runtime\three-lane-cli.mjs"),
    (Join-Path $runtime "package.json")
)
foreach ($p in $required) {
    if (-not (Test-Path $p)) { throw "Required installed runtime file missing: $p" }
}

$installedPackage = Get-Content (Join-Path $runtime "package.json") -Raw -Encoding UTF8 | ConvertFrom-Json
if ([string]$installedPackage.name -ne "magasin-supervisor") {
    throw "Installed runtime package identity mismatch."
}

$status = [ordered]@{
    installed_at = [DateTimeOffset]::UtcNow.ToString('o')
    canonical_repo = $RepoUrl
    pinned_sha = $PinnedSha
    repo_path = $InstallRoot
    supervisor_root = $supervisorRoot
    owner_stop_preserved = $true
    lanes_forced_disabled_on_import = $true
    browser_profile_migrated = $false
    auth_tokens_migrated = $false
    ready_for_dedicated_login = $true
}
$status | ConvertTo-Json -Depth 10 |
    Set-Content -LiteralPath (Join-Path $supervisorRoot "migration-install-status.json") -Encoding UTF8

Write-Host ""
Write-Host "NEW_PC_BOOTSTRAP_COMPLETE=True"
Write-Host "OWNER_STOP_ACTIVE=True"
Write-Host "NEXT=Run prepare-new-pc-login.ps1 and sign into ChatGPT in the dedicated Robot Chrome profile."
