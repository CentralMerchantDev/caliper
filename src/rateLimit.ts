const LIMIT_PER_DAY = 5;

export class RateLimitExceededError extends Error {
  constructor(public readonly ip: string, public readonly limit: number) {
    super(`You've hit the limit of ${limit} live runs per day for this demo. Come back tomorrow, or read the precomputed results below.`);
  }
}

function todayKey(ip: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return `ratelimit/${ip}/${day}`;
}

/** Per-IP daily cap on live runs. Same pattern as spendCap.ts: KV-backed so it
 * survives isolate restarts, checked before the action, incremented after. */
export async function assertUnderRateLimit(kv: KVNamespace, ip: string): Promise<void> {
  const raw = await kv.get(todayKey(ip));
  const count = raw ? parseInt(raw, 10) : 0;
  if (count >= LIMIT_PER_DAY) {
    throw new RateLimitExceededError(ip, LIMIT_PER_DAY);
  }
}

export async function recordRateLimitHit(kv: KVNamespace, ip: string): Promise<void> {
  const key = todayKey(ip);
  const raw = await kv.get(key);
  const count = raw ? parseInt(raw, 10) : 0;
  // 2-day TTL: self-cleaning, no cron needed to expire old counters.
  await kv.put(key, String(count + 1), { expirationTtl: 60 * 60 * 24 * 2 });
}
