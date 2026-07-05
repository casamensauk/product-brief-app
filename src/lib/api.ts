import { NextResponse } from "next/server"
import * as z from "zod"

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export function unauthorized() {
  return jsonError("Authentication required", 401)
}

export function notFound() {
  return jsonError("Not found", 404)
}

/** Parse a request body against a schema; returns data or a 400 response. */
export async function parseBody<T extends z.ZodType>(
  req: Request,
  schema: T
): Promise<{ data: z.infer<T>; error: null } | { data: null; error: NextResponse }> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return { data: null, error: jsonError("Invalid JSON body", 400) }
  }
  const result = schema.safeParse(raw)
  if (!result.success) {
    const first = result.error.issues[0]
    const path = first.path.length ? ` (${first.path.join(".")})` : ""
    return { data: null, error: jsonError(`${first.message}${path}`, 400) }
  }
  return { data: result.data, error: null }
}
