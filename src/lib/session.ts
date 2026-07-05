import { headers } from "next/headers"
import { auth, type Session } from "@/lib/auth"

/** Session for the current request, or null when unauthenticated. */
export async function getSession(): Promise<Session | null> {
  return auth.api.getSession({ headers: await headers() })
}

/**
 * Guard for API route handlers. Returns the session, or null after which the
 * caller should respond with `unauthorized()`.
 */
export async function requireSession(req: Request): Promise<Session | null> {
  return auth.api.getSession({ headers: req.headers })
}
