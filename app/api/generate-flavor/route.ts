import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { createGroq } from "@ai-sdk/groq"
import type { Rarity } from "@/lib/entities/schemas"

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY ?? "",
})

/**
 * Lightweight AI Flavor Endpoint
 *
 * Returns ONLY creative content (200-300 tokens):
 * - Entity names and descriptions
 * - Choice flavor text
 * - Outcome descriptions
 *
 * Game mechanics (stats, rewards, formulas) are calculated by procedural-formulas.ts
 * This endpoint focuses purely on narrative creativity.
 */

// Request interface
export interface FlavorRequest {
  eventType: "combat" | "treasure" | "shop" | "shrine" | "encounter"
  entityRarity: Rarity
  portalTheme?: string
  contextHints?: {
    roomNumber?: number
    playerLevel?: number
    recentEvents?: string[]
    difficulty?: number
  }
}

// Response interface
export interface FlavorResponse {
  entityName: string
  description: string
  choiceFlavor: {
    attack?: string
    defend?: string
    flee?: string
    special?: string
    // Shop-specific
    browse?: string
    buy?: string
    leave?: string
    // Treasure-specific
    item?: string
    gold?: string
    health?: string
    // Shrine-specific
    offer?: string
    refuse?: string
  }
  outcomes: {
    victory?: string
    defeat?: string
    flee?: string
    special?: string
    // Shop outcomes
    purchase?: string
    browse?: string
    // Treasure outcomes
    itemFound?: string
    goldFound?: string
    healthFound?: string
    trapped?: string
    // Shrine outcomes
    boon?: string
    bane?: string
    refused?: string
  }
}

// Minimal prompt templates (500 tokens max)
const FLAVOR_PROMPTS = {
  combat: (req: FlavorRequest): string => {
    const theme = req.portalTheme || "a mysterious void"
    const rarity = req.entityRarity
    const difficulty = req.contextHints?.difficulty || 5

    return `You are a dungeon master creating a ${rarity} enemy encounter in ${theme}.

Room: ${req.contextHints?.roomNumber || 1}
Player Level: ${req.contextHints?.playerLevel || 1}
Difficulty: ${difficulty}/10

Create a vivid, unique enemy encounter. Return ONLY this JSON structure:

{
  "entityName": "Enemy name (2-4 words)",
  "description": "One vivid sentence describing the enemy's appearance/entrance (present tense)",
  "choiceFlavor": {
    "attack": "Attack action description (3-5 words)",
    "defend": "Defend action description (3-5 words)",
    "flee": "Flee action description (3-5 words)",
    "special": "Special action description (3-5 words)"
  },
  "outcomes": {
    "victory": "Victory result (one sentence)",
    "defeat": "Defeat result (one sentence)",
    "flee": "Flee result (one sentence)",
    "special": "Special outcome (one sentence)"
  }
}

Be creative, thematic to ${theme}, and match ${rarity} rarity power level. Return ONLY valid JSON.`
  },

  treasure: (req: FlavorRequest): string => {
    const theme = req.portalTheme || "a mysterious void"
    const rarity = req.entityRarity

    return `You are a dungeon master creating a ${rarity} treasure encounter in ${theme}.

Create a vivid treasure discovery. Return ONLY this JSON structure:

{
  "entityName": "Treasure container name (2-3 words)",
  "description": "One vivid sentence describing the treasure's appearance",
  "choiceFlavor": {
    "item": "Take item choice (3-5 words)",
    "gold": "Take gold choice (3-5 words)",
    "health": "Take health choice (3-5 words)"
  },
  "outcomes": {
    "itemFound": "Found item result (one sentence)",
    "goldFound": "Found gold result (one sentence)",
    "healthFound": "Found health result (one sentence)",
    "trapped": "Trap triggered result (one sentence)"
  }
}

Match ${rarity} rarity theme. Return ONLY valid JSON.`
  },

  shop: (req: FlavorRequest): string => {
    const theme = req.portalTheme || "a mysterious void"
    const rarity = req.entityRarity

    return `You are a dungeon master creating a ${rarity} merchant encounter in ${theme}.

Create a vivid merchant/shop. Return ONLY this JSON structure:

{
  "entityName": "Merchant name (2-4 words)",
  "description": "One vivid sentence describing the merchant/shop",
  "choiceFlavor": {
    "browse": "Browse wares choice (3-5 words)",
    "buy": "Buy item choice (3-5 words)",
    "leave": "Leave shop choice (3-5 words)"
  },
  "outcomes": {
    "purchase": "Purchase result (one sentence)",
    "browse": "Browse result (one sentence)"
  }
}

Match ${rarity} rarity theme. Return ONLY valid JSON.`
  },

  shrine: (req: FlavorRequest): string => {
    const theme = req.portalTheme || "a mysterious void"
    const rarity = req.entityRarity

    return `You are a dungeon master creating a ${rarity} shrine encounter in ${theme}.

Create a vivid shrine/altar. Return ONLY this JSON structure:

{
  "entityName": "Shrine name (2-4 words)",
  "description": "One vivid sentence describing the shrine",
  "choiceFlavor": {
    "offer": "Make offering choice (3-5 words)",
    "refuse": "Refuse offering choice (3-5 words)"
  },
  "outcomes": {
    "boon": "Blessing result (one sentence)",
    "bane": "Curse result (one sentence)",
    "refused": "Refused result (one sentence)"
  }
}

Match ${rarity} rarity theme. Return ONLY valid JSON.`
  },

  encounter: (req: FlavorRequest): string => {
    const theme = req.portalTheme || "a mysterious void"
    const rarity = req.entityRarity

    return `You are a dungeon master creating a ${rarity} NPC encounter in ${theme}.

Create a vivid NPC encounter. Return ONLY this JSON structure:

{
  "entityName": "NPC name (2-4 words)",
  "description": "One vivid sentence describing the NPC",
  "choiceFlavor": {
    "special": "Interact choice (3-5 words)",
    "flee": "Leave choice (3-5 words)"
  },
  "outcomes": {
    "special": "Interaction result (one sentence)",
    "flee": "Leave result (one sentence)"
  }
}

Match ${rarity} rarity theme. Return ONLY valid JSON.`
  },
}

// Procedural fallback when AI fails
const PROCEDURAL_FALLBACKS: Record<string, (rarity: Rarity) => FlavorResponse> = {
  combat: (rarity: Rarity) => ({
    entityName: `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} Guardian`,
    description: "A formidable guardian emerges from the shadows.",
    choiceFlavor: {
      attack: "Strike the guardian",
      defend: "Raise your defenses",
      flee: "Retreat quickly",
      special: "Attempt diplomacy",
    },
    outcomes: {
      victory: "The guardian falls to your superior skill.",
      defeat: "The guardian overwhelms you with devastating force.",
      flee: "You escape into the darkness.",
      special: "The guardian pauses, considering your words.",
    },
  }),

  treasure: (rarity: Rarity) => ({
    entityName: `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} Chest`,
    description: "An ornate chest gleams in the dim light.",
    choiceFlavor: {
      item: "Take the artifact",
      gold: "Take the gold",
      health: "Take the potion",
    },
    outcomes: {
      itemFound: "You claim a valuable artifact.",
      goldFound: "Gold coins spill into your hands.",
      healthFound: "The potion restores your vitality.",
      trapped: "A trap triggers as you reach for the treasure!",
    },
  }),

  shop: (rarity: Rarity) => ({
    entityName: `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} Merchant`,
    description: "A mysterious merchant displays exotic wares.",
    choiceFlavor: {
      browse: "Browse the wares",
      buy: "Purchase an item",
      leave: "Leave the shop",
    },
    outcomes: {
      purchase: "The merchant wraps your purchase carefully.",
      browse: "You examine the merchant's impressive collection.",
    },
  }),

  shrine: (rarity: Rarity) => ({
    entityName: `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} Shrine`,
    description: "An ancient shrine pulses with otherworldly energy.",
    choiceFlavor: {
      offer: "Make an offering",
      refuse: "Step away",
    },
    outcomes: {
      boon: "The shrine bestows a powerful blessing.",
      bane: "The shrine's curse settles upon you.",
      refused: "You wisely step away from the shrine.",
    },
  }),

  encounter: (rarity: Rarity) => ({
    entityName: `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} Stranger`,
    description: "A mysterious figure appears before you.",
    choiceFlavor: {
      special: "Speak with them",
      flee: "Move along",
    },
    outcomes: {
      special: "The stranger shares cryptic wisdom.",
      flee: "You continue on your path.",
    },
  }),
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body = (await request.json()) as FlavorRequest

    // Validate request
    if (!body.eventType || !body.entityRarity) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get appropriate prompt
    const promptTemplate = FLAVOR_PROMPTS[body.eventType]
    if (!promptTemplate) {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 })
    }

    const prompt = promptTemplate(body)

    try {
      // Call Groq with minimal tokens
      const { text } = await generateText({
        model: groq("llama-3.3-70b-versatile"),
        prompt,
        temperature: 0.8, // High creativity
      })

      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error("No valid JSON in response")
      }

      const flavorData = JSON.parse(jsonMatch[0]) as FlavorResponse

      // Validate response structure
      if (!flavorData.entityName || !flavorData.description) {
        throw new Error("Invalid flavor response structure")
      }

      const duration = Date.now() - startTime

      return NextResponse.json({
        ...flavorData,
        _meta: {
          source: "ai",
          duration,
          tokens: text.length, // Approximate
        },
      })
    } catch (aiError) {
      // AI failed - use procedural fallback
      console.warn("[generate-flavor] AI generation failed, using fallback:", aiError)

      const fallbackFn = PROCEDURAL_FALLBACKS[body.eventType]
      if (!fallbackFn) {
        throw new Error(`No fallback available for event type: ${body.eventType}`)
      }
      const fallbackData = fallbackFn(body.entityRarity)

      const duration = Date.now() - startTime

      return NextResponse.json({
        ...fallbackData,
        _meta: {
          source: "procedural",
          duration,
          fallbackReason: aiError instanceof Error ? aiError.message : "Unknown error",
        },
      })
    }
  } catch (error) {
    console.error("[generate-flavor] Request failed:", error)
    return NextResponse.json(
      {
        error: "Failed to generate flavor",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
