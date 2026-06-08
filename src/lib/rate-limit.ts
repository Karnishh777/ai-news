// ─────────────────────────────────────────────────────────────
// Rate limiter
//
// Fixed-window limiter backed by an in-process map (HMR-safe). In
// production, swap the map for Redis (REDIS_URL) using INCR + EXPIRE so
// limits are shared across instances.
// ─────────────────────────────────────────────────────────────

interface Bucket {
  count: number;
  resetAt: number;
}

const g = globalThis as unknown as { __newsflowRate?: Map<string, Bucket> };
const buckets = g.__newsflowRate ?? (g.__newsflowRate = new Map());

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * @param key   unique bucket key, e.g. `login:1.2.3.4`
 * @param limit max requests per window
 * @param windowMs window size in ms
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt };
  }
  bucket.count += 1;
  const ok = bucket.count <= limit;
  return { ok, remaining: Math.max(0, limit - bucket.count), resetAt: bucket.resetAt };
}

/** Best-effort client IP from forwarded headers. */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "127.0.0.1";
}
