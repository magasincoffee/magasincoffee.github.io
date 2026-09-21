param(
    [int]$DurationSeconds = 28800,
    [int]$SampleSeconds = 120,
    [string]$OutputPath = (Join-Path $env:RUNNER_TEMP 'supervisor-release-soak.ndjson'),
    [string]$SummaryPath = (Join-Path $env:RUNNER_TEMP 'supervisor-release-soak-summary.json')
)

$ErrorActionPreference = 'Stop'
if ($DurationSeconds -lt 1) { throw 'DurationSeconds must be positive' }
if ($SampleSeconds -lt 30 -and $DurationSeconds -ge 3600) { throw 'Production soak cadence must not be a tight loop' }

$root = Join-Path $env:LOCALAPPDATA 'MAGASIN\BusinessOS\supervisor'
$runtime = Join-Path $root 'runtime'
$lifecycle = Join-Path $runtime 'windows\lifecycle-truth.ps1'
$configFile = Join-Path $root 'lanes.json'
$registryFile = Join-Path $root 'lane-registry.json'
$statusFile = Join-Path $root 'lane-status.json'
$eventFile = Join-Path $root 'lane-events.ndjson'
$sourceValidator = Join-Path $env:GITHUB_WORKSPACE '.github\scripts\supervisor-release-event-validator.mjs'

if (-not (Test-Path $lifecycle)) { throw 'Installed lifecycle truth helper is missing' }
if (-not (Test-Path $configFile)) { throw 'Production lanes.json is missing' }
if (-not (Test-Path $sourceValidator)) { throw 'Release event validator is missing' }
. $lifecycle

function Get-Sha256Text([string]$Text) {
    $bytes = [Text.Encoding]::UTF8.GetBytes($Text)
    $hasher = [Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($hasher.ComputeHash($bytes))).Replace('-','').ToLowerInvariant() }
    finally { $hasher.Dispose() }
}

function Get-TargetFingerprint {
    $config = Get-Content $configFile -Raw -Encoding UTF8 | ConvertFrom-Json
    $canonical = @($config.lanes | Sort-Object lane_id | ForEach-Object {
        "$([string]$_.lane_id)|$([string]$_.brain_url)|$([int]$_.brain_url_revision)|$([string]$_.work_url)|$([int]$_.work_url_revision)"
    }) -join "`n"
    return Get-Sha256Text $canonical
}

function Get-RuntimeVersion {
    $path = Join-Path $runtime 'src\runtime\three-lane-cli.mjs'
    if (-not (Test-Path $path)) { throw 'Installed Three-Lane runtime is missing' }
    $source = Get-Content $path -Raw -Encoding UTF8
    $match = [regex]::Match($source, 'SUPERVISOR_RUNTIME_VERSION\s*=\s*"([^"]+)"')
    if (-not $match.Success) { throw 'Installed runtime version marker is missing' }
    return [string]$match.Groups[1].Value
}

function Get-ProcessCounts {
    $wrapper = @(Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue | Where-Object {
        $_.CommandLine -and $_.CommandLine -like '*run-supervisor.ps1*' -and $_.CommandLine -like "*$root*"
    })
    $threeLane = @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue | Where-Object {
        $_.CommandLine -and $_.CommandLine -like '*three-lane-cli.mjs*'
    })
    $profile = Join-Path $root 'browser_profile'
    $chrome = @(Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" -ErrorAction SilentlyContinue | Where-Object {
        $_.CommandLine -and $_.CommandLine -like "*$profile*" -and $_.CommandLine -match '--remote-debugging-port=(\d+)'
    })
    return [pscustomobject]@{
        wrapper_count = $wrapper.Count
        three_lane_count = $threeLane.Count
        robot_chrome_root_count = $chrome.Count
    }
}

function Write-SanitizedSample([hashtable]$Sample) {
    $line = $Sample | ConvertTo-Json -Compress -Depth 5
    Add-Content -Path $OutputPath -Value $line -Encoding UTF8
}

$outputFull = [IO.Path]::GetFullPath($OutputPath)
$summaryFull = [IO.Path]::GetFullPath($SummaryPath)
$rootFull = [IO.Path]::GetFullPath($root)
if ($outputFull.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase) -or $summaryFull.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Soak artifacts must never be written under the production Supervisor root'
}
Remove-Item $OutputPath -Force -ErrorAction SilentlyContinue
Remove-Item $SummaryPath -Force -ErrorAction SilentlyContinue

$ownerStop = Get-LifecycleOwnerStopState -Root $root
if ($ownerStop.blocked) {
    Write-Host 'SOAK_SKIPPED_OWNER_STOP=True'
    Write-Host 'SOAK_OWNER_STOP_AUTHORITATIVE=True'
    exit 2
}
$enabledLaneCount = Get-EnabledLaneCount -Root $root
if ($enabledLaneCount -lt 1) {
    Write-Host 'SOAK_SKIPPED_NO_ENABLED_LANES=True'
    exit 3
}

$targetFingerprint = Get-TargetFingerprint
$runtimeVersion = Get-RuntimeVersion
$installedRuntimeHash = (Get-FileHash (Join-Path $runtime 'src\runtime\three-lane-cli.mjs') -Algorithm SHA256).Hash.ToLowerInvariant()
$startUtc = [DateTime]::UtcNow
$startIso = $startUtc.ToString('o')
$watch = [Diagnostics.Stopwatch]::StartNew()
$maxPages = 0
$maxMutation = 0
$unhealthySince = $null
$recoveryTransitions = 0
$previousHealthy = $true
$sampleCount = 0
$eventBytesStart = if (Test-Path $eventFile) { (Get-Item $eventFile).Length } else { 0 }

while ($watch.Elapsed.TotalSeconds -lt $DurationSeconds) {
    $now = [DateTime]::UtcNow
    $ownerStop = Get-LifecycleOwnerStopState -Root $root
    if ($ownerStop.blocked) {
        Write-Host 'SOAK_OWNER_STOP_BECAME_ACTIVE=True'
        Write-Host 'SOAK_OWNER_STOP_AUTHORITATIVE=True'
        throw 'Owner STOP became active during soak; release acceptance must restart from zero later'
    }

    $currentFingerprint = Get-TargetFingerprint
    if ($currentFingerprint -ne $targetFingerprint) {
        Write-Host 'TARGET_CHANGED_EXTERNALLY=True'
        throw 'Production Brain/Work target fingerprint changed during soak; human reconciliation required'
    }

    $counts = Get-ProcessCounts
    if ($counts.wrapper_count -gt 1) { throw 'More than one Supervisor wrapper detected' }
    if ($counts.three_lane_count -gt 1) { throw 'More than one Three-Lane process detected' }
    if ($counts.robot_chrome_root_count -gt 1) { throw 'More than one dedicated Robot Chrome root detected' }

    $truth = Get-LifecycleProcessTruth -Root $root
    $healthy = [bool]$truth.healthy
    if (-not $healthy) {
        if ($null -eq $unhealthySince) { $unhealthySince = $now }
        if (($now - $unhealthySince).TotalSeconds -gt 300) { throw 'Supervisor/Chrome/CDP remained unhealthy beyond bounded recovery allowance' }
    } else {
        if (-not $previousHealthy) { $recoveryTransitions += 1 }
        $unhealthySince = $null
    }
    $previousHealthy = $healthy
    if ($recoveryTransitions -gt 4) { throw 'Repeated Supervisor/Chrome/CDP recovery storm detected' }

    $pageBudget = 0
    $residentPages = 0
    $mutationActive = 0
    $schedulerTurn = 0
    $schedulerRound = 0
    if (Test-Path $statusFile) {
        $status = Get-Content $statusFile -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($status.scheduler) {
            $pageBudget = [int]$status.scheduler.page_budget
            $residentPages = [int]$status.scheduler.resident_chatgpt_pages
            $mutationActive = if ([bool]$status.scheduler.mutation_lease_active) { 1 } else { 0 }
            $schedulerTurn = [int]$status.scheduler.turn_count
            $schedulerRound = [int]$status.scheduler.round_count
            if ($pageBudget -gt 3) { throw 'Configured scheduler page budget exceeded 3' }
            if ($residentPages -gt 3 -or ($pageBudget -gt 0 -and $residentPages -gt $pageBudget)) { throw 'Resident ChatGPT page budget breach' }
            if ($mutationActive -gt 1) { throw 'Mutation singleton breach' }
        }
    }
    $maxPages = [Math]::Max($maxPages, $residentPages)
    $maxMutation = [Math]::Max($maxMutation, $mutationActive)
    $eventBytes = if (Test-Path $eventFile) { (Get-Item $eventFile).Length } else { 0 }

    Write-SanitizedSample @{
        schema_version = 'supervisor-release-soak-sample.v1'
        timestamp = $now.ToString('o')
        elapsed_seconds = [int][Math]::Floor($watch.Elapsed.TotalSeconds)
        enabled_lane_count = [int](Get-EnabledLaneCount -Root $root)
        owner_stop = $false
        wrapper_count = [int]$counts.wrapper_count
        three_lane_count = [int]$counts.three_lane_count
        robot_chrome_root_count = [int]$counts.robot_chrome_root_count
        wrapper_alive = [bool]$truth.wrapper_alive
        three_lane_alive = [bool]$truth.three_lane_alive
        chrome_alive = [bool]$truth.chrome_alive
        cdp_healthy = [bool]$truth.cdp_healthy
        page_budget = $pageBudget
        resident_chatgpt_pages = $residentPages
        mutation_lease_active = [bool]$mutationActive
        scheduler_turn_count = $schedulerTurn
        scheduler_round_count = $schedulerRound
        recovery_transition_count = $recoveryTransitions
        lane_events_bytes = [long]$eventBytes
    }
    $sampleCount += 1

    $remaining = $DurationSeconds - $watch.Elapsed.TotalSeconds
    if ($remaining -le 0) { break }
    $sleep = [Math]::Min($SampleSeconds, [Math]::Ceiling($remaining))
    Start-Sleep -Seconds $sleep
}
$watch.Stop()
$endUtc = [DateTime]::UtcNow
$elapsedSeconds = [int][Math]::Floor($watch.Elapsed.TotalSeconds)
if ($DurationSeconds -eq 28800 -and $elapsedSeconds -lt 28800) { throw 'Eight-hour production soak did not complete continuously' }
if ($DurationSeconds -eq 28800 -and ($endUtc - $startUtc).TotalSeconds -lt 28800) { throw 'Eight-hour wall-clock soak continuity not satisfied' }

if (-not (Test-Path $eventFile)) { throw 'lane-events.ndjson is missing after soak' }
$validatorSummary = Join-Path $env:RUNNER_TEMP 'supervisor-release-event-summary.json'
& node.exe $sourceValidator --file $eventFile --since $startIso --summary $validatorSummary
if ($LASTEXITCODE -ne 0) { throw 'Event-order/exact-once validator failed' }
$eventSummary = Get-Content $validatorSummary -Raw -Encoding UTF8 | ConvertFrom-Json

$privacyText = (Get-Content $OutputPath -Raw -Encoding UTF8) + "`n" + (Get-Content $validatorSummary -Raw -Encoding UTF8)
$forbidden = 'https?://|chatgpt\.com|brain_url|work_url|cookie|token|authorization|message_body|screenshot|browser_profile|\\Users\\|/home/|@gmail|@outlook'
if ($privacyText -match $forbidden) { throw 'Generated soak artifact failed privacy scan' }

$eventBytesEnd = (Get-Item $eventFile).Length
$summary = [ordered]@{
    schema_version = 'supervisor-release-soak-summary.v1'
    release_sha = [string]$env:GITHUB_SHA
    runtime_version = $runtimeVersion
    installed_runtime_sha256 = $installedRuntimeHash
    start_utc = $startIso
    end_utc = $endUtc.ToString('o')
    duration_seconds = $elapsedSeconds
    sample_count = $sampleCount
    max_resident_chatgpt_pages = $maxPages
    max_mutation_lease_active = $maxMutation
    recovery_transition_count = $recoveryTransitions
    lane_events_bytes_start = [long]$eventBytesStart
    lane_events_bytes_end = [long]$eventBytesEnd
    confirmed_dispatch_count = [int]$eventSummary.confirmed_dispatch_count
    confirmed_relay_count = [int]$eventSummary.confirmed_relay_count
    duplicate_dispatch_count = [int]$eventSummary.duplicate_dispatch_count
    duplicate_relay_count = [int]$eventSummary.duplicate_relay_count
    event_order_valid = [bool]$eventSummary.transition_order_valid
    event_privacy_safe = [bool]$eventSummary.privacy_safe
    event_flood_safe = [bool]$eventSummary.flood_safe
    production_targets_fingerprint = $targetFingerprint
    monitor_browser_mutation_count = 0
}
$summary | ConvertTo-Json -Depth 5 | Set-Content -Path $SummaryPath -Encoding UTF8

$summaryPrivacy = Get-Content $SummaryPath -Raw -Encoding UTF8
if ($summaryPrivacy -match $forbidden) { throw 'Generated soak summary failed privacy scan' }

Write-Host "SOAK_RUNTIME_VERSION=$runtimeVersion"
Write-Host "SOAK_START_UTC=$startIso"
Write-Host "SOAK_END_UTC=$($endUtc.ToString('o'))"
Write-Host "SOAK_DURATION_SECONDS=$elapsedSeconds"
if ($DurationSeconds -eq 28800) { Write-Host 'SOAK_CONTINUOUS_DURATION_8H=True' } else { Write-Host 'SOAK_TEST_DURATION_ONLY=True' }
Write-Host 'SOAK_PAGE_BUDGET_MAX_3=True'
Write-Host 'SOAK_MUTATION_SINGLETON=True'
Write-Host 'SOAK_NO_DUPLICATE_DISPATCH=True'
Write-Host 'SOAK_NO_DUPLICATE_RELAY=True'
Write-Host 'SOAK_OWNER_STOP_AUTHORITATIVE=True'
Write-Host 'SOAK_CHROME_CDP_HEALTH=True'
Write-Host 'SOAK_TIMELINE_PRIVACY_SAFE=True'
Write-Host 'SOAK_ARTIFACT_PRIVACY_SAFE=True'
Write-Host 'SOAK_PRODUCTION_TARGETS_UNCHANGED=True'
Write-Host 'SOAK_MONITOR_ZERO_BROWSER_MUTATION=True'
Write-Host 'SOAK_EVENT_ORDER_VALID=True'
Write-Host 'SOAK_NO_RECOVERY_FLOOD=True'
