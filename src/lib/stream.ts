import { BRIEF_SECTION_KEYS } from "@/lib/brief-sections"

/**
 * Split accumulated SSE text into complete `data:` payload strings. The last
 * line may be incomplete, so it is returned as `rest` to prepend to the next
 * chunk. Pure and synchronous — the streaming reader owns the buffer.
 */
export function parseSSELines(buffer: string): { payloads: string[]; rest: string } {
  const lines = buffer.split("\n")
  const rest = lines.pop() ?? ""
  const payloads: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith("data:")) {
      payloads.push(trimmed.slice(5).trim())
    }
  }
  return { payloads, rest }
}

/** Extract the incremental text from one OpenRouter SSE payload, if any. */
export function extractDeltaContent(payload: string): string | null {
  if (payload === "" || payload === "[DONE]") return null
  try {
    const json = JSON.parse(payload)
    const content = json?.choices?.[0]?.delta?.content
    return typeof content === "string" ? content : null
  } catch {
    return null
  }
}

// Match a key only when it's used as a JSON key (`"key":`), so a section name
// appearing inside prose (e.g. "budget" mentioned in the executive summary)
// doesn't tick the checklist early. Precomputed to avoid per-call allocation.
const SECTION_KEY_PATTERNS = new Map(
  BRIEF_SECTION_KEYS.map((key) => [key, new RegExp(`"${key}"\\s*:`)])
)

/**
 * Given the JSON accumulated so far, return the top-level brief section keys
 * that have newly appeared as JSON keys (mutating `seen` to record them).
 * Case-sensitive, so "scope" never matches "inScope"/"outOfScope".
 */
export function detectNewSections(accumulated: string, seen: Set<string>): string[] {
  const found: string[] = []
  for (const key of BRIEF_SECTION_KEYS) {
    if (!seen.has(key) && SECTION_KEY_PATTERNS.get(key)!.test(accumulated)) {
      seen.add(key)
      found.push(key)
    }
  }
  return found
}
