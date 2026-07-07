import { describe, expect, it } from "vitest"

// This suite intentionally does NOT import ./helpers (which loads @/lib/auth),
// so it can set ALLOW_SIGNUP=false before auth is first imported.
const hasTestDb = Boolean(process.env.TEST_DATABASE_URL)

describe.skipIf(!hasTestDb)("sign-up gating", () => {
  it("rejects sign-up at the API when ALLOW_SIGNUP=false", async () => {
    const original = process.env.ALLOW_SIGNUP
    process.env.ALLOW_SIGNUP = "false"
    try {
      const { auth } = await import("@/lib/auth")

      const res = await auth.api.signUpEmail({
        body: {
          email: `gated-${Date.now()}@example.test`,
          password: "integration-pw-12345",
          name: "Gated",
        },
        headers: new Headers({ origin: "http://localhost:3000" }),
        asResponse: true,
      })

      expect(res.status).toBeGreaterThanOrEqual(400)
      const body = await res.text()
      expect(body).toContain("SIGN_UP")
    } finally {
      // Restore so this can't leak into other files sharing the process.
      if (original === undefined) delete process.env.ALLOW_SIGNUP
      else process.env.ALLOW_SIGNUP = original
    }
  })
})
