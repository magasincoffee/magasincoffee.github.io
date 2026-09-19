Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'

$root = Join-Path $env:LOCALAPPDATA 'MAGASIN\BusinessOS\supervisor'
$runtime = Join-Path $root 'runtime'
$pidFile = Join-Path $root 'supervisor.pid'
$statusFile = Join-Path $root 'runtime-status.json'
$registryFile = Join-Path $root 'orchestration.json'
$logFile = Join-Path $root 'supervisor.log'
$ownerResolvedFile = Join-Path $root 'OWNER_RESOLVED.request.json'
$brainRebindFile = Join-Path $root 'BRAIN_REBIND.request.json'
$workerRetryFile = Join-Path $root 'WORKER_RETRY.request.json'
$diagnosticsRoot = Join-Path $root 'diagnostics'
$startScript = Join-Path $runtime 'windows\start-supervisor.ps1'
$stopScript = Join-Path $runtime 'windows\stop-supervisor.ps1'
$openChatScript = Join-Path $runtime 'windows\open-supervisor-chat.ps1'
$projectStateUrl = 'https://raw.githubusercontent.com/magasincoffee/magasincoffee.github.io/main/01_DOCS/MAGASIN/00_PROJECT_STATE.json'
$repoUrl = 'https://github.com/magasincoffee/magasincoffee.github.io'
$runnerRoot = 'C:\actions-runner-business\actions-runner'
$runnerCmd = Join-Path $runnerRoot 'run.cmd'

function Get-GitHubRunnerProcess {
    return Get-CimInstance Win32_Process -Filter "Name='Runner.Listener.exe'" -ErrorAction SilentlyContinue |
        Where-Object {
            ($_.ExecutablePath -and $_.ExecutablePath -like "$runnerRoot*") -or
            ($_.CommandLine -and $_.CommandLine -like "*$runnerRoot*")
        } |
        Select-Object -First 1
}

function Ensure-GitHubRunner {
    param([switch]$Interactive)

    $existing = Get-GitHubRunnerProcess
    if ($existing) { return $true }

    if (-not (Test-Path $runnerCmd)) {
        if ($Interactive) {
            [Windows.Forms.MessageBox]::Show(
                "Không tìm thấy GitHub Runner: $runnerCmd",
                'MAGASIN Business OS',
                'OK',
                'Error'
            ) | Out-Null
        }
        return $false
    }

    $runnerCommand = 'title MAGASIN-BUSINESS-PC RUNNER - KEEP OPEN && cd /d "' + $runnerRoot + '" && call run.cmd'
    Start-Process -FilePath 'cmd.exe' -WorkingDirectory $runnerRoot -ArgumentList @('/k', $runnerCommand)

    for ($i = 0; $i -lt 16; $i++) {
        Start-Sleep -Milliseconds 500
        if (Get-GitHubRunnerProcess) { return $true }
    }

    if ($Interactive) {
        [Windows.Forms.MessageBox]::Show(
            'GitHub Runner chưa ONLINE. Kiểm tra cửa sổ MAGASIN-BUSINESS-PC RUNNER - KEEP OPEN.',
            'MAGASIN Business OS',
            'OK',
            'Warning'
        ) | Out-Null
    }
    return $false
}

function Get-SupervisorProcess {
    if (-not (Test-Path $pidFile)) { return $null }
    $value = Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $value) { return $null }
    return Get-Process -Id $value -ErrorAction SilentlyContinue
}

function Read-JsonFile([string]$Path) {
    if (-not (Test-Path $Path)) { return $null }
    try {
        return Get-Content $Path -Raw -Encoding UTF8 | ConvertFrom-Json
    } catch {
        return $null
    }
}

function Read-ProjectState {
    try {
        return Invoke-RestMethod -Uri $projectStateUrl -TimeoutSec 4 -Headers @{ 'Cache-Control'='no-cache' }
    } catch {
        return $null
    }
}

$vietnamTimeZone = [TimeZoneInfo]::FindSystemTimeZoneById('SE Asia Standard Time')

function Convert-ToVietnamTime([DateTimeOffset]$Value) {
    return [TimeZoneInfo]::ConvertTime($Value, $vietnamTimeZone)
}

function Format-Time([string]$Value) {
    if (-not $Value) { return '—' }
    try {
        $dt = [DateTimeOffset]::Parse($Value)
        $age = [math]::Max(0, [int]([DateTimeOffset]::UtcNow - $dt.ToUniversalTime()).TotalSeconds)
        $vn = Convert-ToVietnamTime $dt
        return "$($vn.ToString('dd/MM/yyyy HH:mm:ss')) giờ Việt Nam  •  $age giây trước"
    } catch {
        return $Value
    }
}

function Format-VietnamClock([DateTimeOffset]$Value) {
    return (Convert-ToVietnamTime $Value).ToString('dd/MM/yyyy HH:mm')
}

function Get-FriendlyReason([string]$Reason) {
    if (-not $Reason) { return 'Robot đang theo dõi công việc và sẽ tự tiếp tục khi đủ điều kiện.' }
    if ($Reason -match 'target mismatch') { return 'Robot mất liên kết với cuộc trò chuyện Bộ não và đang chờ gắn lại đúng cuộc trò chuyện.' }
    if ($Reason -match 'conflicting uncertain prior send outcome|uncertain prior create/send outcome') { return 'Một công việc bị gián đoạn lúc gửi lệnh. Robot đang giữ an toàn để không gửi trùng.' }
    if ($Reason -match 'fetch failed|project state fetch|temporarily unavailable') { return 'Robot đang thử kết nối lại dữ liệu dự án.' }
    if ($Reason -match 'missing MAGASIN_BRAIN_DIRECTIVE_V1 block') { return 'Robot đang chờ phản hồi Bộ não hoàn chỉnh.' }
    if ($Reason -match 'Target page, context or browser has been closed') { return 'Robot đang nối lại trình duyệt làm việc.' }
    return 'Robot đang xử lý theo quy trình an toàn.'
}

function Get-TaskDisplayText($State) {
    if (-not $State -or -not $State.current_task) { return '—' }
    switch ([string]$State.current_task) {
        'TASK-049' { return 'TASK-049 — Nâng cấp Robot điều phối nhiều cuộc trò chuyện' }
        'TASK-048' { return 'TASK-048 — Hoàn tất kiểm tra tự động ban đêm' }
        default {
            if ($State.current_task_title) {
                return "$($State.current_task) — $($State.current_task_title)"
            }
            return [string]$State.current_task
        }
    }
}

function Tail-SafeLog {
    if (-not (Test-Path $logFile)) { return 'Chưa có nhật ký.' }
    try {
        $allLines = @(Get-Content $logFile -Tail 160 -Encoding UTF8)
        if (-not $allLines) { return 'Chưa có nhật ký.' }

        $bootIndex = -1
        for ($i = 0; $i -lt $allLines.Count; $i++) {
            if ($allLines[$i] -match '"type":"RUNTIME_BOOT"') {
                $bootIndex = $i
            }
        }

        $lines = if ($bootIndex -ge 0) {
            @($allLines | Select-Object -Skip $bootIndex | Select-Object -Last 28)
        } else {
            @($allLines | Select-Object -Last 28)
        }

        $out = foreach ($line in $lines) {
            try {
                $e = $line | ConvertFrom-Json
                $parts = @($e.timestamp, $e.type)
                if ($e.action) { $parts += "action=$($e.action)" }
                if ($e.target) { $parts += "target=$($e.target)" }
                if ($null -ne $e.executed) { $parts += "executed=$($e.executed)" }
                if ($e.reason) { $parts += "reason=$($e.reason)" }
                if ($e.errorName) { $parts += "error=$($e.errorName)" }
                if ($e.errorCause) { $parts += "cause=$($e.errorCause)" }
                $parts -join ' | '
            } catch {
                $line
            }
        }
        return ($out -join [Environment]::NewLine)
    } catch {
        return "Không đọc được log: $($_.Exception.Message)"
    }
}

function Set-StatusCard($Panel, $Label, [string]$State, [string]$Text) {
    $palette = @{
        'OFFLINE' = @([Drawing.Color]::FromArgb(254,226,226), [Drawing.Color]::FromArgb(153,27,27))
        'STARTING' = @([Drawing.Color]::FromArgb(219,234,254), [Drawing.Color]::FromArgb(29,78,216))
        'READY' = @([Drawing.Color]::FromArgb(220,252,231), [Drawing.Color]::FromArgb(22,101,52))
        'RUNNING' = @([Drawing.Color]::FromArgb(219,234,254), [Drawing.Color]::FromArgb(29,78,216))
        'RETRYING' = @([Drawing.Color]::FromArgb(255,237,213), [Drawing.Color]::FromArgb(154,52,18))
        'RECOVERING' = @([Drawing.Color]::FromArgb(224,242,254), [Drawing.Color]::FromArgb(3,105,161))
        'ROLLOVER' = @([Drawing.Color]::FromArgb(237,233,254), [Drawing.Color]::FromArgb(91,33,182))
        'WAIT_USER' = @([Drawing.Color]::FromArgb(254,249,195), [Drawing.Color]::FromArgb(133,77,14))
        'PAUSED' = @([Drawing.Color]::FromArgb(241,245,249), [Drawing.Color]::FromArgb(71,85,105))
        'ERROR' = @([Drawing.Color]::FromArgb(254,226,226), [Drawing.Color]::FromArgb(153,27,27))
        'DONE' = @([Drawing.Color]::FromArgb(220,252,231), [Drawing.Color]::FromArgb(22,101,52))
        'STOPPED' = @([Drawing.Color]::FromArgb(241,245,249), [Drawing.Color]::FromArgb(71,85,105))
    }
    $pair = if ($palette.ContainsKey($State)) { $palette[$State] } else { $palette['STOPPED'] }
    $Panel.BackColor = $pair[0]
    $Label.BackColor = $pair[0]
    $Label.ForeColor = $pair[1]
    $Label.Text = $Text
}

function Add-KeyValueRow($Parent, [int]$Y, [string]$Key) {
    $keyLabel = New-Object Windows.Forms.Label
    $keyLabel.Text = $Key
    $keyLabel.Location = New-Object Drawing.Point(20, $Y)
    $keyLabel.Size = New-Object Drawing.Size(155, 24)
    $keyLabel.Font = New-Object Drawing.Font('Segoe UI Semibold', 9)
    $keyLabel.ForeColor = [Drawing.Color]::FromArgb(100,116,139)
    $Parent.Controls.Add($keyLabel)

    $valueLabel = New-Object Windows.Forms.Label
    $valueLabel.Text = '—'
    $valueLabel.Location = New-Object Drawing.Point(180, $Y)
    $valueLabel.Size = New-Object Drawing.Size(745, 44)
    $valueLabel.Font = New-Object Drawing.Font('Segoe UI', 10)
    $valueLabel.ForeColor = [Drawing.Color]::FromArgb(15,23,42)
    $Parent.Controls.Add($valueLabel)
    return $valueLabel
}

$form = New-Object Windows.Forms.Form
$form.Text = 'MAGASIN BUSINESS OS — BẢNG ĐIỀU KHIỂN ROBOT'
$form.Size = New-Object Drawing.Size(1040, 820)
$form.MinimumSize = New-Object Drawing.Size(900, 700)
$form.StartPosition = 'CenterScreen'
$form.BackColor = [Drawing.Color]::FromArgb(248,250,252)
$form.Font = New-Object Drawing.Font('Segoe UI', 10)

$title = New-Object Windows.Forms.Label
$title.Text = 'MAGASIN BUSINESS OS'
$title.Location = New-Object Drawing.Point(28, 22)
$title.Size = New-Object Drawing.Size(520, 42)
$title.Font = New-Object Drawing.Font('Segoe UI Semibold', 22)
$title.ForeColor = [Drawing.Color]::FromArgb(15,23,42)
$form.Controls.Add($title)

$subtitle = New-Object Windows.Forms.Label
$subtitle.Text = 'ROBOT ĐIỀU PHỐI  •  Chủ hệ thống ↔ ChatGPT ↔ Dự án'
$subtitle.Location = New-Object Drawing.Point(590, 32)
$subtitle.Size = New-Object Drawing.Size(410, 28)
$subtitle.TextAlign = 'MiddleRight'
$subtitle.ForeColor = [Drawing.Color]::FromArgb(100,116,139)
$form.Controls.Add($subtitle)

$controls = New-Object Windows.Forms.Panel
$controls.Location = New-Object Drawing.Point(28, 78)
$controls.Size = New-Object Drawing.Size(964, 88)
$controls.BackColor = [Drawing.Color]::White
$controls.BorderStyle = 'FixedSingle'
$form.Controls.Add($controls)

$startButton = New-Object Windows.Forms.Button
$startButton.Text = '▶  BẮT ĐẦU ROBOT'
$startButton.Location = New-Object Drawing.Point(18, 18)
$startButton.Size = New-Object Drawing.Size(230, 50)
$startButton.Font = New-Object Drawing.Font('Segoe UI Semibold', 13)
$controls.Controls.Add($startButton)

$stopButton = New-Object Windows.Forms.Button
$stopButton.Text = '■  DỪNG ROBOT'
$stopButton.Location = New-Object Drawing.Point(260, 18)
$stopButton.Size = New-Object Drawing.Size(150, 50)
$stopButton.Font = New-Object Drawing.Font('Segoe UI Semibold', 11)
$controls.Controls.Add($stopButton)

$runnerButton = New-Object Windows.Forms.Button
$runnerButton.Text = '▶  KẾT NỐI GITHUB'
$runnerButton.Location = New-Object Drawing.Point(420, 18)
$runnerButton.Size = New-Object Drawing.Size(170, 50)
$runnerButton.Font = New-Object Drawing.Font('Segoe UI Semibold', 9.5)
$controls.Controls.Add($runnerButton)

$chatButton = New-Object Windows.Forms.Button
$chatButton.Text = 'MỞ CỬA SỔ ROBOT'
$chatButton.Location = New-Object Drawing.Point(602, 21)
$chatButton.Size = New-Object Drawing.Size(145, 42)
$controls.Controls.Add($chatButton)

$repoButton = New-Object Windows.Forms.Button
$repoButton.Text = 'MỞ DỰ ÁN'
$repoButton.Location = New-Object Drawing.Point(758, 21)
$repoButton.Size = New-Object Drawing.Size(178, 42)
$controls.Controls.Add($repoButton)

$robotCard = New-Object Windows.Forms.Panel
$robotCard.Location = New-Object Drawing.Point(28, 182)
$robotCard.Size = New-Object Drawing.Size(470, 92)
$robotCard.BorderStyle = 'FixedSingle'
$form.Controls.Add($robotCard)

$robotCaption = New-Object Windows.Forms.Label
$robotCaption.Text = 'TRẠNG THÁI ROBOT'
$robotCaption.Location = New-Object Drawing.Point(18, 14)
$robotCaption.Size = New-Object Drawing.Size(200, 22)
$robotCaption.Font = New-Object Drawing.Font('Segoe UI Semibold', 9)
$robotCard.Controls.Add($robotCaption)

$robotValue = New-Object Windows.Forms.Label
$robotValue.Text = 'ĐANG KIỂM TRA…'
$robotValue.Location = New-Object Drawing.Point(18, 42)
$robotValue.Size = New-Object Drawing.Size(430, 34)
$robotValue.Font = New-Object Drawing.Font('Segoe UI Semibold', 16)
$robotCard.Controls.Add($robotValue)

$projectCard = New-Object Windows.Forms.Panel
$projectCard.Location = New-Object Drawing.Point(512, 182)
$projectCard.Size = New-Object Drawing.Size(480, 92)
$projectCard.BorderStyle = 'FixedSingle'
$form.Controls.Add($projectCard)

$projectCaption = New-Object Windows.Forms.Label
$projectCaption.Text = 'TRẠNG THÁI DỰ ÁN'
$projectCaption.Location = New-Object Drawing.Point(18, 14)
$projectCaption.Size = New-Object Drawing.Size(200, 22)
$projectCaption.Font = New-Object Drawing.Font('Segoe UI Semibold', 9)
$projectCard.Controls.Add($projectCaption)

$projectValue = New-Object Windows.Forms.Label
$projectValue.Text = 'ĐANG KIỂM TRA…'
$projectValue.Location = New-Object Drawing.Point(18, 42)
$projectValue.Size = New-Object Drawing.Size(440, 34)
$projectValue.Font = New-Object Drawing.Font('Segoe UI Semibold', 16)
$projectCard.Controls.Add($projectValue)

$details = New-Object Windows.Forms.Panel
$details.Location = New-Object Drawing.Point(28, 292)
$details.Size = New-Object Drawing.Size(964, 286)
$details.BackColor = [Drawing.Color]::White
$details.BorderStyle = 'FixedSingle'
$form.Controls.Add($details)

$currentTaskValue = Add-KeyValueRow $details 18 'CÔNG VIỆC HIỆN TẠI'
$nextTaskValue = Add-KeyValueRow $details 65 'CÔNG VIỆC TIẾP THEO'
$currentActionValue = Add-KeyValueRow $details 112 'HOẠT ĐỘNG HIỆN TẠI'
$nextActionValue = Add-KeyValueRow $details 159 'BƯỚC TIẾP THEO'
$heartbeatValue = Add-KeyValueRow $details 206 'CẬP NHẬT GẦN NHẤT'
$autonomyValue = Add-KeyValueRow $details 247 'CHẾ ĐỘ TỰ ĐỘNG'

$errorPanel = New-Object Windows.Forms.Panel
$errorPanel.Location = New-Object Drawing.Point(28, 594)
$errorPanel.Size = New-Object Drawing.Size(964, 82)
$errorPanel.BackColor = [Drawing.Color]::FromArgb(255,247,237)
$errorPanel.BorderStyle = 'FixedSingle'
$form.Controls.Add($errorPanel)

$errorCaption = New-Object Windows.Forms.Label
$errorCaption.Text = 'THÔNG BÁO / CẦN BẠN XỬ LÝ'
$errorCaption.Location = New-Object Drawing.Point(16, 10)
$errorCaption.Size = New-Object Drawing.Size(220, 20)
$errorCaption.Font = New-Object Drawing.Font('Segoe UI Semibold', 9)
$errorCaption.ForeColor = [Drawing.Color]::FromArgb(154,52,18)
$errorPanel.Controls.Add($errorCaption)

$errorValue = New-Object Windows.Forms.Label
$errorValue.Text = 'Không có lỗi.'
$errorValue.Location = New-Object Drawing.Point(16, 31)
$errorValue.Size = New-Object Drawing.Size(440, 44)
$errorValue.ForeColor = [Drawing.Color]::FromArgb(124,45,18)
$errorPanel.Controls.Add($errorValue)

$ownerResolvedButton = New-Object Windows.Forms.Button
$ownerResolvedButton.Text = '✓  ĐÃ XỬ LÝ — KIỂM TRA LẠI'
$ownerResolvedButton.Location = New-Object Drawing.Point(468, 18)
$ownerResolvedButton.Size = New-Object Drawing.Size(300, 40)
$ownerResolvedButton.Font = New-Object Drawing.Font('Segoe UI Semibold', 9)
$ownerResolvedButton.BackColor = [Drawing.Color]::FromArgb(254,249,195)
$ownerResolvedButton.ForeColor = [Drawing.Color]::FromArgb(133,77,14)
$ownerResolvedButton.Enabled = $false
$errorPanel.Controls.Add($ownerResolvedButton)

$brainRebindButton = New-Object Windows.Forms.Button
$brainRebindButton.Text = 'DÙNG CHAT ĐANG MỞ LÀM BỘ NÃO'
$brainRebindButton.Location = New-Object Drawing.Point(468, 18)
$brainRebindButton.Size = New-Object Drawing.Size(300, 40)
$brainRebindButton.Font = New-Object Drawing.Font('Segoe UI Semibold', 9)
$brainRebindButton.BackColor = [Drawing.Color]::FromArgb(219,234,254)
$brainRebindButton.ForeColor = [Drawing.Color]::FromArgb(29,78,216)
$brainRebindButton.Visible = $false
$errorPanel.Controls.Add($brainRebindButton)

$workerRetryButton = New-Object Windows.Forms.Button
$workerRetryButton.Text = 'TIẾP TỤC CÔNG VIỆC BỊ KẸT'
$workerRetryButton.Location = New-Object Drawing.Point(468, 18)
$workerRetryButton.Size = New-Object Drawing.Size(300, 40)
$workerRetryButton.Font = New-Object Drawing.Font('Segoe UI Semibold', 9)
$workerRetryButton.BackColor = [Drawing.Color]::FromArgb(219,234,254)
$workerRetryButton.ForeColor = [Drawing.Color]::FromArgb(29,78,216)
$workerRetryButton.Visible = $false
$errorPanel.Controls.Add($workerRetryButton)

$autoRecoveryButton = New-Object Windows.Forms.Button
$autoRecoveryButton.Text = 'ROBOT ĐANG TỰ KHÔI PHỤC'
$autoRecoveryButton.Location = New-Object Drawing.Point(468, 18)
$autoRecoveryButton.Size = New-Object Drawing.Size(300, 40)
$autoRecoveryButton.Font = New-Object Drawing.Font('Segoe UI Semibold', 9)
$autoRecoveryButton.BackColor = [Drawing.Color]::FromArgb(224,242,254)
$autoRecoveryButton.ForeColor = [Drawing.Color]::FromArgb(3,105,161)
$autoRecoveryButton.Enabled = $false
$autoRecoveryButton.Visible = $false
$errorPanel.Controls.Add($autoRecoveryButton)

$diagnosticsButton = New-Object Windows.Forms.Button
$diagnosticsButton.Text = 'MỞ NHẬT KÝ LỖI'
$diagnosticsButton.Location = New-Object Drawing.Point(780, 18)
$diagnosticsButton.Size = New-Object Drawing.Size(165, 40)
$diagnosticsButton.Font = New-Object Drawing.Font('Segoe UI Semibold', 9)
$errorPanel.Controls.Add($diagnosticsButton)

$logBox = New-Object Windows.Forms.TextBox
$logBox.Location = New-Object Drawing.Point(28, 688)
$logBox.Size = New-Object Drawing.Size(964, 84)
$logBox.Multiline = $true
$logBox.ReadOnly = $true
$logBox.ScrollBars = 'Vertical'
$logBox.Font = New-Object Drawing.Font('Consolas', 8.5)
$logBox.BackColor = [Drawing.Color]::FromArgb(15,23,42)
$logBox.ForeColor = [Drawing.Color]::FromArgb(226,232,240)
$form.Controls.Add($logBox)

$script:lastRemoteState = $null
$script:lastRemoteFetch = [DateTime]::MinValue

function Refresh-ControlPanel {
    $process = Get-SupervisorProcess
    $runnerProcess = Get-GitHubRunnerProcess
    $runtimeStatus = Read-JsonFile $statusFile
    $registry = Read-JsonFile $registryFile

    $runtimeRunningIds = @()
    if ($runtimeStatus -and $runtimeStatus.worker_running) {
        $runtimeRunningIds = @($runtimeStatus.worker_running | ForEach-Object { [string]$_ })
    }
    $runningWorkers = @()
    if ($registry -and $registry.workers -and $runtimeRunningIds.Count -gt 0) {
        foreach ($property in $registry.workers.PSObject.Properties) {
            $worker = $property.Value
            if ($runtimeRunningIds -contains [string]$worker.worker_id) {
                $runningWorkers += $worker
            }
        }
    }

    if ($runnerProcess) {
        $runnerButton.Text = '✓  KẾT NỐI GITHUB: ĐANG HOẠT ĐỘNG'
        $runnerButton.BackColor = [Drawing.Color]::FromArgb(220,252,231)
        $runnerButton.ForeColor = [Drawing.Color]::FromArgb(22,101,52)
    } else {
        $runnerButton.Text = '▶  KẾT NỐI GITHUB'
        $runnerButton.BackColor = [Drawing.Color]::FromArgb(255,247,237)
        $runnerButton.ForeColor = [Drawing.Color]::FromArgb(154,52,18)
    }

    if (((Get-Date) - $script:lastRemoteFetch).TotalSeconds -ge 10 -or -not $script:lastRemoteState) {
        $script:lastRemoteState = Read-ProjectState
        $script:lastRemoteFetch = Get-Date
    }

    # Runtime status is authoritative only while the Supervisor process is alive.
    # When OFFLINE, prefer repository source-of-truth so stale local status cannot
    # keep showing an already-completed task.
    $projectState = if ($process -and $runtimeStatus -and $runtimeStatus.current_task) {
        $runtimeStatus
    } elseif ($script:lastRemoteState) {
        $script:lastRemoteState
    } else {
        $runtimeStatus
    }

    $projectAutonomy = if ($script:lastRemoteState -and $script:lastRemoteState.autonomy) {
        [string]$script:lastRemoteState.autonomy
    } elseif ($projectState -and $projectState.autonomy) {
        [string]$projectState.autonomy
    } else {
        ''
    }
    $pauseResumeAt = if (
        $script:lastRemoteState -and
        $script:lastRemoteState.night_run -and
        $script:lastRemoteState.night_run.temporal_gate -and
        $script:lastRemoteState.night_run.temporal_gate.resume_at
    ) {
        [string]$script:lastRemoteState.night_run.temporal_gate.resume_at
    } else {
        ''
    }
    $pauseLabel = if ($pauseResumeAt) {
        try {
            $pauseAt = [DateTimeOffset]::Parse($pauseResumeAt)
            "TẠM DỪNG • CHỜ ĐẾN $(Format-VietnamClock $pauseAt)"
        } catch {
            'TẠM DỪNG • CHỜ MỐC ĐÃ DUYỆT'
        }
    } else {
        'TẠM DỪNG • CHỜ MỐC ĐÃ DUYỆT'
    }

    if ($process) {
        $state = if ($runtimeStatus.status) { [string]$runtimeStatus.status } else { 'STARTING' }
        $activationPending = @()
        if ($projectState -and $projectState.activation_boundary_pending) {
            $activationPending = @($projectState.activation_boundary_pending)
        } elseif ($projectState -and $projectState.activation_boundary -and $projectState.activation_boundary.pending) {
            $activationPending = @($projectState.activation_boundary.pending)
        }
        $ownerPending = @()
        if ($projectState -and $projectState.owner_boundary_pending) {
            $ownerPending = @($projectState.owner_boundary_pending)
        } elseif ($projectState -and $projectState.owner_boundary -and $projectState.owner_boundary.pending) {
            $ownerPending = @($projectState.owner_boundary.pending)
        }

        $robotText = if ($state -eq 'PAUSED') {
            $pauseLabel
        } elseif ($state -eq 'RECOVERING' -or $state -eq 'RETRYING' -or $state -eq 'ROLLOVER') {
            'ĐANG TỰ KHÔI PHỤC'
        } elseif ($runningWorkers.Count -gt 0) {
            $firstWorker = $runningWorkers | Select-Object -First 1
            $moreWorkers = [math]::Max(0, $runningWorkers.Count - 1)
            $suffix = if ($moreWorkers -gt 0) { "  •  +$moreWorkers Worker" } else { '' }
            "ĐANG LÀM VIỆC  •  $($firstWorker.worker_id)  •  $($firstWorker.task_id)$suffix"
        } elseif ($state -eq 'WAIT_USER') {
            if ($ownerPending.Count -gt 0) { 'ĐANG CHỜ BẠN • CẦN QUYẾT ĐỊNH' }
            elseif ($activationPending.Count -gt 0) { 'ĐANG CHỜ BẠN • CẦN CẤU HÌNH' }
            else { 'ĐANG CHỜ BẠN' }
        } elseif ($state -eq 'READY') {
            'SẴN SÀNG'
        } elseif ($state -eq 'RUNNING') {
            'ĐANG ĐIỀU PHỐI'
        } elseif ($state -eq 'STARTING') {
            'ĐANG KHỞI ĐỘNG'
        } elseif ($state -eq 'ERROR') {
            'CÓ LỖI'
        } elseif ($state -eq 'DONE') {
            'HOÀN TẤT'
        } else {
            'ĐANG HOẠT ĐỘNG'
        }
        Set-StatusCard $robotCard $robotValue $state $robotText
        $startButton.Enabled = $false
        $stopButton.Enabled = $true
    } else {
        if ($projectAutonomy -eq 'PAUSED') {
            Set-StatusCard $robotCard $robotValue 'PAUSED' $pauseLabel
            $startButton.Enabled = $false
        } else {
            Set-StatusCard $robotCard $robotValue 'OFFLINE' 'ĐANG TẮT'
            $startButton.Enabled = $true
        }
        $stopButton.Enabled = $false
    }

    $projectStatus = if ($process -and $runtimeStatus.project_status) {
        [string]$runtimeStatus.project_status
    } elseif ($script:lastRemoteState -and $script:lastRemoteState.status) {
        [string]$script:lastRemoteState.status
    } elseif ($projectState.status) {
        [string]$projectState.status
    } else {
        'UNKNOWN'
    }
    $projectText = if ($projectAutonomy -eq 'PAUSED') {
        $pauseLabel
    } elseif ($projectStatus -eq 'READY') {
        'SẴN SÀNG • TỰ ĐỘNG TIẾP TỤC'
    } elseif ($projectStatus -eq 'WAIT_USER') {
        'ĐANG CHỜ BẠN'
    } elseif ($projectStatus -eq 'BLOCKED') {
        'ĐANG BỊ CHẶN'
    } else {
        'ĐANG HOẠT ĐỘNG'
    }
    $projectCardState = if ($projectAutonomy -eq 'PAUSED') {
        'PAUSED'
    } elseif ($projectStatus -eq 'WAIT_USER') {
        'WAIT_USER'
    } elseif ($projectStatus -eq 'BLOCKED') {
        'ERROR'
    } else {
        'READY'
    }
    Set-StatusCard $projectCard $projectValue $projectCardState $projectText

    $ownerBoundaryActive = (
        $projectStatus -eq 'WAIT_USER' -and
        -not $projectState.blocked
    )
    $targetMismatchActive = [bool](
        $runtimeStatus -and
        [string]$runtimeStatus.status -eq 'WAIT_USER' -and
        [string]$runtimeStatus.decision_reason -match 'target mismatch'
    )
    $uncertainWorkerActive = [bool](
        $runtimeStatus -and
        [string]$runtimeStatus.status -eq 'WAIT_USER' -and
        [string]$runtimeStatus.decision_reason -match 'uncertain prior create/send outcome'
    )
    $autoRecoveryActive = [bool](
        $runtimeStatus -and
        [string]$runtimeStatus.status -eq 'WAIT_USER' -and
        [string]$runtimeStatus.decision_reason -match 'missing MAGASIN_BRAIN_DIRECTIVE_V1 block|Target page, context or browser has been closed'
    )
    $brainRebindButton.Visible = $targetMismatchActive
    $workerRetryButton.Visible = $uncertainWorkerActive
    $autoRecoveryButton.Visible = $autoRecoveryActive
    $ownerResolvedButton.Visible = -not ($targetMismatchActive -or $uncertainWorkerActive -or $autoRecoveryActive)
    $ownerResolvedButton.Enabled = [bool]$ownerBoundaryActive
    if (Test-Path $ownerResolvedFile) {
        $ownerResolvedButton.Text = '✓  ĐÃ NHẬN — ĐANG KIỂM TRA'
        $ownerResolvedButton.Enabled = $false
    } else {
        $ownerResolvedButton.Text = '✓  ĐÃ XỬ LÝ — KIỂM TRA LẠI'
    }

    if ($targetMismatchActive) {
        $errorValue.Text = 'Robot mất liên kết với cuộc trò chuyện Bộ não. Mở đúng cuộc trò chuyện Bộ não trong Chrome Robot rồi bấm DÙNG CHAT ĐANG MỞ LÀM BỘ NÃO.'
    }

    $currentTask = Get-TaskDisplayText $projectState
    $nextTask = if ($projectState.next_task) { [string]$projectState.next_task } else { '—' }

    $currentTaskValue.Text = $currentTask
    $nextTaskValue.Text = $nextTask

    if ($runningWorkers.Count -gt 0) {
        $workerDescriptions = @($runningWorkers | ForEach-Object {
            "$($_.worker_id) đang xử lý $($_.task_id)"
        })
        $currentActionValue.Text = $workerDescriptions -join '  •  '
    } elseif ($runtimeStatus.status -in @('RECOVERING','RETRYING','ROLLOVER')) {
        $currentActionValue.Text = 'Robot đang tự khôi phục để tiếp tục công việc.'
    } elseif ($runtimeStatus.status -eq 'WAIT_USER') {
        $currentActionValue.Text = 'Robot đang chờ bạn xử lý một điều kiện an toàn.'
    } elseif ($process) {
        $currentActionValue.Text = 'Robot đang theo dõi Bộ não và điều phối công việc.'
    } else {
        $currentActionValue.Text = 'Robot đang tắt.'
    }

    $reasonText = if ($runtimeStatus.recovery_reason) {
        [string]$runtimeStatus.recovery_reason
    } elseif ($runtimeStatus.decision_reason) {
        [string]$runtimeStatus.decision_reason
    } else {
        ''
    }
    $nextActionValue.Text = Get-FriendlyReason $reasonText
    $heartbeatValue.Text = if ($process -and $runtimeStatus.updated_at) {
        Format-Time ([string]$runtimeStatus.updated_at)
    } elseif ($projectState.last_updated) {
        "Dữ liệu dự án • $($projectState.last_updated)"
    } elseif ($runtimeStatus.updated_at) {
        "Dữ liệu Robot cũ • $(Format-Time ([string]$runtimeStatus.updated_at))"
    } else {
        'Chưa có trạng thái Robot.'
    }
    $autonomyValue.Text = if ($projectAutonomy -eq 'AUTO_CONTINUE') {
        'TỰ ĐỘNG TIẾP TỤC'
    } elseif ($projectAutonomy -eq 'PAUSED') {
        'TẠM DỪNG'
    } elseif ($projectAutonomy) {
        'ĐANG ÁP DỤNG CHẾ ĐỘ AN TOÀN'
    } else {
        '—'
    }

    if ($targetMismatchActive) {
        $errorValue.Text = 'Robot mất liên kết với cuộc trò chuyện Bộ não. Mở đúng cuộc trò chuyện Bộ não trong Chrome Robot rồi bấm DÙNG CHAT ĐANG MỞ LÀM BỘ NÃO.'
    } elseif ($uncertainWorkerActive) {
        $errorValue.Text = 'Một công việc bị gián đoạn đúng lúc gửi lệnh. Robot sẽ không tự gửi trùng. Bấm TIẾP TỤC CÔNG VIỆC BỊ KẸT để cho phép thử lại đúng một lần.'
    } elseif ($autoRecoveryActive) {
        $errorValue.Text = 'Robot đang tự khôi phục kết nối hoặc đang chờ lệnh Brain hoàn chỉnh. Không cần bấm ĐÃ XỬ LÝ.'
    } elseif ($projectAutonomy -eq 'PAUSED') {
        $currentActionValue.Text = 'TẠM DỪNG • không mở hoặc điều khiển ChatGPT'
        $nextActionValue.Text = if ($pauseResumeAt) {
            "Không có công việc được phép trước mốc $pauseLabel."
        } else {
            'Không có công việc được phép cho đến khi trạng thái dự án cho phép tiếp tục.'
        }
        $errorValue.Text = 'Không có lỗi. Robot đang tạm dừng theo trạng thái dự án.'
    } elseif (-not $runnerProcess -and $process) {
        $errorValue.Text = 'Kết nối GitHub đang tắt. Các công việc chạy trên máy này sẽ chưa nhận được lệnh; bấm KẾT NỐI GITHUB.'
    } elseif (-not $process) {
        $errorValue.Text = if ($runnerProcess) {
            'Robot đang tắt. Bấm BẮT ĐẦU ROBOT.'
        } else {
            'Robot và kết nối GitHub đang tắt. BẮT ĐẦU ROBOT sẽ kết nối GitHub trước.'
        }
    } elseif ($projectState.requires_user -or $projectState.blocked -or $projectStatus -in @('WAIT_USER','BLOCKED')) {
        $activationPending = @()
        if ($projectState -and $projectState.activation_boundary_pending) {
            $activationPending = @($projectState.activation_boundary_pending)
        } elseif ($projectState -and $projectState.activation_boundary -and $projectState.activation_boundary.pending) {
            $activationPending = @($projectState.activation_boundary.pending)
        }
        $ownerPending = @()
        if ($projectState -and $projectState.owner_boundary_pending) {
            $ownerPending = @($projectState.owner_boundary_pending)
        } elseif ($projectState -and $projectState.owner_boundary -and $projectState.owner_boundary.pending) {
            $ownerPending = @($projectState.owner_boundary.pending)
        }

        if ($projectState.blocked -or $projectStatus -eq 'BLOCKED') {
            $errorValue.Text = 'Dự án đang bị chặn bởi điều kiện an toàn. Robot sẽ không tự vượt qua.'
        } elseif ($ownerPending.Count -gt 0) {
            $errorValue.Text = 'Cần bạn chốt quyết định: ' + ($ownerPending -join ', ')
        } elseif ($activationPending.Count -gt 0) {
            $errorValue.Text = 'Cần cấu hình kỹ thuật trước khi tiếp tục: ' + ($activationPending -join ', ')
        } else {
            $errorValue.Text = 'Trạng thái dự án cần bạn xử lý. Robot sẽ giữ nguyên giới hạn an toàn.'
        }
    } elseif ($runtimeStatus.recovery_blocked) {
        $errorValue.Text = 'Tự khôi phục đã dùng hết giới hạn an toàn. Cần bạn kiểm tra ChatGPT rồi bắt đầu lại Robot.'
    } elseif ($runtimeStatus.status -eq 'ERROR') {
        $errorValue.Text = "Robot gặp lỗi. Mở nhật ký lỗi trước khi khởi động lại."
    } elseif ($runtimeStatus.status -eq 'WAIT_USER') {
        $waitReason = if ($runtimeStatus.recovery_reason) { $runtimeStatus.recovery_reason } else { $runtimeStatus.decision_reason }
        $errorValue.Text = "Robot đang chờ Owner. Lý do: $waitReason"
    } elseif ($runtimeStatus.status -in @('RECOVERING','ROLLOVER')) {
        $errorValue.Text = 'Robot đang tự khôi phục; bạn chưa cần thao tác.'
    } else {
        $errorValue.Text = 'Không có lỗi.'
    }

    $logBox.Text = Tail-SafeLog
}

$startButton.Add_Click({
    $remoteBeforeStart = Read-ProjectState
    if ($remoteBeforeStart -and [string]$remoteBeforeStart.autonomy -eq 'PAUSED') {
        $resumeText = if (
            $remoteBeforeStart.night_run -and
            $remoteBeforeStart.night_run.temporal_gate -and
            $remoteBeforeStart.night_run.temporal_gate.resume_at
        ) {
            try {
                $resumeAt = [DateTimeOffset]::Parse([string]$remoteBeforeStart.night_run.temporal_gate.resume_at)
                Format-VietnamClock $resumeAt
            } catch {
                [string]$remoteBeforeStart.night_run.temporal_gate.resume_at
            }
        } else {
            'mốc do source-of-truth quy định'
        }

        [Windows.Forms.MessageBox]::Show(
            "Robot đang tạm dừng đến $resumeText. BẮT ĐẦU ROBOT sẽ không mở ChatGPT hoặc gửi lệnh.",
            'MAGASIN Business OS',
            'OK',
            'Information'
        ) | Out-Null
        Refresh-ControlPanel
        return
    }

    if (-not (Test-Path $startScript)) {
        [Windows.Forms.MessageBox]::Show("Supervisor chưa được cài: $startScript", 'MAGASIN Business OS', 'OK', 'Error') | Out-Null
        return
    }
    try {
        if (-not (Ensure-GitHubRunner -Interactive)) {
            Refresh-ControlPanel
            return
        }

        $quoted = '"' + $startScript + '"'
        Start-Process powershell.exe -WindowStyle Hidden -ArgumentList @(
            '-NoLogo','-NoProfile','-ExecutionPolicy','Bypass','-File',$quoted,'-Hidden'
        )
        Start-Sleep -Milliseconds 800
        Refresh-ControlPanel
    } catch {
        [Windows.Forms.MessageBox]::Show($_.Exception.Message, 'Không thể bắt đầu Robot', 'OK', 'Error') | Out-Null
    }
})

$stopButton.Add_Click({
    if (-not (Test-Path $stopScript)) { return }
    $answer = [Windows.Forms.MessageBox]::Show(
        'Dừng Robot? Robot sẽ ngừng tự làm việc với ChatGPT.',
        'MAGASIN Business OS',
        'YesNo',
        'Warning'
    )
    if ($answer -ne 'Yes') { return }
    $quoted = '"' + $stopScript + '"'
    Start-Process powershell.exe -WindowStyle Hidden -Wait -ArgumentList @(
        '-NoLogo','-NoProfile','-ExecutionPolicy','Bypass','-File',$quoted
    )
    Refresh-ControlPanel
})

$ownerResolvedButton.Add_Click({
    try {
        $remote = Read-ProjectState
        if (-not $remote -or $remote.status -ne 'WAIT_USER' -or $remote.blocked) {
            [Windows.Forms.MessageBox]::Show(
                'Project hiện không ở WAIT_USER có thể xác minh. Nút này không dùng để vượt BLOCKED/security boundary.',
                'MAGASIN Business OS',
                'OK',
                'Information'
            ) | Out-Null
            Refresh-ControlPanel
            return
        }

        $request = [ordered]@{
            requested_at = [DateTimeOffset]::UtcNow.ToString('o')
            current_task = [string]$remote.current_task
            project_status = [string]$remote.status
            intent = 'OWNER_RESOLVED_RECHECK'
        }
        New-Item -ItemType Directory -Force -Path $root | Out-Null
        $request | ConvertTo-Json | Set-Content -Path $ownerResolvedFile -Encoding UTF8

        [Windows.Forms.MessageBox]::Show(
            'Đã yêu cầu robot KIỂM TRA LẠI quyết định/boundary. Robot không tự bỏ qua security/secret boundary; nếu điều kiện chưa thực sự đủ, WAIT_USER sẽ được giữ nguyên.',
            'MAGASIN Business OS',
            'OK',
            'Information'
        ) | Out-Null
        Refresh-ControlPanel
    } catch {
        [Windows.Forms.MessageBox]::Show(
            $_.Exception.Message,
            'Không thể yêu cầu kiểm tra lại',
            'OK',
            'Error'
        ) | Out-Null
    }
})

$brainRebindButton.Add_Click({
    try {
        $request = [ordered]@{
            requested_at = [DateTimeOffset]::UtcNow.ToString('o')
            intent = 'OWNER_BRAIN_REBIND_VISIBLE_CHAT'
        }
        New-Item -ItemType Directory -Force -Path $root | Out-Null
        $request | ConvertTo-Json | Set-Content -Path $brainRebindFile -Encoding UTF8

        [Windows.Forms.MessageBox]::Show(
            'Đã yêu cầu Robot dùng cuộc trò chuyện ChatGPT đang mở làm Bộ não. Robot sẽ tự kiểm tra đúng định dạng Brain trước khi nhận.',
            'MAGASIN Business OS',
            'OK',
            'Information'
        ) | Out-Null
        Refresh-ControlPanel
    } catch {
        [Windows.Forms.MessageBox]::Show(
            $_.Exception.Message,
            'Không thể gắn lại Bộ não',
            'OK',
            'Error'
        ) | Out-Null
    }
})

$workerRetryButton.Add_Click({
    try {
        $request = [ordered]@{
            requested_at = [DateTimeOffset]::UtcNow.ToString('o')
            intent = 'OWNER_RETRY_UNCERTAIN_WORKER_ONCE'
        }
        New-Item -ItemType Directory -Force -Path $root | Out-Null
        $request | ConvertTo-Json | Set-Content -Path $workerRetryFile -Encoding UTF8

        [Windows.Forms.MessageBox]::Show(
            'Đã cho phép Robot thử lại đúng một lần đối với công việc bị gián đoạn. Robot vẫn kiểm tra chống gửi trùng trước khi tiếp tục.',
            'MAGASIN Business OS',
            'OK',
            'Information'
        ) | Out-Null
        Refresh-ControlPanel
    } catch {
        [Windows.Forms.MessageBox]::Show(
            $_.Exception.Message,
            'Không thể tiếp tục công việc bị kẹt',
            'OK',
            'Error'
        ) | Out-Null
    }
})

$diagnosticsButton.Add_Click({
    try {
        New-Item -ItemType Directory -Force -Path $diagnosticsRoot | Out-Null
        Start-Process explorer.exe -ArgumentList ('"' + $diagnosticsRoot + '"')
    } catch {
        [Windows.Forms.MessageBox]::Show(
            $_.Exception.Message,
            'Không thể mở log lỗi',
            'OK',
            'Error'
        ) | Out-Null
    }
})

$runnerButton.Add_Click({
    try {
        [void](Ensure-GitHubRunner -Interactive)
        Refresh-ControlPanel
    } catch {
        [Windows.Forms.MessageBox]::Show($_.Exception.Message, 'Không thể kết nối GitHub', 'OK', 'Error') | Out-Null
    }
})

$chatButton.Add_Click({
    if (-not (Test-Path $openChatScript)) {
        [Windows.Forms.MessageBox]::Show(
            "Không tìm thấy trình mở cửa sổ Robot: $openChatScript",
            'MAGASIN Business OS',
            'OK',
            'Error'
        ) | Out-Null
        return
    }

    Start-Process powershell.exe -WindowStyle Hidden -ArgumentList @(
        '-NoLogo','-NoProfile','-ExecutionPolicy','Bypass','-File',('"' + $openChatScript + '"')
    )
})

$repoButton.Add_Click({ Start-Process $repoUrl })

$timer = New-Object Windows.Forms.Timer
$timer.Interval = 1800
$timer.Add_Tick({ Refresh-ControlPanel })
$timer.Start()

Refresh-ControlPanel
[void]$form.ShowDialog()
