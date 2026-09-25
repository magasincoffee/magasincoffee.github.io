param(
    [string]$DestinationRoot = "D:\MAGASIN_MIGRATION\supervisor-state"
)

$ErrorActionPreference = 'Stop'

$root = Join-Path $env:LOCALAPPDATA 'MAGASIN\BusinessOS\supervisor'
$lanesPath = Join-Path $root 'lanes.json'

New-Item -ItemType Directory -Force -Path $DestinationRoot | Out-Null

if (-not (Test-Path $lanesPath)) {
    throw "Current lane config not found: $lanesPath"
}

$lanes = Get-Content -LiteralPath $lanesPath -Raw -Encoding UTF8 | ConvertFrom-Json
if ([string]$lanes.mode -ne 'THREE_LANE_V1') {
    throw 'Only THREE_LANE_V1 lane configuration is eligible for clean migration.'
}

foreach ($lane in @($lanes.lanes)) {
    # Migration is configuration transfer, never runtime continuation.
    # New machine always starts with all lanes disabled.
    $lane.enabled = $false
}

$exportLanes = Join-Path $DestinationRoot 'lanes.json'
$lanes | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $exportLanes -Encoding UTF8

$meta = [ordered]@{
    schema_version = 'magasin-new-pc-migration.v1'
    exported_at = [DateTimeOffset]::UtcNow.ToString('o')
    source_machine = $env:COMPUTERNAME
    source_user = $env:USERNAME
    source_mode = 'THREE_LANE_V1'
    carries_lane_names = $true
    carries_brain_work_urls = $true
    lanes_forced_disabled = $true
    browser_profile_included = $false
    cookies_included = $false
    auth_tokens_included = $false
    runtime_registry_included = $false
    in_flight_transactions_included = $false
    intended_restore = 'CONFIG_ONLY_CLEAN_START'
}
$metaPath = Join-Path $DestinationRoot 'migration-meta.json'
$meta | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $metaPath -Encoding UTF8

$hashes = @(
    [pscustomobject]@{
        File = 'lanes.json'
        SHA256 = (Get-FileHash -LiteralPath $exportLanes -Algorithm SHA256).Hash
    },
    [pscustomobject]@{
        File = 'migration-meta.json'
        SHA256 = (Get-FileHash -LiteralPath $metaPath -Algorithm SHA256).Hash
    }
)
$hashes | Export-Csv -LiteralPath (Join-Path $DestinationRoot 'SHA256SUMS.csv') -NoTypeInformation -Encoding UTF8

Write-Host ("MIGRATION_STATE_PATH=" + $DestinationRoot)
Write-Host 'LANES_FORCED_DISABLED=True'
Write-Host 'BROWSER_PROFILE_INCLUDED=False'
Write-Host 'AUTH_TOKENS_INCLUDED=False'
Write-Host 'RUNTIME_REGISTRY_INCLUDED=False'
Write-Host 'MIGRATION_STATE_EXPORT_COMPLETE=True'
