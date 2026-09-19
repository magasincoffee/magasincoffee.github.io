import test from "node:test";
import assert from "node:assert/strict";

import {
  captureAssistantTurnDigests,
  captureUserTurnDigests,
  digestCapturedResponse
} from "../src/ui/message-capture.mjs";

test("assistant continuity capture returns only deterministic digests to the runtime", async () => {
  const page = {
    async evaluate() {
      return ["older Brain response", "latest Brain response"];
    }
  };

  const digests = await captureAssistantTurnDigests(page);
  assert.deepEqual(digests, [
    digestCapturedResponse("older Brain response"),
    digestCapturedResponse("latest Brain response")
  ]);
  assert.equal(digests.includes("older Brain response"), false);
  assert.equal(digests.includes("latest Brain response"), false);
});


test("Worker instruction continuity capture returns only deterministic user-turn digests", async () => {
  const page = {
    async evaluate() {
      return ["TASK-049/D instruction", "TASK-049/E instruction"];
    }
  };

  const digests = await captureUserTurnDigests(page);
  assert.deepEqual(digests, [
    digestCapturedResponse("TASK-049/D instruction"),
    digestCapturedResponse("TASK-049/E instruction")
  ]);
  assert.equal(digests.includes("TASK-049/E instruction"), false);
});
