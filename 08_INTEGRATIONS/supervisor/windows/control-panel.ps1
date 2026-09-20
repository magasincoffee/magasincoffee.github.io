param(
    [switch]$ViewportProbe,
    [int]$ProbeWidth = 0,
    [int]$ProbeHeight = 0
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'

function Get-ControlPanelViewportLayout([Drawing.Rectangle]$WorkingArea) {
    $desiredWindow = New-Object Drawing.Size(1240, 930)
    $logicalCanvas = New-Object Drawing.Size(1215, 890)

    $initialWidth = [Math]::Min($desiredWindow.Width, [Math]::Max(320, $WorkingArea.Width))
    $initialHeight = [Math]::Min($desiredWindow.Height, [Math]::Max(320, $WorkingArea.Height))

    # Keep a useful resize floor on normal displays without ever forcing the
    # window beyond the monitor WorkingArea on smaller/scaled displays.
    $minimumWidth = [Math]::Min(900, [Math]::Max(640, $WorkingArea.Width - 24))
    $minimumHeight = [Math]::Min(600, [Math]::Max(420, $WorkingArea.Height - 24))
    $minimumWidth = [Math]::Min($minimumWidth, $initialWidth)
    $minimumHeight = [Math]::Min($minimumHeight, $initialHeight)

    $left = $WorkingArea.Left + [Math]::Max(
        0,
        [int](($WorkingArea.Width - $initialWidth) / 2)
    )
    $top = $WorkingArea.Top + [Math]::Max(
        0,
        [int](($WorkingArea.Height - $initialHeight) / 2)
    )

    return [pscustomobject]@{
        InitialSize = New-Object Drawing.Size($initialWidth, $initialHeight)
        MinimumSize = New-Object Drawing.Size($minimumWidth, $minimumHeight)
        Location = New-Object Drawing.Point($left, $top)
        LogicalCanvasSize = $logicalCanvas
    }
}

if ($ViewportProbe) {
    $probeWorkingArea = if ($ProbeWidth -gt 0 -and $ProbeHeight -gt 0) {
        New-Object Drawing.Rectangle(0, 0, $ProbeWidth, $ProbeHeight)
    } else {
        [Windows.Forms.Screen]::FromPoint([Windows.Forms.Cursor]::Position).WorkingArea
    }
    $probeLayout = Get-ControlPanelViewportLayout -WorkingArea $probeWorkingArea
    [pscustomobject]@{
        working_width = $probeWorkingArea.Width
        working_height = $probeWorkingArea.Height
        initial_width = $probeLayout.InitialSize.Width
        initial_height = $probeLayout.InitialSize.Height
        minimum_width = $probeLayout.MinimumSize.Width
        minimum_height = $probeLayout.MinimumSize.Height
        logical_width = $probeLayout.LogicalCanvasSize.Width
        logical_height = $probeLayout.LogicalCanvasSize.Height
        vertical_scroll_required = [bool]($probeLayout.InitialSize.Height -lt $probeLayout.LogicalCanvasSize.Height)
        lane3_stop_bottom = 851
        lane3_stop_in_canvas = [bool]($probeLayout.LogicalCanvasSize.Height -ge 851)
    } | ConvertTo-Json -Compress
    exit 0
}

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
            [ordered]@{ lane_id='lane-1'; project_name='Dự án 1'; brain_url=''; brain_url_revision=0; work_url=''; work_url_revision=0; work_url_saved_at=$null; work_mode='AUTO'; relay_retry_rearm_revision=0; relay_retry_rearm_requested_at=$null; enabled=$false },
            [ordered]@{ lane_id='lane-2'; project_name='Dự án 2'; brain_url=''; brain_url_revision=0; work_url=''; work_url_revision=0; work_url_saved_at=$null; work_mode='AUTO'; relay_retry_rearm_revision=0; relay_retry_rearm_requested_at=$null; enabled=$false },
            [ordered]@{ lane_id='lane-3'; project_name='Dự án 3'; brain_url=''; brain_url_revision=0; work_url=''; work_url_revision=0; work_url_saved_at=$null; work_mode='AUTO'; relay_retry_rearm_revision=0; relay_retry_rearm_requested_at=$null; enabled=$false }
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

function ConvertTo-CanonicalChatConversationUrl([string]$Url) {
    if (-not $Url) { throw 'URL trống' }
    $uri = [Uri]$Url
    if (
        $uri.Scheme -ne 'https' -or
        $uri.Host -notmatch '(^|\.)chatgpt\.com$' -or
        $uri.AbsolutePath -notmatch '^/(c|g|project)/'
    ) {
        throw 'URL phải là cuộc trò chuyện ChatGPT cụ thể'
    }

    $path = $uri.AbsolutePath
    if ($path -match '^/c/WEB:([0-9a-fA-F-]{36})$') {
        $path = '/c/' + $Matches[1]
    }
    return 'https://chatgpt.com' + $path
}

function Test-ChatConversationUrl([string]$Url) {
    try {
        [void](ConvertTo-CanonicalChatConversationUrl $Url)
        return $true
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
    [bool]$Enabled
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
    }

    $lane.project_name = if ($ProjectName) { $ProjectName.Trim() } else { $LaneId }
    $lane.brain_url = $newBrainUrl
    $lane.enabled = $Enabled
    Write-JsonAtomic $configFile $config
}

function Save-WorkTarget(
    [string]$LaneId,
    [string]$WorkUrl = '',
    [bool]$RobotManaged = $false,
    [bool]$ForceRevision = $false
) {
    $config = Ensure-Config
    $lane = Get-LaneConfig $config $LaneId
    if (-not $lane) { throw "Không tìm thấy $LaneId" }

    if (-not $lane.PSObject.Properties['work_url']) {
        $lane | Add-Member -NotePropertyName 'work_url' -NotePropertyValue ''
    }
    if (-not $lane.PSObject.Properties['work_url_revision']) {
        $lane | Add-Member -NotePropertyName 'work_url_revision' -NotePropertyValue 0
    }
    if (-not $lane.PSObject.Properties['work_url_saved_at']) {
        $lane | Add-Member -NotePropertyName 'work_url_saved_at' -NotePropertyValue $null
    }
    if (-not $lane.PSObject.Properties['work_mode']) {
        $legacyMode = if ([string]$lane.work_url) { 'OWNER' } else { 'AUTO' }
        $lane | Add-Member -NotePropertyName 'work_mode' -NotePropertyValue $legacyMode
    }

    $newMode = if ($RobotManaged) { 'AUTO' } else { 'OWNER' }
    $newWorkUrl = if ($RobotManaged) {
        ''
    } else {
        ConvertTo-CanonicalChatConversationUrl $WorkUrl
    }

    $currentMode = ([string]$lane.work_mode).ToUpperInvariant()
    if ($currentMode -notin @('OWNER','AUTO')) {
        $currentMode = if ([string]$lane.work_url) { 'OWNER' } else { 'AUTO' }
    }
    $currentWorkUrl = ''
    if ($currentMode -eq 'OWNER' -and [string]$lane.work_url) {
        try {
            $currentWorkUrl = ConvertTo-CanonicalChatConversationUrl ([string]$lane.work_url)
        } catch {
            $currentWorkUrl = ([string]$lane.work_url).Trim()
        }
    }

    if (
        -not $ForceRevision -and
        $currentMode -eq $newMode -and
        $currentWorkUrl -eq $newWorkUrl
    ) {
        return [pscustomobject]@{
            Changed = $false
            Revision = [int]$lane.work_url_revision
            SavedAt = $lane.work_url_saved_at
            Mode = $currentMode
        }
    }

    $lane.work_url = $newWorkUrl
    $lane.work_mode = $newMode
    $lane.work_url_revision = [int]$lane.work_url_revision + 1
    $lane.work_url_saved_at = [DateTimeOffset]::UtcNow.ToString('o')
    Write-JsonAtomic $configFile $config

    return [pscustomobject]@{
        Changed = $true
        Revision = [int]$lane.work_url_revision
        SavedAt = [string]$lane.work_url_saved_at
        Mode = $newMode
    }
}

function Request-RelayRetryRearm([string]$LaneId) {
    $config = Ensure-Config
    $lane = Get-LaneConfig $config $LaneId
    if (-not $lane) { throw "Không tìm thấy $LaneId" }

    if (-not $lane.PSObject.Properties['relay_retry_rearm_revision']) {
        $lane | Add-Member -NotePropertyName 'relay_retry_rearm_revision' -NotePropertyValue 0
    }
    if (-not $lane.PSObject.Properties['relay_retry_rearm_requested_at']) {
        $lane | Add-Member -NotePropertyName 'relay_retry_rearm_requested_at' -NotePropertyValue $null
    }

    $lane.relay_retry_rearm_revision = [int]$lane.relay_retry_rearm_revision + 1
    $lane.relay_retry_rearm_requested_at = [DateTimeOffset]::UtcNow.ToString('o')
    Write-JsonAtomic $configFile $config

    return [pscustomobject]@{
        Revision = [int]$lane.relay_retry_rearm_revision
        RequestedAt = [string]$lane.relay_retry_rearm_requested_at
    }
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
$form.StartPosition = 'Manual'
$form.AutoScaleMode = [Windows.Forms.AutoScaleMode]::Dpi
$form.AutoScaleDimensions = New-Object Drawing.SizeF(96, 96)

$currentScreen = [Windows.Forms.Screen]::FromPoint([Windows.Forms.Cursor]::Position)
$viewportLayout = Get-ControlPanelViewportLayout -WorkingArea $currentScreen.WorkingArea
$form.Size = $viewportLayout.InitialSize
$form.MinimumSize = $viewportLayout.MinimumSize
$form.Location = $viewportLayout.Location
$form.BackColor = [Drawing.Color]::FromArgb(248,250,252)
$form.Font = New-Object Drawing.Font('Segoe UI', 9)

$scrollHost = New-Object Windows.Forms.Panel
$scrollHost.Dock = [Windows.Forms.DockStyle]::Fill
$scrollHost.AutoScroll = $true
$scrollHost.BackColor = $form.BackColor
$form.Controls.Add($scrollHost)

$content = New-Object Windows.Forms.Panel
$content.Location = New-Object Drawing.Point(0, 0)
$content.Size = $viewportLayout.LogicalCanvasSize
$content.BackColor = $form.BackColor
$scrollHost.Controls.Add($content)
$scrollHost.AutoScrollMinSize = $viewportLayout.LogicalCanvasSize

$title = New-Object Windows.Forms.Label
$title.Text = 'MAGASIN BUSINESS OS'
$title.Location = New-Object Drawing.Point(28, 22)
$title.Size = New-Object Drawing.Size(430, 42)
$title.Font = New-Object Drawing.Font('Segoe UI Semibold', 23)
$content.Controls.Add($title)

$subtitle = New-Object Windows.Forms.Label
$subtitle.Text = '3 LUỒNG ĐỘC LẬP  •  BỘ NÃO DO BẠN CHỌN  •  WORK: BẠN CHỌN HOẶC ROBOT TỰ TẠO'
$subtitle.Location = New-Object Drawing.Point(520, 34)
$subtitle.Size = New-Object Drawing.Size(665, 26)
$subtitle.TextAlign = 'MiddleRight'
$subtitle.ForeColor = [Drawing.Color]::FromArgb(71,85,105)
$content.Controls.Add($subtitle)

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
$content.Controls.Add($runnerButton)

$runtimeLabel = New-Object Windows.Forms.Label
$runtimeLabel.Location = New-Object Drawing.Point(310, 82)
$runtimeLabel.Size = New-Object Drawing.Size(500, 32)
$runtimeLabel.Font = New-Object Drawing.Font('Segoe UI Semibold', 10)
$content.Controls.Add($runtimeLabel)

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
$content.Controls.Add($runtimeStartButton)

$repoButton = New-Object Windows.Forms.Button
$repoButton.Location = New-Object Drawing.Point(1015, 76)
$repoButton.Size = New-Object Drawing.Size(170, 42)
$repoButton.Text = 'MỞ DỰ ÁN'
$repoButton.Add_Click({ Start-Process $repoUrl })
$content.Controls.Add($repoButton)

$laneUi = @{}
$cardY = @(135, 385, 635)

for ($i = 0; $i -lt 3; $i++) {
    $laneId = "lane-$($i + 1)"
    $panel = New-Object Windows.Forms.Panel
    $panel.Location = New-Object Drawing.Point(28, $cardY[$i])
    $panel.Size = New-Object Drawing.Size(1157, 228)
    $panel.BorderStyle = 'FixedSingle'
    $panel.BackColor = [Drawing.Color]::White
    $content.Controls.Add($panel)

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
    $workBox.Size = New-Object Drawing.Size(635, 27)
    $workBox.ReadOnly = $false
    $workBox.BackColor = [Drawing.Color]::White
    $panel.Controls.Add($workBox)

    $openWork = New-Object Windows.Forms.Button
    $openWork.Text = 'MỞ WORK'
    $openWork.Location = New-Object Drawing.Point(775, 94)
    $openWork.Size = New-Object Drawing.Size(108, 34)
    $panel.Controls.Add($openWork)

    $saveWork = New-Object Windows.Forms.Button
    $saveWork.Text = 'LƯU WORK'
    $saveWork.Location = New-Object Drawing.Point(892, 94)
    $saveWork.Size = New-Object Drawing.Size(108, 34)
    $panel.Controls.Add($saveWork)

    $resetWork = New-Object Windows.Forms.Button
    $resetWork.Text = 'TỰ TẠO WORK'
    $resetWork.Location = New-Object Drawing.Point(1009, 94)
    $resetWork.Size = New-Object Drawing.Size(116, 34)
    $panel.Controls.Add($resetWork)

    $messageLabel = New-Object Windows.Forms.Label
    $messageLabel.Text = 'THÔNG BÁO'
    $messageLabel.Location = New-Object Drawing.Point(18, 141)
    $messageLabel.Size = New-Object Drawing.Size(105, 24)
    $panel.Controls.Add($messageLabel)

    $messageValue = New-Object Windows.Forms.Label
    $messageValue.Location = New-Object Drawing.Point(125, 138)
    $messageValue.Size = New-Object Drawing.Size(635, 48)
    $messageValue.AutoEllipsis = $true
    $panel.Controls.Add($messageValue)

    $updatedValue = New-Object Windows.Forms.Label
    $updatedValue.Location = New-Object Drawing.Point(125, 190)
    $updatedValue.Size = New-Object Drawing.Size(635, 22)
    $updatedValue.ForeColor = [Drawing.Color]::FromArgb(100,116,139)
    $panel.Controls.Add($updatedValue)

    $retryRelayButton = New-Object Windows.Forms.Button
    $retryRelayButton.Text = 'THỬ LẠI RELAY'
    $retryRelayButton.Location = New-Object Drawing.Point(775, 145)
    $retryRelayButton.Size = New-Object Drawing.Size(110, 71)
    $retryRelayButton.Enabled = $false
    $retryRelayButton.Visible = $false
    $panel.Controls.Add($retryRelayButton)

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
        SaveWork = $saveWork
        ResetWork = $resetWork
        RetryRelay = $retryRelayButton
    }

    $currentLaneId = $laneId
    $startButton.Add_Click({
        $id = $this.Tag
        $ui = $laneUi[$id]
        $brainUrl = $ui.Brain.Text.Trim()
        if (-not (Test-ChatConversationUrl $brainUrl)) {
            [Windows.Forms.MessageBox]::Show(
                'Hãy dán đúng link cuộc trò chuyện ChatGPT dùng làm BỘ NÃO cho luồng này.',
                'MAGASIN BUSINESS OS',
                'OK',
                'Warning'
            ) | Out-Null
            return
        }
        # Lane START changes only Owner lane intent: disabled -> enabled.
        # Process recovery is a separate lifecycle concern handled by Refresh-Ui.
        Save-Lane $id $ui.Project.Text $brainUrl $true
    })
    $startButton.Tag = $currentLaneId

    $stopButton.Add_Click({
        $id = $this.Tag
        $ui = $laneUi[$id]
        Save-Lane $id $ui.Project.Text $ui.Brain.Text $false
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

    $saveWork.Add_Click({
        $id = $this.Tag
        $ui = $laneUi[$id]
        $workUrl = $ui.Work.Text.Trim()
        if (-not (Test-ChatConversationUrl $workUrl)) {
            [Windows.Forms.MessageBox]::Show(
                'LINK WORK không hợp lệ. Hãy dán đúng link cuộc trò chuyện ChatGPT.',
                'MAGASIN BUSINESS OS',
                'OK',
                'Warning'
            ) | Out-Null
            return
        }

        $saved = Save-WorkTarget $id $workUrl
        if ($saved.Changed) {
            [Windows.Forms.MessageBox]::Show(
                ('ĐÃ LƯU WORK · revision ' + $saved.Revision + ' · ' + (Format-VietnamTime $saved.SavedAt) + '. Robot sẽ nhận revision ở vòng xử lý kế tiếp; task đang chạy không bị bỏ.'),
                'MAGASIN BUSINESS OS',
                'OK',
                'Information'
            ) | Out-Null
        } else {
            [Windows.Forms.MessageBox]::Show(
                ('WORK không đổi · revision ' + $saved.Revision + '. Không tăng revision.'),
                'MAGASIN BUSINESS OS',
                'OK',
                'Information'
            ) | Out-Null
        }
    })
    $saveWork.Tag = $currentLaneId

    $resetWork.Add_Click({
        $id = $this.Tag
        $saved = Save-WorkTarget $id '' $true $true
        [Windows.Forms.MessageBox]::Show(
            ('ĐÃ LƯU TỰ TẠO WORK · revision ' + $saved.Revision + ' · ' + (Format-VietnamTime $saved.SavedAt) + '. Nếu có task đang chạy, Work hiện tại được giữ đến safe boundary; Robot không bỏ task.'),
            'MAGASIN BUSINESS OS',
            'OK',
            'Information'
        ) | Out-Null
    })
    $resetWork.Tag = $currentLaneId

    $retryRelayButton.Add_Click({
        $id = $this.Tag
        $requested = Request-RelayRetryRearm $id
        [Windows.Forms.MessageBox]::Show(
            ('ĐÃ YÊU CẦU THỬ LẠI RELAY — revision ' + $requested.Revision + '. Robot sẽ reconcile marker trước; không đổi Brain/Work và không reset task.'),
            'MAGASIN BUSINESS OS',
            'OK',
            'Information'
        ) | Out-Null
        $this.Enabled = $false
    })
    $retryRelayButton.Tag = $currentLaneId
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
            $configuredMode = if ($cfg -and $cfg.work_mode) {
                ([string]$cfg.work_mode).ToUpperInvariant()
            } elseif ($cfg -and $cfg.work_url) {
                'OWNER'
            } else {
                'AUTO'
            }

            if ($configuredMode -eq 'OWNER' -and $cfg -and $cfg.work_url) {
                # The textbox represents the latest Owner intent. During an
                # active task the runtime may still execute the old Work until
                # the pending revision reaches a safe boundary.
                $ui.Work.Text = [string]$cfg.work_url
            } elseif ($enabled -and $st -and $st.work_url) {
                $ui.Work.Text = [string]$st.work_url
            } elseif ($reg -and $reg.work_url) {
                $ui.Work.Text = [string]$reg.work_url
            } else {
                $ui.Work.Text = ''
            }
        }

        $ui.Project.Enabled = -not $enabled
        $ui.Brain.Enabled = $true
        $ui.Work.Enabled = $true
        $ui.Start.Enabled = -not $enabled
        $ui.Stop.Enabled = $enabled
        $ui.SaveBrain.Enabled = $true
        $ui.SaveWork.Enabled = $true

        $relayExhausted = [bool](
            $reg -and
            $reg.relay_inflight -and
            $reg.relay_inflight.retry_exhausted
        )
        $relayRearmRevision = if ($cfg -and $cfg.relay_retry_rearm_revision) {
            [int]$cfg.relay_retry_rearm_revision
        } else { 0 }
        $appliedRelayRearmRevision = if ($reg -and $reg.applied_relay_retry_rearm_revision) {
            [int]$reg.applied_relay_retry_rearm_revision
        } else { 0 }
        $relayRearmPending = [bool]($relayRearmRevision -gt $appliedRelayRearmRevision)
        $ui.RetryRelay.Visible = $relayExhausted
        $ui.RetryRelay.Enabled = [bool]($relayExhausted -and -not $relayRearmPending)

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

        if ($relayExhausted) {
            $state = 'WAIT_OWNER'
            if ($relayRearmPending) {
                $message = 'ĐÃ YÊU CẦU THỬ LẠI RELAY — revision ' + $relayRearmRevision + '. Đang chờ Robot reconcile marker và apply đúng một lần.'
            } else {
                $message = 'RELAY HẾT LƯỢT THỬ — kiểm tra Brain rồi bấm THỬ LẠI RELAY.'
            }
            if ($ownerStop.blocked) {
                $message += ' Robot đang Owner STOP; intent được lưu nhưng chỉ apply sau khi bạn START lại.'
            }
        }

        $ui.Status.Text = Get-FriendlyStatus $state
        $ui.Panel.BackColor = Get-StatusBackColor $state
        $ui.Message.Text = $message
        $configuredRevision = if ($cfg -and $cfg.work_url_revision) {
            [int]$cfg.work_url_revision
        } else { 0 }
        $appliedRevision = if ($reg -and $reg.applied_work_url_revision) {
            [int]$reg.applied_work_url_revision
        } else { 0 }
        $pendingRevision = if ($reg -and $reg.pending_work_url_revision) {
            [int]$reg.pending_work_url_revision
        } else { 0 }
        $configuredMode = if ($cfg -and $cfg.work_mode) {
            ([string]$cfg.work_mode).ToUpperInvariant()
        } elseif ($cfg -and $cfg.work_url) {
            'OWNER'
        } else {
            'AUTO'
        }
        $workApplyState = if ($configuredRevision -gt 0 -and $pendingRevision -ge $configuredRevision) {
            'ĐANG CHỜ ÁP DỤNG'
        } elseif ($configuredRevision -gt 0 -and $appliedRevision -ge $configuredRevision) {
            'ĐÃ ÁP DỤNG'
        } elseif ($configuredRevision -gt 0) {
            'ĐÃ LƯU'
        } else {
            'CHƯA CÓ REVISION'
        }
        $savedAt = if ($cfg -and $cfg.work_url_saved_at) {
            Format-VietnamTime ([string]$cfg.work_url_saved_at)
        } else {
            '—'
        }
        $ui.Updated.Text = 'WORK ' + $configuredMode + ' · revision ' + $configuredRevision + ' · ' + $workApplyState + ' · ' + $savedAt

        $ui.OpenBrain.Enabled = Test-ChatConversationUrl $ui.Brain.Text
        $ui.OpenWork.Enabled = Test-ChatConversationUrl $ui.Work.Text
        $ui.ResetWork.Enabled = $true
    }
}

$timer = New-Object Windows.Forms.Timer
$timer.Interval = 2000
$timer.Add_Tick({ Refresh-Ui })
$timer.Start()

Ensure-Config | Out-Null
Refresh-Ui
[void]$form.ShowDialog()
