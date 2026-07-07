import { beforeAll, describe, expect, it } from "vitest"
import { POST as createBrief } from "@/app/api/briefs/route"
import { GET as getBrief } from "@/app/api/briefs/[id]/route"
import { PUT as putAnswers } from "@/app/api/public/briefs/[token]/answers/route"
import { POST as submit } from "@/app/api/public/briefs/[token]/submit/route"
import { POST as uploadAttachment } from "@/app/api/public/briefs/[token]/attachments/route"
import { DEFAULT_QUESTIONS } from "@/lib/templates"
import { ctx, hasTestDb, jsonRequest, signUpAndGetCookie } from "./helpers"

const BASE = "http://localhost:3000"

// The default questionnaire's required question ids (used to satisfy submit).
const requiredAnswers = Object.fromEntries(
  DEFAULT_QUESTIONS.filter((q) => q.required).map((q) => [q.id, "An answer."])
)

async function newBrief(cookie: string): Promise<{ id: string; shareToken: string }> {
  const res = await createBrief(
    jsonRequest("/api/briefs", { method: "POST", cookie, body: { clientName: "Acme" } })
  )
  const brief = await res.json()
  return { id: brief.id, shareToken: brief.shareToken }
}

describe.skipIf(!hasTestDb)("public questionnaire lifecycle", () => {
  let cookie: string
  beforeAll(async () => {
    cookie = await signUpAndGetCookie()
  })

  it("sanitizes answers: unknown ids and bad option values are dropped", async () => {
    const { id, shareToken } = await newBrief(cookie)
    const firstReq = DEFAULT_QUESTIONS.find((q) => q.required)!.id

    const res = await putAnswers(
      jsonRequest(`/api/public/briefs/${shareToken}/answers`, {
        method: "PUT",
        body: { answers: { [firstReq]: "kept", ghostQuestion: "dropped" } },
      }),
      ctx({ token: shareToken })
    )
    expect(res.status).toBe(200)

    const brief = await (
      await getBrief(jsonRequest(`/api/briefs/${id}`, { cookie }), ctx({ id }))
    ).json()
    expect(brief.rawClientAnswers[firstReq]).toBe("kept")
    expect(brief.rawClientAnswers.ghostQuestion).toBeUndefined()
  })

  it("blocks submit until required questions are answered, then locks (409)", async () => {
    const { shareToken } = await newBrief(cookie)

    const missing = await submit(
      jsonRequest(`/api/public/briefs/${shareToken}/submit`, {
        method: "POST",
        body: { answers: {} },
      }),
      ctx({ token: shareToken })
    )
    expect(missing.status).toBe(400)

    const ok = await submit(
      jsonRequest(`/api/public/briefs/${shareToken}/submit`, {
        method: "POST",
        body: { answers: requiredAnswers },
      }),
      ctx({ token: shareToken })
    )
    expect(ok.status).toBe(200)

    const again = await submit(
      jsonRequest(`/api/public/briefs/${shareToken}/submit`, {
        method: "POST",
        body: { answers: requiredAnswers },
      }),
      ctx({ token: shareToken })
    )
    expect(again.status).toBe(409)
  })
})

describe.skipIf(!hasTestDb)("attachment validation", () => {
  let cookie: string
  beforeAll(async () => {
    cookie = await signUpAndGetCookie()
  })

  const tinyPng = Uint8Array.from(
    atob(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
    ),
    (c) => c.charCodeAt(0)
  )

  function upload(token: string, file: File): Promise<Response> {
    const form = new FormData()
    form.append("file", file)
    return uploadAttachment(
      new Request(`${BASE}/api/public/briefs/${token}/attachments`, {
        method: "POST",
        body: form,
      }),
      ctx({ token })
    )
  }

  it("accepts a valid image and rejects oversized / disallowed files", async () => {
    const { shareToken } = await newBrief(cookie)

    const good = await upload(shareToken, new File([tinyPng], "logo.png", { type: "image/png" }))
    expect(good.status).toBe(201)

    const big = new File([new Uint8Array(6 * 1024 * 1024)], "big.png", { type: "image/png" })
    expect((await upload(shareToken, big)).status).toBe(400)

    const html = new File(["<html></html>"], "evil.html", { type: "text/html" })
    expect((await upload(shareToken, html)).status).toBe(400)

    // Mismatched extension vs declared type.
    const spoof = new File([tinyPng], "notreal.txt", { type: "image/png" })
    expect((await upload(shareToken, spoof)).status).toBe(400)
  })

  it("enforces the five-file cap", async () => {
    const { shareToken } = await newBrief(cookie)
    for (let i = 0; i < 5; i++) {
      const res = await upload(shareToken, new File([tinyPng], `f${i}.png`, { type: "image/png" }))
      expect(res.status).toBe(201)
    }
    const sixth = await upload(shareToken, new File([tinyPng], "f5.png", { type: "image/png" }))
    expect(sixth.status).toBe(400)
  })
})
