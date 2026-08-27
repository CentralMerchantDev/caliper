const SPEND_KEY = "cumulative_spend_usd";

export class SpendCapExceededError extends Error {
  constructor(public readonly current: number, public readonly cap: number) {
    super(`Spend cap exceeded: $${current.toFixed(4)} of $${cap.toFixed(2)} cap`);
  }
}

/**
 * Hard spend cap enforced in code, not just documented. Checked BEFORE every
 * generation call (using a conservative worst-case estimate for the call
 * about to be made) and updated with the ACTUAL cost immediately after.
 *
 * Backed by KV so the cap survives isolate restarts -- an in-memory counter
 * would reset on every cold start and the cap would be meaningless.
 */
export async function assertUnderCap(kv: KVNamespace, capUsd: number, estimatedCostUsd: number): Promise<number> {
  const currentRaw = await kv.get(SPEND_KEY);
  const current = currentRaw ? parseFloat(currentRaw) : 0;
  if (current + estimatedCostUsd > capUsd) {
    throw new SpendCapExceededError(current, capUsd);
  }
  return current;
}

export async function recordSpend(kv: KVNamespace, actualCostUsd: number): Promise<number> {
  // Not transactional -- fine for a single-developer project hitting this
  // from at most a handful of concurrent requests. A real multi-tenant
  // version would need a Durable Object for atomic increments.
  const currentRaw = await kv.get(SPEND_KEY);
  const current = currentRaw ? parseFloat(currentRaw) : 0;
  const next = current + actualCostUsd;
  await kv.put(SPEND_KEY, next.toString());
  return next;
}

export async function getCumulativeSpend(kv: KVNamespace): Promise<number> {
  const raw = await kv.get(SPEND_KEY);
  return raw ? parseFloat(raw) : 0;
}
