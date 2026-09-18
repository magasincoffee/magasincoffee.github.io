param(
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$root = Join-Path $env:LOCALAPPDATA 'MAGASIN\BusinessOS\supervisor'
$runtime = Join-Path $root 'runtime'
$profile = Join-Path $root 'browser_profile'
$target = Join-Path $root 'target.json'
$stop = Join-Path $root 'STOP'
$pidFile = Join-Path $root 'supervisor.pid'

if (-not (Test-Path $target)) {
    throw "Supervisor target is missing: $target"
}

Remove-Item $stop -Force -ErrorAction SilentlyContinue
Set-Content -Path $pidFile -Value $PID -Encoding ascii

try {
    $chromeCandidates = @(
        "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
        "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
    )
    $chrome = $chromeCandidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
    if (-not $chrome) { throw 'Installed Google Chrome not found.' }

    while (-not (Test-Path $stop)) {
        $ready = $false
        try {
            $null = Invoke-RestMethod -Uri 'http://127.0.0.1:9222/json/version' -TimeoutSec 2
            $ready = $true
        } catch {}

        if (-not $ready) {
            Start-Process -FilePath $chrome -ArgumentList @(
                '--remote-debugging-address=127.0.0.1',
                '--remote-debugging-port=9222',
                "--user-data-dir=$profile",
                '--no-first-run',
                '--no-default-browser-check',
                'https://chatgpt.com/'
            )

            for ($i = 0; $i -lt 30; $i++) {
                if (Test-Path $stop) { break }
                try {
                    $null = Invoke-RestMethod -Uri 'http://127.0.0.1:9222/json/version' -TimeoutSec 2
                    $ready = $true
                    break
                } catch {
                    Start-Sleep -Seconds 1
                }
            }
        }

        if (-not $ready) {
            Start-Sleep -Seconds 5
            continue
        }

        Push-Location $runtime
        try {
            $nodeArgs = @('src/runtime/supervisor-loop-cli.mjs', '--cdp-url', 'http://127.0.0.1:9222', '--poll-ms', '5000')
            if (-not $DryRun) { $nodeArgs += '--execute' }
            & node @nodeArgs
        } finally {
            Pop-Location
        }

        if (-not (Test-Path $stop)) {
            Start-Sleep -Seconds 3
        }
    }
} finally {
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}
