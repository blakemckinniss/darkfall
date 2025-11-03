/**
 * Portal Event Generation - Phase 0 Integration
 *
 * Wrapper around the new Phase 0 event generation system.
 * Selects event type and generates events using the new pipeline.
 */

import { generateEvent, type GameEvent as NewGameEvent } from "./event-templates"
import { adaptNewEventToLegacy } from "./event-adapter"
import type { GameEvent as OldGameEvent, PlayerStats } from "./game-engine"
import type { Rarity } from "./entities/schemas"

export interface PortalEventContext {
  portalTheme?: string
  rarity?: Rarity
  riskLevel?: string
  currentRoom?: number
  expectedRooms?: number
  stability?: number
  playerLevel?: number
}

/**
 * Select event type based on portal context and probability
 * Matches original distribution from game-engine.ts
 */
function selectEventType(): "combat" | "treasure" | "shop" | "shrine" | "encounter" {
  const rand = Math.random()

  // Match original probabilities from generateEvent():
  // Combat: 40%
  // Treasure: 30%
  // Shop: 15%
  // Shrine: 10%
  // Encounter: 5%

  if (rand < 0.4) {
    return "combat"
  } else if (rand < 0.7) {
    // 0.4 + 0.3 = 0.7
    return "treasure"
  } else if (rand < 0.85) {
    // 0.7 + 0.15 = 0.85
    return "shop"
  } else if (rand < 0.95) {
    // 0.85 + 0.1 = 0.95
    return "shrine"
  } else {
    return "encounter"
  }
}

/**
 * Generate portal event using Phase 0 system
 * Returns event in legacy format for backwards compatibility
 */
export async function generatePortalEvent(
  playerStats: PlayerStats,
  context?: PortalEventContext
): Promise<OldGameEvent> {
  // Select event type
  const eventType = selectEventType()

  // Generate event using Phase 0 pipeline
  const eventContext: {
    eventType: "combat" | "treasure" | "shop" | "shrine" | "encounter"
    roomNumber: number
    playerLevel: number
    stability: number
    portalTheme?: string
  } = {
    eventType,
    roomNumber: context?.currentRoom || 1,
    playerLevel: playerStats.level,
    stability: context?.stability || 100,
  }

  if (context?.portalTheme) {
    eventContext.portalTheme = context.portalTheme
  }

  const newEvent: NewGameEvent = await generateEvent(eventContext)

  // Convert to legacy format
  return adaptNewEventToLegacy(newEvent)
}

/**
 * Procedural fallback when AI fails
 * Uses Phase 0 procedural formulas for reliable fallback
 */
export function generateProceduralEvent(
  playerStats: PlayerStats,
  context?: PortalEventContext
): OldGameEvent {
  const eventType = selectEventType()

  // Import procedural formulas
  const { PROCEDURAL_FORMULAS, selectRarity } = require("./procedural-formulas")

  // Calculate difficulty
  const difficulty = PROCEDURAL_FORMULAS.difficulty.calculateDifficulty(
    context?.currentRoom || 1,
    context?.stability || 100
  )

  // Select rarity
  const rarity = selectRarity(difficulty - 5)

  // Generate stats
  const health = PROCEDURAL_FORMULAS.stats.health(rarity, difficulty)
  const attack = PROCEDURAL_FORMULAS.stats.attack(rarity, difficulty)
  const defense = PROCEDURAL_FORMULAS.stats.defense(rarity, difficulty)
  const gold = PROCEDURAL_FORMULAS.rewards.gold(rarity, playerStats.level)
  const exp = PROCEDURAL_FORMULAS.rewards.exp(rarity, playerStats.level)

  // Build procedural event based on type
  switch (eventType) {
    case "combat":
      return {
        eventType: "combat",
        description: `A ${rarity} guardian emerges from the shadows.`,
        entity: `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} Guardian`,
        entityRarity: rarity,
        entityData: {
          name: `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} Guardian`,
          rarity,
          type: "enemy",
          stats: { attack, defense, health },
          health,
          attack,
          gold,
          exp,
          icon: "ra-monster-skull",
        },
        choices: [
          {
            text: "Attack",
            outcome: {
              message: "You strike at the guardian!",
              healthChange: -attack,
            },
          },
          {
            text: "Defend",
            outcome: {
              message: "You raise your defenses.",
              healthChange: 0,
            },
          },
          {
            text: "Flee",
            outcome: {
              message: "You escape into the darkness.",
            },
          },
        ],
      }

    case "treasure":
      return {
        eventType: "treasure",
        description: `An ornate ${rarity} chest gleams in the dim light.`,
        entity: `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} Chest`,
        entityRarity: rarity,
        entityData: {
          name: `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} Chest`,
          rarity,
          icon: "ra-crystal-ball",
        },
        choices: [
          {
            text: "Take the gold",
            outcome: {
              message: `You find ${gold} gold!`,
              goldChange: gold,
            },
          },
          {
            text: "Take the health potion",
            outcome: {
              message: "You restore your vitality.",
              healthChange: 20,
            },
          },
        ],
      }

    case "shop":
      return {
        eventType: "shop",
        description: `A ${rarity} merchant displays exotic wares.`,
        entity: `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} Merchant`,
        entityRarity: rarity,
        entityData: {
          name: `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} Merchant`,
          rarity,
          icon: "ra-shop",
        },
        choices: [
          {
            text: "Browse wares",
            outcome: {
              message: "You examine the merchant's collection.",
            },
          },
          {
            text: "Leave",
            outcome: {
              message: "You continue on your way.",
            },
          },
        ],
      }

    case "shrine": {
      const offeringCost = PROCEDURAL_FORMULAS.shrine.offeringCost(rarity, "gold")
      return {
        eventType: "shrine",
        description: `An ancient ${rarity} shrine pulses with otherworldly energy.`,
        entity: `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} Shrine`,
        entityRarity: rarity,
        entityData: {
          name: `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} Shrine`,
          rarity,
          icon: "ra-temple",
        },
        choices: [
          {
            text: `Offer ${offeringCost} gold`,
            outcome: {
              message: "The shrine bestows a blessing.",
              goldChange: -offeringCost,
              healthChange: 10,
            },
          },
          {
            text: "Step away",
            outcome: {
              message: "You wisely step away from the shrine.",
            },
          },
        ],
      }
    }

    case "encounter":
    default:
      return {
        eventType: "encounter",
        description: `A mysterious ${rarity} figure appears before you.`,
        entity: `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} Stranger`,
        entityRarity: rarity,
        entityData: {
          name: `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} Stranger`,
          rarity,
          icon: "ra-hood",
        },
        choices: [
          {
            text: "Speak with them",
            outcome: {
              message: "The stranger shares cryptic wisdom.",
            },
          },
          {
            text: "Move along",
            outcome: {
              message: "You continue on your path.",
            },
          },
        ],
      }
  }
}
