import crypto from "node:crypto";

export function digestCapturedResponse(text) {
  return crypto.createHash("sha256").update(String(text || ""), "utf8").digest("hex");
}

export async function captureCompletedAssistantTurn(page) {
  if (!page) throw new TypeError("page is required");

  const captured = await page.evaluate(() => {
    const messages = Array.from(
      document.querySelectorAll("[data-message-author-role]")
    );
    const last = messages.at(-1) || null;
    if (!last || last.getAttribute("data-message-author-role") !== "assistant") {
      return null;
    }

    const text = String(last.innerText || last.textContent || "").trim();
    let turn = 0;
    const turnNode = last.closest("[data-testid^='conversation-turn-']") ||
      last.querySelector("[data-testid^='conversation-turn-']");
    if (turnNode) {
      const match = /^conversation-turn-(\d+)$/.exec(
        String(turnNode.getAttribute("data-testid") || "")
      );
      if (match) turn = Number(match[1]);
    }

    return { text, turn, chars: text.length };
  });

  if (!captured?.text) return null;
  return {
    ...captured,
    digest: digestCapturedResponse(captured.text)
  };
}
