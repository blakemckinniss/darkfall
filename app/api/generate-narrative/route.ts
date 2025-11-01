import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { createGroq } from "@ai-sdk/groq"
import { ENTITIES, TTL } from "@/lib/entities"

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY ?? "",
})

interface NarrativeChoice {
  text: string
  outcome: {
    message: string
    healthChange?: number
    goldChange?: number
    experienceChange?: number
  }
}

interface NarrativeData {
  description: string
  entity: string
  entityRarity: string
  entityType: string
  color?: string
  choices: NarrativeChoice[]
  entityData?: {
    health?: number
    attack?: number
    gold?: number
    exp?: number
  }
}

// Variety generators for unique encounters - used for prompt injection
const ATMOSPHERIC_ELEMENTS = [
  "The void pulses with strange energy",
  "Reality fractures at the edges of your vision",
  "Whispers echo from nowhere",
  "The air shimmers with unstable magic",
  "Void rifts crackle nearby",
  "Ancient power radiates from the walls",
  "Time feels distorted here",
  "The darkness seems alive",
  "Ethereal mist swirls around you",
  "Crystal formations glow faintly",
]

const ENCOUNTER_THEMES = [
  "corrupted",
  "ancient",
  "ethereal",
  "crystalline",
  "shadowy",
  "arcane",
  "primal",
  "cursed",
  "celestial",
  "abyssal",
]

const LOCATION_HINTS = [
  "a forgotten chamber",
  "a collapsed corridor",
  "a ritual circle",
  "a crumbling archway",
  "a void-touched sanctum",
  "an abandoned outpost",
  "a crystallized junction",
  "a fractured hall",
  "a nexus of power",
  "a sealed vault",
]

export async function POST(request: NextRequest) {
  try {
    const { playerStats } = await request.json()

    if (!playerStats) {
      return NextResponse.json({ error: "Player stats required" }, { status: 400 })
    }

    console.log("[narrative] Generating void event for player:", playerStats)

    // Generate unique context for this encounter
    const seed = Date.now()
    const atmosphere =
      ATMOSPHERIC_ELEMENTS[seed % ATMOSPHERIC_ELEMENTS.length] ?? ATMOSPHERIC_ELEMENTS[0]
    const theme =
      ENCOUNTER_THEMES[Math.floor(Math.random() * ENCOUNTER_THEMES.length)] ?? ENCOUNTER_THEMES[0]
    const location =
      LOCATION_HINTS[Math.floor(Math.random() * LOCATION_HINTS.length)] ?? LOCATION_HINTS[0]
    const temperature = 0.7 + Math.random() * 0.2 // Vary between 0.7-0.9

    const systemPrompt = `You are an entity-driven encounter generator for "The Void" dungeon crawler.
Generate encounters that prioritize mechanical information over narrative prose.
Respond ONLY with valid JSON matching this exact structure (no markdown, no extra text):
{
  "description": "string (ENTITY-FIRST: state what entity appears, its stats/threat level, minimal location context)",
  "entity": "string (clear, concise entity name - 2-3 words max)",
  "entityRarity": "common" | "uncommon" | "rare" | "epic" | "legendary",
  "entityType": "enemy" | "npc" | "object" | "creature" | "phenomenon",
  "color": "string (optional, Tailwind text color class for thematic entities - e.g., 'text-red-500' for fire, 'text-cyan-400' for ice)",
  "entityData": {
    "health": number (optional, for enemies: 20-120 based on rarity),
    "attack": number (optional, for enemies: 5-30 based on rarity),
    "gold": number (optional, reward amount: 10-150),
    "exp": number (optional, experience: 15-100)
  },
  "choices": [
    {
      "text": "string (direct action verb + target)",
      "outcome": {
        "message": "string (state mechanical result directly - what stats changed and why)",
        "healthChange": number (optional, -50 to 50),
        "goldChange": number (optional, -30 to 50),
        "experienceChange": number (optional, 0 to 60)
      }
    }
  ]
}

MANDATORY STYLE RULES:
1. ENTITY-FIRST DESCRIPTIONS: Start with entity name and stats, add 1 brief location/atmosphere phrase only if needed
   ✓ GOOD: "A Void Wraith (45 HP, 12 ATK) blocks your path. Shadows writhe around it."
   ✗ BAD: "In the depths of the twisted corridor, writhing with shadows, a mysterious entity emerges..."

2. DIRECT ACTION CHOICES: Use clear verbs, no flowery language
   ✓ GOOD: "Attack the Wraith", "Evade and flee", "Offer gold (10g)"
   ✗ BAD: "Attempt to engage in combat", "Try your luck at negotiation"

3. MECHANICAL OUTCOME MESSAGES: State what happened in game terms
   ✓ GOOD: "Wraith dealt 12 damage. Gained 25 exp, 20 gold."
   ✗ BAD: "You strike down the Wraith as shadows dissipate into nothingness..."

4. MINIMAL PROSE: Cut all unnecessary adjectives and drama
   - NO: "glimmers", "brandishes menacingly", "radiates energy", "twisted", "ominous"
   - YES: entity stats, clear locations, direct threats

5. ENTITY NAMES: Short, functional, instantly understandable
   ✓ GOOD: "Void Wraith", "Crystal Sentinel", "Rift Beast"
   ✗ BAD: "The Twisted Shadow of the Forgotten Realm", "Ancient One Who Walks Between"

6. CUSTOM COLORS (optional): Add thematic colors for unique entities
   - Fire/lava: "text-red-500" or "text-orange-500"
   - Ice/frost: "text-cyan-400" or "text-blue-300"
   - Poison/corruption: "text-green-600" or "text-lime-500"
   - Shadow/void: "text-violet-400" or "text-purple-600"
   - Holy/divine: "text-yellow-300" or "text-amber-400"
   - Omit color field to use default rarity colors

ENTITY STATS (for enemies - REQUIRED):
- common: health 20-30, attack 5-8, gold 10-15, exp 15-20
- uncommon: health 40-50, attack 10-15, gold 20-30, exp 25-35
- rare: health 60-70, attack 16-20, gold 40-60, exp 45-60
- epic: health 80-90, attack 21-25, gold 70-90, exp 65-80
- legendary: health 100-120, attack 26-30, gold 100-150, exp 90-100

OUTCOME BALANCE:
- Combat: -10 to -30 health, appropriate exp/gold based on entity rarity
- Risk: -15 to -30 health OR +20 to +40 gold (high variance)
- Safe: minimal stat changes (0-5 exp, 0-5 gold)

ENTITY TYPES: enemy (hostile), npc (can trade), object (interactive), creature (neutral), phenomenon (environmental)

CURRENT ENCOUNTER CONTEXT (seed: ${seed}):
- Atmosphere: ${atmosphere}
- Theme preference: ${theme}
- Location type: ${location}
- Player state: Health ${playerStats.health}/${playerStats.maxHealth}, Level ${playerStats.level}, Gold ${playerStats.gold}

Use this context to create unique encounters. The theme and atmosphere should subtly influence entity naming and description without overriding the entity-first, mechanical style.`

    const { text } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      system: systemPrompt,
      prompt:
        "Generate an entity encounter. State entity name and stats first, then location. Create 2-3 tactical choices with clear mechanical outcomes.",
      temperature,
    })

    console.log("[narrative] Groq response:", text)

    // Parse the generated narrative
    const cleanedText = text
      .trim()
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
    const narrativeData = JSON.parse(cleanedText) as NarrativeData

    // Register AI-generated entity in the registry (if it's an enemy with stats)
    let registeredEntity = null
    if (narrativeData.entityType === "enemy" && narrativeData.entityData) {
      const entityToRegister = {
        id: `enemy:ai_${Date.now()}`,
        entityType: "enemy",
        name: narrativeData.entity,
        health: narrativeData.entityData.health || 50,
        attack: narrativeData.entityData.attack || 10,
        gold: narrativeData.entityData.gold || 25,
        exp: narrativeData.entityData.exp || 30,
        rarity: narrativeData.entityRarity,
        icon: getIconForEntityType(narrativeData.entityType),
        source: "ai",
        version: 1,
        sessionOnly: false,
        tags: ["void", "ai-generated"],
        ...(narrativeData.color && { color: narrativeData.color }),
      }

      console.log("[narrative] Registering AI entity:", entityToRegister)

      const result = ENTITIES.addAI(entityToRegister, {
        ttl: TTL.WEEK, // Entities expire after 1 week
        sessionOnly: false,
        tags: ["void", "ai-generated"],
      })

      if (result.success) {
        registeredEntity = result.data
        console.log("[narrative] Entity registered successfully:", registeredEntity.id)
      } else {
        console.error("[narrative] Failed to register entity:", result.error)
      }
    }

    // Transform to GameEvent structure
    const event = {
      description: narrativeData.description,
      entity: narrativeData.entity,
      entityRarity: narrativeData.entityRarity,
      entityData: {
        name: narrativeData.entity,
        rarity: narrativeData.entityRarity,
        type: narrativeData.entityType,
        icon: getIconForEntityType(narrativeData.entityType),
        ...(narrativeData.entityData?.health && { health: narrativeData.entityData.health }),
        ...(narrativeData.entityData?.attack && { attack: narrativeData.entityData.attack }),
        ...(narrativeData.entityData?.gold && { gold: narrativeData.entityData.gold }),
        ...(narrativeData.entityData?.exp && { exp: narrativeData.entityData.exp }),
      },
      choices: narrativeData.choices.map((choice) => ({
        text: choice.text,
        outcome: {
          message: choice.outcome.message,
          entity: narrativeData.entity,
          entityRarity: narrativeData.entityRarity,
          ...(choice.outcome.healthChange !== undefined && {
            healthChange: choice.outcome.healthChange,
          }),
          ...(choice.outcome.goldChange !== undefined && { goldChange: choice.outcome.goldChange }),
          ...(choice.outcome.experienceChange !== undefined && {
            experienceChange: choice.outcome.experienceChange,
          }),
        },
      })),
    }

    console.log("[narrative] Generated event:", event)

    return NextResponse.json({
      event,
      registeredEntity: registeredEntity?.id || null,
    })
  } catch (error) {
    console.error("[narrative] Error generating narrative:", error)
    return NextResponse.json(
      { error: "Failed to generate narrative. Please try again." },
      { status: 500 }
    )
  }
}

function getIconForEntityType(type: string): string {
  const iconMap: Record<string, string> = {
    enemy: "ra-wolf-howl",
    npc: "ra-player",
    object: "ra-rune-stone",
    creature: "ra-beast",
    phenomenon: "ra-crystal-wand",
  }
  return iconMap[type] || "ra-droplet"
}
