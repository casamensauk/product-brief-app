import { createAuthClient } from "better-auth/react"

// Auth is served by this app at /api/auth, so no baseURL is needed.
export const authClient = createAuthClient()
