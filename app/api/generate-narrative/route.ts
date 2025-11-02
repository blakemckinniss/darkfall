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

interface NarrativeTreasureChoice {
  type: "item" | "gold" | "health"
  description: string
  itemName?: string
  itemType?: "weapon" | "armor" | "accessory" | "consumable"
  itemStats?: {
    attack?: number
    defense?: number
    health?: number
  }
  itemRarity?: "common" | "uncommon" | "rare" | "epic" | "legendary"
  gold?: number
  healthRestore?: number
}

interface NarrativeShopItem {
  itemName: string
  itemType: "weapon" | "armor" | "accessory" | "consumable"
  itemStats?: {
    attack?: number
    defense?: number
    health?: number
  }
  itemRarity: "common" | "uncommon" | "rare" | "epic" | "legendary"
  price: number
  stock: number
  description: string
}

interface NarrativeShrineOffer {
  costType: "health" | "gold"
  costAmount: number
  boonDescription: string
  boonEffect: {
    healthChange?: number
    goldChange?: number
    itemName?: string
    itemType?: "weapon" | "armor" | "accessory" | "consumable"
    itemStats?: { attack?: number; defense?: number; health?: number }
    itemRarity?: "common" | "uncommon" | "rare" | "epic" | "legendary"
  }
  baneDescription: string
  baneEffect: {
    healthChange?: number
    goldChange?: number
  }
  boonChance: number
}

interface NarrativeData {
  eventType: "combat" | "shop" | "shrine" | "treasure" | "encounter"
  description: string
  entity: string
  entityRarity: string
  entityType: string
  color?: string
  choices: NarrativeChoice[]
  treasureChoices?: NarrativeTreasureChoice[]
  entityData?: {
    health?: number
    attack?: number
    gold?: number
    exp?: number
  }
  shopInventory?: NarrativeShopItem[]
  shrineOffer?: NarrativeShrineOffer
  trapRisk?: {
    failChance: number
    penalty: {
      healthChange?: number
      goldChange?: number
    }
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
    const { playerStats, portalContext } = await request.json()

    if (!playerStats) {
      return NextResponse.json({ error: "Player stats required" }, { status: 400 })
    }

    const locationType = portalContext?.theme || "The Void"
    console.log(
      `[narrative] Generating event for ${locationType} (player level ${playerStats.level})`
    )

    // Generate unique context for this encounter
    const seed = Date.now()
    const atmosphere =
      ATMOSPHERIC_ELEMENTS[seed % ATMOSPHERIC_ELEMENTS.length] ?? ATMOSPHERIC_ELEMENTS[0]
    const theme =
      ENCOUNTER_THEMES[Math.floor(Math.random() * ENCOUNTER_THEMES.length)] ?? ENCOUNTER_THEMES[0]
    const location =
      LOCATION_HINTS[Math.floor(Math.random() * LOCATION_HINTS.length)] ?? LOCATION_HINTS[0]
    const temperature = 0.85 + Math.random() * 0.1 // Vary between 0.85-0.95 for high variety

    const locationContext = portalContext
      ? `You are generating an encounter for "${portalContext.theme}" (${portalContext.rarity} portal, risk level: ${portalContext.riskLevel}/10).
Encounters should match the portal's theme and difficulty.`
      : `You are generating an encounter for "The Void" - a mysterious, unstable dimension.`

    const systemPrompt = `You are a diverse event generator for a dungeon crawler roguelike.
${locationContext}
Generate varied events that prioritize mechanical clarity and gameplay diversity.
Respond ONLY with valid JSON matching this exact structure (no markdown, no extra text):

BASE STRUCTURE (ALL EVENT TYPES):
{
  "eventType": "combat" | "shop" | "shrine" | "treasure" | "encounter",
  "description": "string (ENTITY-FIRST: state what entity appears, its stats/threat level, minimal location context)",
  "entity": "string (clear, concise entity name - 2-3 words max)",
  "entityRarity": "common" | "uncommon" | "rare" | "epic" | "legendary",
  "entityType": "enemy" | "npc" | "object" | "creature" | "phenomenon",
  "color": "string (optional, Tailwind text color class)",
  "entityData": {
    "health": number (optional, for combat),
    "attack": number (optional, for combat),
    "gold": number (optional, reward/cost amount),
    "exp": number (optional, experience)
  },
  "choices": [ ... ], // Always required, format varies by eventType

  // EVENT-SPECIFIC FIELDS (add only for specific eventType):
  "treasureChoices": [...], // For combat/treasure events (optional, 40% chance)
  "shopInventory": [...],   // For shop events (required)
  "shrineOffer": {...},     // For shrine events (required)
  "trapRisk": {...}         // For treasure events with traps (optional, 30% chance)
}

════════════════════════════════════════════════════════════════
EVENT TYPE 1: COMBAT (Aggressive Enemy Encounters)
════════════════════════════════════════════════════════════════
{
  "eventType": "combat",
  "entity": "Void Wraith",
  "entityRarity": "rare",
  "entityType": "enemy",
  "description": "A Void Wraith (65 HP, 18 ATK) blocks your path in the fractured hall.",
  "entityData": { "health": 65, "attack": 18, "gold": 50, "exp": 55 },
  "choices": [
    { "text": "Attack the Wraith", "outcome": { "message": "Wraith dealt 18 damage. You dealt 20 damage. Gained 55 exp.", "healthChange": -18, "experienceChange": 55 }},
    { "text": "Use defensive stance", "outcome": { "message": "Blocked 10 damage. Wraith dealt 8 damage.", "healthChange": -8, "experienceChange": 10 }},
    { "text": "Attempt to flee", "outcome": { "message": "Escaped but took 5 damage in retreat.", "healthChange": -5, "experienceChange": 0 }}
  ],
  "treasureChoices": [ // OPTIONAL - 40% chance
    { "type": "item", "itemName": "Void Blade", "itemType": "weapon", "itemStats": {"attack": 12}, "itemRarity": "rare", "description": "Dark blade (+12 ATK)" },
    { "type": "gold", "gold": 60, "description": "60 gold coins" }
  ]
}

════════════════════════════════════════════════════════════════
EVENT TYPE 2: SHOP (NPC Merchant with Inventory)
════════════════════════════════════════════════════════════════
{
  "eventType": "shop",
  "entity": "Wandering Merchant",
  "entityRarity": "uncommon",
  "entityType": "npc",
  "description": "A Wandering Merchant sets up shop in the chamber. 3 items for sale.",
  "entityData": {},
  "choices": [
    { "text": "Browse shop inventory", "outcome": { "message": "Merchant shows wares. Gold unchanged.", "goldChange": 0 }},
    { "text": "Ask about portal rumors", "outcome": { "message": "Merchant shares portal intel. Gained 5 exp.", "experienceChange": 5 }},
    { "text": "Leave the shop", "outcome": { "message": "Moved on without purchasing.", "experienceChange": 0 }}
  ],
  "shopInventory": [ // REQUIRED for shop events
    { "itemName": "Steel Sword", "itemType": "weapon", "itemStats": {"attack": 8}, "itemRarity": "uncommon", "price": 40, "stock": 1, "description": "Reliable blade (+8 ATK)" },
    { "itemName": "Leather Armor", "itemType": "armor", "itemStats": {"defense": 6}, "itemRarity": "uncommon", "price": 35, "stock": 1, "description": "Sturdy protection (+6 DEF)" },
    { "itemName": "Health Potion", "itemType": "consumable", "itemStats": {"health": 30}, "itemRarity": "common", "price": 20, "stock": 3, "description": "Restores 30 HP" }
  ]
}

════════════════════════════════════════════════════════════════
EVENT TYPE 3: SHRINE (Sacrifice Resource for Boon/Bane)
════════════════════════════════════════════════════════════════
{
  "eventType": "shrine",
  "entity": "Void Altar",
  "entityRarity": "rare",
  "entityType": "object",
  "description": "A Void Altar pulses with unstable energy. Sacrifice 15 HP or 40 gold for random blessing.",
  "entityData": {},
  "choices": [
    { "text": "Sacrifice 15 health", "outcome": { "message": "Blood offered to altar. Awaiting blessing...", "healthChange": -15 }},
    { "text": "Sacrifice 40 gold", "outcome": { "message": "Gold consumed by void. Awaiting blessing...", "goldChange": -40 }},
    { "text": "Leave the altar", "outcome": { "message": "Moved on without offering.", "experienceChange": 0 }}
  ],
  "shrineOffer": { // REQUIRED for shrine events
    "costType": "health",
    "costAmount": 15,
    "boonDescription": "Void Blessing: +15 HP, +5 ATK buff (temporary)",
    "boonEffect": { "healthChange": 15, "goldChange": 0 },
    "baneDescription": "Void Curse: -10 HP, -20 gold lost",
    "baneEffect": { "healthChange": -10, "goldChange": -20 },
    "boonChance": 60
  }
}

════════════════════════════════════════════════════════════════
EVENT TYPE 4: TREASURE (Loot Discovery with Optional Trap)
════════════════════════════════════════════════════════════════
{
  "eventType": "treasure",
  "entity": "Ancient Chest",
  "entityRarity": "uncommon",
  "entityType": "object",
  "description": "An Ancient Chest sits in the chamber. Lock looks worn.",
  "entityData": {},
  "choices": [
    { "text": "Open the chest", "outcome": { "message": "Chest opened. Select reward.", "experienceChange": 5 }},
    { "text": "Check for traps", "outcome": { "message": "Found trap mechanism. Chest safely opened.", "experienceChange": 10 }},
    { "text": "Leave the chest", "outcome": { "message": "Moved on without looting.", "experienceChange": 0 }}
  ],
  "treasureChoices": [ // REQUIRED for treasure events
    { "type": "item", "itemName": "Ruby Ring", "itemType": "accessory", "itemStats": {"attack": 3, "defense": 2}, "itemRarity": "uncommon", "description": "Jeweled ring (+3 ATK, +2 DEF)" },
    { "type": "gold", "gold": 35, "description": "35 gold coins" },
    { "type": "health", "healthRestore": 20, "description": "Healing salve (restore 20 HP)" }
  ],
  "trapRisk": { // OPTIONAL - 30% chance for treasure events
    "failChance": 40,
    "penalty": { "healthChange": -15, "goldChange": 0 }
  }
}

════════════════════════════════════════════════════════════════
EVENT TYPE 5: ENCOUNTER (Non-Aggressive Entity - Dialogue/Trade)
════════════════════════════════════════════════════════════════
{
  "eventType": "encounter",
  "entity": "Lost Explorer",
  "entityRarity": "common",
  "entityType": "npc",
  "description": "A Lost Explorer seeks help navigating the void.",
  "entityData": {},
  "choices": [
    { "text": "Help the explorer", "outcome": { "message": "Explorer grateful. Gained 15 exp, 10 gold reward.", "goldChange": 10, "experienceChange": 15 }},
    { "text": "Trade information", "outcome": { "message": "Shared portal knowledge. Gained 20 exp.", "experienceChange": 20 }},
    { "text": "Ignore and move on", "outcome": { "message": "Moved on without helping.", "experienceChange": 0 }}
  ]
}

════════════════════════════════════════════════════════════════
GENERAL RULES FOR ALL EVENT TYPES
════════════════════════════════════════════════════════════════
1. ENTITY-FIRST DESCRIPTIONS: Entity name/stats first, brief location context
2. DIRECT CHOICES: Clear action verbs (Attack, Trade, Sacrifice, Open, Help)
3. MECHANICAL OUTCOMES: State stat changes directly (no flowery prose)
4. ENTITY STATS (combat): common 20-30 HP, uncommon 40-50 HP, rare 60-70 HP, epic 80-90 HP, legendary 100-120 HP
5. ALWAYS include 2-3 choices minimum
6. Shop inventory: 2-4 items, prices 20-80 gold based on rarity
7. Shrine boonChance: 50-70% (higher = more reliable blessing)
8. Treasure trapRisk: failChance 30-50% (higher = more dangerous)

CURRENT ENCOUNTER CONTEXT (seed: ${seed}):
${
  portalContext
    ? `- Portal: ${portalContext.theme} (${portalContext.rarity})
- Risk Level: ${portalContext.riskLevel}/10
- Room: ${portalContext.currentRoom}/${portalContext.expectedRooms}
- Stability: ${portalContext.stability}%`
    : `- Atmosphere: ${atmosphere}
- Theme preference: ${theme}
- Location type: ${location}`
}
- Player state: Health ${playerStats.health}/${playerStats.maxHealth}, Level ${playerStats.level}, Gold ${playerStats.gold}

IMPORTANT: Generate a DIVERSE mix of event types. Avoid generating only combat events.
- Distribute evenly: ~30% combat, ~20% shop, ~20% shrine, ~15% treasure, ~15% encounter
- Match event type to portal context and player needs
- For low health: favor shop (potions), treasure (healing), encounter (low-risk rewards)
- For high gold: favor shop (equipment), shrine (sacrifice gold for power)
- For portal exploration: mix all types for varied gameplay

${portalContext ? `Use the portal theme to create thematically appropriate ${portalContext.rarity} encounters matching risk level ${portalContext.riskLevel}/10.` : `Create varied encounters. Avoid repetitive combat-only events.`}`

    const { text } = await generateText({
      model: groq("openai/gpt-oss-20b"),
      system: systemPrompt,
      prompt:
        "Generate ONE varied event from the 5 event types (combat/shop/shrine/treasure/encounter). Choose the event type that best fits the current player state and portal context. Include all required fields for your chosen eventType. Return ONLY valid JSON.",
      temperature,
    })

    console.log("[narrative] Groq response:", text)

    // Parse the generated narrative
    const cleanedText = text
      .trim()
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
    const narrativeData = JSON.parse(cleanedText) as NarrativeData

    // DEBUG: Log treasure choices generation
    console.log("[narrative] DEBUG - AI Response:", {
      hasTreasureChoices: !!narrativeData.treasureChoices,
      treasureChoicesCount: narrativeData.treasureChoices?.length || 0,
      entityType: narrativeData.entityType,
      entity: narrativeData.entity,
      fullTreasureChoices: narrativeData.treasureChoices,
    })

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

    // Transform treasure choices if present
    const transformedTreasureChoices = narrativeData.treasureChoices?.map((choice) => {
      const baseChoice = {
        type: choice.type,
        description: choice.description,
      }

      if (choice.type === "item" && choice.itemName) {
        return {
          ...baseChoice,
          item: {
            id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: choice.itemName,
            type: choice.itemType || "treasure",
            value: choice.gold || 0,
            rarity: choice.itemRarity || "common",
            icon: getIconForItemType(choice.itemType || "treasure"),
            stats: choice.itemStats,
          },
        }
      } else if (choice.type === "gold") {
        return {
          ...baseChoice,
          gold: choice.gold || 0,
        }
      } else if (choice.type === "health") {
        return {
          ...baseChoice,
          healthRestore: choice.healthRestore || 0,
        }
      }
      return baseChoice
    })

    // Transform shop inventory if present
    const transformedShopInventory = narrativeData.shopInventory?.map((shopItem) => ({
      item: {
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: shopItem.itemName,
        type: shopItem.itemType,
        value: shopItem.price,
        rarity: shopItem.itemRarity,
        icon: getIconForItemType(shopItem.itemType),
        stats: shopItem.itemStats,
      },
      price: shopItem.price,
      stock: shopItem.stock,
    }))

    // Transform shrine offer if present
    const transformedShrineOffer = narrativeData.shrineOffer
      ? {
          costType: narrativeData.shrineOffer.costType,
          costAmount: narrativeData.shrineOffer.costAmount,
          boonDescription: narrativeData.shrineOffer.boonDescription,
          boonEffect: {
            healthChange: narrativeData.shrineOffer.boonEffect.healthChange,
            goldChange: narrativeData.shrineOffer.boonEffect.goldChange,
            ...(narrativeData.shrineOffer.boonEffect.itemName && {
              itemGained: {
                id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: narrativeData.shrineOffer.boonEffect.itemName,
                type: narrativeData.shrineOffer.boonEffect.itemType || "treasure",
                value: 0,
                rarity: narrativeData.shrineOffer.boonEffect.itemRarity || "common",
                icon: getIconForItemType(
                  narrativeData.shrineOffer.boonEffect.itemType || "treasure"
                ),
                stats: narrativeData.shrineOffer.boonEffect.itemStats,
              },
            }),
          },
          baneDescription: narrativeData.shrineOffer.baneDescription,
          baneEffect: {
            healthChange: narrativeData.shrineOffer.baneEffect.healthChange,
            goldChange: narrativeData.shrineOffer.baneEffect.goldChange,
          },
          boonChance: narrativeData.shrineOffer.boonChance,
        }
      : undefined

    // Transform to GameEvent structure
    const event = {
      eventType: narrativeData.eventType,
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
      ...(transformedTreasureChoices && { treasureChoices: transformedTreasureChoices }),
      ...(transformedShopInventory && { shopInventory: transformedShopInventory }),
      ...(transformedShrineOffer && { shrineOffer: transformedShrineOffer }),
      ...(narrativeData.trapRisk && { trapRisk: narrativeData.trapRisk }),
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

function getIconForItemType(type: string): string {
  const iconMap: Record<string, string> = {
    weapon: "ra-sword",
    armor: "ra-shield",
    accessory: "ra-gem-pendant",
    consumable: "ra-potion",
    treasure: "ra-crystal-ball",
  }
  return iconMap[type] || "ra-crystal-ball"
}
