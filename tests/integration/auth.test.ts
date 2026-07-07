import { describe, expect, it } from "vitest"
import { GET as listBriefs, POST as createBrief } from "@/app/api/briefs/route"
import {
  GET as getBrief,
  DELETE as deleteBrief,
} from "@/app/api/briefs/[id]/route"
import { POST as generate } from "@/app/api/briefs/[id]/generate/route"
import { GET as listTemplates } from "@/app/api/templates/route"
import { GET as getSettings } from "@/app/api/settings/route"
import { ctx, hasTestDb, jsonRequest, signUpAndGetCookie } from "./helpers"

describe.skipIf(!hasTestDb)("management routes require a session", () => {
  it("returns 401 for anonymous requests across the management surface", async () => {
    expect((await listBriefs(jsonRequest("/api/briefs"))).status).toBe(401)
    expect(
      (await createBrief(jsonRequest("/api/briefs", { method: "POST", body: { clientName: "x" } })))
        .status
    ).toBe(401)
    expect((await getBrief(jsonRequest("/api/briefs/anything"), ctx({ id: "anything" }))).status).toBe(401)
    expect(
      (await deleteBrief(jsonRequest("/api/briefs/x", { method: "DELETE" }), ctx({ id: "x" }))).status
    ).toBe(401)
    expect(
      (await generate(jsonRequest("/api/briefs/x/generate", { method: "POST" }), ctx({ id: "x" })))
        .status
    ).toBe(401)
    expect((await listTemplates(jsonRequest("/api/templates"))).status).toBe(401)
    expect((await getSettings(jsonRequest("/api/settings"))).status).toBe(401)
  })
})

describe.skipIf(!hasTestDb)("authenticated session flow", () => {
  it("signs up, creates a brief, and reads it back", async () => {
    const cookie = await signUpAndGetCookie()

    const created = await createBrief(
      jsonRequest("/api/briefs", {
        method: "POST",
        cookie,
        body: { clientName: "Acme", projectName: "Portal" },
      })
    )
    expect(created.status).toBe(201)
    const brief = await created.json()
    expect(brief.id).toBeTruthy()
    expect(brief.ownerId).toBeTruthy()
    expect(brief.shareToken).toBeTruthy()

    const fetched = await getBrief(jsonRequest(`/api/briefs/${brief.id}`, { cookie }), ctx({ id: brief.id }))
    expect(fetched.status).toBe(200)
    expect((await fetched.json()).clientName).toBe("Acme")
  })
})
