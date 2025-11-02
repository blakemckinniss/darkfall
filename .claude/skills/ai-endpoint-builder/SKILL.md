---
name: ai-endpoint-builder
description: Scaffolds new AI generation API endpoints following fal.ai and Groq patterns with proper error handling, type-safe schemas, and integration with game state. Use when creating new AI features, adding generation endpoints, or integrating third-party AI APIs.
allowed-tools: Read, Write, Edit, mcp__serena__find_symbol, mcp__serena__get_symbols_overview
---

# AI Endpoint Builder

Creates production-ready AI generation API endpoints for the Blackfell dungeon crawler, following established patterns from `app/api/generate-portrait/` and `app/api/generate-item/`.

## Supported AI Providers

### fal.ai (Image Generation)
- Used for: Character portraits, item art, location backgrounds
- Model: flux/schnell (or other fal models)
- Pattern: See `app/api/generate-portrait/route.ts`

### Groq (Text/Structured Generation via AI SDK)
- Used for: Item generation, narrative text, entity creation
- Models: mixtral-8x7b-32768, llama-3.1-70b-versatile
- Pattern: See `app/api/generate-item/route.ts`
- Uses Vercel AI SDK for structured outputs

### OpenAI (Alternative Text/Image Generation)
- Used for: Fallback text generation, DALL-E images
- Can be integrated using AI SDK patterns

## Endpoint Structure Pattern

All AI endpoints follow this structure:

```typescript
// app/api/generate-[feature]/route.ts

import { NextRequest, NextResponse } from "next/server"
// Import AI provider SDK
// Import schemas from lib/entities or define inline

export async function POST(req: NextRequest) {
  try {
    // 1. Parse and validate request
    const body = await req.json()
    const { prompt, ...options } = body

    // 2. Call AI provider
    const result = await aiProvider.generate({
      prompt,
      ...options
    })

    // 3. Transform response to game schema
    const gameEntity = transformToSchema(result)

    // 4. Return structured response
    return NextResponse.json({
      success: true,
      data: gameEntity
    })

  } catch (error) {
    // 5. Error handling
    console.error("Generation error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Generation failed"
      },
      { status: 500 }
    )
  }
}
```

## Instructions

### 1. Identify Requirements
From user request, determine:
- **What to generate**: Entity, image, text, narrative?
- **AI provider**: fal.ai (images), Groq (structured data), OpenAI (fallback)?
- **Input schema**: What does the endpoint accept?
- **Output schema**: What structure does it return?
- **Integration point**: Where in the game does this connect?

### 2. Create API Route File
Create new file at `app/api/generate-[feature]/route.ts`

### 3. Implement Provider Integration

#### For fal.ai (Images)
```typescript
import * as fal from "@fal-ai/serverless-client"

// Configure client
fal.config({
  credentials: process.env.FAL_KEY
})

// Generate image
const result = await fal.subscribe("fal-ai/flux/schnell", {
  input: {
    prompt: enhancedPrompt,
    image_size: "square_hd",
    num_inference_steps: 4,
    num_images: 1,
    enable_safety_checker: false,  // Allow fantasy content
  }
})

const imageUrl = result.images[0]?.url
```

#### For Groq (Structured Data via AI SDK)
```typescript
import { generateObject } from "ai"
import { createGroq } from "@ai-sdk/groq"
import { z } from "zod"

// Configure provider
const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY
})

// Define output schema with Zod
const outputSchema = z.object({
  name: z.string(),
  description: z.string(),
  rarity: z.enum(["common", "uncommon", "rare", "epic", "legendary"]),
  stats: z.object({
    attack: z.number().optional(),
    defense: z.number().optional()
  })
})

// Generate structured output
const { object: generatedData } = await generateObject({
  model: groq("mixtral-8x7b-32768"),
  schema: outputSchema,
  prompt: `Generate a fantasy ${entityType}...`,
  temperature: 0.8
})
```

#### For OpenAI (Text/Images)
```typescript
import { generateObject, generateText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// For structured data
const { object } = await generateObject({
  model: openai("gpt-4o"),
  schema: mySchema,
  prompt: "..."
})

// For text
const { text } = await generateText({
  model: openai("gpt-4o"),
  prompt: "..."
})
```

### 4. Add Prompt Engineering
Create effective prompts that:
- Specify exact output requirements
- Include constraints (stats ranges, themes)
- Match game lore and style
- Handle edge cases

Example from generate-item:
```typescript
const prompt = `Create a ${itemDescription} for a fantasy dungeon crawler game.

Rarity: ${rarity}
Stat Guidelines:
- Common: 5-20 value, +1 to +3 stats
- Uncommon: 20-40 value, +3 to +6 stats
- Rare: 40-70 value, +6 to +10 stats
- Epic: 70-100 value, +10 to +15 stats
- Legendary: 100-150 value, +15 to +25 stats

Generate balanced stats appropriate for ${rarity} rarity.`
```

### 5. Add Response Transformation
Transform AI output to match game entity schemas:

```typescript
function transformToGameEntity(aiOutput: AIResponse): GameEntity {
  return {
    id: `ai_${Date.now()}_${Math.random()}`,
    entityType: "treasure",
    name: aiOutput.name,
    description: aiOutput.description,
    rarity: aiOutput.rarity,
    icon: selectAppropriateIcon(aiOutput),
    itemType: aiOutput.itemType,
    value: aiOutput.value,
    stats: aiOutput.stats,
    tags: ["ai-generated", ...aiOutput.tags]
  }
}
```

### 6. Add Error Handling
Handle common error cases:
- Missing API keys
- Rate limiting
- Invalid prompts
- Network failures
- Malformed responses

```typescript
try {
  // Generation logic
} catch (error) {
  console.error(`[generate-${feature}] Error:`, error)

  // Specific error messages
  if (error instanceof z.ZodError) {
    return NextResponse.json({
      success: false,
      error: "Invalid output schema",
      details: error.errors
    }, { status: 400 })
  }

  if (error.message.includes("rate limit")) {
    return NextResponse.json({
      success: false,
      error: "Rate limit exceeded, try again later"
    }, { status: 429 })
  }

  // Generic error
  return NextResponse.json({
    success: false,
    error: error instanceof Error ? error.message : "Unknown error"
  }, { status: 500 })
}
```

### 7. Add Environment Variables
Document required env vars in `.env.example`:
```bash
# AI Provider API Keys
FAL_KEY=your_fal_api_key_here
GROQ_API_KEY=your_groq_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

### 8. Create Client-Side Integration
Add modal/button in game UI to call endpoint:

```typescript
// In dungeon-crawler.tsx or separate component
const [generating, setGenerating] = useState(false)

async function handleGenerate() {
  setGenerating(true)
  try {
    const response = await fetch("/api/generate-feature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, options })
    })

    const data = await response.json()

    if (data.success) {
      // Add to game state
      ENTITIES.addAI(data.data, { ttl: 3600000 })
      // Update UI
    } else {
      console.error("Generation failed:", data.error)
    }
  } catch (error) {
    console.error("Request failed:", error)
  } finally {
    setGenerating(false)
  }
}
```

## Examples

### Example 1: Enemy Generation Endpoint

**User Request**: "Create an endpoint to generate enemies with AI"

**Implementation**:

```typescript
// app/api/generate-enemy/route.ts
import { NextRequest, NextResponse } from "next/server"
import { generateObject } from "ai"
import { createGroq } from "@ai-sdk/groq"
import { z } from "zod"

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY
})

const enemySchema = z.object({
  name: z.string(),
  description: z.string(),
  rarity: z.enum(["common", "uncommon", "rare", "epic", "legendary"]),
  health: z.number(),
  attack: z.number(),
  defense: z.number(),
  gold: z.number(),
  exp: z.number(),
  abilities: z.array(z.string()).optional()
})

export async function POST(req: NextRequest) {
  try {
    const { prompt, rarity = "common" } = await req.json()

    const statRanges = {
      common: { health: [20, 40], attack: [5, 10], value: [5, 20] },
      uncommon: { health: [40, 60], attack: [10, 15], value: [20, 40] },
      rare: { health: [60, 90], attack: [15, 20], value: [40, 70] },
      epic: { health: [90, 130], attack: [20, 30], value: [70, 100] },
      legendary: { health: [130, 200], attack: [30, 45], value: [100, 150] }
    }

    const ranges = statRanges[rarity as keyof typeof statRanges]

    const { object: enemy } = await generateObject({
      model: groq("mixtral-8x7b-32768"),
      schema: enemySchema,
      prompt: `Create a ${rarity} fantasy enemy: ${prompt}

Stat ranges for ${rarity}:
- Health: ${ranges.health[0]}-${ranges.health[1]}
- Attack: ${ranges.attack[0]}-${ranges.attack[1]}
- Gold reward: ${ranges.value[0]}-${ranges.value[1]}
- Exp: Similar to gold

Generate balanced stats within these ranges.`,
      temperature: 0.8
    })

    const gameEnemy = {
      id: `enemy:ai_${Date.now()}`,
      entityType: "enemy" as const,
      ...enemy,
      icon: "gi-wolf-head",  // Default, can be improved with icon selection
      tags: ["ai-generated"]
    }

    return NextResponse.json({
      success: true,
      data: gameEnemy
    })

  } catch (error) {
    console.error("[generate-enemy] Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
```

### Example 2: Location Art Generation

**User Request**: "Generate background images for locations"

**Implementation**:

```typescript
// app/api/generate-location-art/route.ts
import { NextRequest, NextResponse } from "next/server"
import * as fal from "@fal-ai/serverless-client"

fal.config({
  credentials: process.env.FAL_KEY
})

export async function POST(req: NextRequest) {
  try {
    const { locationName, description, style = "fantasy" } = await req.json()

    const enhancedPrompt = `${style} art of ${locationName}: ${description}.
Cinematic, atmospheric, detailed environment art, digital painting style,
trending on artstation, dramatic lighting, epic composition`

    const result = await fal.subscribe("fal-ai/flux/schnell", {
      input: {
        prompt: enhancedPrompt,
        image_size: "landscape_16_9",
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: false
      }
    })

    const imageUrl = result.images[0]?.url

    if (!imageUrl) {
      throw new Error("No image generated")
    }

    return NextResponse.json({
      success: true,
      data: {
        imageUrl,
        prompt: enhancedPrompt
      }
    })

  } catch (error) {
    console.error("[generate-location-art] Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
```

## Best Practices

1. **Always Validate API Keys**: Check for env vars and return clear errors if missing
2. **Use Zod Schemas**: Define strict schemas for AI outputs to ensure type safety
3. **Add Generous Error Handling**: AI calls can fail in many ways
4. **Log Everything**: Use console.error with prefixes for debugging
5. **Rate Limit Protection**: Consider adding rate limiting for production
6. **Prompt Engineering**: Spend time crafting effective prompts
7. **Response Transformation**: Always transform AI outputs to match game schemas
8. **Test Thoroughly**: Test with various inputs, edge cases, and failure scenarios

## Files to Reference

- **Portrait Generation**: `app/api/generate-portrait/route.ts`
- **Item Generation**: `app/api/generate-item/route.ts`
- **Entity Schemas**: `lib/entities/schemas.ts`
- **Game State**: `lib/game-state.ts`

## Environment Variables

Required in `.env`:
```bash
FAL_KEY=your_fal_api_key
GROQ_API_KEY=your_groq_api_key
OPENAI_API_KEY=your_openai_api_key  # Optional
```
