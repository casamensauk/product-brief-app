import { type Instrumentation } from "next"

// Logs one structured JSON line per captured server error. A real observability
// provider (e.g. Sentry) can be wired in here later.
export const onRequestError: Instrumentation.onRequestError = (err, request) => {
  const message = err instanceof Error ? err.message : String(err)
  const digest =
    typeof err === "object" && err !== null && "digest" in err
      ? String((err as { digest: unknown }).digest)
      : undefined

  console.error(
    JSON.stringify({
      level: "error",
      message,
      digest,
      path: request.path,
      method: request.method,
    })
  )
}
