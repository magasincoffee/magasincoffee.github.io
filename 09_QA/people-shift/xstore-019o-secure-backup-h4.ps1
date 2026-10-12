# XSTORE-019O pre-release production backup. Run on H4 only.
# CHECK mode has no network, credentials, data reads or writes.
# BACKUP mode is interactive and captures a DB-only archive, NOT a verified restore.
[CmdletBinding()]
param([switch]$Backup)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$project = 'menvbzlsncmpuvnaifxa'
$hostName = 'db.' + $project + '.supabase.co'
$bin = 'D:\MAGASIN_XSTORE_019K_PG17_20261010\postgresql\pgsql\bin'
$dump = Join-Path $bin 'pg_dump.exe'
$restore = Join-Path $bin 'pg_restore.exe'
if (!(Test-Path -LiteralPath $dump -PathType Leaf)) { throw 'BACKUP_BLOCKED: pg_dump is not installed in the approved H4 tool location.' }
if (!(Test-Path -LiteralPath $restore -PathType Leaf)) { throw 'BACKUP_BLOCKED: pg_restore is missing.' }
Write-Output ('PROJECT=' + $project)
Write-Output ('PG_DUMP_FOUND=' + (Test-Path -LiteralPath $dump))
Write-Output ('PG_RESTORE_FOUND=' + (Test-Path -LiteralPath $restore))
if (!$Backup) {
  Write-Output 'CHECK_ONLY=PASS_NO_DATABASE_ACCESS'
  Write-Output 'NEXT=Launch this script with -Backup in an interactive H4 PowerShell console. Never send a password in chat.'
  return
}
if (![Environment]::UserInteractive) { throw 'BACKUP_BLOCKED: interactive local H4 console required.' }
$free = (Get-PSDrive -Name D).Free
if ($free -lt 2GB) { throw 'BACKUP_BLOCKED: less than 2 GiB available on D.' }
$base = 'D:\MAGASIN_SECURE_BACKUPS\XSTORE_019O'
if (!(Test-Path -LiteralPath $base)) { New-Item -ItemType Directory -Path $base -Force | Out-Null }
$dir = Join-Path $base ('capture_' + (Get-Date -Format 'yyyyMMdd_HHmmss') + '_' + [guid]::NewGuid().ToString('N').Substring(0,8))
New-Item -ItemType Directory -Path $dir | Out-Null
$userSid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
& icacls.exe $dir /inheritance:r /grant:r ('*' + $userSid + ':(OI)(CI)F') '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'BACKUP_BLOCKED: could not lock down backup directory ACL.' }
$pgpass = Join-Path $dir 'pgpass.tmp'
$archive = Join-Path $dir ('magasin_noibo_before_xstore019o_' + (Get-Date -Format 'yyyyMMdd_HHmmss') + '.dump')
$oldPass = $env:PGPASSFILE
$oldSsl = $env:PGSSLMODE
$created = $false
try {
  Write-Output 'ENTER_DATABASE_PASSWORD_ON_H4_ONLY. It will not be printed or sent to chat.'
  $secret = Read-Host 'MAGASIN-NOIBO database password' -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
  try { $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
  if ([string]::IsNullOrEmpty($password)) { throw 'BACKUP_BLOCKED: empty password.' }
  $escapedPassword = $password.Replace('\','\\').Replace(':','\:')
  $password = $null
  [IO.File]::WriteAllText($pgpass, ($hostName + ':5432:postgres:postgres:' + $escapedPassword + [Environment]::NewLine), [Text.UTF8Encoding]::new($false))
  $escapedPassword = $null
  & icacls.exe $pgpass /inheritance:r /grant:r ('*' + $userSid + ':F') '*S-1-5-18:F' '*S-1-5-32-544:F' | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'BACKUP_BLOCKED: credential file ACL failed.' }
  $env:PGPASSFILE = $pgpass
  $env:PGSSLMODE = 'require'
  Write-Output 'CAPTURING_DATABASE_ARCHIVE_WITH_READ_ONLY_PG_DUMP'
  & $dump ('--host=' + $hostName) '--port=5432' '--username=postgres' '--dbname=postgres' '--format=custom' '--no-owner' '--no-acl' '--no-password' '--lock-wait-timeout=15s' ('--file=' + $archive)
  if ($LASTEXITCODE -ne 0) { throw ('BACKUP_FAILED: pg_dump returned exit ' + $LASTEXITCODE) }
  $created = $true
  if ((Get-Item -LiteralPath $archive).Length -lt 1000) { throw 'BACKUP_FAILED: unexpectedly small archive.' }
  & $restore '--list' $archive | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'BACKUP_FAILED: pg_restore cannot list the archive.' }
  $details = Get-Item -LiteralPath $archive
  $meta = [ordered]@{
    project_ref = $project
    target_host = $hostName
    captured_utc = (Get-Date).ToUniversalTime().ToString('o')
    size_bytes = $details.Length
    sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $archive).Hash
    archive_catalog_readable = $true
    restore_verified = $false
    production_migration_applied = $false
    scope = 'PostgreSQL database dump; Supabase Storage object payloads not included'
  }
  $manifest = Join-Path $dir 'manifest.json'
  [IO.File]::WriteAllText($manifest, ($meta | ConvertTo-Json -Depth 4), [Text.UTF8Encoding]::new($false))
  Write-Output ('ARCHIVE_CREATED=' + $archive)
  Write-Output ('ARCHIVE_BYTES=' + $details.Length)
  Write-Output ('SHA256=' + $meta.sha256)
  Write-Output 'BACKUP_CAPTURE=PASS; RESTORE_VERIFICATION=NOT_DONE; RELEASE_GATE=BLOCKED'
} catch {
  if (!$created -and (Test-Path -LiteralPath $archive)) { Remove-Item -LiteralPath $archive -Force }
  throw
} finally {
  if (Test-Path -LiteralPath $pgpass) { Remove-Item -LiteralPath $pgpass -Force }
  $env:PGPASSFILE = $oldPass
  $env:PGSSLMODE = $oldSsl
}
