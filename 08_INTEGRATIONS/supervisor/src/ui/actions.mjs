import { ACTIONS } from "../decision.mjs";

const SAFE_RETRY_RE = /^(try again|retry|thử lại)$/i;
const SAFE_CONTINUE_RE = /^(continue generating|continue response|tiếp tục tạo|tiếp tục)$/i;
const SAFE_SEND_RE = /^(send|send prompt|gửi|gửi tin nhắn)$/i;
const COMPOSER_SELECTOR =
  "#prompt-textarea:visible, [contenteditable='true'][role='textbox']:visible, textarea:visible, [contenteditable='true']:visible";

function composerLocator(page) {
  return page.locator(COMPOSER_SELECTOR).first();
}

async function composerReadyState(composer) {
  const visible = typeof composer?.isVisible === "function"
    ? await composer.isVisible().catch(() => false)
    : false;
  const enabled = typeof composer?.isEnabled === "function"
    ? await composer.isEnabled().catch(() => false)
    : visible;
  const editable = typeof composer?.isEditable === "function"
    ? await composer.isEditable().catch(() => false)
    : enabled;
  return { visible, enabled, editable, ready: visible && enabled && editable };
}

async function waitForReadyComposer(
  page,
  { timeoutMs = 8_000, intervalMs = 200 } = {}
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() <= deadline) {
    const composer = composerLocator(page);
    const state = await composerReadyState(composer);
    if (state.ready) return composer;
    await page.waitForTimeout(intervalMs);
  }
  return null;
}

function visibleControlSnapshot(page) {
  return page.evaluate(() => {
    const visible = (el) => {
      if (!el) return false;
      const style = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      return style.display !== "none" &&
        style.visibility !== "hidden" &&
        box.width > 0 &&
        box.height > 0;
    };

    return Array.from(document.querySelectorAll("button,[role='button']"))
      .filter(visible)
      .slice(0, 200)
      .map((el) => ({
        text: String(el.innerText || el.textContent || "").trim(),
        ariaLabel: String(el.getAttribute("aria-label") || "").trim(),
        testId: el.getAttribute("data-testid") || null,
        disabled: Boolean(el.disabled) || el.getAttribute("aria-disabled") === "true"
      }));
  });
}

function findSafeControl(controls, pattern, allowedTestIds = []) {
  return controls.find((control) => {
    if (control.disabled) return false;
    const candidates = [control.text, control.ariaLabel].filter(Boolean);
    return candidates.some((value) => pattern.test(value)) ||
      (control.testId && allowedTestIds.includes(control.testId));
  }) || null;
}

export async function inspectActionSurface(page) {
  if (!page) throw new TypeError("page is required");

  const composer = composerLocator(page);
  const composerState = await composerReadyState(composer);
  const composerReady = composerState.ready;
  const controls = await visibleControlSnapshot(page);

  return {
    composerReady,
    retryControl: findSafeControl(controls, SAFE_RETRY_RE),
    continueControl: findSafeControl(controls, SAFE_CONTINUE_RE),
    sendControl: findSafeControl(controls, SAFE_SEND_RE, ["send-button"])
  };
}

async function clickControlBySemantic(page, control) {
  if (!control) throw new Error("safe control not found");

  if (control.testId) {
    const locator = page.locator(`[data-testid="${control.testId}"]`).first();
    if (await locator.isVisible().catch(() => false)) {
      await locator.click();
      return;
    }
  }

  const exactText = control.ariaLabel || control.text;
  const locator = page.getByRole("button", { name: exactText, exact: true }).first();
  if (!(await locator.isVisible().catch(() => false))) {
    throw new Error("safe control disappeared before click");
  }
  await locator.click();
}

export async function sendComposerInstruction(
  page,
  instruction,
  { dryRun = true } = {}
) {
  if (!page) throw new TypeError("page is required");
  if (typeof instruction !== "string" || !instruction.trim()) {
    throw new Error("composer instruction is required");
  }

  const surface = await inspectActionSurface(page);
  if (!surface.composerReady && dryRun) {
    return {
      executed: false,
      dryRun,
      action: ACTIONS.CONTINUE,
      reason: "composer is not ready"
    };
  }

  if (dryRun) {
    return {
      executed: false,
      dryRun: true,
      action: ACTIONS.CONTINUE,
      target: "COMPOSER_SEND"
    };
  }

  const composer = await waitForReadyComposer(page);
  if (!composer) {
    return {
      executed: false,
      dryRun: false,
      action: ACTIONS.CONTINUE,
      reason: "composer is not ready; did not become editable before bounded timeout"
    };
  }
  await composer.fill(instruction, { timeout: 10_000 });

  const afterFill = await inspectActionSurface(page);
  if (afterFill.sendControl) {
    await clickControlBySemantic(page, afterFill.sendControl);
  } else {
    await composer.press("Enter");
  }

  return {
    executed: true,
    dryRun: false,
    action: ACTIONS.CONTINUE,
    target: "COMPOSER_SEND"
  };
}

export async function executeDecision({
  page,
  decision,
  dryRun = true
}) {
  if (!page) throw new TypeError("page is required");
  if (!decision || typeof decision.action !== "string") {
    throw new TypeError("decision with action is required");
  }

  const surface = await inspectActionSurface(page);

  if (decision.action === ACTIONS.WAIT ||
      decision.action === ACTIONS.STOP_WAIT_USER ||
      decision.action === ACTIONS.STOP_DONE) {
    return {
      executed: false,
      dryRun,
      action: decision.action,
      reason: "decision requires no UI action"
    };
  }

  if (decision.action === ACTIONS.RETRY) {
    if (!surface.retryControl) {
      return {
        executed: false,
        dryRun,
        action: decision.action,
        reason: "safe retry control not present"
      };
    }

    if (!dryRun) await clickControlBySemantic(page, surface.retryControl);
    return {
      executed: !dryRun,
      dryRun,
      action: decision.action,
      target: "SAFE_RETRY_CONTROL"
    };
  }

  if (decision.action === ACTIONS.CONTINUE) {
    if (surface.continueControl) {
      if (!dryRun) await clickControlBySemantic(page, surface.continueControl);
      return {
        executed: !dryRun,
        dryRun,
        action: decision.action,
        target: "SAFE_CONTINUE_CONTROL"
      };
    }

    if (typeof decision.instruction !== "string" || !decision.instruction.trim()) {
      throw new Error("continue decision is missing canonical instruction");
    }

    return sendComposerInstruction(page, decision.instruction, { dryRun });
  }

  throw new Error(`unsupported decision action: ${decision.action}`);
}


const ATTACHMENT_BUTTON_RE =
  /attach|upload|add files|add photos|đính kèm|tải lên|thêm tệp|thêm ảnh/i;

async function resolveFileInput(page) {
  let input = page.locator("input[type='file']").first();
  if (await input.count().catch(() => 0)) return input;

  const attachButton = page.getByRole("button", { name: ATTACHMENT_BUTTON_RE }).first();
  if (await attachButton.isVisible().catch(() => false)) {
    await attachButton.click();
    await page.waitForTimeout(250);
    input = page.locator("input[type='file']").first();
    if (await input.count().catch(() => 0)) return input;
  }
  return null;
}

async function waitForAttachmentReady(
  page,
  { timeoutMs = 45_000, intervalMs = 250 } = {}
) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() <= deadline) {
    const composer = composerLocator(page);
    const state = await composerReadyState(composer);
    const surface = await inspectActionSurface(page).catch(() => null);

    if (state.ready && surface?.sendControl) {
      return { ready: true, sendControl: surface.sendControl };
    }
    await page.waitForTimeout(intervalMs);
  }

  return {
    ready: false,
    reason: "attachment upload did not become ready before timeout"
  };
}

export async function sendComposerWithAttachment(
  page,
  instruction,
  filePath,
  { dryRun = true } = {}
) {
  if (!page) throw new TypeError("page is required");
  if (typeof instruction !== "string" || !instruction.trim()) {
    throw new Error("composer instruction is required");
  }
  if (typeof filePath !== "string" || !filePath.trim()) {
    throw new Error("attachment path is required");
  }

  const surface = await inspectActionSurface(page);
  if (!surface.composerReady && dryRun) {
    return {
      executed: false,
      dryRun,
      action: ACTIONS.CONTINUE,
      reason: "composer is not ready"
    };
  }

  if (dryRun) {
    return {
      executed: false,
      dryRun: true,
      action: ACTIONS.CONTINUE,
      target: "COMPOSER_ATTACHMENT_SEND"
    };
  }

  const composer = await waitForReadyComposer(page);
  if (!composer) {
    return {
      executed: false,
      dryRun: false,
      action: ACTIONS.CONTINUE,
      reason: "composer is not ready; did not become editable before bounded timeout"
    };
  }

  // ChatGPT disables the composer while an uploaded image is being processed.
  // Fill the relay text first, then attach the screenshot, then wait until both
  // the composer and the explicit Send control are enabled again.
  await composer.fill(instruction, { timeout: 10_000 });

  const input = await resolveFileInput(page);
  if (!input) {
    return {
      executed: false,
      dryRun: false,
      action: ACTIONS.CONTINUE,
      reason: "attachment input is not available"
    };
  }

  await input.setInputFiles(filePath);

  const ready = await waitForAttachmentReady(page);
  if (!ready.ready) {
    return {
      executed: false,
      dryRun: false,
      action: ACTIONS.CONTINUE,
      reason: ready.reason
    };
  }

  await clickControlBySemantic(page, ready.sendControl);

  return {
    executed: true,
    dryRun: false,
    action: ACTIONS.CONTINUE,
    target: "COMPOSER_ATTACHMENT_SEND"
  };
}
