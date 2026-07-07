import { auth } from "@/lib/auth"

/** Integration suites only run when a throwaway test database is configured. */
export const hasTestDb = Boolean(process.env.TEST_DATABASE_URL)

const BASE = "http://localhost:3000"

let counter = 0
export function uniqueEmail(prefix = "user"): string {
  counter += 1
  return `${prefix}-${process.pid}-${counter}-${Math.random().toString(36).slice(2, 8)}@example.test`
}

/**
 * Sign up a fresh user via the better-auth server API and return a Cookie
 * header string usable on subsequent authenticated requests.
 */
export async function signUpAndGetCookie(email = uniqueEmail()): Promise<string> {
  const res = await auth.api.signUpEmail({
    body: { email, password: "integration-pw-12345", name: "Integration Tester" },
    headers: new Headers({ origin: BASE }),
    asResponse: true,
  })
  if (!res.ok) {
    throw new Error(`sign-up failed: ${res.status} ${await res.text()}`)
  }
  const cookies = res.headers.getSetCookie()
  return cookies.map((c) => c.split(";")[0]).join("; ")
}

type Body = Record<string, unknown>

export function jsonRequest(
  url: string,
  init: { method?: string; cookie?: string; body?: Body } = {}
): Request {
  const headers: Record<string, string> = { "content-type": "application/json" }
  if (init.cookie) headers.cookie = init.cookie
  return new Request(`${BASE}${url}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body ? JSON.stringify(init.body) : undefined,
  })
}

/** Wrap a params object the way Next passes it to route handlers. */
export function ctx<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return { params: Promise.resolve(params) }
}
