import { extractDeltaContent, parseSSELines } from "@/lib/stream"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const DEFAULT_MODEL = "anthropic/claude-sonnet-4.5"
const REQUEST_TIMEOUT_MS = 120_000

/** Error whose message is safe to show to the end user. */
export class AIError extends Error {
  constructor(
    message: string,
    public readonly status: number = 502
  ) {
    super(message)
    this.name = "AIError"
  }
}

function requireApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new AIError(
      "AI features are not configured. Set OPENROUTER_API_KEY on the server to enable them.",
      503
    )
  }
  return apiKey
}

/** Map a non-OK OpenRouter response to a user-presentable AIError. */
async function throwForResponse(response: Response): Promise<never> {
  const detail = await response.text().catch(() => "")
  console.error(`OpenRouter error ${response.status}: ${detail.slice(0, 500)}`)
  if (response.status === 401) {
    throw new AIError("The configured OpenRouter API key was rejected.", 502)
  }
  if (response.status === 402) {
    throw new AIError("The OpenRouter account is out of credits.", 502)
  }
  if (response.status === 429) {
    throw new AIError("The AI service is rate-limiting requests. Try again shortly.", 503)
  }
  throw new AIError("The AI service returned an error. Please try again.")
}

/** Strip stray markdown fences and parse the model's JSON output. */
export function parseModelJson(content: string): unknown {
  const jsonText = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
  try {
    return JSON.parse(jsonText)
  } catch {
    console.error(`AI returned unparseable JSON: ${jsonText.slice(0, 500)}`)
    throw new AIError("The AI service returned an unexpected format. Please try again.")
  }
}

/**
 * Run a completion that must return a single JSON object, and parse it.
 * Throws AIError with a user-presentable message on any failure.
 */
export async function completeJson(options: {
  system: string
  prompt: string
  model?: string
}): Promise<unknown> {
  const apiKey = requireApiKey()

  let response: Response
  try {
    response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "Product Brief App",
      },
      body: JSON.stringify({
        model: options.model || process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
        messages: [
          { role: "system", content: options.system },
          { role: "user", content: options.prompt },
        ],
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (cause) {
    if (cause instanceof Error && cause.name === "TimeoutError") {
      throw new AIError("The AI request timed out. Please try again.", 504)
    }
    throw new AIError("Could not reach the AI service. Please try again.")
  }

  if (!response.ok) await throwForResponse(response)

  const data = await response.json().catch(() => null)
  const content: unknown = data?.choices?.[0]?.message?.content
  if (typeof content !== "string" || content.length === 0) {
    throw new AIError("The AI service returned an empty response. Please try again.")
  }
  return parseModelJson(content)
}

/**
 * Stream a JSON completion from OpenRouter. Calls `onDelta` with each text
 * fragment as it arrives and resolves with the full accumulated content once
 * the stream ends. Throws AIError (before any delta) on setup/HTTP failure.
 */
export async function streamCompletion(options: {
  system: string
  prompt: string
  onDelta: (text: string) => void
  /** Cancels the upstream request early (e.g. when the client disconnects). */
  signal?: AbortSignal
  model?: string
}): Promise<string> {
  const apiKey = requireApiKey()
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout

  let response: Response
  try {
    response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "Product Brief App",
      },
      body: JSON.stringify({
        model: options.model || process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
        messages: [
          { role: "system", content: options.system },
          { role: "user", content: options.prompt },
        ],
        response_format: { type: "json_object" },
        stream: true,
      }),
      signal,
    })
  } catch (cause) {
    if (cause instanceof Error && cause.name === "TimeoutError") {
      throw new AIError("The AI request timed out. Please try again.", 504)
    }
    throw new AIError("Could not reach the AI service. Please try again.")
  }

  if (!response.ok) await throwForResponse(response)
  if (!response.body) {
    throw new AIError("The AI service returned an empty response. Please try again.")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let content = ""

  const drain = (payloads: string[]) => {
    for (const payload of payloads) {
      const delta = extractDeltaContent(payload)
      if (delta) {
        content += delta
        options.onDelta(delta)
      }
    }
  }

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const { payloads, rest } = parseSSELines(buffer)
    buffer = rest
    drain(payloads)
  }
  // Flush any final complete line left in the buffer.
  drain(parseSSELines(buffer + "\n").payloads)

  if (content.length === 0) {
    throw new AIError("The AI service returned an empty response. Please try again.")
  }
  return content
}
