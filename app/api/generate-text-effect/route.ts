import { type NextRequest, NextResponse } from "next/server"
import { generateObject } from "ai"
import { createGroq } from "@ai-sdk/groq"
import { z } from "zod"
import type { Rarity } from "@/lib/entities/schemas"

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY ?? "",
})

// Rarity to color mapping for constraints
const RARITY_COLOR_MAP: Record<Rarity, string[]> = {
  common: ["gray-400", "gray-500", "gray-600"],
  uncommon: ["green-400", "green-500", "green-600"],
  rare: ["blue-400", "blue-500", "blue-600"],
  epic: ["purple-400", "purple-500", "purple-600"],
  legendary: ["amber-400", "amber-500", "amber-600", "yellow-300"],
}

// Valid Tailwind color names
const VALID_TAILWIND_COLORS = [
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
]

// Text effect schema for AI generation
const textEffectSchema = z.object({
  type: z.enum(["shimmer", "gradient", "glow", "per-letter", "default"]),
  colors: z.array(z.string()),
  animationDuration: z.string(),
  intensity: z.enum(["subtle", "medium", "strong"]),
  customClass: z.string().nullable().optional(),
})

interface GenerateTextEffectRequest {
  entityName: string
  entityType: string
  rarity: Rarity
  theme?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateTextEffectRequest

    const { entityName, entityType, rarity, theme } = body

    // Build Groq prompt with constraints
    const prompt = `You are generating a text effect specification for a game entity. Return a JSON object matching this exact schema:

{
  "type": "shimmer" | "gradient" | "glow" | "per-letter" | "default",
  "colors": string[],  // Array of Tailwind color classes
  "animationDuration": string,  // Format: "2s", "3s", "4s", "5s", "6s"
  "intensity": "subtle" | "medium" | "strong",
  "customClass": string | null  // Optional custom CSS class
}

ENTITY CONTEXT:
- Name: ${entityName}
- Type: ${entityType}
- Rarity: ${rarity}
${theme ? `- Theme: ${theme}` : ""}

RARITY COLOR MAPPING:
- common: gray (gray-400 to gray-600)
- uncommon: green (green-400 to green-600)
- rare: blue (blue-400 to blue-600)
- epic: purple (purple-400 to purple-600)
- legendary: amber (amber-400 to amber-600)

EFFECT GUIDELINES:
1. Base colors MUST include the rarity color as primary
2. Effect intensity should match rarity:
   - common/uncommon: "subtle" or "medium", prefer "default" or "glow" types
   - rare/epic: "medium" or "strong", prefer "gradient" or "shimmer" types
   - legendary: "strong", prefer "shimmer" or "per-letter" types
3. Animation duration:
   - subtle effects: "2s" to "3s"
   - medium effects: "3s" to "4s"
   - strong effects: "4s" to "6s"

VALID TAILWIND COLORS:
Use format: {color}-{shade} where:
- Colors: ${VALID_TAILWIND_COLORS.join(", ")}
- Shades: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950

EXAMPLES:
{"type": "shimmer", "colors": ["amber-400", "yellow-300", "amber-600"], "animationDuration": "5s", "intensity": "strong"}
{"type": "default", "colors": ["gray-500"], "animationDuration": "2s", "intensity": "subtle"}
{"type": "gradient", "colors": ["purple-500", "indigo-400", "purple-600"], "animationDuration": "4s", "intensity": "medium"}

THEME OVERRIDES (apply these when thematically appropriate):
- Fire/Heat entities: Add red, orange, or yellow tones
- Ice/Frost entities: Add cyan, sky, or blue tones
- Nature entities: Add green, emerald, or lime tones
- Shadow/Dark entities: Add slate, zinc, or neutral tones

SPECIAL CASES:
- If entity has conflicting themes (e.g., "Fire" + "common" rarity), prioritize rarity for base color but add theme colors as accents
- For "default" type, always use single color from rarity mapping
- "per-letter" effects work best with 3-5 colors maximum

Generate an appropriate text effect that enhances the entity's theme while respecting its rarity tier.`

    // Generate with Groq using structured output
    const result = await generateObject({
      model: groq("llama-3.3-70b-versatile"),
      schema: textEffectSchema,
      prompt,
      temperature: 0.75, // Creative but constrained
    })

    // Validate generated colors are valid Tailwind classes
    const validatedEffect = {
      ...result.object,
      colors: result.object.colors.filter((color) => {
        // Check if color matches Tailwind format: color-shade
        const parts = color.split("-")
        if (parts.length !== 2) return false

        const colorName = parts[0]
        const shade = parts[1]

        if (!colorName || !shade) return false

        return (
          VALID_TAILWIND_COLORS.includes(colorName) &&
          ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"].includes(
            shade
          )
        )
      }),
    }

    // Fallback to rarity colors if validation fails
    if (validatedEffect.colors.length === 0) {
      const rarityColors = RARITY_COLOR_MAP[rarity]
      validatedEffect.colors = rarityColors && rarityColors[0] ? [rarityColors[0]] : ["gray-500"]
      validatedEffect.type = "default"
    }

    return NextResponse.json({
      success: true,
      textEffect: validatedEffect,
    })
  } catch (error) {
    console.error("Text effect generation error:", error)

    // Fallback response with default effect
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate text effect",
        textEffect: {
          type: "default",
          colors: ["text-foreground"],
          animationDuration: "2s",
          intensity: "subtle",
          customClass: null,
        },
      },
      { status: 500 }
    )
  }
}
