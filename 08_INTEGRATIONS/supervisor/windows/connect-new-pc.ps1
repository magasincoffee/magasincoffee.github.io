param(
    [string]$Repository = "magasincoffee/magasincoffee.github.io",
    [string]$RunnerRoot = "C:\actions-runner-business\actions-runner"
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

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "Run Command Prompt as Administrator, then launch this connector again."
}

Write-Step "ENSURE GITHUB CLI"
if (-not (Get-Command gh.exe -ErrorAction SilentlyContinue)) {
    if (-not (Get-Command winget.exe -ErrorAction SilentlyContinue)) {
        throw "winget is unavailable. Install Microsoft App Installer, then rerun."
    }
    & winget.exe install --id GitHub.cli --exact --silent --accept-source-agreements --accept-package-agreements
    if ($LASTEXITCODE -ne 0) { throw "GitHub CLI installation failed." }
    Refresh-Path
}
if (-not (Get-Command gh.exe -ErrorAction SilentlyContinue)) {
    throw "gh.exe is unavailable after installation."
}
Write-Host ("GH=" + (& gh --version | Select-Object -First 1))

Write-Step "AUTHORIZE THIS NEW PC"
& cmd.exe /d /c "gh auth status --hostname github.com >nul 2>&1"
$ghAuthReady = ($LASTEXITCODE -eq 0)
if (-not $ghAuthReady) {
    Write-Host "GitHub will show a one-time browser/device authorization. Approve it with the Owner GitHub account."
    & gh auth login --hostname github.com --git-protocol https --web
    if ($LASTEXITCODE -ne 0) { throw "GitHub CLI web login failed." }
}
& gh auth setup-git
if ($LASTEXITCODE -ne 0) { throw "gh auth setup-git failed." }
Write-Host "GITHUB_OWNER_AUTH_READY=True"

Write-Step "INSTALL MAGASIN SUPERVISOR"
$bootstrap = Join-Path $env:TEMP "magasin-bootstrap-new-pc.ps1"
$bootstrapUrl = "https://raw.githubusercontent.com/magasincoffee/magasincoffee.github.io/refs/heads/migration/new-pc-bootstrap-v1/08_INTEGRATIONS/supervisor/windows/bootstrap-new-pc.ps1"
Invoke-WebRequest -Uri $bootstrapUrl -OutFile $bootstrap -UseBasicParsing
if (-not (Test-Path $bootstrap)) { throw "Failed to download bootstrap-new-pc.ps1." }

$psHost = Get-Command powershell.exe -ErrorAction SilentlyContinue
if (-not $psHost) { $psHost = Get-Command pwsh.exe -ErrorAction SilentlyContinue }
if (-not $psHost) { throw "No PowerShell host is available for bootstrap." }
& $psHost.Source -NoLogo -NoProfile -ExecutionPolicy Bypass -File $bootstrap
if ($LASTEXITCODE -ne 0) { throw "MAGASIN bootstrap failed with exit code $LASTEXITCODE." }

Write-Step "REGISTER CLEAN SELF-HOSTED GITHUB RUNNER"
$repoUrl = "https://github.com/$Repository"
$runnerParent = Split-Path -Parent $RunnerRoot
New-Item -ItemType Directory -Force -Path $runnerParent | Out-Null

if (Test-Path (Join-Path $RunnerRoot ".runner")) {
    Write-Host "Existing runner registration found at canonical path; preserving it."
} else {
    if (Test-Path $RunnerRoot) {
        $existing = @(Get-ChildItem -LiteralPath $RunnerRoot -Force -ErrorAction SilentlyContinue)
        if ($existing.Count -gt 0) {
            $backup = $RunnerRoot + ".pre-migration-" + (Get-Date -Format "yyyyMMdd-HHmmss")
            Move-Item -LiteralPath $RunnerRoot -Destination $backup
            Write-Host ("MOVED_PARTIAL_RUNNER_TO=" + $backup)
        }
    }

    New-Item -ItemType Directory -Force -Path $RunnerRoot | Out-Null

    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/actions/runner/releases/latest" -Headers @{ "User-Agent" = "MAGASIN-New-PC-Migration" }
    $asset = @($release.assets | Where-Object { $_.name -match '^actions-runner-win-x64-.*\.zip$' }) | Select-Object -First 1
    if (-not $asset) { throw "Could not find latest Windows x64 Actions Runner package." }

    $zip = Join-Path $env:TEMP $asset.name
    Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zip -UseBasicParsing

    if ($asset.digest -and ([string]$asset.digest).StartsWith("sha256:")) {
        $expected = ([string]$asset.digest).Substring(7).ToUpperInvariant()
        $actual = (Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToUpperInvariant()
        if ($expected -ne $actual) { throw "GitHub Actions Runner package SHA256 mismatch." }
        Write-Host "RUNNER_PACKAGE_SHA256_VERIFIED=True"
    }

    Expand-Archive -LiteralPath $zip -DestinationPath $RunnerRoot -Force

    $token = (& gh api --method POST "repos/$Repository/actions/runners/registration-token" --jq ".token")
    if ($LASTEXITCODE -ne 0 -or -not $token) {
        throw "Could not obtain runner registration token. Owner account must have repository Actions administration permission."
    }

    $runnerName = ("MAGASIN-" + $env:COMPUTERNAME + "-NEWPC").ToUpperInvariant()
    Push-Location $RunnerRoot
    try {
        & .\config.cmd --unattended --replace --url $repoUrl --token $token --name $runnerName --labels "magasin,new-pc" --work "_work"
        if ($LASTEXITCODE -ne 0) { throw "GitHub Actions Runner configuration failed." }
    } finally {
        $token = $null
        Pop-Location
    }
    Write-Host ("RUNNER_NAME=" + $runnerName)
    Write-Host "RUNNER_REGISTERED=True"
}

Write-Step "START RUNNER"
$listener = Get-CimInstance Win32_Process -Filter "Name='Runner.Listener.exe'" -ErrorAction SilentlyContinue |
    Where-Object {
        ($_.ExecutablePath -and $_.ExecutablePath -like "$RunnerRoot*") -or
        ($_.CommandLine -and $_.CommandLine -like "*$RunnerRoot*")
    } |
    Select-Object -First 1

if (-not $listener) {
    $cmd = 'cd /d "' + $RunnerRoot + '" && run.cmd'
    Start-Process -FilePath "cmd.exe" -ArgumentList @("/k", $cmd)
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 1
        $listener = Get-CimInstance Win32_Process -Filter "Name='Runner.Listener.exe'" -ErrorAction SilentlyContinue |
            Where-Object {
                ($_.ExecutablePath -and $_.ExecutablePath -like "$RunnerRoot*") -or
                ($_.CommandLine -and $_.CommandLine -like "*$RunnerRoot*")
            } |
            Select-Object -First 1
        if ($listener) { break }
    }
}

if (-not $listener) {
    throw "Runner did not become visible. Keep the runner Command Prompt open and rerun if needed."
}

Write-Host ("RUNNER_PID=" + $listener.ProcessId)
Write-Host "NEW_PC_RUNNER_ONLINE_LOCAL=True"
Write-Host "MAGASIN_NEW_PC_CONNECTION_READY=True"
Write-Host "OWNER_STOP_REMAINS_ACTIVE=True"
Write-Host "NEXT=Tell Brain: DA KET NOI MAY MOI. Brain can then verify the runner through GitHub and take over diagnostics/install verification."
