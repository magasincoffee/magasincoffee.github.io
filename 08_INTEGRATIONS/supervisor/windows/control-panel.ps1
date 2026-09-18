Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'

$root = Join-Path $env:LOCALAPPDATA 'MAGASIN\BusinessOS\supervisor'
$runtime = Join-Path $root 'runtime'
$pidFile = Join-Path $root 'supervisor.pid'
$statusFile = Join-Path $root 'runtime-status.json'
$logFile = Join-Path $root 'supervisor.log'
$ownerResolvedFile = Join-Path $root 'OWNER_RESOLVED.request.json'
$startScript = Join-Path $runtime 'windows\start-supervisor.ps1'
$stopScript = Join-Path $runtime 'windows\stop-supervisor.ps1'
$openChatScript = Join-Path $runtime 'windows\open-supervisor-chat.ps1'
$projectStateUrl = 'https://raw.githubusercontent.com/magasincoffee/magasincoffee.github.io/main/01_DOCS/MAGASIN/00_PROJECT_STATE.json'
$repoUrl = 'https://github.com/magasincoffee/magasincoffee.github.io'
$runnerRoot = 'C:\actions-runner'
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

    $runnerCommand = 'title MAGASIN-PC RUNNER - KEEP OPEN && cd /d "' + $runnerRoot + '" && call run.cmd'
    Start-Process -FilePath 'cmd.exe' -WorkingDirectory $runnerRoot -ArgumentList @('/k', $runnerCommand)

    for ($i = 0; $i -lt 16; $i++) {
        Start-Sleep -Milliseconds 500
        if (Get-GitHubRunnerProcess) { return $true }
    }

    if ($Interactive) {
        [Windows.Forms.MessageBox]::Show(
            'GitHub Runner chưa ONLINE. Kiểm tra cửa sổ MAGASIN-PC RUNNER - KEEP OPEN.',
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

function Format-Time([string]$Value) {
    if (-not $Value) { return '—' }
    try {
        $dt = [DateTimeOffset]::Parse($Value)
        $age = [math]::Max(0, [int]([DateTimeOffset]::UtcNow - $dt.ToUniversalTime()).TotalSeconds)
        return "$($dt.ToLocalTime().ToString('yyyy-MM-dd HH:mm:ss'))  •  $age giây trước"
    } catch {
        return $Value
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
$form.Text = 'MAGASIN BUSINESS OS — SUPERVISOR'
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
$subtitle.Text = 'SUPERVISOR ROBOT  •  Owner ↔ ChatGPT ↔ Repository'
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
$startButton.Text = '▶  START ROBOT'
$startButton.Location = New-Object Drawing.Point(18, 18)
$startButton.Size = New-Object Drawing.Size(230, 50)
$startButton.Font = New-Object Drawing.Font('Segoe UI Semibold', 13)
$controls.Controls.Add($startButton)

$stopButton = New-Object Windows.Forms.Button
$stopButton.Text = '■  STOP'
$stopButton.Location = New-Object Drawing.Point(260, 18)
$stopButton.Size = New-Object Drawing.Size(150, 50)
$stopButton.Font = New-Object Drawing.Font('Segoe UI Semibold', 11)
$controls.Controls.Add($stopButton)

$runnerButton = New-Object Windows.Forms.Button
$runnerButton.Text = '▶  GITHUB RUNNER'
$runnerButton.Location = New-Object Drawing.Point(420, 18)
$runnerButton.Size = New-Object Drawing.Size(170, 50)
$runnerButton.Font = New-Object Drawing.Font('Segoe UI Semibold', 9.5)
$controls.Controls.Add($runnerButton)

$chatButton = New-Object Windows.Forms.Button
$chatButton.Text = 'ChatGPT Robot'
$chatButton.Location = New-Object Drawing.Point(602, 21)
$chatButton.Size = New-Object Drawing.Size(145, 42)
$controls.Controls.Add($chatButton)

$repoButton = New-Object Windows.Forms.Button
$repoButton.Text = 'Mở dự án GitHub'
$repoButton.Location = New-Object Drawing.Point(758, 21)
$repoButton.Size = New-Object Drawing.Size(178, 42)
$controls.Controls.Add($repoButton)

$robotCard = New-Object Windows.Forms.Panel
$robotCard.Location = New-Object Drawing.Point(28, 182)
$robotCard.Size = New-Object Drawing.Size(470, 92)
$robotCard.BorderStyle = 'FixedSingle'
$form.Controls.Add($robotCard)

$robotCaption = New-Object Windows.Forms.Label
$robotCaption.Text = 'SUPERVISOR ROBOT'
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
$projectCaption.Text = 'PROJECT STATE'
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

$currentTaskValue = Add-KeyValueRow $details 18 'ĐANG LÀM'
$nextTaskValue = Add-KeyValueRow $details 65 'CHUẨN BỊ LÀM'
$currentActionValue = Add-KeyValueRow $details 112 'ROBOT ĐANG LÀM'
$nextActionValue = Add-KeyValueRow $details 159 'HÀNH ĐỘNG KẾ'
$heartbeatValue = Add-KeyValueRow $details 206 'CẬP NHẬT'
$autonomyValue = Add-KeyValueRow $details 247 'CHẾ ĐỘ'

$errorPanel = New-Object Windows.Forms.Panel
$errorPanel.Location = New-Object Drawing.Point(28, 594)
$errorPanel.Size = New-Object Drawing.Size(964, 70)
$errorPanel.BackColor = [Drawing.Color]::FromArgb(255,247,237)
$errorPanel.BorderStyle = 'FixedSingle'
$form.Controls.Add($errorPanel)

$errorCaption = New-Object Windows.Forms.Label
$errorCaption.Text = 'LỖI / CẦN OWNER XỬ LÝ'
$errorCaption.Location = New-Object Drawing.Point(16, 10)
$errorCaption.Size = New-Object Drawing.Size(220, 20)
$errorCaption.Font = New-Object Drawing.Font('Segoe UI Semibold', 9)
$errorCaption.ForeColor = [Drawing.Color]::FromArgb(154,52,18)
$errorPanel.Controls.Add($errorCaption)

$errorValue = New-Object Windows.Forms.Label
$errorValue.Text = 'Không có lỗi.'
$errorValue.Location = New-Object Drawing.Point(16, 33)
$errorValue.Size = New-Object Drawing.Size(640, 28)
$errorValue.ForeColor = [Drawing.Color]::FromArgb(124,45,18)
$errorPanel.Controls.Add($errorValue)

$ownerResolvedButton = New-Object Windows.Forms.Button
$ownerResolvedButton.Text = '✓  ĐÃ XỬ LÝ — KIỂM TRA LẠI'
$ownerResolvedButton.Location = New-Object Drawing.Point(690, 18)
$ownerResolvedButton.Size = New-Object Drawing.Size(250, 38)
$ownerResolvedButton.Font = New-Object Drawing.Font('Segoe UI Semibold', 9)
$ownerResolvedButton.BackColor = [Drawing.Color]::FromArgb(254,249,195)
$ownerResolvedButton.ForeColor = [Drawing.Color]::FromArgb(133,77,14)
$ownerResolvedButton.Enabled = $false
$errorPanel.Controls.Add($ownerResolvedButton)

$logBox = New-Object Windows.Forms.TextBox
$logBox.Location = New-Object Drawing.Point(28, 680)
$logBox.Size = New-Object Drawing.Size(964, 92)
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

    if ($runnerProcess) {
        $runnerButton.Text = '✓  RUNNER ONLINE'
        $runnerButton.BackColor = [Drawing.Color]::FromArgb(220,252,231)
        $runnerButton.ForeColor = [Drawing.Color]::FromArgb(22,101,52)
    } else {
        $runnerButton.Text = '▶  START RUNNER'
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

    if ($process) {
        $state = if ($runtimeStatus.status) { [string]$runtimeStatus.status } else { 'STARTING' }
        $robotText = switch ($state) {
            'READY' { 'ONLINE • CHỜ CHATGPT' }
            'RUNNING' { 'RUNNING • ĐANG LÀM VIỆC' }
            'RETRYING' { 'RETRYING • ĐANG THỬ LẠI' }
            'RECOVERING' { 'RECOVERING • TỰ KHÔI PHỤC' }
            'ROLLOVER' { 'ROLLOVER • CHUYỂN CHAT MỚI' }
            'WAIT_USER' { 'WAIT_USER • CẦN OWNER' }
            'ERROR' { 'ERROR' }
            'DONE' { 'DONE' }
            default { "ONLINE • $state" }
        }
        Set-StatusCard $robotCard $robotValue $state $robotText
        $startButton.Enabled = $false
        $stopButton.Enabled = $true
    } else {
        Set-StatusCard $robotCard $robotValue 'OFFLINE' 'OFFLINE'
        $startButton.Enabled = $true
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
    $projectText = if ($projectStatus -eq 'READY') { 'READY • AUTO CONTINUE' } else { $projectStatus }
    $projectCardState = if ($projectStatus -eq 'WAIT_USER') { 'WAIT_USER' } elseif ($projectStatus -eq 'BLOCKED') { 'ERROR' } else { 'READY' }
    Set-StatusCard $projectCard $projectValue $projectCardState $projectText

    $ownerBoundaryActive = (
        $projectStatus -eq 'WAIT_USER' -and
        -not $projectState.blocked
    )
    $ownerResolvedButton.Enabled = [bool]$ownerBoundaryActive
    if (Test-Path $ownerResolvedFile) {
        $ownerResolvedButton.Text = '✓  ĐÃ NHẬN — ĐANG KIỂM TRA'
        $ownerResolvedButton.Enabled = $false
    } else {
        $ownerResolvedButton.Text = '✓  ĐÃ XỬ LÝ — KIỂM TRA LẠI'
    }

    $currentTask = if ($projectState.current_task) {
        "$($projectState.current_task) — $($projectState.current_task_title)"
    } else { '—' }
    $nextTask = if ($projectState.next_task) { [string]$projectState.next_task } else { '—' }

    $decision = if ($runtimeStatus.decision_action) { [string]$runtimeStatus.decision_action } else { 'WAIT' }
    $observation = if ($runtimeStatus.observation) { [string]$runtimeStatus.observation } else { '—' }
    $uiState = if ($runtimeStatus.ui_state) { [string]$runtimeStatus.ui_state } else { '—' }
    $executed = if ($runtimeStatus.execution_executed) { 'đã thực thi' } else { 'chưa thực thi' }
    $recoveryAction = if ($runtimeStatus.recovery_action) { [string]$runtimeStatus.recovery_action } else { 'NONE' }

    $currentTaskValue.Text = $currentTask
    $nextTaskValue.Text = $nextTask
    if ($recoveryAction -ne 'NONE') {
        $currentActionValue.Text = "$recoveryAction  •  UI=$uiState  •  OBS=$observation"
    } else {
        $currentActionValue.Text = "$decision  •  UI=$uiState  •  OBS=$observation  •  $executed"
    }
    $nextActionValue.Text = if ($runtimeStatus.recovery_reason) {
        [string]$runtimeStatus.recovery_reason
    } elseif ($runtimeStatus.decision_reason) {
        [string]$runtimeStatus.decision_reason
    } else {
        'Theo dõi ChatGPT; tự Continue khi source-of-truth cho phép.'
    }
    $heartbeatValue.Text = if ($process -and $runtimeStatus.updated_at) {
        Format-Time ([string]$runtimeStatus.updated_at)
    } elseif ($projectState.last_updated) {
        "Repository source-of-truth • $($projectState.last_updated)"
    } elseif ($runtimeStatus.updated_at) {
        "Runtime cũ • $(Format-Time ([string]$runtimeStatus.updated_at))"
    } else {
        'Chưa có runtime status.'
    }
    $autonomyValue.Text = if ($projectState.autonomy) { "$($projectState.autonomy)  •  phase=$($projectState.current_phase)" } else { '—' }

    if (-not $runnerProcess -and $process) {
        $errorValue.Text = 'GitHub Runner đang OFFLINE. Local-machine GitHub jobs sẽ không chạy; bấm START RUNNER.'
    } elseif (-not $process) {
        $errorValue.Text = if ($runnerProcess) {
            'Robot đang OFFLINE. Bấm START ROBOT.'
        } else {
            'Robot và GitHub Runner đang OFFLINE. START ROBOT sẽ khởi động Runner trước.'
        }
    } elseif ($projectState.requires_user -or $projectState.blocked -or $projectStatus -in @('WAIT_USER','BLOCKED')) {
        $errorValue.Text = 'Project state yêu cầu Owner xử lý. Robot sẽ không tự vượt approval/security boundary.'
    } elseif ($runtimeStatus.recovery_blocked) {
        $errorValue.Text = 'Tự khôi phục đã dùng hết giới hạn an toàn. Cần Owner kiểm tra ChatGPT rồi START lại.'
    } elseif ($runtimeStatus.status -eq 'ERROR') {
        $errorValue.Text = "Supervisor lỗi: $($runtimeStatus.error_name). Xem nhật ký trước khi khởi động lại."
    } elseif ($runtimeStatus.status -eq 'WAIT_USER') {
        $waitReason = if ($runtimeStatus.recovery_reason) { $runtimeStatus.recovery_reason } else { $runtimeStatus.decision_reason }
        $errorValue.Text = "Robot đang chờ Owner. Lý do: $waitReason"
    } elseif ($runtimeStatus.status -in @('RECOVERING','ROLLOVER')) {
        $errorValue.Text = 'Robot đang tự khôi phục ChatGPT; chưa cần Owner thao tác.'
    } else {
        $errorValue.Text = 'Không có lỗi.'
    }

    $logBox.Text = Tail-SafeLog
}

$startButton.Add_Click({
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
        [Windows.Forms.MessageBox]::Show($_.Exception.Message, 'Không thể START', 'OK', 'Error') | Out-Null
    }
})

$stopButton.Add_Click({
    if (-not (Test-Path $stopScript)) { return }
    $answer = [Windows.Forms.MessageBox]::Show(
        'Dừng Supervisor Robot? Robot sẽ ngừng tự làm việc với ChatGPT.',
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

$runnerButton.Add_Click({
    try {
        [void](Ensure-GitHubRunner -Interactive)
        Refresh-ControlPanel
    } catch {
        [Windows.Forms.MessageBox]::Show($_.Exception.Message, 'Không thể START RUNNER', 'OK', 'Error') | Out-Null
    }
})

$chatButton.Add_Click({
    if (-not (Test-Path $openChatScript)) {
        [Windows.Forms.MessageBox]::Show(
            "Không tìm thấy shared ChatGPT launcher: $openChatScript",
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
