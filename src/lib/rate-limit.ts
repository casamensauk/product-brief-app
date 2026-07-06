type Options = { windowMs: number; max: number }

// Per-instance sliding-window counters. Fine for a single-instance deploy
// (Railway); a multi-instance deployment would need shared storage (Redis).
const hits = new Map<string, number[]>()

/**
 * Record one request against `key` and report whether it's within the limit.
 * Sliding window: only requests in the last `windowMs` count.
 */
export function checkRateLimit(
  key: string,
  { windowMs, max }: Options
): { allowed: boolean; retryAfter: number } {
  const now = Date.now()
  const cutoff = now - windowMs
  const recent = (hits.get(key) ?? []).filter((t) => t > cutoff)

  if (recent.length >= max) {
    hits.set(key, recent)
    const retryAfter = Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000))
    return { allowed: false, retryAfter }
  }

  recent.push(now)
  hits.set(key, recent)
  return { allowed: true, retryAfter: 0 }
}

/** Best-effort client IP from the proxy, for use as a rate-limit key prefix. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")
  return forwarded ? forwarded.split(",")[0].trim() : "unknown"
}
