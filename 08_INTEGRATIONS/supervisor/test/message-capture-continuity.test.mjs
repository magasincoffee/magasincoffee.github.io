import test from "node:test";
import assert from "node:assert/strict";

import {
  captureAssistantTurnDigests,
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
