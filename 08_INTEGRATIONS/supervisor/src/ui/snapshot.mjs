const NORMALIZE = String.raw`
(text) => (text || "").replace(/\s+/g, " ").trim()
`;

export async function collectSafeUiSnapshot(page) {
  return page.evaluate(
    ({ normalizeSource }) => {
      const normalize = eval(normalizeSource);
      const visible = (el) => {
        if (!el) return false;
        const style = getComputedStyle(el);
        const box = el.getBoundingClientRect();
        return style.display !== "none" &&
          style.visibility !== "hidden" &&
          box.width > 0 &&
          box.height > 0;
      };

      const controls = Array.from(
        document.querySelectorAll("button,a,[role='button'],[role='alert']")
      )
        .filter(visible)
        .slice(0, 160)
        .map((el) => ({
          tag: el.tagName.toLowerCase(),
          role: el.getAttribute("role"),
          text: normalize(el.innerText || el.textContent).slice(0, 120),
          ariaLabel: normalize(el.getAttribute("aria-label")).slice(0, 120),
          testId: el.getAttribute("data-testid") || null
        }));

      const haystack = controls
        .flatMap((item) => [item.text, item.ariaLabel, item.testId || ""])
        .join(" | ")
        .toLowerCase();

      const composer = [
        document.querySelector("#prompt-textarea"),
        ...document.querySelectorAll("textarea,[contenteditable='true']")
      ].find(visible);

      const frames = Array.from(document.querySelectorAll("iframe"))
        .map((el) => String(el.src || "").toLowerCase());

      const path = location.pathname || "";
      const conversationPath =
        /^\/c\//.test(path) ||
        /^\/g\//.test(path) ||
        /^\/project\//.test(path);

      const loginRequired =
        /(^|\W)(log in|login|đăng nhập)(\W|$)/i.test(haystack) &&
        !composer;

      const hasCaptcha =
        frames.some((src) =>
          /turnstile|recaptcha|hcaptcha|challenge/.test(src)
        ) ||
        /verify you are human|xác minh bạn là người|captcha/.test(haystack);

      const responseRunning =
        /stop generating|dừng tạo|stop response/.test(haystack);

      const hasNetworkError =
        /network error|lỗi mạng|connection lost|mất kết nối/.test(haystack);

      const hasTransientError =
        /something went wrong|đã xảy ra lỗi|try again|thử lại|retry/.test(haystack);

      return {
        schemaVersion: "1.0",
        urlOrigin: location.origin,
        pathKind: conversationPath ? "conversation" : (path === "/" ? "home" : "other"),
        conversationPath,
        composerReady: Boolean(composer),
        assistantMessageCount: document.querySelectorAll(
          "[data-message-author-role='assistant']"
        ).length,
        userMessageCount: document.querySelectorAll(
          "[data-message-author-role='user']"
        ).length,
        loginRequired,
        hasCaptcha,
        responseRunning,
        hasNetworkError,
        hasTransientError,
        hasContinueControl:
          /continue generating|tiếp tục tạo|continue response/.test(haystack),
        hasRetryControl:
          /try again|thử lại|retry/.test(haystack)
      };
    },
    { normalizeSource: NORMALIZE }
  );
}
