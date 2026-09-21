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
    $stream = [System.IO.FileStream]::new(
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


function Get-Rbt009SafeEventDelta {
  param(
    [Parameter(Mandatory=$true)][string]$Path,
    [int64]$Offset = 0,
    [string]$PreviousSignature = "",
    [int]$PreviousRun = 0,
    [int]$MaxBytes = 262144
  )

  if ($MaxBytes -lt 4096) { throw "MaxBytes must be >= 4096" }
  if ($Offset -lt 0) { $Offset = 0 }
  if ($PreviousRun -lt 0) { $PreviousRun = 0 }

  $result = [ordered]@{
    file_length_bytes = 0L
    next_offset = [int64]$Offset
    bytes_read = 0
    complete_bytes_processed = 0
    event_count = 0
    error_recovery_count = 0
    max_identical_error_recovery_run = 0
    trailing_signature = [string]$PreviousSignature
    trailing_run = [int]$PreviousRun
    state_reset = $false
    overflow = $false
  }

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    if ($Offset -gt 0) {
      $result.next_offset = 0L
      $result.trailing_signature = ""
      $result.trailing_run = 0
      $result.state_reset = $true
    }
    return [pscustomobject]$result
  }

  $stream = $null
  try {
    $share = [System.IO.FileShare]::ReadWrite -bor [System.IO.FileShare]::Delete
    $stream = [System.IO.FileStream]::new(
      $Path,
      [System.IO.FileMode]::Open,
      [System.IO.FileAccess]::Read,
      $share
    )

    $length = [int64]$stream.Length
    $result.file_length_bytes = $length

    $effectiveOffset = [int64]$Offset
    if ($length -lt $effectiveOffset) {
      $effectiveOffset = 0L
      $result.next_offset = 0L
      $result.trailing_signature = ""
      $result.trailing_run = 0
      $result.state_reset = $true
    }

    $available = $length - $effectiveOffset
    if ($available -le 0) {
      $result.next_offset = $effectiveOffset
      return [pscustomobject]$result
    }

    if ($available -gt [int64]$MaxBytes) {
      $result.overflow = $true
    }

    $requested = [int][Math]::Min([int64]$MaxBytes, $available)
    [void]$stream.Seek($effectiveOffset, [System.IO.SeekOrigin]::Begin)
    $buffer = New-Object byte[] $requested
    $readTotal = 0
    while ($readTotal -lt $requested) {
      $read = $stream.Read($buffer, $readTotal, $requested - $readTotal)
      if ($read -le 0) { break }
      $readTotal += $read
    }
    $result.bytes_read = $readTotal
    if ($readTotal -le 0) {
      return [pscustomobject]$result
    }

    $lastNewline = -1
    for ($i = 0; $i -lt $readTotal; $i++) {
      if ($buffer[$i] -eq 10) { $lastNewline = $i }
    }
    if ($lastNewline -lt 0) {
      return [pscustomobject]$result
    }

    $completeBytes = $lastNewline + 1
    $result.complete_bytes_processed = $completeBytes
    $result.next_offset = $effectiveOffset + [int64]$completeBytes

    $text = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $completeBytes)
    $lines = @($text -split "`n")

    $lastSignature = [string]$result.trailing_signature
    $run = [int]$result.trailing_run
    $maxRun = [int]$run

    foreach ($lineRaw in $lines) {
      $line = [string]$lineRaw.TrimEnd("`r")
      if ([string]::IsNullOrWhiteSpace($line)) { continue }

      $event = $null
      try {
        $event = $line | ConvertFrom-Json -ErrorAction Stop
      } catch {
        continue
      }

      $type = [string](Get-Rbt009OptionalProperty -Object $event -Name "event_type" -DefaultValue "")
      if ([string]::IsNullOrWhiteSpace($type)) { continue }
      $result.event_count++

      if ($type -ne "ERROR" -and $type -ne "RECOVERY") {
        $lastSignature = ""
        $run = 0
        continue
      }

      $reason = [string](Get-Rbt009OptionalProperty -Object $event -Name "reason_code" -DefaultValue "NONE")
      $lane = [string](Get-Rbt009OptionalProperty -Object $event -Name "lane_id" -DefaultValue "GLOBAL")
      if ([string]::IsNullOrWhiteSpace($reason)) { $reason = "NONE" }
      if ([string]::IsNullOrWhiteSpace($lane)) { $lane = "GLOBAL" }

      $signature = "$type|$reason|$lane"
      $result.error_recovery_count++
      if ($signature -eq $lastSignature) {
        $run++
      } else {
        $lastSignature = $signature
        $run = 1
      }
      if ($run -gt $maxRun) { $maxRun = $run }
    }

    $result.max_identical_error_recovery_run = $maxRun
    $result.trailing_signature = $lastSignature
    $result.trailing_run = $run
    return [pscustomobject]$result
  } catch {
    # Concurrent rotate/delete/truncate is not a semantic Supervisor failure.
    # Keep the previous cursor/streak; a later bounded sample can retry.
    return [pscustomobject]$result
  } finally {
    if ($null -ne $stream) { $stream.Dispose() }
  }
}
