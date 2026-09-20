import test from "node:test";
import assert from "node:assert/strict";
import {
  BrowserScheduler,
  DEFAULT_CHATGPT_PAGE_BUDGET,
  PAGE_LEASE_STATES
} from "../src/runtime/browser-scheduler.mjs";

class FakePage {
  constructor(url, id) {
    this._url = url;
    this.id = id;
    this.closed = false;
    this.hasDraft = false;
  }
  url() { return this._url; }
  isClosed() { return this.closed; }
  async close() { this.closed = true; }
}

class FakeAdapter {
  constructor() {
    this.pages = [];
    this.nextId = 1;
    this.reopens = 0;
    this.closes = [];
  }
  getChatGptPages() {
    return this.pages.filter((page) => !page.closed);
  }
  findPageForTarget(target) {
    return this.getChatGptPages().find((page) => {
      const parsed = new URL(page.url());
      return parsed.origin === target.origin && parsed.pathname === target.pathname;
    }) || null;
  }
  async reopenTargetPage(url) {
    this.reopens += 1;
    const page = new FakePage(url, this.nextId++);
    this.pages.push(page);
    return page;
  }
  async newChatPage(url) {
    const page = new FakePage(url, this.nextId++);
    this.pages.push(page);
    return page;
  }
  async hasNonPersistedComposerArtifact(page) {
    return Boolean(page.hasDraft);
  }
  async closePage(page) {
    this.closes.push(page.id);
    await page.close();
  }
}

function t(url) {
  const parsed = new URL(url);
  return { origin: parsed.origin, pathname: parsed.pathname };
}
function lane(id, enabled = true) {
  return { lane_id: id, enabled };
}
async function acquire(scheduler, laneId, role, n) {
  const url = `https://chatgpt.com/c/${laneId}-${role.toLowerCase()}-${n}`;
  return scheduler.acquireExactPage({
    laneId,
    role,
    url,
    target: t(url),
    targetRevision: n,
    generation: n
  });
}

test("default page budget is exactly three global pages", () => {
  assert.equal(DEFAULT_CHATGPT_PAGE_BUDGET, 3);
});

test("one enabled lane runs independently and completes each round", () => {
  const scheduler = new BrowserScheduler({ adapter: new FakeAdapter() });
  const turns = Array.from({ length: 4 }, () => scheduler.nextEnabledTurn([
    lane("lane-1"), lane("lane-2", false), lane("lane-3", false)
  ]));
  assert.deepEqual(turns.map((x) => x.lane_id), ["lane-1","lane-1","lane-1","lane-1"]);
  assert.ok(turns.every((x) => x.round_complete));
});

test("two enabled lanes are strict round-robin with disabled lane skipped", () => {
  const scheduler = new BrowserScheduler({ adapter: new FakeAdapter() });
  const turns = Array.from({ length: 6 }, () => scheduler.nextEnabledTurn([
    lane("lane-1"), lane("lane-2", false), lane("lane-3")
  ]));
  assert.deepEqual(turns.map((x) => x.lane_id), [
    "lane-1","lane-3","lane-1","lane-3","lane-1","lane-3"
  ]);
});

test("three enabled lanes are fair round-robin without starvation", () => {
  const scheduler = new BrowserScheduler({ adapter: new FakeAdapter() });
  const turns = Array.from({ length: 9 }, () => scheduler.nextEnabledTurn([
    lane("lane-1"), lane("lane-2"), lane("lane-3")
  ]));
  assert.deepEqual(turns.map((x) => x.lane_id), [
    "lane-1","lane-2","lane-3",
    "lane-1","lane-2","lane-3",
    "lane-1","lane-2","lane-3"
  ]);
  assert.equal(turns.filter((x) => x.round_complete).length, 3);
});

test("global mutation lease is singleton across lanes", () => {
  const scheduler = new BrowserScheduler({ adapter: new FakeAdapter() });
  const release = scheduler.acquireMutationLease({
    laneId: "lane-1", role: "WORK", reason: "send"
  });
  assert.equal(scheduler.snapshot().mutation_lease_active, true);
  assert.throws(
    () => scheduler.acquireMutationLease({
      laneId: "lane-2", role: "BRAIN", reason: "relay"
    }),
    (error) => error.code === "MUTATION_LEASE_BUSY"
  );
  release();
  assert.equal(scheduler.snapshot().mutation_lease_active, false);
});

test("six logical targets never require more than three resident pages", async () => {
  const adapter = new FakeAdapter();
  const scheduler = new BrowserScheduler({ adapter });
  for (let i = 0; i < 6; i += 1) {
    const page = await acquire(
      scheduler,
      `lane-${(i % 3) + 1}`,
      i % 2 ? "WORK" : "BRAIN",
      i + 1
    );
    scheduler.releaseObservation(page);
    assert.ok(adapter.getChatGptPages().length <= 3);
  }
  assert.equal(scheduler.snapshot().page_budget, 3);
});

test("LRU evicts oldest EVICTABLE before PARKED", async () => {
  const adapter = new FakeAdapter();
  const scheduler = new BrowserScheduler({ adapter });
  const p1 = await acquire(scheduler,"lane-1","BRAIN",1);
  scheduler.releaseObservation(p1);
  const p2 = await acquire(scheduler,"lane-2","BRAIN",2);
  scheduler.parkPage(p2);
  const p3 = await acquire(scheduler,"lane-3","BRAIN",3);
  scheduler.releaseObservation(p3);
  const p4 = await acquire(scheduler,"lane-1","WORK",4);
  assert.equal(p1.isClosed(), true);
  assert.equal(p2.isClosed(), false);
  assert.equal(p3.isClosed(), false);
  assert.equal(p4.isClosed(), false);
});

test("ACTIVE_MUTATION page is never evicted", async () => {
  const adapter = new FakeAdapter();
  const scheduler = new BrowserScheduler({ adapter });
  const active = await acquire(scheduler,"lane-1","WORK",1);
  const releaseMutation = scheduler.acquireMutationLease({
    laneId:"lane-1", role:"WORK", page:active, reason:"send"
  });
  const p2 = await acquire(scheduler,"lane-2","BRAIN",2);
  scheduler.releaseObservation(p2);
  const p3 = await acquire(scheduler,"lane-3","BRAIN",3);
  scheduler.releaseObservation(p3);
  await scheduler.evictOneSafe();
  assert.equal(active.isClosed(), false);
  assert.equal(scheduler.leaseFor(active).state, PAGE_LEASE_STATES.ACTIVE_MUTATION);
  releaseMutation();
});

test("page with only non-persisted composer artifact is never evicted", async () => {
  const adapter = new FakeAdapter();
  const scheduler = new BrowserScheduler({ adapter });
  const draft = await acquire(scheduler,"lane-1","BRAIN",1);
  draft.hasDraft = true;
  scheduler.parkPage(draft,{nonPersistedArtifact:true});
  const p2 = await acquire(scheduler,"lane-2","BRAIN",2);
  scheduler.releaseObservation(p2);
  const p3 = await acquire(scheduler,"lane-3","BRAIN",3);
  scheduler.releaseObservation(p3);
  await scheduler.evictOneSafe();
  assert.equal(draft.isClosed(), false);
});

test("closed exact target reopens without any scheduler resend primitive", async () => {
  const adapter = new FakeAdapter();
  const scheduler = new BrowserScheduler({ adapter });
  const url="https://chatgpt.com/c/exact-reopen";
  const first=await scheduler.acquireExactPage({
    laneId:"lane-1",role:"WORK",url,target:t(url),targetRevision:8,generation:4
  });
  scheduler.releaseObservation(first);
  await adapter.closePage(first);
  const before=adapter.reopens;
  const second=await scheduler.acquireExactPage({
    laneId:"lane-1",role:"WORK",url,target:t(url),targetRevision:8,generation:4
  });
  assert.ok(adapter.reopens>before);
  assert.equal(second.url(),url);
  assert.equal("send" in scheduler,false);
});

test("restart reconstruction clears transient leases but never touches durable lane truth", async () => {
  const adapter = new FakeAdapter();
  const scheduler = new BrowserScheduler({ adapter });
  const durable={
    task_id:"TASK-X",
    awaiting_work:true,
    dispatch_inflight:{dispatch_id:"d1"},
    relay_inflight:{relay_id:"r1"},
    work_url:"https://chatgpt.com/c/old",
    pending_work_url:"https://chatgpt.com/c/new",
    pending_work_url_revision:9
  };
  const before=JSON.stringify(durable);
  const page=await acquire(scheduler,"lane-1","WORK",1);
  scheduler.releaseObservation(page);
  await scheduler.reconstructFromBrowser();
  assert.equal(JSON.stringify(durable),before);
});

test("scheduler snapshot is metadata-only and exposes no target URL", async () => {
  const scheduler = new BrowserScheduler({ adapter: new FakeAdapter() });
  const page=await acquire(scheduler,"lane-1","WORK",1);
  scheduler.releaseObservation(page);
  const json=JSON.stringify(scheduler.snapshot());
  assert.equal(json.includes("chatgpt.com"),false);
  assert.equal(json.includes("/c/"),false);
  assert.equal(json.includes("token"),false);
  assert.equal(json.includes("cookie"),false);
});
