import { ChatGptUiAdapter } from "../ui/playwright-adapter.mjs";
import { retryOperation } from "../retry.mjs";

export class SupervisorSession {
  constructor({
    cdpUrl = "http://127.0.0.1:9222",
    adapterFactory = (options) => new ChatGptUiAdapter(options),
    maxConnectRetries = 2,
    retryDelaysMs,
    sleep,
    onEvent = () => {}
  } = {}) {
    this.cdpUrl = cdpUrl;
    this.adapterFactory = adapterFactory;
    this.maxConnectRetries = maxConnectRetries;
    this.retryDelaysMs = retryDelaysMs;
    this.sleep = sleep;
    this.onEvent = onEvent;
    this.adapter = null;
  }

  async connect() {
    if (this.adapter) return this.adapter;

    const adapter = this.adapterFactory({ cdpUrl: this.cdpUrl });
    try {
      await retryOperation({
        operation: async () => {
          await adapter.open();
          return adapter;
        },
        maxRetries: this.maxConnectRetries,
        delaysMs: this.retryDelaysMs,
        sleep: this.sleep,
        onRetry: ({ attempt, delayMs }) => {
          this.onEvent({
            type: "CONNECT_RETRY",
            attempt,
            delayMs
          });
        }
      });
      this.adapter = adapter;
      this.onEvent({ type: "CONNECTED" });
      return adapter;
    } catch (error) {
      await adapter.close().catch(() => {});
      this.onEvent({
        type: "CONNECT_FAILED",
        errorName: error?.name || "Error"
      });
      throw error;
    }
  }

  async probe() {
    const adapter = await this.connect();
    try {
      return await adapter.probe();
    } catch (error) {
      this.onEvent({
        type: "PROBE_FAILED",
        errorName: error?.name || "Error"
      });
      await this.disconnect();
      throw error;
    }
  }

  async reconnect() {
    await this.disconnect();
    this.onEvent({ type: "RECONNECT" });
    return this.connect();
  }

  async disconnect() {
    if (this.adapter) {
      await this.adapter.close().catch(() => {});
      this.adapter = null;
      this.onEvent({ type: "DISCONNECTED" });
    }
  }
}
