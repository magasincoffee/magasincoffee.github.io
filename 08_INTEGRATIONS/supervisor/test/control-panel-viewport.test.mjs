import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const panelUrl = new URL("../windows/control-panel.ps1", import.meta.url);

async function panelSource() {
  return fs.readFile(panelUrl, "utf8");
}

test("Control Panel viewport is monitor-aware and no longer locked to 1240x930", async () => {
  const source = await panelSource();

  assert.match(source, /function Get-ControlPanelViewportLayout\(\[Drawing\.Rectangle\]\$WorkingArea\)/);
  assert.match(source, /Screen\]::FromPoint\(\[Windows\.Forms\.Cursor\]::Position\)/);
  assert.match(source, /\$form\.Size = \$viewportLayout\.InitialSize/);
  assert.match(source, /\$form\.MinimumSize = \$viewportLayout\.MinimumSize/);
  assert.match(source, /\$form\.Location = \$viewportLayout\.Location/);
  assert.doesNotMatch(source, /\$form\.MinimumSize = New-Object Drawing\.Size\(1240, 930\)/);
});

test("Control Panel uses a scrollable logical canvas that contains all three lane cards", async () => {
  const source = await panelSource();

  assert.match(source, /\$scrollHost\.Dock = \[Windows\.Forms\.DockStyle\]::Fill/);
  assert.match(source, /\$scrollHost\.AutoScroll = \$true/);
  assert.match(source, /\$scrollHost\.AutoScrollMinSize = \$viewportLayout\.LogicalCanvasSize/);
  assert.match(source, /New-Object Drawing\.Size\(1215, 890\)/);
  assert.match(source, /\$cardY = @\(135, 385, 635\)/);
  assert.match(source, /for \(\$i = 0; \$i -lt 3; \$i\+\+\)/);
  assert.match(source, /\$content\.Controls\.Add\(\$panel\)/);
});

test("viewport contract stays usable for 1080p, 900p and 768p working heights", async () => {
  const source = await panelSource();

  const desired = source.match(/\$desiredWindow = New-Object Drawing\.Size\((\d+), (\d+)\)/);
  const canvas = source.match(/\$logicalCanvas = New-Object Drawing\.Size\((\d+), (\d+)\)/);
  assert.ok(desired);
  assert.ok(canvas);

  const desiredWidth = Number(desired[1]);
  const desiredHeight = Number(desired[2]);
  const canvasWidth = Number(canvas[1]);
  const canvasHeight = Number(canvas[2]);

  function layout(width, height) {
    const initialWidth = Math.min(desiredWidth, Math.max(320, width));
    const initialHeight = Math.min(desiredHeight, Math.max(320, height));
    let minimumWidth = Math.min(900, Math.max(640, width - 24));
    let minimumHeight = Math.min(600, Math.max(420, height - 24));
    minimumWidth = Math.min(minimumWidth, initialWidth);
    minimumHeight = Math.min(minimumHeight, initialHeight);
    return { initialWidth, initialHeight, minimumWidth, minimumHeight };
  }

  for (const [width, height] of [
    [1920, 1040],
    [1600, 860],
    [1366, 728]
  ]) {
    const result = layout(width, height);
    assert.ok(result.initialWidth <= width);
    assert.ok(result.initialHeight <= height);
    assert.ok(result.minimumWidth <= result.initialWidth);
    assert.ok(result.minimumHeight <= result.initialHeight);
  }

  const low = layout(1366, 728);
  assert.ok(low.initialHeight < canvasHeight, "low viewport must scroll vertically");
  assert.ok(low.initialWidth >= canvasWidth, "1366-wide viewport should not require horizontal scrolling");
});

test("DPI scaling contract is explicit and scrolling remains available", async () => {
  const source = await panelSource();

  assert.match(source, /\$form\.AutoScaleMode = \[Windows\.Forms\.AutoScaleMode\]::Dpi/);
  assert.match(source, /\$form\.AutoScaleDimensions = New-Object Drawing\.SizeF\(96, 96\)/);
  assert.match(source, /\$scrollHost\.AutoScroll = \$true/);
  assert.doesNotMatch(source, /\$form\.FormBorderStyle\s*=\s*['"]Fixed/);
  assert.doesNotMatch(source, /\$form\.MinimizeBox\s*=\s*\$false/);
  assert.doesNotMatch(source, /\$form\.MaximizeBox\s*=\s*\$false/);
});

test("all lane START and STOP controls remain reachable content and preserve handlers", async () => {
  const source = await panelSource();

  assert.match(source, /\$startButton\.Text = '▶  BẮT ĐẦU LUỒNG'/);
  assert.match(source, /\$stopButton\.Text = '■  DỪNG LUỒNG'/);
  assert.match(source, /\$panel\.Controls\.Add\(\$startButton\)/);
  assert.match(source, /\$panel\.Controls\.Add\(\$stopButton\)/);
  assert.match(source, /Stop = \$stopButton/);
  assert.match(source, /\$stopButton\.Tag = \$currentLaneId/);

  assert.match(
    source,
    /\$startButton\.Add_Click\(\{[\s\S]*?Save-Lane \$id \$ui\.Project\.Text \$brainUrl \$workUrl \$true[\s\S]*?\}\)/
  );
  assert.match(
    source,
    /\$stopButton\.Add_Click\(\{[\s\S]*?Save-Lane \$id \$ui\.Project\.Text \$ui\.Brain\.Text \$ui\.Work\.Text \$false[\s\S]*?\}\)/
  );
});

test("viewport patch preserves lifecycle truth, Owner STOP and refresh timer semantics", async () => {
  const source = await panelSource();

  assert.match(source, /Get-LifecycleOwnerStopState -Root \$root/);
  assert.match(source, /Get-LifecycleProcessTruth -Root \$root/);
  assert.match(source, /if \(\$enabledLaneCount -gt 0 -and -not \$ownerStop\.blocked -and -not \$processTruth\.healthy\)/);
  assert.match(source, /\$runtimeStartButton\.Enabled = \[bool\]\(\$enabledLaneCount -gt 0 -and \$ownerStop\.blocked\)/);
  assert.match(source, /\$timer\.Interval = 2000/);
  assert.match(source, /\$timer\.Add_Tick\(\{ Refresh-Ui \}\)/);
  assert.match(source, /\$timer\.Start\(\)/);
  assert.match(source, /\[void\]\$form\.ShowDialog\(\)/);
});
