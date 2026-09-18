const cleanText = value => String(value ?? "").trim();

export function validateEmailActivation(config = {}) {
  const provider = cleanText(config.provider);
  const sender = cleanText(config.sender);
  const credentialAvailable = config.credentialAvailable === true;
  const missing = [];
  if (!provider) missing.push("provider");
  if (!sender) missing.push("sender");
  if (!credentialAvailable) missing.push("credential");
  return {
    ready: missing.length === 0,
    provider: provider || null,
    sender: sender || null,
    credentialAvailable,
    missing
  };
}

export function buildEmailEnvelope(notification, targets) {
  if (!notification?.id) throw new Error("NOTIFICATION_ID_REQUIRED");
  if (!notification?.event_key) throw new Error("EVENT_KEY_REQUIRED");

  const uniqueRecipients = new Map();
  for (const target of targets ?? []) {
    const email = cleanText(target?.email);
    if (!email) continue;
    const key = email.toLowerCase();
    if (!uniqueRecipients.has(key)) uniqueRecipients.set(key, email);
  }
  const recipients = [...uniqueRecipients.values()];
  if (!recipients.length) throw new Error("EMAIL_TARGET_REQUIRED");

  const subject = cleanText(notification.title);
  const body = cleanText(notification.message);
  if (!subject) throw new Error("EMAIL_SUBJECT_REQUIRED");
  if (!body) throw new Error("EMAIL_BODY_REQUIRED");

  return {
    idempotencyKey: notification.event_key,
    notificationId: notification.id,
    eventType: cleanText(notification.event_type),
    recipients,
    privacy: "BLIND_RECIPIENTS",
    subject,
    text: body
  };
}

export async function runEmailBatch({
  config,
  claimBatch,
  resolveTargets,
  send,
  complete,
  skip,
  limit = 25
}) {
  const activation = validateEmailActivation(config);
  if (!activation.ready) {
    return {
      status: "CONFIG_PENDING",
      activation,
      claimed: 0,
      sent: 0,
      failed: 0,
      skipped: 0
    };
  }

  for (const [name, fn] of Object.entries({ claimBatch, resolveTargets, send, complete, skip })) {
    if (typeof fn !== "function") throw new TypeError(`${name.toUpperCase()}_REQUIRED`);
  }

  const claimed = await claimBatch(limit);
  if (!Array.isArray(claimed)) throw new TypeError("CLAIM_BATCH_ARRAY_REQUIRED");

  const summary = {
    status: "ACTIVE",
    activation,
    claimed: claimed.length,
    sent: 0,
    failed: 0,
    skipped: 0
  };

  for (const notification of claimed) {
    try {
      const targets = await resolveTargets(notification.id);
      if (!Array.isArray(targets) || targets.length === 0) {
        await skip(notification.id, "NO_ACTIVE_EMAIL_TARGET");
        summary.skipped += 1;
        continue;
      }

      const envelope = buildEmailEnvelope(notification, targets);
      await send(envelope, activation);
      await complete(notification.id, true, null);
      summary.sent += 1;
    } catch (error) {
      const reason = cleanText(error?.message || error) || "EMAIL_DELIVERY_FAILED";
      await complete(notification.id, false, reason);
      summary.failed += 1;
    }
  }

  return summary;
}
