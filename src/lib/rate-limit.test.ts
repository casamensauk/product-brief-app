import { afterEach, describe, expect, it, vi } from "vitest"
import { checkRateLimit, clientIp } from "@/lib/rate-limit"

afterEach(() => {
  vi.useRealTimers()
})

describe("checkRateLimit", () => {
  const opts = { windowMs: 60_000, max: 3 }

  it("allows up to max then blocks with a positive retryAfter", () => {
    const key = `allow-${Math.random()}`
    expect(checkRateLimit(key, opts).allowed).toBe(true)
    expect(checkRateLimit(key, opts).allowed).toBe(true)
    expect(checkRateLimit(key, opts).allowed).toBe(true)
    const blocked = checkRateLimit(key, opts)
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfter).toBeGreaterThan(0)
  })

  it("keeps separate counters per key", () => {
    const a = `iso-a-${Math.random()}`
    const b = `iso-b-${Math.random()}`
    for (let i = 0; i < 3; i++) checkRateLimit(a, opts)
    expect(checkRateLimit(a, opts).allowed).toBe(false)
    // b is untouched
    expect(checkRateLimit(b, opts).allowed).toBe(true)
  })

  it("allows again after the window slides past", () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    const key = `window-${Math.random()}`
    for (let i = 0; i < 3; i++) expect(checkRateLimit(key, opts).allowed).toBe(true)
    expect(checkRateLimit(key, opts).allowed).toBe(false)

    vi.advanceTimersByTime(opts.windowMs + 1)
    expect(checkRateLimit(key, opts).allowed).toBe(true)
  })
})

describe("clientIp", () => {
  it("takes the first x-forwarded-for hop", () => {
    const req = new Request("http://x", {
      headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1" },
    })
    expect(clientIp(req)).toBe("203.0.113.9")
  })

  it("falls back to 'unknown' without the header", () => {
    expect(clientIp(new Request("http://x"))).toBe("unknown")
  })
})
