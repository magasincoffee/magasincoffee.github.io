export const RELAY_RECONCILE_OUTCOMES = Object.freeze({
  CONFIRMED: "CONFIRMED",
  NOT_CONFIRMED: "NOT_CONFIRMED",
  PENDING: "PENDING"
});

export function classifyRelayMarkerState({
  markerPresent = false,
  brainStable = false
} = {}) {
  if (markerPresent) return RELAY_RECONCILE_OUTCOMES.CONFIRMED;
  if (!brainStable) return RELAY_RECONCILE_OUTCOMES.PENDING;
  return RELAY_RECONCILE_OUTCOMES.NOT_CONFIRMED;
}

export function activeRelayScreenshotPaths(registry) {
  const active = new Set();
  for (const lane of Object.values(registry?.lanes || {})) {
    const screenshotPath = String(
      lane?.relay_inflight?.screenshot_path || ""
    ).trim();
    if (screenshotPath) active.add(screenshotPath);
  }
  return active;
}
