import { beforeAll, describe, expect, it } from "vitest"
import { POST as createBrief } from "@/app/api/briefs/route"
import { GET as getBrief } from "@/app/api/briefs/[id]/route"
import { POST as nextQuestion } from "@/app/api/public/briefs/[token]/next-question/route"
import { PUT as putLinks } from "@/app/api/public/briefs/[token]/links/route"
import { POST as submit } from "@/app/api/public/briefs/[token]/submit/route"
import { DEFAULT_QUESTIONS } from "@/lib/templates"
import { ctx, hasTestDb, jsonRequest, signUpAndGetCookie } from "./helpers"

// The default questionnaire's required question ids (used to satisfy submit
// on a STATIC brief, mirroring tests/integration/questionnaire.test.ts).
const requiredAnswers = Object.fromEntries(
  DEFAULT_QUESTIONS.filter((q) => q.required).map((q) => [q.id, "An answer."])
)

async function newBrief(
  cookie: string,
  body: Record<string, unknown> = {}
): Promise<{ status: number; brief: { id: string; shareToken: string; mode: string; questions: unknown[] } }> {
  const res = await createBrief(
    jsonRequest("/api/briefs", { method: "POST", cookie, body: { clientName: "Acme", ...body } })
  )
  const brief = await res.json()
  return { status: res.status, brief }
}

describe.skipIf(!hasTestDb)("adaptive interview brief creation", () => {
  let cookie: string
  beforeAll(async () => {
    cookie = await signUpAndGetCookie()
  })

  it("creates an ADAPTIVE brief with one seeded question, ignoring a bogus templateId", async () => {
    const { status, brief } = await newBrief(cookie, {
      mode: "ADAPTIVE",
      templateId: "does-not-exist",
    })
    expect(status).toBe(201)
    expect(brief.mode).toBe("ADAPTIVE")
    expect(brief.questions).toHaveLength(1)
    const [question] = brief.questions as { type: string; required: boolean }[]
    expect(question.type).toBe("long_text")
    expect(question.required).toBe(true)
  })

  it("defaults to STATIC with the default questionnaire when mode is omitted", async () => {
    const { status, brief } = await newBrief(cookie)
    expect(status).toBe(201)
    expect(brief.mode).toBe("STATIC")
    expect(brief.questions.length).toBeGreaterThan(1)
  })
})

describe.skipIf(!hasTestDb)("next-question endpoint", () => {
  let cookie: string
  beforeAll(async () => {
    cookie = await signUpAndGetCookie()
  })

  it("rejects next-question on a STATIC brief with 400", async () => {
    const { brief } = await newBrief(cookie)
    const res = await nextQuestion(
      jsonRequest(`/api/public/briefs/${brief.shareToken}/next-question`, {
        method: "POST",
        body: {},
      }),
      ctx({ token: brief.shareToken })
    )
    expect(res.status).toBe(400)
  })

  it("returns 503 with a JSON error when OPENROUTER_API_KEY is unset", async () => {
    const { brief } = await newBrief(cookie, { mode: "ADAPTIVE" })

    const original = process.env.OPENROUTER_API_KEY
    delete process.env.OPENROUTER_API_KEY
    try {
      const res = await nextQuestion(
        jsonRequest(`/api/public/briefs/${brief.shareToken}/next-question`, {
          method: "POST",
          body: {},
        }),
        ctx({ token: brief.shareToken })
      )
      expect(res.status).toBe(503)
      const data = await res.json()
      expect(data.error).toBeTruthy()
    } finally {
      // Restore so this can't leak into other files sharing the process.
      if (original === undefined) delete process.env.OPENROUTER_API_KEY
      else process.env.OPENROUTER_API_KEY = original
    }
  })
})

describe.skipIf(!hasTestDb)("client reference links lifecycle", () => {
  let cookie: string
  beforeAll(async () => {
    cookie = await signUpAndGetCookie()
  })

  it("saves valid links and reads them back via the management GET", async () => {
    const { brief } = await newBrief(cookie)
    const links = [
      { url: "https://example.com", label: "Reference site" },
      { url: "http://example.org" },
    ]

    const putRes = await putLinks(
      jsonRequest(`/api/public/briefs/${brief.shareToken}/links`, {
        method: "PUT",
        body: { links },
      }),
      ctx({ token: brief.shareToken })
    )
    expect(putRes.status).toBe(200)

    const fetched = await getBrief(
      jsonRequest(`/api/briefs/${brief.id}`, { cookie }),
      ctx({ id: brief.id })
    )
    expect(fetched.status).toBe(200)
    const fetchedBrief = await fetched.json()
    expect(fetchedBrief.clientLinks).toEqual(links)
  })

  it("rejects more than 10 links", async () => {
    const { brief } = await newBrief(cookie)
    const links = Array.from({ length: 11 }, (_, i) => ({ url: `https://example.com/${i}` }))

    const res = await putLinks(
      jsonRequest(`/api/public/briefs/${brief.shareToken}/links`, {
        method: "PUT",
        body: { links },
      }),
      ctx({ token: brief.shareToken })
    )
    expect(res.status).toBe(400)
  })

  it("rejects a javascript: URL", async () => {
    const { brief } = await newBrief(cookie)

    const res = await putLinks(
      jsonRequest(`/api/public/briefs/${brief.shareToken}/links`, {
        method: "PUT",
        body: { links: [{ url: "javascript:alert(1)" }] },
      }),
      ctx({ token: brief.shareToken })
    )
    expect(res.status).toBe(400)
  })

  it("locks (409) after the brief has been submitted", async () => {
    const { brief } = await newBrief(cookie)

    const submitRes = await submit(
      jsonRequest(`/api/public/briefs/${brief.shareToken}/submit`, {
        method: "POST",
        body: { answers: requiredAnswers },
      }),
      ctx({ token: brief.shareToken })
    )
    expect(submitRes.status).toBe(200)

    const res = await putLinks(
      jsonRequest(`/api/public/briefs/${brief.shareToken}/links`, {
        method: "PUT",
        body: { links: [{ url: "https://example.com" }] },
      }),
      ctx({ token: brief.shareToken })
    )
    expect(res.status).toBe(409)
  })
})
