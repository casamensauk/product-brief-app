type BriefUpdateResponse = {
  status: "DRAFT" | "SUBMITTED" | "REVIEWED" | "SCOPED"
  questions: unknown
  rawClientAnswers: unknown
  generatedBrief: unknown
  updatedAt: string
}

type Handlers = {
  onSection: (section: string) => void
  onDone: (updated: BriefUpdateResponse) => void
  onError: (message: string) => void
}

function handleFrame(frame: string, handlers: Handlers) {
  let event = "message"
  let data = ""
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim()
    else if (line.startsWith("data:")) data += line.slice(5).trim()
  }
  if (!data) return
  let parsed: unknown
  try {
    parsed = JSON.parse(data)
  } catch {
    return
  }
  if (event === "progress") handlers.onSection((parsed as { section: string }).section)
  else if (event === "done") handlers.onDone(parsed as BriefUpdateResponse)
  else if (event === "error") handlers.onError((parsed as { error: string }).error)
}

/**
 * POST /generate and drive the SSE stream. Precondition failures (non-200)
 * surface via onError from the JSON body; streamed outcomes arrive as events.
 */
export async function runBriefGeneration(briefId: string, handlers: Handlers): Promise<void> {
  let res: Response
  try {
    res = await fetch(`/api/briefs/${briefId}/generate`, { method: "POST" })
  } catch {
    handlers.onError("Could not reach the server. Please try again.")
    return
  }

  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => null)
    handlers.onError(data?.error || "Failed to generate the brief")
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let boundary: number
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)
      handleFrame(frame, handlers)
    }
  }
  if (buffer.trim()) handleFrame(buffer, handlers)
}
