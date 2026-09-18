$ErrorActionPreference = 'Stop'

$root = Join-Path $env:LOCALAPPDATA 'MAGASIN\BusinessOS\supervisor'
$profile = Join-Path $root 'browser_profile'
$targetFile = Join-Path $root 'target.json'
$orchestrationFile = Join-Path $root 'orchestration.json'

function Resolve-ChromeExecutable {
    $candidates = @(
        (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
        $(if (${env:ProgramFiles(x86)}) { Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe' }),
        (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe')
    ) | Where-Object { $_ -and (Test-Path $_) }

    return $candidates | Select-Object -First 1
}

function Get-DedicatedChromeProcesses {
    return @(Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -and $_.CommandLine -like "*$profile*" })
}

function Get-FreeCdpPort {
    foreach ($candidate in 9222..9232) {
        $listener = Get-NetTCPConnection -State Listen -LocalPort $candidate -ErrorAction SilentlyContinue |
            Select-Object -First 1
        if (-not $listener) { return $candidate }
    }
    throw 'No free Supervisor CDP port in range 9222-9232.'
}

function Resolve-TargetUrl {
    # Brain/Worker V17: Owner-facing ChatGPT Robot always opens the one Brain
    # conversation. Worker targets are intentionally not exposed by this launcher.
    if (Test-Path $orchestrationFile) {
        try {
            $orchestration = Get-Content $orchestrationFile -Raw -Encoding UTF8 | ConvertFrom-Json
            $brain = $orchestration.brain.target
            if ($brain.origin -eq 'https://chatgpt.com' -and [string]$brain.pathname -match '^/(c|g|project)/') {
                return "$($brain.origin)$($brain.pathname)"
            }
        } catch {}
    }

    # Compatibility fallback for the legacy single-conversation runtime.
    if (Test-Path $targetFile) {
        try {
            $target = Get-Content $targetFile -Raw -Encoding UTF8 | ConvertFrom-Json
            if ($target.origin -eq 'https://chatgpt.com' -and [string]$target.pathname -match '^/(c|g|project)/') {
                return "$($target.origin)$($target.pathname)"
            }
        } catch {}
    }

    return 'https://chatgpt.com/'
}

$chrome = Resolve-ChromeExecutable
if (-not $chrome) {
    throw 'Google Chrome executable was not found.'
}

New-Item -ItemType Directory -Force -Path $profile | Out-Null
$url = Resolve-TargetUrl
$existing = Get-DedicatedChromeProcesses | Select-Object -First 1

if ($existing) {
    # Reuse the same authenticated Supervisor profile so Owner and Robot share
    # one ChatGPT workspace. Chrome forwards this URL to the existing instance.
    Start-Process -FilePath $chrome -ArgumentList @(
        ('--user-data-dir="' + $profile + '"'),
        $url
    )
    exit 0
}

$port = Get-FreeCdpPort
Start-Process -FilePath $chrome -ArgumentList @(
    '--remote-debugging-address=127.0.0.1',
    "--remote-debugging-port=$port",
    ('--user-data-dir="' + $profile + '"'),
    '--no-first-run',
    '--no-default-browser-check',
    $url
)
