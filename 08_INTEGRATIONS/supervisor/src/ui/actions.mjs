import { ACTIONS } from "../decision.mjs";

const SAFE_RETRY_RE = /^(try again|retry|thử lại)$/i;
const SAFE_CONTINUE_RE = /^(continue generating|continue response|tiếp tục tạo|tiếp tục)$/i;
const SAFE_SEND_RE = /^(send|send prompt|gửi|gửi tin nhắn)$/i;

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
        testId: el.getAttribute("data-testid") || null
      }));
  });
}

function findSafeControl(controls, pattern, allowedTestIds = []) {
  return controls.find((control) => {
    const candidates = [control.text, control.ariaLabel].filter(Boolean);
    return candidates.some((value) => pattern.test(value)) ||
      (control.testId && allowedTestIds.includes(control.testId));
  }) || null;
}

export async function inspectActionSurface(page) {
  if (!page) throw new TypeError("page is required");

  const composer = page.locator("#prompt-textarea, textarea, [contenteditable='true']").first();
  const composerReady = await composer.isVisible().catch(() => false);
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

    if (!surface.composerReady) {
      return {
        executed: false,
        dryRun,
        action: decision.action,
        reason: "composer is not ready"
      };
    }

    if (typeof decision.instruction !== "string" || !decision.instruction.trim()) {
      throw new Error("continue decision is missing canonical instruction");
    }

    if (dryRun) {
      return {
        executed: false,
        dryRun: true,
        action: decision.action,
        target: "COMPOSER_SEND"
      };
    }

    const composer = page.locator("#prompt-textarea, textarea, [contenteditable='true']").first();
    await composer.fill(decision.instruction);

    const afterFill = await inspectActionSurface(page);
    if (afterFill.sendControl) {
      await clickControlBySemantic(page, afterFill.sendControl);
    } else {
      await composer.press("Enter");
    }

    return {
      executed: true,
      dryRun: false,
      action: decision.action,
      target: "COMPOSER_SEND"
    };
  }

  throw new Error(`unsupported decision action: ${decision.action}`);
}
