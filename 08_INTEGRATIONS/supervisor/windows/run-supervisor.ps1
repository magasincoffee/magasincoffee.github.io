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
$registryFile = Join-Path $root 'orchestration.json'
$runtimeStatusFile = Join-Path $root 'runtime-status.json'
$projectStateUrl = 'https://raw.githubusercontent.com/magasincoffee/magasincoffee.github.io/main/01_DOCS/MAGASIN/00_PROJECT_STATE.json'
$mutexName = 'Local\MAGASIN_BUSINESS_OS_SUPERVISOR'
$mutex = New-Object System.Threading.Mutex($false, $mutexName)
$ownsMutex = $false

try {
    try {
        $ownsMutex = $mutex.WaitOne(0, $false)
    } catch [System.Threading.AbandonedMutexException] {
        $ownsMutex = $true
    }

    if (-not $ownsMutex) {
        Write-Host 'Another MAGASIN Supervisor wrapper already owns the singleton mutex.'
        exit 0
    }
} catch {
    $mutex.Dispose()
    throw
}

function Get-DedicatedChromeProcesses {
    return @(Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -and $_.CommandLine -like "*$profile*" })
}

function Stop-DedicatedChrome {
    # Only terminate Chrome processes that explicitly use the dedicated
    # Supervisor profile. Never touch the Owner's normal Chrome profile.
    Get-DedicatedChromeProcesses | ForEach-Object {
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }
}

function Get-ExistingDedicatedCdpPort {
    foreach ($process in (Get-DedicatedChromeProcesses)) {
        if ($process.CommandLine -match '--remote-debugging-port=(\d+)') {
            return [int]$Matches[1]
        }
    }
    return $null
}

function Get-FreeCdpPort {
    foreach ($candidate in 9222..9232) {
        $listener = Get-NetTCPConnection -State Listen -LocalPort $candidate -ErrorAction SilentlyContinue |
            Select-Object -First 1
        if (-not $listener) { return $candidate }
    }
    throw 'No free Supervisor CDP port in range 9222-9232.'
}

function Test-DedicatedCdpEndpoint([int]$Port) {
    $listener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if (-not $listener) { return $false }

    $owner = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)" -ErrorAction SilentlyContinue
    if (
        -not $owner -or
        $owner.Name -ne 'chrome.exe' -or
        -not $owner.CommandLine -or
        $owner.CommandLine -notlike "*$profile*" -or
        $owner.CommandLine -notmatch ("--remote-debugging-port=" + $Port + "(\s|$)")
    ) {
        return $false
    }

    try {
        $version = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/json/version" -TimeoutSec 2
        return [bool]$version.webSocketDebuggerUrl
    } catch {
        return $false
    }
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
        $cdpPort = Get-ExistingDedicatedCdpPort
        if (-not $cdpPort) { $cdpPort = Get-FreeCdpPort }
        $cdpBaseUrl = "http://127.0.0.1:$cdpPort"
        $ready = Test-DedicatedCdpEndpoint -Port $cdpPort

        if (-not $ready) {
            Stop-DedicatedChrome
            Start-Sleep -Milliseconds 750
            $cdpPort = Get-FreeCdpPort
            $cdpBaseUrl = "http://127.0.0.1:$cdpPort"

            # Keep the real Supervisor Chrome UI available for CDP, but automatic
            # boot/recovery must not jump in front of the Owner.
            Start-Process -FilePath $chrome -WindowStyle Minimized -ArgumentList @(
                '--remote-debugging-address=127.0.0.1',
                "--remote-debugging-port=$cdpPort",
                ('--user-data-dir="' + $profile + '"'),
                '--no-first-run',
                '--no-default-browser-check',
                '--start-minimized',
                'https://chatgpt.com/'
            )

            for ($i = 0; $i -lt 30; $i++) {
                if (Test-Path $stop) { break }
                if (Test-DedicatedCdpEndpoint -Port $cdpPort) {
                    $ready = $true
                    break
                }
                Start-Sleep -Seconds 1
            }
        }

        if (-not $ready) {
            Start-Sleep -Seconds 5
            continue
        }

        $brainWorkerMode = $null
        try {
            $projectState = Invoke-RestMethod -Uri $projectStateUrl -TimeoutSec 4 -Headers @{ 'Cache-Control'='no-cache' }
            $brainWorkerMode = [bool](
                $projectState -and
                $projectState.supervisor_orchestration -and
                [string]$projectState.supervisor_orchestration.mode -eq 'BRAIN_WORKER_V1'
            )
        } catch {
            # A transient GitHub/raw fetch failure must never downgrade the
            # already-established Brain/Worker architecture to legacy mode.
            try {
                if (Test-Path $registryFile) {
                    $registry = Get-Content $registryFile -Raw -Encoding UTF8 | ConvertFrom-Json
                    if ([string]$registry.mode -eq 'BRAIN_WORKER_V1') {
                        $brainWorkerMode = $true
                    }
                }
            } catch {}

            if ($null -eq $brainWorkerMode) {
                try {
                    if (Test-Path $runtimeStatusFile) {
                        $runtimeStatus = Get-Content $runtimeStatusFile -Raw -Encoding UTF8 | ConvertFrom-Json
                        if ([string]$runtimeStatus.orchestration_mode -eq 'BRAIN_WORKER_V1') {
                            $brainWorkerMode = $true
                        }
                    }
                } catch {}
            }

            if ($null -eq $brainWorkerMode) {
                Write-Host 'Project state is temporarily unavailable; preserving Supervisor wrapper and retrying without mode downgrade.'
                Start-Sleep -Seconds 5
                continue
            }
        }

        $entryPoint = if ($brainWorkerMode) {
            'src/runtime/brain-worker-cli.mjs'
        } else {
            'src/runtime/supervisor-loop-cli.mjs'
        }

        if (-not $brainWorkerMode -and -not (Test-Path $target)) {
            Write-Host 'Legacy mode was explicitly selected but no legacy target exists; waiting for authoritative project state instead of terminating.'
            Start-Sleep -Seconds 5
            continue
        }

        Write-Host "Supervisor entry point: $entryPoint"

        Push-Location $runtime
        try {
            $nodeArgs = @($entryPoint, '--cdp-url', $cdpBaseUrl, '--poll-ms', '5000')
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

        if (-not (Test-Path $stop) -and $nodeExitCode -eq 76) {
            # Exit code 76 is an intentional autonomy pause. Do not keep an
            # automation browser open when source-of-truth says there is no
            # authorized work to execute.
            Write-Host 'Supervisor entered PAUSED autonomy; closing dedicated Chrome and stopping wrapper.'
            Stop-DedicatedChrome
            break
        }

        if (-not (Test-Path $stop)) {
            Start-Sleep -Seconds 3
        }
    }
} finally {
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    if ($ownsMutex) {
        try { $mutex.ReleaseMutex() } catch {}
    }
    $mutex.Dispose()
}
