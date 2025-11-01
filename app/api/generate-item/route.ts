import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { createGroq } from "@ai-sdk/groq"

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY ?? "",
})

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    console.log("[v0] Generating item with Groq for prompt:", prompt)

    const systemPrompt = `You are a game item generator for a fantasy dungeon crawler game.
Generate a single inventory item based on the user's description.
Respond ONLY with valid JSON matching this exact structure (no markdown, no extra text):
{
  "name": "string (creative item name)",
  "type": "weapon" | "armor" | "accessory" | "potion" | "treasure" | "map" | "consumable",
  "value": number (1-150, based on rarity),
  "rarity": "common" | "uncommon" | "rare" | "epic" | "legendary",
  "icon": "string (e.g., ra-sword, ra-shield, ra-potion, ra-gem-pendant, ra-scroll-unfurled)",
  "stats": { "attack": number, "defense": number, "health": number } (optional, only for equipment)
}

Guidelines:
- Common items: value 5-20, basic stats (1-5)
- Uncommon items: value 20-40, moderate stats (5-10)
- Rare items: value 40-70, good stats (10-15)
- Epic items: value 70-100, great stats (15-25)
- Legendary items: value 100-150, exceptional stats (25-40)
- Weapons should have attack stats
- Armor should have defense stats
- Accessories can have mixed stats
- Potions and treasures don't need stats`

    const { text } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      system: systemPrompt,
      prompt: prompt,
      temperature: 0.8,
    })

    console.log("[v0] Groq response:", text)

    // Parse the generated item
    const cleanedText = text
      .trim()
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
    const itemData = JSON.parse(cleanedText)

    // Add ID to the item
    const item = {
      ...itemData,
      id: crypto.randomUUID(),
    }

    console.log("[v0] Generated item:", item)

    return NextResponse.json({ item })
  } catch (error) {
    console.error("[v0] Error generating item:", error)
    return NextResponse.json(
      { error: "Failed to generate item. Please try again." },
      { status: 500 }
    )
  }
}
