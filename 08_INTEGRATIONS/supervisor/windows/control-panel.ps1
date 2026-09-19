Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'

$root = Join-Path $env:LOCALAPPDATA 'MAGASIN\BusinessOS\supervisor'
$runtime = Join-Path $root 'runtime'
$configFile = Join-Path $root 'lanes.json'
$registryFile = Join-Path $root 'lane-registry.json'
$statusFile = Join-Path $root 'lane-status.json'
$startScript = Join-Path $runtime 'windows\start-supervisor.ps1'
$lifecycleScript = Join-Path $runtime 'windows\lifecycle-truth.ps1'
$openChatScript = Join-Path $runtime 'windows\open-supervisor-chat.ps1'
$runnerRoot = 'C:\actions-runner-business\actions-runner'
$repoUrl = 'https://github.com/magasincoffee/magasincoffee.github.io'
$vietnamTimeZone = [TimeZoneInfo]::FindSystemTimeZoneById('SE Asia Standard Time')
$script:lastRecoveryRequestAt = [DateTimeOffset]::MinValue

if (-not (Test-Path $lifecycleScript)) {
    throw "Không tìm thấy lifecycle truth helper: $lifecycleScript"
}
. $lifecycleScript

function Read-JsonFile([string]$Path) {
    if (-not (Test-Path $Path)) { return $null }
    try {
        return Get-Content $Path -Raw -Encoding UTF8 | ConvertFrom-Json
    } catch {
        return $null
    }
}

function Write-JsonAtomic([string]$Path, $Value) {
    $dir = Split-Path $Path -Parent
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    $tmp = "$Path.tmp"
    $json = $Value | ConvertTo-Json -Depth 12
    [System.IO.File]::WriteAllText(
        $tmp,
        $json + [Environment]::NewLine,
        (New-Object System.Text.UTF8Encoding($false))
    )
    Move-Item -Path $tmp -Destination $Path -Force
}

function New-DefaultConfig {
    return [ordered]@{
        schema_version = 'three-lane-config.v1'
        mode = 'THREE_LANE_V1'
        lanes = @(
            [ordered]@{ lane_id='lane-1'; project_name='Dự án 1'; brain_url=''; brain_url_revision=0; work_url=''; work_url_revision=0; enabled=$false },
            [ordered]@{ lane_id='lane-2'; project_name='Dự án 2'; brain_url=''; brain_url_revision=0; work_url=''; work_url_revision=0; enabled=$false },
            [ordered]@{ lane_id='lane-3'; project_name='Dự án 3'; brain_url=''; brain_url_revision=0; work_url=''; work_url_revision=0; enabled=$false }
        )
    }
}

function Ensure-Config {
    $config = Read-JsonFile $configFile
    if (-not $config -or -not $config.lanes) {
        $config = New-DefaultConfig
        Write-JsonAtomic $configFile $config
    }
    return $config
}

function Get-LaneConfig($Config, [string]$LaneId) {
    return @($Config.lanes | Where-Object { [string]$_.lane_id -eq $LaneId } | Select-Object -First 1)[0]
}

function Test-ChatConversationUrl([string]$Url) {
    if (-not $Url) { return $false }
    try {
        $uri = [Uri]$Url
        return (
            $uri.Scheme -eq 'https' -and
            $uri.Host -match '(^|\.)chatgpt\.com$' -and
            $uri.AbsolutePath -match '^/(c|g|project)/'
        )
    } catch {
        return $false
    }
}

function Get-SupervisorProcess {
    return Get-LifecycleSupervisorWrapper -Root $root
}

function Request-LifecycleRecovery {
    $now = [DateTimeOffset]::UtcNow
    if (($now - $script:lastRecoveryRequestAt).TotalSeconds -lt 5) {
        return
    }

    $result = Invoke-LifecycleRecoveryStart -StartScript $startScript -Root $root
    if ([string]$result.state -in @('STARTING','RECOVERING')) {
        $script:lastRecoveryRequestAt = $now
    }
}

function Get-RunnerProcess {
    return Get-CimInstance Win32_Process -Filter "Name='Runner.Listener.exe'" -ErrorAction SilentlyContinue |
        Where-Object {
            ($_.ExecutablePath -and $_.ExecutablePath -like "$runnerRoot*") -or
            ($_.CommandLine -and $_.CommandLine -like "*$runnerRoot*")
        } |
        Select-Object -First 1
}

function Ensure-Runner {
    if (Get-RunnerProcess) { return $true }
    $runCmd = Join-Path $runnerRoot 'run.cmd'
    if (-not (Test-Path $runCmd)) { return $false }
    try {
        $env:RUNNER_TRACKING_ID = 'MAGASIN_RUNNER_PERSISTENT'
        Start-Process -FilePath 'cmd.exe' -WindowStyle Hidden -WorkingDirectory $runnerRoot -ArgumentList @('/c','run.cmd')
        Start-Sleep -Seconds 2
        return [bool](Get-RunnerProcess)
    } catch {
        return $false
    }
}

function Open-RobotUrl([string]$Url) {
    if (-not (Test-ChatConversationUrl $Url)) {
        [Windows.Forms.MessageBox]::Show(
            'Chưa có URL cuộc trò chuyện hợp lệ.',
            'MAGASIN BUSINESS OS',
            'OK',
            'Information'
        ) | Out-Null
        return
    }
    if (-not (Test-Path $openChatScript)) {
        [Windows.Forms.MessageBox]::Show(
            'Không tìm thấy trình mở Chrome Robot.',
            'MAGASIN BUSINESS OS',
            'OK',
            'Error'
        ) | Out-Null
        return
    }
    Start-Process powershell.exe -WindowStyle Hidden -ArgumentList @(
        '-NoLogo','-NoProfile','-ExecutionPolicy','Bypass',
        '-File',('"' + $openChatScript + '"'),
        '-Url',('"' + $Url + '"')
    )
}

function Format-VietnamTime([string]$Value) {
    if (-not $Value) { return '—' }
    try {
        $dt = [DateTimeOffset]::Parse($Value)
        $vn = [TimeZoneInfo]::ConvertTime($dt, $vietnamTimeZone)
        return $vn.ToString('dd/MM/yyyy HH:mm:ss') + ' giờ Việt Nam'
    } catch {
        return '—'
    }
}

function Get-FriendlyStatus([string]$Status) {
    switch ($Status) {
        'STOPPED' { return 'ĐÃ DỪNG' }
        'NEED_BRAIN_URL' { return 'CẦN LINK BỘ NÃO' }
        'STARTING' { return 'ĐANG KHỞI ĐỘNG' }
        'WAITING_BRAIN' { return 'ĐANG CHỜ BỘ NÃO' }
        'WORKING' { return 'ĐANG LÀM VIỆC' }
        'RELAYING_RESULT' { return 'ĐANG GỬI KẾT QUẢ' }
        'READY' { return 'SẴN SÀNG' }
        'RECOVERING' { return 'ĐANG TỰ KHÔI PHỤC' }
        'WAIT_OWNER' { return 'CẦN BẠN XỬ LÝ' }
        'ERROR' { return 'CÓ LỖI' }
        default { return 'ĐANG KHỞI TẠO' }
    }
}

function Get-StatusBackColor([string]$Status) {
    switch ($Status) {
        'WORKING' { return [Drawing.Color]::FromArgb(219,234,254) }
        'RELAYING_RESULT' { return [Drawing.Color]::FromArgb(224,242,254) }
        'READY' { return [Drawing.Color]::FromArgb(220,252,231) }
        'WAITING_BRAIN' { return [Drawing.Color]::FromArgb(254,249,195) }
        'RECOVERING' { return [Drawing.Color]::FromArgb(254,249,195) }
        'WAIT_OWNER' { return [Drawing.Color]::FromArgb(255,237,213) }
        'ERROR' { return [Drawing.Color]::FromArgb(254,226,226) }
        'NEED_BRAIN_URL' { return [Drawing.Color]::FromArgb(255,237,213) }
        default { return [Drawing.Color]::FromArgb(248,250,252) }
    }
}

function Save-Lane(
    [string]$LaneId,
    [string]$ProjectName,
    [string]$BrainUrl,
    [string]$WorkUrl,
    [bool]$Enabled,
    [bool]$ForceWorkRevision = $false
) {
    $config = Ensure-Config
    $lane = Get-LaneConfig $config $LaneId
    if (-not $lane) { throw "Không tìm thấy $LaneId" }

    if (-not $lane.PSObject.Properties['brain_url_revision']) {
        $initialBrainRevision = if ([string]$lane.brain_url) { 1 } else { 0 }
        $lane | Add-Member -NotePropertyName 'brain_url_revision' -NotePropertyValue $initialBrainRevision
    }
    if (-not $lane.PSObject.Properties['work_url']) {
        $lane | Add-Member -NotePropertyName 'work_url' -NotePropertyValue ''
    }
    if (-not $lane.PSObject.Properties['work_url_revision']) {
        $lane | Add-Member -NotePropertyName 'work_url_revision' -NotePropertyValue 0
    }

    $newBrainUrl = if ($BrainUrl) { $BrainUrl.Trim() } else { '' }
    $newWorkUrl = if ($WorkUrl) { $WorkUrl.Trim() } else { '' }
    if ([string]$lane.brain_url -ne $newBrainUrl) {
        $lane.brain_url_revision = [int]$lane.brain_url_revision + 1
    }
    if ([string]$lane.work_url -ne $newWorkUrl -or $ForceWorkRevision) {
        $lane.work_url_revision = [int]$lane.work_url_revision + 1
    }

    $lane.project_name = if ($ProjectName) { $ProjectName.Trim() } else { $LaneId }
    $lane.brain_url = $newBrainUrl
    $lane.work_url = $newWorkUrl
    $lane.enabled = $Enabled
    Write-JsonAtomic $configFile $config
}

function Save-BrainTarget(
    [string]$LaneId,
    [string]$BrainUrl
) {
    $config = Ensure-Config
    $lane = Get-LaneConfig $config $LaneId
    if (-not $lane) { throw "Không tìm thấy $LaneId" }

    if (-not $lane.PSObject.Properties['brain_url_revision']) {
        $initialBrainRevision = if ([string]$lane.brain_url) { 1 } else { 0 }
        $lane | Add-Member -NotePropertyName 'brain_url_revision' -NotePropertyValue $initialBrainRevision
    }

    $newBrainUrl = if ($BrainUrl) { $BrainUrl.Trim() } else { '' }
    if ([string]$lane.brain_url -ne $newBrainUrl) {
        $lane.brain_url_revision = [int]$lane.brain_url_revision + 1
        $lane.brain_url = $newBrainUrl
        Write-JsonAtomic $configFile $config
        return $true
    }

    return $false
}

[Windows.Forms.Application]::EnableVisualStyles()

$form = New-Object Windows.Forms.Form
$form.Text = 'MAGASIN BUSINESS OS — 3 LUỒNG LÀM VIỆC'
$form.StartPosition = 'CenterScreen'
$form.Size = New-Object Drawing.Size(1240, 930)
$form.MinimumSize = New-Object Drawing.Size(1240, 930)
$form.BackColor = [Drawing.Color]::FromArgb(248,250,252)
$form.Font = New-Object Drawing.Font('Segoe UI', 9)

$title = New-Object Windows.Forms.Label
$title.Text = 'MAGASIN BUSINESS OS'
$title.Location = New-Object Drawing.Point(28, 22)
$title.Size = New-Object Drawing.Size(430, 42)
$title.Font = New-Object Drawing.Font('Segoe UI Semibold', 23)
$form.Controls.Add($title)

$subtitle = New-Object Windows.Forms.Label
$subtitle.Text = '3 LUỒNG ĐỘC LẬP  •  BỘ NÃO DO BẠN CHỌN  •  WORK: BẠN CHỌN HOẶC ROBOT TỰ TẠO'
$subtitle.Location = New-Object Drawing.Point(520, 34)
$subtitle.Size = New-Object Drawing.Size(665, 26)
$subtitle.TextAlign = 'MiddleRight'
$subtitle.ForeColor = [Drawing.Color]::FromArgb(71,85,105)
$form.Controls.Add($subtitle)

$runnerButton = New-Object Windows.Forms.Button
$runnerButton.Location = New-Object Drawing.Point(28, 76)
$runnerButton.Size = New-Object Drawing.Size(260, 42)
$runnerButton.Text = 'KẾT NỐI GITHUB'
$runnerButton.Add_Click({
    if (-not (Ensure-Runner)) {
        [Windows.Forms.MessageBox]::Show(
            'Không thể khởi động GitHub Runner. Mở nhật ký Runner để kiểm tra kết nối mạng.',
            'MAGASIN BUSINESS OS',
            'OK',
            'Warning'
        ) | Out-Null
    }
})
$form.Controls.Add($runnerButton)

$runtimeLabel = New-Object Windows.Forms.Label
$runtimeLabel.Location = New-Object Drawing.Point(310, 82)
$runtimeLabel.Size = New-Object Drawing.Size(500, 32)
$runtimeLabel.Font = New-Object Drawing.Font('Segoe UI Semibold', 10)
$form.Controls.Add($runtimeLabel)

$runtimeStartButton = New-Object Windows.Forms.Button
$runtimeStartButton.Location = New-Object Drawing.Point(820, 76)
$runtimeStartButton.Size = New-Object Drawing.Size(175, 42)
$runtimeStartButton.Text = 'KHỞI ĐỘNG ROBOT NỀN'
$runtimeStartButton.Add_Click({
    $enabledLaneCount = Get-EnabledLaneCount -Root $root
    if ($enabledLaneCount -lt 1) {
        [Windows.Forms.MessageBox]::Show(
            'Hãy bật ít nhất một luồng trước khi khởi động Robot nền.',
            'MAGASIN BUSINESS OS',
            'OK',
            'Information'
        ) | Out-Null
        return
    }

    if (-not (Test-Path $startScript)) {
        [Windows.Forms.MessageBox]::Show(
            'Không tìm thấy Supervisor runtime.',
            'MAGASIN BUSINESS OS',
            'OK',
            'Error'
        ) | Out-Null
        return
    }

    Start-Process powershell.exe -WindowStyle Hidden -ArgumentList @(
        '-NoLogo','-NoProfile','-ExecutionPolicy','Bypass',
        '-File',('"' + $startScript + '"'),'-Hidden'
    )
})
$form.Controls.Add($runtimeStartButton)

$repoButton = New-Object Windows.Forms.Button
$repoButton.Location = New-Object Drawing.Point(1015, 76)
$repoButton.Size = New-Object Drawing.Size(170, 42)
$repoButton.Text = 'MỞ DỰ ÁN'
$repoButton.Add_Click({ Start-Process $repoUrl })
$form.Controls.Add($repoButton)

$laneUi = @{}
$cardY = @(135, 385, 635)

for ($i = 0; $i -lt 3; $i++) {
    $laneId = "lane-$($i + 1)"
    $panel = New-Object Windows.Forms.Panel
    $panel.Location = New-Object Drawing.Point(28, $cardY[$i])
    $panel.Size = New-Object Drawing.Size(1157, 228)
    $panel.BorderStyle = 'FixedSingle'
    $panel.BackColor = [Drawing.Color]::White
    $form.Controls.Add($panel)

    $laneTitle = New-Object Windows.Forms.Label
    $laneTitle.Text = "LUỒNG $($i + 1)"
    $laneTitle.Location = New-Object Drawing.Point(18, 12)
    $laneTitle.Size = New-Object Drawing.Size(130, 26)
    $laneTitle.Font = New-Object Drawing.Font('Segoe UI Semibold', 13)
    $panel.Controls.Add($laneTitle)

    $projectLabel = New-Object Windows.Forms.Label
    $projectLabel.Text = 'TÊN DỰ ÁN'
    $projectLabel.Location = New-Object Drawing.Point(165, 15)
    $projectLabel.Size = New-Object Drawing.Size(85, 22)
    $panel.Controls.Add($projectLabel)

    $projectBox = New-Object Windows.Forms.TextBox
    $projectBox.Location = New-Object Drawing.Point(250, 12)
    $projectBox.Size = New-Object Drawing.Size(340, 26)
    $panel.Controls.Add($projectBox)

    $statusValue = New-Object Windows.Forms.Label
    $statusValue.Location = New-Object Drawing.Point(610, 10)
    $statusValue.Size = New-Object Drawing.Size(520, 32)
    $statusValue.Font = New-Object Drawing.Font('Segoe UI Semibold', 13)
    $statusValue.TextAlign = 'MiddleRight'
    $panel.Controls.Add($statusValue)

    $brainLabel = New-Object Windows.Forms.Label
    $brainLabel.Text = 'LINK BỘ NÃO'
    $brainLabel.Location = New-Object Drawing.Point(18, 58)
    $brainLabel.Size = New-Object Drawing.Size(105, 24)
    $panel.Controls.Add($brainLabel)

    $brainBox = New-Object Windows.Forms.TextBox
    $brainBox.Location = New-Object Drawing.Point(125, 55)
    $brainBox.Size = New-Object Drawing.Size(760, 27)
    $panel.Controls.Add($brainBox)

    $openBrain = New-Object Windows.Forms.Button
    $openBrain.Text = 'MỞ BỘ NÃO'
    $openBrain.Location = New-Object Drawing.Point(900, 52)
    $openBrain.Size = New-Object Drawing.Size(108, 34)
    $panel.Controls.Add($openBrain)

    $saveBrain = New-Object Windows.Forms.Button
    $saveBrain.Text = 'LƯU BỘ NÃO'
    $saveBrain.Location = New-Object Drawing.Point(1017, 52)
    $saveBrain.Size = New-Object Drawing.Size(108, 34)
    $panel.Controls.Add($saveBrain)

    $workLabel = New-Object Windows.Forms.Label
    $workLabel.Text = 'LINK WORK (TÙY CHỌN)'
    $workLabel.Location = New-Object Drawing.Point(18, 100)
    $workLabel.Size = New-Object Drawing.Size(105, 24)
    $panel.Controls.Add($workLabel)

    $workBox = New-Object Windows.Forms.TextBox
    $workBox.Location = New-Object Drawing.Point(125, 97)
    $workBox.Size = New-Object Drawing.Size(760, 27)
    $workBox.ReadOnly = $false
    $workBox.BackColor = [Drawing.Color]::White
    $panel.Controls.Add($workBox)

    $openWork = New-Object Windows.Forms.Button
    $openWork.Text = 'MỞ WORK'
    $openWork.Location = New-Object Drawing.Point(900, 94)
    $openWork.Size = New-Object Drawing.Size(108, 34)
    $panel.Controls.Add($openWork)

    $resetWork = New-Object Windows.Forms.Button
    $resetWork.Text = 'TỰ TẠO WORK'
    $resetWork.Location = New-Object Drawing.Point(1017, 94)
    $resetWork.Size = New-Object Drawing.Size(108, 34)
    $panel.Controls.Add($resetWork)

    $messageLabel = New-Object Windows.Forms.Label
    $messageLabel.Text = 'THÔNG BÁO'
    $messageLabel.Location = New-Object Drawing.Point(18, 141)
    $messageLabel.Size = New-Object Drawing.Size(105, 24)
    $panel.Controls.Add($messageLabel)

    $messageValue = New-Object Windows.Forms.Label
    $messageValue.Location = New-Object Drawing.Point(125, 138)
    $messageValue.Size = New-Object Drawing.Size(760, 48)
    $messageValue.AutoEllipsis = $true
    $panel.Controls.Add($messageValue)

    $updatedValue = New-Object Windows.Forms.Label
    $updatedValue.Location = New-Object Drawing.Point(125, 190)
    $updatedValue.Size = New-Object Drawing.Size(500, 22)
    $updatedValue.ForeColor = [Drawing.Color]::FromArgb(100,116,139)
    $panel.Controls.Add($updatedValue)

    $startButton = New-Object Windows.Forms.Button
    $startButton.Text = '▶  BẮT ĐẦU LUỒNG'
    $startButton.Location = New-Object Drawing.Point(900, 145)
    $startButton.Size = New-Object Drawing.Size(225, 34)
    $panel.Controls.Add($startButton)

    $stopButton = New-Object Windows.Forms.Button
    $stopButton.Text = '■  DỪNG LUỒNG'
    $stopButton.Location = New-Object Drawing.Point(900, 184)
    $stopButton.Size = New-Object Drawing.Size(225, 32)
    $panel.Controls.Add($stopButton)

    $laneUi[$laneId] = [pscustomobject]@{
        Panel = $panel
        Project = $projectBox
        Brain = $brainBox
        Work = $workBox
        Status = $statusValue
        Message = $messageValue
        Updated = $updatedValue
        Start = $startButton
        Stop = $stopButton
        OpenBrain = $openBrain
        SaveBrain = $saveBrain
        OpenWork = $openWork
        ResetWork = $resetWork
    }

    $currentLaneId = $laneId
    $startButton.Add_Click({
        $id = $this.Tag
        $ui = $laneUi[$id]
        $brainUrl = $ui.Brain.Text.Trim()
        $workUrl = $ui.Work.Text.Trim()
        if (-not (Test-ChatConversationUrl $brainUrl)) {
            [Windows.Forms.MessageBox]::Show(
                'Hãy dán đúng link cuộc trò chuyện ChatGPT dùng làm BỘ NÃO cho luồng này.',
                'MAGASIN BUSINESS OS',
                'OK',
                'Warning'
            ) | Out-Null
            return
        }
        if ($workUrl -and -not (Test-ChatConversationUrl $workUrl)) {
            [Windows.Forms.MessageBox]::Show(
                'LINK WORK không hợp lệ. Dán link cuộc trò chuyện ChatGPT hoặc để trống để Robot tự tạo.',
                'MAGASIN BUSINESS OS',
                'OK',
                'Warning'
            ) | Out-Null
            return
        }
        # Lane START changes only Owner lane intent: disabled -> enabled.
        # Process recovery is a separate lifecycle concern handled by Refresh-Ui.
        Save-Lane $id $ui.Project.Text $brainUrl $workUrl $true
    })
    $startButton.Tag = $currentLaneId

    $stopButton.Add_Click({
        $id = $this.Tag
        $ui = $laneUi[$id]
        Save-Lane $id $ui.Project.Text $ui.Brain.Text $ui.Work.Text $false
    })
    $stopButton.Tag = $currentLaneId

    $openBrain.Add_Click({
        $id = $this.Tag
        Open-RobotUrl $laneUi[$id].Brain.Text
    })
    $openBrain.Tag = $currentLaneId

    $saveBrain.Add_Click({
        $id = $this.Tag
        $ui = $laneUi[$id]
        $brainUrl = $ui.Brain.Text.Trim()
        if (-not (Test-ChatConversationUrl $brainUrl)) {
            [Windows.Forms.MessageBox]::Show(
                'LINK BỘ NÃO không hợp lệ. Hãy dán đúng link cuộc trò chuyện ChatGPT mới.',
                'MAGASIN BUSINESS OS',
                'OK',
                'Warning'
            ) | Out-Null
            return
        }

        $changed = Save-BrainTarget $id $brainUrl
        if ($changed) {
            [Windows.Forms.MessageBox]::Show(
                'Đã lưu Bộ não mới. Robot sẽ chuyển sang Bộ não này ở vòng xử lý kế tiếp, kể cả khi Work hiện tại vẫn đang chạy.',
                'MAGASIN BUSINESS OS',
                'OK',
                'Information'
            ) | Out-Null
        }
    })
    $saveBrain.Tag = $currentLaneId

    $openWork.Add_Click({
        $id = $this.Tag
        Open-RobotUrl $laneUi[$id].Work.Text
    })
    $openWork.Tag = $currentLaneId

    $resetWork.Add_Click({
        $id = $this.Tag
        $ui = $laneUi[$id]
        $config = Ensure-Config
        $lane = Get-LaneConfig $config $id
        if ($lane -and [bool]$lane.enabled) {
            [Windows.Forms.MessageBox]::Show(
                'Hãy DỪNG LUỒNG trước khi đổi Work.',
                'MAGASIN BUSINESS OS',
                'OK',
                'Information'
            ) | Out-Null
            return
        }

        Save-Lane $id $ui.Project.Text $ui.Brain.Text '' $false $true
        $ui.Work.Text = ''
        [Windows.Forms.MessageBox]::Show(
            'Đã chuyển sang chế độ Robot tự tạo Work. Bấm BẮT ĐẦU LUỒNG để tiếp tục.',
            'MAGASIN BUSINESS OS',
            'OK',
            'Information'
        ) | Out-Null
    })
    $resetWork.Tag = $currentLaneId
}

function Refresh-Ui {
    $config = Ensure-Config
    $registry = Read-JsonFile $registryFile
    $status = Read-JsonFile $statusFile

    $runner = Get-RunnerProcess
    if ($runner) {
        $runnerButton.Text = '✓  GITHUB ĐANG KẾT NỐI'
        $runnerButton.BackColor = [Drawing.Color]::FromArgb(220,252,231)
    } else {
        $runnerButton.Text = '▶  KẾT NỐI GITHUB'
        $runnerButton.BackColor = [Drawing.Color]::FromArgb(255,247,237)
    }

    $enabledLaneCount = @($config.lanes | Where-Object { [bool]$_.enabled }).Count
    $ownerStop = Get-LifecycleOwnerStopState -Root $root
    $processTruth = Get-LifecycleProcessTruth -Root $root

    if ($enabledLaneCount -gt 0 -and -not $ownerStop.blocked -and -not $processTruth.healthy) {
        Request-LifecycleRecovery
        $processTruth = Get-LifecycleProcessTruth -Root $root
    }

    $processState = if ($enabledLaneCount -lt 1) {
        'ALL_DISABLED'
    } elseif ($ownerStop.blocked) {
        'OWNER_STOP'
    } elseif ($processTruth.healthy) {
        'HEALTHY'
    } elseif (-not $processTruth.wrapper_alive) {
        'STARTING'
    } else {
        'RECOVERING'
    }

    switch ($processState) {
        'HEALTHY' {
            $runtimeLabel.Text = 'ROBOT NỀN: ĐANG HOẠT ĐỘNG'
            $runtimeLabel.ForeColor = [Drawing.Color]::FromArgb(22,101,52)
        }
        'OWNER_STOP' {
            $runtimeLabel.Text = 'ROBOT NỀN: OWNER STOP — CHỈ BẠN CÓ THỂ KHỞI ĐỘNG LẠI'
            $runtimeLabel.ForeColor = [Drawing.Color]::FromArgb(185,28,28)
        }
        'ALL_DISABLED' {
            $runtimeLabel.Text = 'ROBOT NỀN: KHÔNG CẦN CHẠY — TẤT CẢ LUỒNG ĐANG TẮT'
            $runtimeLabel.ForeColor = [Drawing.Color]::FromArgb(71,85,105)
        }
        'STARTING' {
            $runtimeLabel.Text = 'ROBOT NỀN: ĐANG KHỞI ĐỘNG'
            $runtimeLabel.ForeColor = [Drawing.Color]::FromArgb(161,98,7)
        }
        default {
            $runtimeLabel.Text = 'ROBOT NỀN: ĐANG TỰ KHÔI PHỤC'
            $runtimeLabel.ForeColor = [Drawing.Color]::FromArgb(161,98,7)
        }
    }

    $runtimeStartButton.Enabled = [bool]($enabledLaneCount -gt 0 -and $ownerStop.blocked)

    foreach ($laneId in @('lane-1','lane-2','lane-3')) {
        $ui = $laneUi[$laneId]
        $cfg = Get-LaneConfig $config $laneId
        $reg = $null
        if ($registry -and $registry.lanes) {
            $reg = $registry.lanes.$laneId
        }
        $st = $null
        if ($status -and $status.lanes) {
            $st = @($status.lanes | Where-Object { [string]$_.lane_id -eq $laneId } | Select-Object -First 1)[0]
        }

        if (-not $ui.Project.Focused) { $ui.Project.Text = [string]$cfg.project_name }

        $enabled = [bool]$cfg.enabled
        if (-not $ui.Brain.Focused) {
            if ($enabled -and $st -and $st.brain_url) {
                $ui.Brain.Text = [string]$st.brain_url
            } elseif ($enabled -and $reg -and $reg.brain_url) {
                $ui.Brain.Text = [string]$reg.brain_url
            } elseif ($cfg -and $cfg.brain_url) {
                $ui.Brain.Text = [string]$cfg.brain_url
            } elseif ($reg -and $reg.brain_url) {
                $ui.Brain.Text = [string]$reg.brain_url
            } else {
                $ui.Brain.Text = ''
            }
        }
        if (-not $ui.Work.Focused) {
            if ($enabled -and $st -and $st.work_url) {
                $ui.Work.Text = [string]$st.work_url
            } elseif ($enabled -and $reg -and $reg.work_url) {
                $ui.Work.Text = [string]$reg.work_url
            } elseif ($cfg -and $cfg.work_url) {
                $ui.Work.Text = [string]$cfg.work_url
            } elseif ($reg -and $reg.work_url) {
                $ui.Work.Text = [string]$reg.work_url
            } else {
                $ui.Work.Text = ''
            }
        }

        $ui.Project.Enabled = -not $enabled
        $ui.Brain.Enabled = $true
        $ui.Work.Enabled = -not $enabled
        $ui.Start.Enabled = -not $enabled
        $ui.Stop.Enabled = $enabled
        $ui.SaveBrain.Enabled = $true

        $state = 'STOPPED'
        $message = 'Luồng đang dừng. Nhập link Bộ não rồi bấm BẮT ĐẦU LUỒNG.'

        if ($enabled) {
            if ($ownerStop.blocked) {
                $state = 'WAIT_OWNER'
                $message = 'Robot nền đang ở Owner STOP. Luồng vẫn được lưu; bấm KHỞI ĐỘNG ROBOT NỀN khi bạn muốn tiếp tục.'
            } elseif (-not $processTruth.healthy) {
                if ($processState -eq 'STARTING') {
                    $state = 'STARTING'
                    $message = 'Đang khởi động Robot nền; trạng thái cũ chỉ được giữ để recovery.'
                } else {
                    $state = 'RECOVERING'
                    $message = 'Đang tự khôi phục Supervisor / Three-Lane / Chrome / CDP trước khi tiếp tục task.'
                }
            } elseif ($st -and $st.status) {
                $state = [string]$st.status
                $message = if ($st.message) { [string]$st.message } else { 'Robot đang hoạt động.' }
            } else {
                $state = 'STARTING'
                $message = 'Runtime đã sống; đang chờ lane status mới.'
            }
        }

        $ui.Status.Text = Get-FriendlyStatus $state
        $ui.Panel.BackColor = Get-StatusBackColor $state
        $ui.Message.Text = $message
        $ui.Updated.Text = if ($processTruth.healthy -and $st -and $st.updated_at) {
            'Cập nhật: ' + (Format-VietnamTime ([string]$st.updated_at))
        } elseif ($enabled -and -not $processTruth.healthy) {
            'Cập nhật: đang xác minh PROCESS TRUTH'
        } else {
            'Cập nhật: —'
        }

        $ui.OpenBrain.Enabled = Test-ChatConversationUrl $ui.Brain.Text
        $ui.OpenWork.Enabled = Test-ChatConversationUrl $ui.Work.Text
        $ui.ResetWork.Enabled = -not $enabled
    }
}

$timer = New-Object Windows.Forms.Timer
$timer.Interval = 2000
$timer.Add_Tick({ Refresh-Ui })
$timer.Start()

Ensure-Config | Out-Null
Refresh-Ui
[void]$form.ShowDialog()
