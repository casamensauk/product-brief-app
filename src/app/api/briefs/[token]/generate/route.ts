import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  
  try {
    const brief = await prisma.projectBrief.findUnique({
      where: { shareToken: token }
    })

    if (!brief) {
      return NextResponse.json({ error: "Brief not found" }, { status: 404 })
    }

    if (!brief.rawClientAnswers) {
      return NextResponse.json({ error: "No raw client answers found to generate from." }, { status: 400 })
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OPENROUTER_API_KEY is not configured on the server." }, { status: 500 })
    }

    const prompt = `You are an expert Business Analyst. 
    Analyze the following raw client answers from a software project discovery questionnaire and generate a formal Requirements Analysis Document following the Pulsion 5-step methodology. 
    
    Return ONLY a valid JSON object matching this exact schema (no markdown formatting, no comments, just raw JSON):
    {
      "stakeholders": [
        { "name": "Name or N/A", "role": "Role or N/A", "influence": "Influence/Interest" }
      ],
      "gatheringMethods": {
        "interviews": true/false,
        "focusGroups": true/false,
        "surveys": true/false,
        "documentObservations": true/false,
        "userStories": "Markdown string of user stories inferred from the answers",
        "useCases": "Markdown string of use cases inferred from the answers"
      },
      "categorisedRequirements": [
        { "name": "Feature name", "category": "Functional|Non-functional|Technical|Operational|Transitional", "description": "Details", "priority": "Must-have|Should-have|Nice-to-have" }
      ],
      "analysisModels": {
        "contextDiagramUrl": "Any URL mentioned for diagrams, or empty",
        "contextDiagramNotes": "Inferred notes about system context",
        "prototypeUrl": "Any URL mentioned for prototypes/wireframes, or empty",
        "prototypeNotes": "Notes about design/wireframes mentioned"
      },
      "documentationData": {
        "purpose": "High-level purpose",
        "audience": "Audience overview",
        "successMetrics": "Inferred success metrics",
        "timeline": "Timeline mentioned",
        "budget": "Budget mentioned"
      }
    }

    Client Answers:
    ${JSON.stringify(brief.rawClientAnswers, null, 2)}
    `

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://product-brief-app.railway.app", 
        "X-Title": "Product Brief App",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "anthropic/claude-3.5-sonnet",
        messages: [
          { role: "system", content: "You are an expert Business Analyst system that strictly outputs valid JSON." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      })
    })

    if (!response.ok) {
      const errTxt = await response.text()
      throw new Error(`OpenRouter API error: ${response.status} ${errTxt}`)
    }

    const data = await response.json()
    const content = data.choices[0].message.content

    // Attempt to parse the JSON (Claude might wrap it in markdown code blocks even when told not to, so we sanitize)
    const jsonStr = content.replace(/^```json/, "").replace(/```$/, "").trim()
    const parsed = JSON.parse(jsonStr)

    // Update the database
    const updatedBrief = await prisma.projectBrief.update({
      where: { shareToken: token },
      data: {
        stakeholders: parsed.stakeholders,
        gatheringMethods: parsed.gatheringMethods,
        categorisedRequirements: parsed.categorisedRequirements,
        analysisModels: parsed.analysisModels,
        documentationData: parsed.documentationData
      }
    })

    return NextResponse.json(updatedBrief)
  } catch (error: any) {
    console.error("Failed to generate requirements:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
