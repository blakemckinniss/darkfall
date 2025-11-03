import type { Rarity } from "./entities/schemas"
import { PROCEDURAL_FORMULAS, selectRarity } from "./procedural-formulas"
import type { FlavorResponse } from "@/app/api/generate-flavor/route"

/**
 * Event Template Builders
 *
 * Combines procedural game mechanics with AI-generated flavor to create complete events.
 * Architecture: Template builder receives EntitySeed + AIFlavor → outputs GameEvent
 */

// Entity seed - procedural constraints for AI generation
export interface EntitySeed {
  entityType: "enemy" | "npc" | "creature"
  rarity: Rarity
  archetypeHints?: string[]
  thematicContext: {
    portalTheme?: string
    biomeElements?: string[]
    threatLevel?: number
  }
  mechanicalConstraints: {
    baseHealth: number
    baseAttack: number
    baseDefense: number
    goldRange: [number, number]
    expRange: [number, number]
  }
}

// Complete game event structure
export interface GameEvent {
  id: string
  type: "combat" | "treasure" | "shop" | "shrine" | "encounter"
  entity: {
    name: string
    rarity: Rarity
    description: string
    icon: string
    color: string
  }
  stats?: {
    health: number
    maxHealth: number
    attack: number
    defense: number
  }
  rewards?: {
    gold: number
    exp: number
  }
  choices: Array<{
    id: string
    text: string
    type: "attack" | "defend" | "flee" | "special" | "browse" | "buy" | "leave" | "offer" | "refuse"
    outcome?: {
      message: string
      healthChange?: number
      goldChange?: number
      expChange?: number
      success?: boolean
    }
  }>
  metadata: {
    source: "ai" | "procedural" | "cache"
    generationTime?: number
    difficulty?: number
    trapChance?: number
    trapDamage?: number
    boonChance?: number
    boonReward?: number
    banePenalty?: number
    boonMessage?: string
    baneMessage?: string
  }
}

// Rarity color mapping
const RARITY_COLORS: Record<Rarity, string> = {
  common: "text-gray-400",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-orange-400",
}

// Icon mapping by entity type
const ENTITY_ICONS = {
  combat: "ra-monster-skull",
  treasure: "ra-crystal-ball",
  shop: "ra-shop",
  shrine: "ra-temple",
  encounter: "ra-hood",
}

/**
 * Generate entity seed for AI flavor generation
 */
export const generateEntitySeed = (context: {
  eventType: "combat" | "treasure" | "shop" | "shrine" | "encounter"
  portalTheme?: string
  roomNumber?: number
  playerLevel?: number
  stability?: number
}): EntitySeed => {
  const { eventType, portalTheme, roomNumber = 1, playerLevel = 1, stability = 100 } = context

  // Calculate difficulty based on room depth and portal stability
  const difficulty = PROCEDURAL_FORMULAS.difficulty.calculateDifficulty(roomNumber, stability)

  // Select rarity based on difficulty
  const rarity = selectRarity(difficulty - 5)

  // Calculate stats using procedural formulas
  const baseHealth = PROCEDURAL_FORMULAS.stats.health(rarity, difficulty)
  const baseAttack = PROCEDURAL_FORMULAS.stats.attack(rarity, difficulty)
  const baseDefense = PROCEDURAL_FORMULAS.stats.defense(rarity, difficulty)
  const gold = PROCEDURAL_FORMULAS.rewards.gold(rarity, playerLevel)
  const exp = PROCEDURAL_FORMULAS.rewards.exp(rarity, playerLevel)

  const seed: EntitySeed = {
    entityType: eventType === "combat" ? "enemy" : "npc",
    rarity,
    thematicContext: {
      threatLevel: difficulty,
    },
    mechanicalConstraints: {
      baseHealth,
      baseAttack,
      baseDefense,
      goldRange: [Math.floor(gold * 0.8), Math.floor(gold * 1.2)],
      expRange: [Math.floor(exp * 0.8), Math.floor(exp * 1.2)],
    },
  }

  if (portalTheme) {
    seed.thematicContext.portalTheme = portalTheme
  }

  return seed
}

/**
 * Build combat event from seed + AI flavor
 */
export const buildCombatEvent = (seed: EntitySeed, flavor: FlavorResponse): GameEvent => {
  const { rarity, mechanicalConstraints } = seed

  return {
    id: `combat_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    type: "combat",
    entity: {
      name: flavor.entityName,
      rarity,
      description: flavor.description,
      icon: ENTITY_ICONS.combat,
      color: RARITY_COLORS[rarity],
    },
    stats: {
      health: mechanicalConstraints.baseHealth,
      maxHealth: mechanicalConstraints.baseHealth,
      attack: mechanicalConstraints.baseAttack,
      defense: mechanicalConstraints.baseDefense,
    },
    rewards: {
      gold: Math.floor(
        (mechanicalConstraints.goldRange[0] + mechanicalConstraints.goldRange[1]) / 2
      ),
      exp: Math.floor((mechanicalConstraints.expRange[0] + mechanicalConstraints.expRange[1]) / 2),
    },
    choices: [
      {
        id: "attack",
        text: flavor.choiceFlavor.attack || "Attack",
        type: "attack",
        outcome: {
          message: "", // Calculated dynamically during combat
          success: true,
        },
      },
      {
        id: "defend",
        text: flavor.choiceFlavor.defend || "Defend",
        type: "defend",
        outcome: {
          message: "", // Calculated dynamically during combat
          success: true,
        },
      },
      {
        id: "flee",
        text: flavor.choiceFlavor.flee || "Flee",
        type: "flee",
        outcome: {
          message: flavor.outcomes.flee || "You escape to safety.",
          success: true,
        },
      },
      {
        id: "special",
        text: flavor.choiceFlavor.special || "Special Action",
        type: "special",
        outcome: {
          message: flavor.outcomes.special || "You attempt a special action.",
          success: true,
        },
      },
    ],
    metadata: {
      source: "ai" as const,
      ...(seed.thematicContext.threatLevel !== undefined && {
        difficulty: seed.thematicContext.threatLevel,
      }),
    },
  }
}

/**
 * Build treasure event from seed + AI flavor
 */
export const buildTreasureEvent = (seed: EntitySeed, flavor: FlavorResponse): GameEvent => {
  const { rarity } = seed

  // Calculate treasure rewards
  const goldReward = PROCEDURAL_FORMULAS.rewards.gold(rarity)
  const healthReward = PROCEDURAL_FORMULAS.items.consumableEffect(rarity, "health")
  const trapDamage = PROCEDURAL_FORMULAS.trap.damage(rarity)
  const trapChance = PROCEDURAL_FORMULAS.trap.failChance(rarity)

  return {
    id: `treasure_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    type: "treasure",
    entity: {
      name: flavor.entityName,
      rarity,
      description: flavor.description,
      icon: ENTITY_ICONS.treasure,
      color: RARITY_COLORS[rarity],
    },
    choices: [
      {
        id: "item",
        text: flavor.choiceFlavor.item || "Take the item",
        type: "special",
        outcome: {
          message: flavor.outcomes.itemFound || "You claim a mysterious artifact.",
          success: true,
        },
      },
      {
        id: "gold",
        text: flavor.choiceFlavor.gold || "Take the gold",
        type: "special",
        outcome: {
          message: flavor.outcomes.goldFound || `You find ${goldReward} gold.`,
          goldChange: goldReward,
          success: true,
        },
      },
      {
        id: "health",
        text: flavor.choiceFlavor.health || "Take the potion",
        type: "special",
        outcome: {
          message: flavor.outcomes.healthFound || `You restore ${healthReward} health.`,
          healthChange: healthReward,
          success: true,
        },
      },
    ],
    metadata: {
      source: "ai" as const,
      ...(seed.thematicContext.threatLevel !== undefined && {
        difficulty: seed.thematicContext.threatLevel,
      }),
      trapChance,
      trapDamage,
    },
  }
}

/**
 * Build shop event from seed + AI flavor
 */
export const buildShopEvent = (seed: EntitySeed, flavor: FlavorResponse): GameEvent => {
  const { rarity } = seed

  return {
    id: `shop_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    type: "shop",
    entity: {
      name: flavor.entityName,
      rarity,
      description: flavor.description,
      icon: ENTITY_ICONS.shop,
      color: RARITY_COLORS[rarity],
    },
    choices: [
      {
        id: "browse",
        text: flavor.choiceFlavor.browse || "Browse wares",
        type: "browse",
        outcome: {
          message: flavor.outcomes.browse || "You examine the merchant's wares.",
          success: true,
        },
      },
      {
        id: "buy",
        text: flavor.choiceFlavor.buy || "Buy item",
        type: "buy",
        outcome: {
          message: flavor.outcomes.purchase || "You purchase an item.",
          success: true,
        },
      },
      {
        id: "leave",
        text: flavor.choiceFlavor.leave || "Leave shop",
        type: "leave",
        outcome: {
          message: "You leave the shop.",
          success: true,
        },
      },
    ],
    metadata: {
      source: "ai",
    },
  }
}

/**
 * Build shrine event from seed + AI flavor
 */
export const buildShrineEvent = (seed: EntitySeed, flavor: FlavorResponse): GameEvent => {
  const { rarity } = seed

  const offeringCost = PROCEDURAL_FORMULAS.shrine.offeringCost(rarity, "gold")
  const boonChance = PROCEDURAL_FORMULAS.shrine.boonChance(rarity)
  const boonReward = PROCEDURAL_FORMULAS.shrine.boonReward(offeringCost)
  const banePenalty = PROCEDURAL_FORMULAS.shrine.banePenalty(offeringCost)

  return {
    id: `shrine_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    type: "shrine",
    entity: {
      name: flavor.entityName,
      rarity,
      description: flavor.description,
      icon: ENTITY_ICONS.shrine,
      color: RARITY_COLORS[rarity],
    },
    choices: [
      {
        id: "offer",
        text: flavor.choiceFlavor.offer || `Offer ${offeringCost} gold`,
        type: "offer",
        outcome: {
          message: "", // Calculated based on boon/bane roll
          goldChange: -offeringCost,
          success: true,
        },
      },
      {
        id: "refuse",
        text: flavor.choiceFlavor.refuse || "Refuse offering",
        type: "refuse",
        outcome: {
          message: flavor.outcomes.refused || "You step away from the shrine.",
          success: true,
        },
      },
    ],
    metadata: {
      source: "ai" as const,
      boonChance,
      boonReward,
      banePenalty,
      ...(flavor.outcomes.boon && { boonMessage: flavor.outcomes.boon }),
      ...(flavor.outcomes.bane && { baneMessage: flavor.outcomes.bane }),
    },
  }
}

/**
 * Build encounter event from seed + AI flavor
 */
export const buildEncounterEvent = (seed: EntitySeed, flavor: FlavorResponse): GameEvent => {
  const { rarity } = seed

  return {
    id: `encounter_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    type: "encounter",
    entity: {
      name: flavor.entityName,
      rarity,
      description: flavor.description,
      icon: ENTITY_ICONS.encounter,
      color: RARITY_COLORS[rarity],
    },
    choices: [
      {
        id: "special",
        text: flavor.choiceFlavor.special || "Interact",
        type: "special",
        outcome: {
          message: flavor.outcomes.special || "You interact with the stranger.",
          success: true,
        },
      },
      {
        id: "flee",
        text: flavor.choiceFlavor.flee || "Leave",
        type: "flee",
        outcome: {
          message: flavor.outcomes.flee || "You continue on your way.",
          success: true,
        },
      },
    ],
    metadata: {
      source: "ai",
    },
  }
}

/**
 * Complete event generation pipeline
 * Generates seed → calls AI flavor endpoint → builds event
 */
export const generateEvent = async (context: {
  eventType: "combat" | "treasure" | "shop" | "shrine" | "encounter"
  portalTheme?: string
  roomNumber?: number
  playerLevel?: number
  stability?: number
}): Promise<GameEvent> => {
  const startTime = Date.now()

  // Step 1: Generate entity seed (procedural)
  const seed = generateEntitySeed(context)

  // Step 2: Call AI flavor endpoint
  const flavorResponse = await fetch("/api/generate-flavor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventType: context.eventType,
      entityRarity: seed.rarity,
      portalTheme: context.portalTheme,
      contextHints: {
        roomNumber: context.roomNumber,
        playerLevel: context.playerLevel,
        difficulty: seed.thematicContext.threatLevel,
      },
    }),
  })

  if (!flavorResponse.ok) {
    throw new Error(`Flavor generation failed: ${flavorResponse.statusText}`)
  }

  const flavor = (await flavorResponse.json()) as FlavorResponse

  // Step 3: Build complete event using template
  let event: GameEvent
  switch (context.eventType) {
    case "combat":
      event = buildCombatEvent(seed, flavor)
      break
    case "treasure":
      event = buildTreasureEvent(seed, flavor)
      break
    case "shop":
      event = buildShopEvent(seed, flavor)
      break
    case "shrine":
      event = buildShrineEvent(seed, flavor)
      break
    case "encounter":
      event = buildEncounterEvent(seed, flavor)
      break
    default:
      throw new Error(`Unknown event type: ${context.eventType}`)
  }

  // Add generation time to metadata
  event.metadata.generationTime = Date.now() - startTime

  return event
}
