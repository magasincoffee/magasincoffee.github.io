Set-StrictMode -Version 2.0

function Get-Rbt009OptionalProperty {
  param(
    [Parameter(Mandatory=$false)]$Object,
    [Parameter(Mandatory=$true)][string]$Name,
    $DefaultValue = $null
  )

  if ($null -eq $Object) { return $DefaultValue }
  $property = $Object.PSObject.Properties[$Name]
  if ($null -eq $property) { return $DefaultValue }
  if ($null -eq $property.Value) { return $DefaultValue }
  return $property.Value
}

function Read-Rbt009BoundedTextTail {
  param(
    [Parameter(Mandatory=$true)][string]$Path,
    [int]$MaxBytes = 262144
  )

  if ($MaxBytes -lt 4096) { throw "MaxBytes must be >= 4096" }

  $result = [ordered]@{
    file_length_bytes = 0L
    bytes_read = 0
    truncated_prefix = $false
    lines = @()
  }

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    return [pscustomobject]$result
  }

  $stream = $null
  try {
    $share = [System.IO.FileShare]::ReadWrite -bor [System.IO.FileShare]::Delete
    $stream = New-Object System.IO.FileStream(
      $Path,
      [System.IO.FileMode]::Open,
      [System.IO.FileAccess]::Read,
      $share
    )

    $length = [int64]$stream.Length
    $result.file_length_bytes = $length
    if ($length -le 0) {
      return [pscustomobject]$result
    }

    $start = [Math]::Max([int64]0, $length - [int64]$MaxBytes)
    $result.truncated_prefix = ($start -gt 0)
    [void]$stream.Seek($start, [System.IO.SeekOrigin]::Begin)

    $requested = [int][Math]::Min([int64]$MaxBytes, $length - $start)
    $buffer = New-Object byte[] $requested
    $offset = 0
    while ($offset -lt $requested) {
      $read = $stream.Read($buffer, $offset, $requested - $offset)
      if ($read -le 0) { break }
      $offset += $read
    }
    $result.bytes_read = $offset
    if ($offset -le 0) {
      return [pscustomobject]$result
    }

    $text = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $offset)
    $endsWithNewline = $text.EndsWith("`n")
    $parts = @($text -split "`n", -1)

    if ($result.truncated_prefix -and $parts.Count -gt 0) {
      if ($parts.Count -eq 1) {
        $parts = @()
      } else {
        $parts = @($parts[1..($parts.Count - 1)])
      }
    }

    if (-not $endsWithNewline -and $parts.Count -gt 0) {
      if ($parts.Count -eq 1) {
        $parts = @()
      } else {
        $parts = @($parts[0..($parts.Count - 2)])
      }
    } elseif ($endsWithNewline -and $parts.Count -gt 0 -and $parts[$parts.Count - 1] -eq "") {
      if ($parts.Count -eq 1) {
        $parts = @()
      } else {
        $parts = @($parts[0..($parts.Count - 2)])
      }
    }

    $clean = @()
    foreach ($line in $parts) {
      $clean += [string]$line.TrimEnd("`r")
    }
    $result.lines = $clean
    return [pscustomobject]$result
  } catch {
    # Monitoring tolerates concurrent rotate/delete/truncate. A later sample
    # observes the new file. Raw exception and event content are never emitted.
    return [pscustomobject]$result
  } finally {
    if ($null -ne $stream) { $stream.Dispose() }
  }
}

function Get-Rbt009SafeEventStats {
  param(
    [Parameter(Mandatory=$true)][string]$Path,
    [int]$MaxTailBytes = 262144
  )

  $tail = Read-Rbt009BoundedTextTail -Path $Path -MaxBytes $MaxTailBytes
  $result = [ordered]@{
    file_length_bytes = [int64]$tail.file_length_bytes
    tail_bytes_read = [int]$tail.bytes_read
    tail_line_count = 0
    error_recovery_tail = 0
    max_identical_error_recovery_tail = 0
  }

  $last = ""
  $run = 0
  $maxRun = 0

  foreach ($line in @($tail.lines)) {
    if ([string]::IsNullOrWhiteSpace([string]$line)) { continue }

    $event = $null
    try {
      $event = $line | ConvertFrom-Json -ErrorAction Stop
    } catch {
      continue
    }

    $type = [string](Get-Rbt009OptionalProperty -Object $event -Name "event_type" -DefaultValue "")
    if ([string]::IsNullOrWhiteSpace($type)) { continue }
    $result.tail_line_count++

    if ($type -ne "ERROR" -and $type -ne "RECOVERY") {
      $last = ""
      $run = 0
      continue
    }

    $reason = [string](Get-Rbt009OptionalProperty -Object $event -Name "reason_code" -DefaultValue "NONE")
    $lane = [string](Get-Rbt009OptionalProperty -Object $event -Name "lane_id" -DefaultValue "GLOBAL")
    if ([string]::IsNullOrWhiteSpace($reason)) { $reason = "NONE" }
    if ([string]::IsNullOrWhiteSpace($lane)) { $lane = "GLOBAL" }

    $signature = "$type|$reason|$lane"
    $result.error_recovery_tail++
    if ($signature -eq $last) {
      $run++
    } else {
      $last = $signature
      $run = 1
    }
    if ($run -gt $maxRun) { $maxRun = $run }
  }

  $result.max_identical_error_recovery_tail = $maxRun
  return [pscustomobject]$result
}
