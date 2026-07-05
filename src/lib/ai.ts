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

/**
 * Run a completion that must return a single JSON object, and parse it.
 * Throws AIError with a user-presentable message on any failure.
 */
export async function completeJson(options: {
  system: string
  prompt: string
}): Promise<unknown> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new AIError(
      "AI features are not configured. Set OPENROUTER_API_KEY on the server to enable them.",
      503
    )
  }

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
        model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
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

  if (!response.ok) {
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

  const data = await response.json().catch(() => null)
  const content: unknown = data?.choices?.[0]?.message?.content
  if (typeof content !== "string" || content.length === 0) {
    throw new AIError("The AI service returned an empty response. Please try again.")
  }

  // Models occasionally wrap JSON in markdown fences despite instructions.
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
