import type { Rarity, ItemType, EffectType, Stats } from "./types"
import type { PortalMetadata, PortalData } from "./entities/schemas"
import { ENTITIES } from "./entities"

export interface PlayerStats {
  health: number
  maxHealth: number
  attack: number
  defense: number
  gold: number
  experience: number
  level: number
}

export interface InventoryItem {
  id: string
  name: string
  type: ItemType
  value: number
  rarity: Rarity
  icon: string
  stats?: Stats
  mapData?: {
    locationName: string
    entrances: number
    rarity: Rarity
  }
  portalMetadata?: PortalMetadata
  consumableEffect?: {
    type: EffectType
    duration?: number
    statChanges: Stats
  }
}

export interface ActiveEffect {
  id: string
  name: string
  statChanges: Stats
  endTime: number // timestamp when effect expires
  rarity: Rarity
}

export interface Location {
  id: string
  name: string
  entrancesRemaining: number
  maxEntrances: number
  rarity: Rarity
  stability: number // Portal stability percentage (0-100)
  portalData?: PortalData
}

export interface TreasureChoice {
  type: "item" | "gold" | "health" | "buff"
  item?: InventoryItem
  gold?: number
  healthRestore?: number
  buffEffect?: ActiveEffect
  description: string
}

export interface GameEvent {
  description: string
  entity?: string
  entityRarity?: Rarity
  entityData?: {
    name: string
    rarity: Rarity
    type?: string
    stats?: Stats
    gold?: number
    exp?: number
    entrances?: number
    icon?: string
  }
  choices: {
    text: string
    outcome: {
      message: string
      entity?: string
      entityRarity?: Rarity
      healthChange?: number
      goldChange?: number
      experienceChange?: number
      itemGained?: InventoryItem
      itemLost?: string
      unlockTab?: string
    }
  }[]
  treasureChoices?: TreasureChoice[]
}

// Location flavor text for encounters
const locations = [
  "a dimly lit corridor",
  "a vast chamber",
  "a narrow passage",
  "an ancient hall",
  "a mysterious room",
  "a forgotten crypt",
]

let _eventCounter = 0

export function generateEvent(playerStats: PlayerStats, _inventory: InventoryItem[]): GameEvent {
  _eventCounter++
  const rand = Math.random()

  // Combat encounter (40% chance)
  if (rand < 0.4) {
    const enemy = ENTITIES.random("enemy")
    const locationArr = locations[Math.floor(Math.random() * locations.length)]

    if (!enemy || !locationArr) {
      return generateEvent(playerStats, _inventory)
    }

    // Type assertion for enemy entity
    if (enemy.entityType !== "enemy") {
      return generateEvent(playerStats, _inventory)
    }

    return {
      description: `A ${enemy.name} (${enemy.health} HP, ${enemy.attack} ATK) appears in ${locationArr}.`,
      entity: enemy.name,
      entityRarity: enemy.rarity,
      entityData: {
        name: enemy.name,
        rarity: enemy.rarity,
        type: "enemy",
        stats: {
          health: enemy.health,
          attack: enemy.attack,
        },
        gold: enemy.gold,
        exp: enemy.exp,
      },
      choices: [
        {
          text: "Attack the enemy",
          outcome: {
            message: `${enemy.name} defeated. Took ${Math.max(1, enemy.attack - playerStats.defense)} damage. Gained ${enemy.exp} exp, ${enemy.gold} gold.`,
            entity: enemy.name,
            entityRarity: enemy.rarity,
            healthChange: -Math.max(1, enemy.attack - playerStats.defense),
            goldChange: enemy.gold,
            experienceChange: enemy.exp,
          },
        },
        {
          text: "Evade and flee",
          outcome: {
            message: `Escaped ${enemy.name}. Took ${Math.floor(enemy.attack / 2)} damage while fleeing.`,
            entity: enemy.name,
            entityRarity: enemy.rarity,
            healthChange: -Math.floor(enemy.attack / 2),
          },
        },
        {
          text: "Offer gold (10g)",
          outcome: {
            message: `${enemy.name} accepts payment. Lost ${Math.min(playerStats.gold, 10)} gold.`,
            entity: enemy.name,
            entityRarity: enemy.rarity,
            goldChange: -Math.min(playerStats.gold, 10),
          },
        },
      ],
    }
  }

  // Treasure/Item encounter (30% chance - within 0.4 to 0.7)
  if (rand < 0.7) {
    const encounterType = Math.random()

    // 20% consumable
    if (encounterType < 0.2) {
      const consumable = ENTITIES.random("consumable")
      const locationArr = locations[Math.floor(Math.random() * locations.length)]

      if (!consumable || !locationArr || consumable.entityType !== "consumable") {
        return generateEvent(playerStats, _inventory)
      }

      return {
        description: `${consumable.name} found in ${locationArr}.`,
        entity: consumable.name,
        entityRarity: consumable.rarity,
        entityData: {
          name: consumable.name,
          rarity: consumable.rarity,
          type: "consumable",
          icon: consumable.icon,
        },
        choices: [
          {
            text: "Take the consumable",
            outcome: {
              message: `${consumable.name} added to inventory.`,
              entity: consumable.name,
              entityRarity: consumable.rarity,
              itemGained: {
                id: Math.random().toString(36).substr(2, 9),
                name: consumable.name,
                type: consumable.type,
                value: consumable.value,
                rarity: consumable.rarity,
                icon: consumable.icon,
                ...(consumable.consumableEffect && {
                  consumableEffect: {
                    type: consumable.consumableEffect.type,
                    statChanges: {
                      ...(consumable.consumableEffect.statChanges.health !== undefined && {
                        health: consumable.consumableEffect.statChanges.health,
                      }),
                      ...(consumable.consumableEffect.statChanges.attack !== undefined && {
                        attack: consumable.consumableEffect.statChanges.attack,
                      }),
                      ...(consumable.consumableEffect.statChanges.defense !== undefined && {
                        defense: consumable.consumableEffect.statChanges.defense,
                      }),
                    },
                    ...(consumable.consumableEffect.duration !== undefined && {
                      duration: consumable.consumableEffect.duration,
                    }),
                  },
                }),
              },
            },
          },
          {
            text: "Leave it behind",
            outcome: {
              message: "Item left behind. Continue exploring.",
              entity: "dungeon",
              entityRarity: "common",
            },
          },
        ],
      }
    }
    // 30% map
    else if (encounterType < 0.5) {
      const mapItem = ENTITIES.random("map")
      const locationArr = locations[Math.floor(Math.random() * locations.length)]

      if (!mapItem || !locationArr || mapItem.entityType !== "map") {
        return generateEvent(playerStats, _inventory)
      }

      return {
        description: `${mapItem.name} found in ${locationArr}. Shows route to ${mapItem.locationName} (${mapItem.entrances} entrances).`,
        entity: mapItem.name,
        entityRarity: mapItem.rarity,
        entityData: {
          name: mapItem.name,
          rarity: mapItem.rarity,
          type: "map",
          entrances: mapItem.entrances,
          icon: mapItem.icon,
        },
        choices: [
          {
            text: "Take the map",
            outcome: {
              message: `${mapItem.name} added to inventory. ${mapItem.entrances} entrances marked.`,
              entity: mapItem.name,
              entityRarity: mapItem.rarity,
              itemGained: {
                id: Math.random().toString(36).substr(2, 9),
                name: mapItem.name,
                type: "map",
                value: mapItem.value,
                rarity: mapItem.rarity,
                icon: mapItem.icon,
                mapData: {
                  locationName: mapItem.locationName,
                  entrances: mapItem.entrances,
                  rarity: mapItem.rarity,
                },
                ...(mapItem.portalMetadata && { portalMetadata: mapItem.portalMetadata }),
              },
            },
          },
          {
            text: "Leave it behind",
            outcome: {
              message: "Map left behind. Continue exploring.",
              entity: "dungeon",
              entityRarity: "common",
            },
          },
        ],
      }
    }
    // 50% regular treasure
    else {
      const treasure = ENTITIES.random("treasure")
      const locationArr = locations[Math.floor(Math.random() * locations.length)]

      if (!treasure || !locationArr || treasure.entityType !== "treasure") {
        return generateEvent(playerStats, _inventory)
      }

      return {
        description: `${treasure.name} found in ${locationArr}.`,
        entity: treasure.name,
        entityRarity: treasure.rarity,
        entityData: {
          name: treasure.name,
          rarity: treasure.rarity,
          type: treasure.type,
          icon: treasure.icon,
          ...(treasure.stats &&
            (treasure.stats.health !== undefined ||
              treasure.stats.attack !== undefined ||
              treasure.stats.defense !== undefined) && {
              stats: {
                ...(treasure.stats.health !== undefined && { health: treasure.stats.health }),
                ...(treasure.stats.attack !== undefined && { attack: treasure.stats.attack }),
                ...(treasure.stats.defense !== undefined && { defense: treasure.stats.defense }),
              },
            }),
        },
        choices: [
          {
            text: "Take the item",
            outcome: {
              message: `${treasure.name} added to inventory.`,
              entity: treasure.name,
              entityRarity: treasure.rarity,
              itemGained: {
                id: Math.random().toString(36).substr(2, 9),
                name: treasure.name,
                type: treasure.type,
                value: treasure.value,
                rarity: treasure.rarity,
                icon: treasure.icon,
                ...(treasure.stats &&
                  (treasure.stats.health !== undefined ||
                    treasure.stats.attack !== undefined ||
                    treasure.stats.defense !== undefined) && {
                    stats: {
                      ...(treasure.stats.health !== undefined && { health: treasure.stats.health }),
                      ...(treasure.stats.attack !== undefined && { attack: treasure.stats.attack }),
                      ...(treasure.stats.defense !== undefined && {
                        defense: treasure.stats.defense,
                      }),
                    },
                  }),
              },
            },
          },
          {
            text: "Leave it behind",
            outcome: {
              message: "Item left behind. Continue exploring.",
              entity: "dungeon",
              entityRarity: "common",
            },
          },
        ],
      }
    }
  }

  // Mystery encounter (30% chance - remaining 0.7 to 1.0)
  let encounter = ENTITIES.random("encounter")

  if (!encounter || encounter.entityType !== "encounter") {
    // Fallback to first canonical encounter
    const fallback = ENTITIES.get("encounter:mysterious_merchant")
    if (!fallback || fallback.entityType !== "encounter") {
      // Last resort: generate a simple generic event
      return {
        description: "Crossroads ahead.",
        entity: "crossroads",
        entityRarity: "common",
        entityData: {
          name: "Crossroads",
          rarity: "common",
          type: "object",
          icon: "ra-crystal-ball",
        },
        choices: [
          {
            text: "Continue forward",
            outcome: {
              message: "Moving forward.",
              entity: "dungeon",
              entityRarity: "common",
            },
          },
        ],
      }
    }
    encounter = fallback
  }

  // Transform encounter entity to GameEvent format
  // Special handling for fountain to calculate health change
  const choices = encounter.choices.map((choice) => {
    const baseOutcome = choice.outcome

    // Special case: Magical Fountain calculates health dynamically
    let healthChange = baseOutcome.healthChange
    if (encounter.name === "Magical Fountain" && choice.text.includes("Drink")) {
      healthChange = playerStats.maxHealth - playerStats.health
    }

    return {
      text: choice.text,
      outcome: {
        message: baseOutcome.message,
        entity: encounter.name,
        entityRarity: encounter.rarity,
        ...(healthChange !== undefined && { healthChange }),
        ...(baseOutcome.goldChange !== undefined && { goldChange: baseOutcome.goldChange }),
        ...(baseOutcome.experienceChange !== undefined && {
          experienceChange: baseOutcome.experienceChange,
        }),
        ...(baseOutcome.statChanges !== undefined && { statChanges: baseOutcome.statChanges }),
      },
    }
  })

  return {
    description: encounter.description,
    entity: encounter.name,
    entityRarity: encounter.rarity,
    entityData: {
      name: encounter.name,
      rarity: encounter.rarity,
      type: "encounter",
      icon: encounter.icon,
    },
    choices,
  }
}
