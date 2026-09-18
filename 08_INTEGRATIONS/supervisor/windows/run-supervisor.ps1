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

function Stop-DedicatedChrome {
    # Only terminate Chrome processes that explicitly use the dedicated
    # Supervisor profile. Never touch the Owner's normal Chrome profile.
    Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -and $_.CommandLine -like "*$profile*" } |
        ForEach-Object {
            Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
        }
}

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
            Stop-DedicatedChrome
            Start-Sleep -Milliseconds 750

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
            $nodeExitCode = $LASTEXITCODE
        } finally {
            Pop-Location
        }

        if (-not (Test-Path $stop) -and $nodeExitCode -eq 75) {
            # Exit code 75 is the Supervisor's explicit request for a clean CDP
            # recovery. Kill only the dedicated Supervisor Chrome profile even
            # when /json/version still answers, then let the outer gate relaunch it.
            Write-Host 'Supervisor requested dedicated Chrome restart after repeated CDP failures.'
            Stop-DedicatedChrome
            Start-Sleep -Milliseconds 750
            continue
        }

        if (-not (Test-Path $stop)) {
            Start-Sleep -Seconds 3
        }
    }
} finally {
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}
