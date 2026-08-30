// FINISH.md section 5: "The spend counter must be atomic. KV is eventually
// consistent and can be raced -- move it to a Durable Object. A cap that
// can be raced is not a cap."
//
// The race KV couldn't close: assertUnderPipelineSpendCap reads the daily
// total, checks it against the cap, and returns -- then, MINUTES later
// (after a real model call finishes), recordPipelineSpend writes the
// actual cost. Two concurrent runs can both read "$1.99 of $2.00 spent",
// both see room for a $0.05 call, both proceed, and both write afterward
// -- final total $2.09, over the cap, because the check and the write were
// never one atomic operation. A Durable Object closes this because a
// single DO instance processes one request at a time; reserve() below
// does the check-and-commit as one synchronous-relative-to-other-callers
// unit, so two concurrent reserve() calls for the same instance can never
// both see room for the same dollar.
//
// Deliberately reserve-then-reconcile, not check-then-record: the cap is
// checked and PROVISIONALLY committed using the worst-case estimate before
// the real call happens (closing the race), then adjusted down (almost
// always) to the real cost once it's known. This preserves the exact
// existing two-phase shape (estimate before, actual after) that
// assertUnderPipelineSpendCap/recordPipelineSpend already had -- the
// atomicity fix is IN the reserve step, not a redesign of when spend is
// known.
//
// Split into a plain, dependency-free SpendCounterLogic class and a thin
// SpendCounterDO shell that adapts it to the platform's DurableObject base
// class (required by the Workers runtime -- a bare class produced a real,
// reproducible boot failure, "Class extends value undefined is not a
// constructor", caught by actually starting wrangler dev). The split
// matters for a mechanical reason, not just style: "cloudflare:workers" is
// a virtual module the Workers runtime provides and plain Node cannot
// resolve, so any file that imports it can never be loaded by a plain
// Node test run. SpendCounterLogic has no such import -- it takes a plain
// {get, put} storage interface -- so its atomicity-relevant logic is fully
// testable in Node (test/spendCounterDO.test.ts), including firing real
// concurrent reserve() calls via Promise.all.

export interface StorageLike {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
}

export interface SpendCaps {
  dailyCapUsd: number;
  weeklyCapUsd: number;
  monthlyCapUsd: number;
}

export interface SpendStatus {
  dailySpentUsd: number;
  weeklySpentUsd: number;
  monthlySpentUsd: number;
}

export type ReserveResult = { ok: true } | { ok: false; kind: "daily-cap" | "weekly-cap" | "monthly-cap"; message: string; status: SpendStatus };

function dayKey(): string {
  return new Date().toISOString().slice(0, 10);
}
function weekKey(): string {
  return `w${Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))}`;
}
function monthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

export class SpendCounterLogic {
  constructor(private storage: StorageLike) {}

  private async getBucket(key: string): Promise<number> {
    return (await this.storage.get<number>(key)) ?? 0;
  }

  private async getAll(): Promise<SpendStatus> {
    const [daily, weekly, monthly] = await Promise.all([this.getBucket(`daily/${dayKey()}`), this.getBucket(`weekly/${weekKey()}`), this.getBucket(`monthly/${monthKey()}`)]);
    return { dailySpentUsd: daily, weeklySpentUsd: weekly, monthlySpentUsd: monthly };
  }

  /** Atomically checks all three caps against the given estimate and, if
   * every one has room, commits the estimate to all three buckets in the
   * same call. Atomicity itself comes from the CALLER running this inside
   * a single Durable Object instance (Cloudflare's one-request-at-a-time-
   * per-instance guarantee) -- this class just has no unnecessary await
   * between the check and the write that would create a gap for that
   * guarantee to matter around. */
  async reserve(estimateUsd: number, caps: SpendCaps): Promise<ReserveResult> {
    const status = await this.getAll();
    if (status.dailySpentUsd + estimateUsd > caps.dailyCapUsd) {
      return { ok: false, kind: "daily-cap", message: `Today's pipeline budget ($${caps.dailyCapUsd.toFixed(2)}) is used up ($${status.dailySpentUsd.toFixed(4)} spent so far).`, status };
    }
    if (status.weeklySpentUsd + estimateUsd > caps.weeklyCapUsd) {
      return { ok: false, kind: "weekly-cap", message: `This week's pipeline budget ($${caps.weeklyCapUsd.toFixed(2)}) is used up.`, status };
    }
    if (status.monthlySpentUsd + estimateUsd > caps.monthlyCapUsd) {
      return { ok: false, kind: "monthly-cap", message: `This month's pipeline budget ($${caps.monthlyCapUsd.toFixed(2)}) is used up.`, status };
    }
    await Promise.all([
      this.storage.put(`daily/${dayKey()}`, status.dailySpentUsd + estimateUsd),
      this.storage.put(`weekly/${weekKey()}`, status.weeklySpentUsd + estimateUsd),
      this.storage.put(`monthly/${monthKey()}`, status.monthlySpentUsd + estimateUsd),
    ]);
    return { ok: true };
  }

  /** Adjusts all three buckets by (actualUsd - reservedUsd) -- almost
   * always negative, since reserve() commits the worst-case estimate and
   * real calls typically cost less. Never lets a bucket go below 0. */
  async reconcile(reservedUsd: number, actualUsd: number): Promise<SpendStatus> {
    const diff = actualUsd - reservedUsd;
    const status = await this.getAll();
    const next: SpendStatus = {
      dailySpentUsd: Math.max(0, status.dailySpentUsd + diff),
      weeklySpentUsd: Math.max(0, status.weeklySpentUsd + diff),
      monthlySpentUsd: Math.max(0, status.monthlySpentUsd + diff),
    };
    await Promise.all([
      this.storage.put(`daily/${dayKey()}`, next.dailySpentUsd),
      this.storage.put(`weekly/${weekKey()}`, next.weeklySpentUsd),
      this.storage.put(`monthly/${monthKey()}`, next.monthlySpentUsd),
    ]);
    return next;
  }

  async status(): Promise<SpendStatus> {
    return this.getAll();
  }

  /**
   * Atomic Compare-and-Swap publication for world source code.
   * Ensures Pipeline A and Pipeline B racing at Stage 5 serialize through the DO:
   * strictly verifies active unexpired lease credentials, validates expectedSource === currentSource,
   * updates source atomically, and returns success/conflict.
   */
  async publishSource(expectedSource: string, newSource: string, runId?: string, leaseToken?: string): Promise<{ ok: boolean; conflict?: boolean; reason?: string }> {
    if (!runId || !leaseToken) {
      return { ok: false, conflict: true, reason: "Active lease credentials required for source publication" };
    }
    const now = Date.now();
    const rawLeases = (await this.storage.get<Array<{ runId: string; leaseToken: string; expiresAt: number }>>("pipeline/active-leases")) ?? [];
    const active = rawLeases.find(l => l.runId === runId && l.expiresAt > now);
    if (!active || active.leaseToken !== leaseToken) {
      return { ok: false, conflict: true, reason: "Active run lease expired or was revoked prior to publication" };
    }
    const current = (await this.storage.get<string>("sim/current-source")) ?? expectedSource;
    if (current !== expectedSource) {
      return { ok: false, conflict: true, reason: "Concurrent source modification detected" };
    }
    await this.storage.put("sim/current-source", newSource);
    return { ok: true };
  }

  /**
   * Single authoritative source retrieval directly from the coordinator.
   */
  async getSource(): Promise<string | null> {
    return (await this.storage.get<string>("sim/current-source")) ?? null;
  }

  /**
   * Atomic lease acquisition for active pipeline runs:
   * Prevents concurrent runs from exceeding MAX_CONCURRENT_PIPELINE_RUNS,
   * ensures a runId cannot be leased twice simultaneously,
   * auto-prunes stale leases whose lease duration expired,
   * and issues a unique cryptographic leaseToken to prevent ABA release races.
   */
  async leaseRun(runId: string, maxConcurrent = 3, ttlSec = 600): Promise<{ ok: boolean; leaseToken?: string; expiresAt?: number; reason?: string }> {
    const now = Date.now();
    const rawLeases = (await this.storage.get<Array<{ runId: string; leaseToken: string; expiresAt: number }>>("pipeline/active-leases")) ?? [];
    // Prune expired leases
    const activeLeases = rawLeases.filter(l => l.expiresAt > now);

    if (activeLeases.some(l => l.runId === runId)) {
      return { ok: false, reason: `Pipeline run "${runId}" is already actively executing.` };
    }
    if (activeLeases.length >= maxConcurrent) {
      return { ok: false, reason: `${activeLeases.length} pipeline runs are already in flight (max ${maxConcurrent}) -- try again in a moment.` };
    }
    const leaseToken = crypto.randomUUID();
    const expiresAt = now + ttlSec * 1000;
    activeLeases.push({ runId, leaseToken, expiresAt });
    await this.storage.put("pipeline/active-leases", activeLeases);
    // Keep legacy active-runs key synchronized for diagnostics
    await this.storage.put("pipeline/active-runs", activeLeases.map(l => l.runId));
    return { ok: true, leaseToken, expiresAt };
  }

  /**
   * Extends the lease duration of an actively executing run.
   * Atomically verifies that the caller owns the active leaseToken before extending.
   */
  async renewLease(runId: string, leaseToken: string, extensionSec = 600): Promise<{ ok: boolean; renewed: boolean }> {
    const now = Date.now();
    const rawLeases = (await this.storage.get<Array<{ runId: string; leaseToken: string; expiresAt: number }>>("pipeline/active-leases")) ?? [];
    const target = rawLeases.find(l => l.runId === runId);
    if (!target || target.leaseToken !== leaseToken || target.expiresAt <= now) {
      return { ok: false, renewed: false };
    }
    target.expiresAt = now + extensionSec * 1000;
    await this.storage.put("pipeline/active-leases", rawLeases);
    return { ok: true, renewed: true };
  }

  /**
   * Releases an active run lease atomically.
   * Mandates matching leaseToken to strictly eliminate ABA races where a timed-out
   * predecessor releases a successor's lease.
   */
  async releaseRun(runId: string, leaseToken: string): Promise<{ ok: boolean; released: boolean }> {
    const now = Date.now();
    const rawLeases = (await this.storage.get<Array<{ runId: string; leaseToken: string; expiresAt: number }>>("pipeline/active-leases")) ?? [];
    const target = rawLeases.find(l => l.runId === runId);
    if (!target) {
      return { ok: true, released: false };
    }
    // Strictly require matching cryptographic lease token: reject tokenless or mismatched releases
    if (!leaseToken || target.leaseToken !== leaseToken) {
      return { ok: false, released: false };
    }
    const filtered = rawLeases.filter(l => l.runId !== runId && l.expiresAt > now);
    await this.storage.put("pipeline/active-leases", filtered);
    await this.storage.put("pipeline/active-runs", filtered.map(l => l.runId));
    return { ok: true, released: true };
  }
  /**
   * Generates and stores a short-lived single-use resume ticket atomically in DO storage.
   */
  async createResumeTicket(runId: string, ttlSec = 90): Promise<{ ok: boolean; ticket: string }> {
    const now = Date.now();
    const ticket = crypto.randomUUID();
    const rawTickets = (await this.storage.get<Array<{ runId: string; ticket: string; expiresAt: number }>>("pipeline/resume-tickets")) ?? [];
    const active = rawTickets.filter(t => t.expiresAt > now);
    active.push({ runId, ticket, expiresAt: now + ttlSec * 1000 });
    await this.storage.put("pipeline/resume-tickets", active);
    return { ok: true, ticket };
  }

  /**
   * Atomically verifies and single-use consumes a resume ticket in DO storage.
   */
  async consumeResumeTicket(runId: string, ticket: string): Promise<{ ok: boolean; valid: boolean }> {
    const now = Date.now();
    const rawTickets = (await this.storage.get<Array<{ runId: string; ticket: string; expiresAt: number }>>("pipeline/resume-tickets")) ?? [];
    const active = rawTickets.filter(t => t.expiresAt > now);
    const idx = active.findIndex(t => t.runId === runId && t.ticket === ticket);
    if (idx === -1) {
      await this.storage.put("pipeline/resume-tickets", active);
      return { ok: true, valid: false };
    }
    // Atomically consume (single-use)
    active.splice(idx, 1);
    await this.storage.put("pipeline/resume-tickets", active);
    return { ok: true, valid: true };
  }
}

/** Routes a fetch() request to the right SpendCounterLogic method and
 * shapes the Response -- also dependency-free (Request/Response are
 * standard Web APIs Node has natively), so this is tested directly too,
 * not just the logic underneath it. */
export async function handleSpendCounterRequest(logic: SpendCounterLogic, request: Request): Promise<Response> {
  const url = new URL(request.url);
  try {
    if (url.pathname === "/reserve" && request.method === "POST") {
      const body = (await request.json()) as { estimateUsd: number; caps: SpendCaps };
      const result = await logic.reserve(body.estimateUsd, body.caps);
      return new Response(JSON.stringify(result), { headers: { "content-type": "application/json" } });
    }
    if (url.pathname === "/reconcile" && request.method === "POST") {
      const body = (await request.json()) as { reservedUsd: number; actualUsd: number };
      const result = await logic.reconcile(body.reservedUsd, body.actualUsd);
      return new Response(JSON.stringify(result), { headers: { "content-type": "application/json" } });
    }
    if (url.pathname === "/status") {
      return new Response(JSON.stringify(await logic.status()), { headers: { "content-type": "application/json" } });
    }
    if (url.pathname === "/publish-source" && request.method === "POST") {
      const body = (await request.json()) as { expectedSource: string; newSource: string; runId?: string; leaseToken?: string };
      const result = await logic.publishSource(body.expectedSource, body.newSource, body.runId, body.leaseToken);
      return new Response(JSON.stringify(result), { headers: { "content-type": "application/json" } });
    }
    if (url.pathname === "/get-source") {
      const source = await logic.getSource();
      return new Response(JSON.stringify({ source }), { headers: { "content-type": "application/json" } });
    }
    if (url.pathname === "/lease-run" && request.method === "POST") {
      const body = (await request.json()) as { runId: string; maxConcurrent?: number };
      const result = await logic.leaseRun(body.runId, body.maxConcurrent);
      return new Response(JSON.stringify(result), { headers: { "content-type": "application/json" } });
    }
    if (url.pathname === "/renew-lease" && request.method === "POST") {
      const body = (await request.json()) as { runId: string; leaseToken: string; extensionSec?: number };
      const result = await logic.renewLease(body.runId, body.leaseToken, body.extensionSec);
      return new Response(JSON.stringify(result), { headers: { "content-type": "application/json" } });
    }
    if (url.pathname === "/release-run" && request.method === "POST") {
      const body = (await request.json()) as { runId: string; leaseToken: string };
      const result = await logic.releaseRun(body.runId, body.leaseToken);
      return new Response(JSON.stringify(result), { headers: { "content-type": "application/json" } });
    }
    if (url.pathname === "/create-resume-ticket" && request.method === "POST") {
      const body = (await request.json()) as { runId: string; ttlSec?: number };
      const result = await logic.createResumeTicket(body.runId, body.ttlSec);
      return new Response(JSON.stringify(result), { headers: { "content-type": "application/json" } });
    }
    if (url.pathname === "/consume-resume-ticket" && request.method === "POST") {
      const body = (await request.json()) as { runId: string; ticket: string };
      const result = await logic.consumeResumeTicket(body.runId, body.ticket);
      return new Response(JSON.stringify(result), { headers: { "content-type": "application/json" } });
    }
    return new Response("not found", { status: 404 });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), { status: 500, headers: { "content-type": "application/json" } });
  }
}
