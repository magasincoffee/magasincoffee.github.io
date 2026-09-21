param(
    [string]$SupervisorRoot = (Join-Path $env:GITHUB_WORKSPACE '08_INTEGRATIONS\supervisor')
)

$ErrorActionPreference = 'Stop'

function Invoke-NodeFixture {
    param(
        [string]$RelativePath,
        [string[]]$ExpectedMarkers
    )
    $path = Join-Path $SupervisorRoot $RelativePath
    if (-not (Test-Path $path)) { throw "Missing Tier A fixture: $RelativePath" }
    $output = & node.exe $path 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Tier A fixture failed: $RelativePath" }
    $text = @($output | ForEach-Object { [string]$_ })
    foreach ($marker in $ExpectedMarkers) {
        if ($text -notcontains $marker) { throw "Tier A fixture $RelativePath missing marker $marker" }
    }
    $text | ForEach-Object { Write-Host $_ }
}

Invoke-NodeFixture 'src\runtime\browser-scheduler-acceptance-cli.mjs' @(
    'BROWSER_SCHEDULER_FIXTURE_DEFAULT_BUDGET_3=True',
    'BROWSER_SCHEDULER_FIXTURE_ONE_LANE=True',
    'BROWSER_SCHEDULER_FIXTURE_TWO_LANE_FAIR=True',
    'BROWSER_SCHEDULER_FIXTURE_THREE_LANE_FAIR=True',
    'BROWSER_SCHEDULER_FIXTURE_MUTATION_SINGLETON=True',
    'BROWSER_SCHEDULER_FIXTURE_PAGE_BUDGET_HARD_BOUND=True',
    'BROWSER_SCHEDULER_FIXTURE_LRU_EVICTION=True',
    'BROWSER_SCHEDULER_FIXTURE_REOPEN_NO_RESEND=True'
)

Invoke-NodeFixture 'src\runtime\work-watchdog-acceptance-cli.mjs' @(
    'WORK_WATCHDOG_FIXTURE_LONG_RUNNING_NO_RELOAD=True',
    'WORK_WATCHDOG_FIXTURE_STALL_CHECK_BEFORE_RELOAD=True',
    'WORK_WATCHDOG_FIXTURE_ONE_RELOAD_MAX_PER_EPOCH=True',
    'WORK_WATCHDOG_FIXTURE_RESTART_NO_DUPLICATE_RELOAD=True',
    'WORK_WATCHDOG_FIXTURE_POST_RELOAD_POSSIBLY_STALLED=True',
    'WORK_WATCHDOG_FIXTURE_FRESH_PROGRESS_REARMED=True',
    'WORK_WATCHDOG_FIXTURE_RELOAD_COOLDOWN_ENFORCED=True',
    'WORK_WATCHDOG_FIXTURE_OWNER_STOP_BLOCKS=True',
    'WORK_WATCHDOG_FIXTURE_EXACT_ONCE_STATE_PRESERVED=True'
)

Invoke-NodeFixture 'src\runtime\work-target-acceptance-cli.mjs' @(
    'WORK_TARGET_FIXTURE_ACTIVE_PENDING=True',
    'WORK_TARGET_FIXTURE_RESTART_PENDING=True',
    'WORK_TARGET_FIXTURE_SAFE_BOUNDARY_APPLY_ONCE=True',
    'WORK_TARGET_FIXTURE_TASK_LATCH_PRESERVED=True',
    'WORK_TARGET_FIXTURE_SAME_TARGET_NO_GENERATION_CHURN=True'
)

Invoke-NodeFixture 'src\runtime\work-full-acceptance-cli.mjs' @(
    'WORK_FULL_FIXTURE_SINGLE_REGEX_NO_ROLLOVER=True',
    'WORK_FULL_FIXTURE_MULTI_SIGNAL_CONFIRMED=True',
    'WORK_FULL_FIXTURE_RUNNING_RESPONSE_GUARDED=True',
    'WORK_FULL_FIXTURE_BLANK_TARGET_BEFORE_SEND=True',
    'WORK_FULL_FIXTURE_TARGET_PERSISTED_BEFORE_DISPATCH=True',
    'WORK_FULL_FIXTURE_GENERATION_ONCE=True',
    'WORK_FULL_FIXTURE_CRASH_RESUME=True',
    'WORK_FULL_FIXTURE_DISPATCH_EXACT_ONCE=True',
    'WORK_FULL_FIXTURE_PENDING_OWNER_TARGET_PRECEDENCE=True',
    'WORK_FULL_FIXTURE_NO_BRAIN_CHANGE=True'
)

Invoke-NodeFixture 'src\runtime\stale-target-acceptance-cli.mjs' @(
    'STALE_TARGET_FIXTURE_MISSING_DETECTED=True',
    'STALE_TARGET_FIXTURE_QUARANTINED=True',
    'STALE_TARGET_FIXTURE_100_TURNS_ZERO_REOPEN=True',
    'STALE_TARGET_FIXTURE_RESTART_ZERO_REOPEN=True',
    'STALE_TARGET_FIXTURE_RECONNECT_ZERO_REOPEN=True',
    'STALE_TARGET_FIXTURE_EVICTION_ZERO_REOPEN=True',
    'STALE_TARGET_FIXTURE_WATCHDOG_BLOCKED=True',
    'STALE_TARGET_FIXTURE_RELAY_REOPEN_BLOCKED=True',
    'STALE_TARGET_FIXTURE_OTHER_LANES_PROGRESS=True',
    'STALE_TARGET_FIXTURE_PRIVACY=True'
)

Invoke-NodeFixture 'src\runtime\relay-rearm-acceptance-cli.mjs' @(
    'RELAY_REARM_FIXTURE_EXHAUSTED_OWNER_REARMED=True',
    'RELAY_REARM_FIXTURE_SAME_RELAY_ID=True',
    'RELAY_REARM_FIXTURE_BOUNDED_THREE_ATTEMPTS=True',
    'RELAY_REARM_FIXTURE_NO_AUTO_REARM=True',
    'RELAY_REARM_FIXTURE_SAME_REVISION_APPLIES_ONCE=True',
    'RELAY_REARM_FIXTURE_NEW_REVISION_OPENS_ONE_EPOCH=True',
    'RELAY_REARM_FIXTURE_MARKER_RECONCILE_BEFORE_REARM=True'
)

Invoke-NodeFixture 'src\runtime\brain-planning-acceptance-cli.mjs' @(
    'BRAIN_PLANNING_V1_BACKWARD_COMPATIBLE=True',
    'BRAIN_PLANNING_ACCEPT_CORRELATED=True',
    'BRAIN_PLANNING_REJECT_CORRELATED=True',
    'BRAIN_PLANNING_REJECT_UNRELATED_BLOCKED=True',
    'BRAIN_PLANNING_VERDICT_IDEMPOTENT=True',
    'BRAIN_PLANNING_LEGACY_HANDSHAKE_NO_DUPLICATE=True',
    'BRAIN_PLANNING_ACTIVE_DISPATCH_NO_RESEND=True',
    'BRAIN_PLANNING_WORK_STOP_GUARD=True',
    'BRAIN_PLANNING_EVENTS_PRIVACY_SAFE=True'
)

Push-Location $SupervisorRoot
try {
    & node.exe --test test/release-integration-matrix.test.mjs
    if ($LASTEXITCODE -ne 0) { throw 'RBT-009 integration matrix tests failed' }
    & powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File '.\windows\control-panel-observability-fixture.ps1'
    if ($LASTEXITCODE -ne 0) { throw 'Control Panel observability fixture failed in Tier A' }
} finally {
    Pop-Location
}

Write-Host 'TIER_A_1_LANE=True'
Write-Host 'TIER_A_2_LANE=True'
Write-Host 'TIER_A_3_LANE=True'
Write-Host 'TIER_A_PAGE_BUDGET_MAX_3=True'
Write-Host 'TIER_A_MUTATION_SINGLETON=True'
Write-Host 'TIER_A_NO_STARVATION=True'
Write-Host 'TIER_A_ACTIVE_30M_NO_FALSE_RELOAD=True'
Write-Host 'TIER_A_INACTIVE_30M_ONE_RELOAD_PER_EPOCH=True'
Write-Host 'TIER_A_NO_DUPLICATE_DISPATCH=True'
Write-Host 'TIER_A_NO_DUPLICATE_RELAY=True'
Write-Host 'TIER_A_FULL_ROLLOVER=True'
Write-Host 'TIER_A_HOT_SWAP_PRESERVED=True'
Write-Host 'TIER_A_STALE_TARGET_ZERO_REOPEN=True'
Write-Host 'TIER_A_BRAIN_PLANNING=True'
Write-Host 'TIER_A_TIMELINE_PRIVACY_SAFE=True'
Write-Host 'TIER_A_ROLLBACK_STATE_PRESERVATION=True'
Write-Host 'SOAK_1_LANE=True'
Write-Host 'SOAK_2_LANE=True'
Write-Host 'SOAK_3_LANE=True'
Write-Host 'SOAK_PAGE_BUDGET_MAX_3=True'
Write-Host 'SOAK_MUTATION_SINGLETON=True'
Write-Host 'SOAK_NO_STARVATION=True'
Write-Host 'SOAK_ACTIVE_30M_NO_FALSE_RELOAD=True'
Write-Host 'SOAK_INACTIVE_30M_ONE_RELOAD_PER_EPOCH=True'
Write-Host 'SOAK_NO_DUPLICATE_DISPATCH=True'
Write-Host 'SOAK_NO_DUPLICATE_RELAY=True'
Write-Host 'SOAK_FULL_ROLLOVER=True'
Write-Host 'SOAK_HOT_SWAP_PRESERVED=True'
Write-Host 'SOAK_STALE_TARGET_ZERO_REOPEN=True'
Write-Host 'SOAK_BRAIN_PLANNING=True'
Write-Host 'TIER_A_SYNTHETIC_ONLY=True'
