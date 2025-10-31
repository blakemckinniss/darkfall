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
  type: "weapon" | "armor" | "accessory" | "potion" | "treasure" | "map" | "consumable"
  value: number
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"
  icon: string
  stats?: {
    attack?: number
    defense?: number
    health?: number
  }
  mapData?: {
    locationName: string
    entrances: number
    rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"
  }
  consumableEffect?: {
    type: "permanent" | "temporary"
    duration?: number
    statChanges: {
      attack?: number
      defense?: number
      health?: number
      maxHealth?: number
    }
  }
}

export interface ActiveEffect {
  id: string
  name: string
  statChanges: {
    attack?: number
    defense?: number
    health?: number
    maxHealth?: number
  }
  endTime: number // timestamp when effect expires
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"
}

export interface Location {
  id: string
  name: string
  entrancesRemaining: number
  maxEntrances: number
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"
  stability: number // Portal stability percentage (0-100)
}

export interface GameEvent {
  description: string
  entity?: string
  entityRarity?: "common" | "uncommon" | "rare" | "epic" | "legendary"
  entityData?: {
    name: string
    rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"
    type?: string
    stats?: {
      attack?: number
      defense?: number
      health?: number
    }
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
      entityRarity?: "common" | "uncommon" | "rare" | "epic" | "legendary"
      healthChange?: number
      goldChange?: number
      experienceChange?: number
      itemGained?: InventoryItem
      itemLost?: string
      unlockTab?: string
    }
  }[]
}

const enemies = [
  { name: "Goblin", health: 20, attack: 5, gold: 10, exp: 15, rarity: "common" as const },
  { name: "Skeleton", health: 30, attack: 8, gold: 15, exp: 20, rarity: "common" as const },
  { name: "Orc", health: 40, attack: 12, gold: 25, exp: 30, rarity: "uncommon" as const },
  { name: "Dark Knight", health: 60, attack: 15, gold: 50, exp: 50, rarity: "rare" as const },
  { name: "Shadow Demon", health: 80, attack: 20, gold: 75, exp: 70, rarity: "epic" as const },
  {
    name: "Ancient Dragon",
    health: 120,
    attack: 30,
    gold: 150,
    exp: 100,
    rarity: "legendary" as const,
  },
]

const treasures = [
  {
    name: "Health Potion",
    type: "potion" as const,
    value: 20,
    rarity: "common" as const,
    icon: "ra-potion",
  },
  {
    name: "Steel Sword",
    type: "weapon" as const,
    value: 15,
    stats: { attack: 8 },
    rarity: "uncommon" as const,
    icon: "ra-sword",
  },
  {
    name: "Iron Shield",
    type: "armor" as const,
    value: 10,
    stats: { defense: 6 },
    rarity: "uncommon" as const,
    icon: "ra-shield",
  },
  {
    name: "Gold Coins",
    type: "treasure" as const,
    value: 30,
    rarity: "common" as const,
    icon: "ra-gold-bar",
  },
  {
    name: "Ancient Amulet",
    type: "accessory" as const,
    value: 50,
    stats: { attack: 3, defense: 3 },
    rarity: "rare" as const,
    icon: "ra-gem-pendant",
  },
  {
    name: "Dragon Blade",
    type: "weapon" as const,
    value: 40,
    stats: { attack: 15 },
    rarity: "epic" as const,
    icon: "ra-fire-sword",
  },
  {
    name: "Plate Armor",
    type: "armor" as const,
    value: 35,
    stats: { defense: 12 },
    rarity: "rare" as const,
    icon: "ra-shield",
  },
  {
    name: "Ring of Vitality",
    type: "accessory" as const,
    value: 25,
    stats: { health: 20 },
    rarity: "uncommon" as const,
    icon: "ra-gem-pendant",
  },
  {
    name: "Legendary Excalibur",
    type: "weapon" as const,
    value: 100,
    stats: { attack: 25 },
    rarity: "legendary" as const,
    icon: "ra-sword",
  },
  {
    name: "Mythril Armor",
    type: "armor" as const,
    value: 80,
    stats: { defense: 20 },
    rarity: "epic" as const,
    icon: "ra-shield",
  },
]

const consumables = [
  {
    name: "Strength Elixir",
    type: "consumable" as const,
    value: 30,
    rarity: "uncommon" as const,
    icon: "ra-flask",
    consumableEffect: {
      type: "temporary" as const,
      duration: 120,
      statChanges: { attack: 50 },
    },
  },
  {
    name: "Iron Skin Potion",
    type: "consumable" as const,
    value: 25,
    rarity: "uncommon" as const,
    icon: "ra-bottle-vapors",
    consumableEffect: {
      type: "temporary" as const,
      duration: 90,
      statChanges: { defense: 30 },
    },
  },
  {
    name: "Berserker Brew",
    type: "consumable" as const,
    value: 50,
    rarity: "rare" as const,
    icon: "ra-bubbling-potion",
    consumableEffect: {
      type: "temporary" as const,
      duration: 60,
      statChanges: { attack: 100, defense: -20 },
    },
  },
  {
    name: "Titan's Blessing",
    type: "consumable" as const,
    value: 80,
    rarity: "epic" as const,
    icon: "ra-vial",
    consumableEffect: {
      type: "temporary" as const,
      duration: 180,
      statChanges: { attack: 75, defense: 50 },
    },
  },
  {
    name: "Permanent Strength Tome",
    type: "consumable" as const,
    value: 100,
    rarity: "legendary" as const,
    icon: "ra-book",
    consumableEffect: {
      type: "permanent" as const,
      statChanges: { attack: 10 },
    },
  },
  {
    name: "Permanent Defense Scroll",
    type: "consumable" as const,
    value: 100,
    rarity: "legendary" as const,
    icon: "ra-scroll-unfurled",
    consumableEffect: {
      type: "permanent" as const,
      statChanges: { defense: 8 },
    },
  },
]

const mapItems = [
  {
    name: "Crumbling Map",
    locationName: "Forgotten Catacombs",
    entrances: 2,
    rarity: "common" as const,
    value: 15,
    icon: "ra-scroll-unfurled",
  },
  {
    name: "Weathered Map",
    locationName: "Ancient Library",
    entrances: 3,
    rarity: "uncommon" as const,
    value: 25,
    icon: "ra-scroll-unfurled",
  },
  {
    name: "Enchanted Map",
    locationName: "Crystal Caverns",
    entrances: 4,
    rarity: "rare" as const,
    value: 40,
    icon: "ra-compass",
  },
  {
    name: "Mystical Map",
    locationName: "Dragon's Lair",
    entrances: 5,
    rarity: "legendary" as const,
    value: 60,
    icon: "ra-compass",
  },
  {
    name: "Torn Map",
    locationName: "Abandoned Mine",
    entrances: 2,
    rarity: "common" as const,
    value: 12,
    icon: "ra-scroll-unfurled",
  },
  {
    name: "Ancient Map",
    locationName: "Sunken Temple",
    entrances: 3,
    rarity: "uncommon" as const,
    value: 30,
    icon: "ra-scroll-unfurled",
  },
]

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

  // Combat encounter
  if (rand < 0.4) {
    const enemy = enemies[Math.floor(Math.random() * enemies.length)]
    const location = locations[Math.floor(Math.random() * locations.length)]

    return {
      description: `You encounter a ${enemy.name} in ${location}. It brandishes its weapon menacingly.`,
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
          text: "Attack with your weapon",
          outcome: {
            message: `You strike the ${enemy.name} down! Victory is yours.`,
            entity: enemy.name,
            entityRarity: enemy.rarity,
            healthChange: -Math.max(1, enemy.attack - playerStats.defense),
            goldChange: enemy.gold,
            experienceChange: enemy.exp,
          },
        },
        {
          text: "Attempt to flee",
          outcome: {
            message: `You escape, but the ${enemy.name} lands a glancing blow as you run.`,
            entity: enemy.name,
            entityRarity: enemy.rarity,
            healthChange: -Math.floor(enemy.attack / 2),
          },
        },
        {
          text: "Try to negotiate",
          outcome: {
            message: `The ${enemy.name} accepts your gold and lets you pass.`,
            entity: enemy.name,
            entityRarity: enemy.rarity,
            goldChange: -Math.min(playerStats.gold, 10),
          },
        },
      ],
    }
  }

  // Treasure encounter - now includes maps and consumables
  if (rand < 0.7) {
    const encounterType = Math.random()

    if (encounterType < 0.2) {
      // 20% chance for consumable
      const consumable = consumables[Math.floor(Math.random() * consumables.length)]
      const location = locations[Math.floor(Math.random() * locations.length)]

      return {
        description: `You discover a ${consumable.name} in ${location}. It radiates magical energy.`,
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
              message: `You add the ${consumable.name} to your inventory.`,
              entity: consumable.name,
              entityRarity: consumable.rarity,
              itemGained: {
                id: Math.random().toString(36).substr(2, 9),
                ...consumable,
              },
            },
          },
          {
            text: "Leave it behind",
            outcome: {
              message: "You decide not to take the consumable and continue exploring.",
              entity: "dungeon",
              entityRarity: "common",
            },
          },
        ],
      }
    } else if (encounterType < 0.5) {
      // 30% chance for map
      const mapItem = mapItems[Math.floor(Math.random() * mapItems.length)]
      const location = locations[Math.floor(Math.random() * locations.length)]

      return {
        description: `You discover a ${mapItem.name} in ${location}. It shows the way to ${mapItem.locationName}.`,
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
              message: `You add the ${mapItem.name} to your inventory. It has ${mapItem.entrances} entrances marked.`,
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
              },
            },
          },
          {
            text: "Leave it behind",
            outcome: {
              message: "You decide not to take the map and continue exploring.",
              entity: "dungeon",
              entityRarity: "common",
            },
          },
        ],
      }
    } else {
      // 50% chance for regular treasure
      const treasure = treasures[Math.floor(Math.random() * treasures.length)]
      const location = locations[Math.floor(Math.random() * locations.length)]

      return {
        description: `You discover a ${treasure.name} in ${location}. It glimmers in the torchlight.`,
        entity: treasure.name,
        entityRarity: treasure.rarity,
        entityData: {
          name: treasure.name,
          rarity: treasure.rarity,
          type: treasure.type,
          stats: treasure.stats,
          icon: treasure.icon,
        },
        choices: [
          {
            text: "Take the item",
            outcome: {
              message: `You add the ${treasure.name} to your inventory.`,
              entity: treasure.name,
              entityRarity: treasure.rarity,
              itemGained: {
                id: Math.random().toString(36).substr(2, 9),
                ...treasure,
              },
            },
          },
          {
            text: "Leave it behind",
            outcome: {
              message: "You decide not to take the item and continue exploring.",
              entity: "dungeon",
              entityRarity: "common",
            },
          },
        ],
      }
    }
  }

  // Mysterious encounter
  const mysteryEvents = [
    {
      description: "A mysterious merchant appears from the shadows, offering his wares.",
      entity: "merchant",
      entityRarity: "uncommon" as const,
      entityData: {
        name: "Mysterious Merchant",
        rarity: "uncommon" as const,
        type: "npc",
        icon: "ra-player",
      },
      choices: [
        {
          text: "Buy a health potion (20 gold)",
          outcome: {
            message: "The merchant hands you a glowing potion. Your health is restored!",
            entity: "potion",
            entityRarity: "common" as const,
            goldChange: -20,
            healthChange: 30,
          },
        },
        {
          text: "Decline and move on",
          outcome: {
            message: "The merchant vanishes as mysteriously as he appeared.",
            entity: "merchant",
            entityRarity: "uncommon" as const,
          },
        },
      ],
    },
    {
      description: "You find a magical fountain. Its waters shimmer with an otherworldly glow.",
      entity: "fountain",
      entityRarity: "rare" as const,
      entityData: {
        name: "Magical Fountain",
        rarity: "rare" as const,
        type: "object",
        icon: "ra-droplet",
      },
      choices: [
        {
          text: "Drink from the fountain",
          outcome: {
            message: "The magical waters invigorate you! Your health is fully restored.",
            entity: "fountain",
            entityRarity: "rare" as const,
            healthChange: playerStats.maxHealth - playerStats.health,
          },
        },
        {
          text: "Continue without drinking",
          outcome: {
            message: "You decide not to risk it and move on.",
            entity: "dungeon",
            entityRarity: "common" as const,
          },
        },
      ],
    },
    {
      description: "A strange altar stands before you, covered in ancient runes.",
      entity: "altar",
      entityRarity: "epic" as const,
      entityData: {
        name: "Ancient Altar",
        rarity: "epic" as const,
        type: "object",
        icon: "ra-rune-stone",
      },
      choices: [
        {
          text: "Offer gold to the altar",
          outcome: {
            message: "The altar glows and grants you experience!",
            entity: "altar",
            entityRarity: "epic" as const,
            goldChange: -15,
            experienceChange: 40,
          },
        },
        {
          text: "Leave the altar alone",
          outcome: {
            message: "You decide not to disturb the ancient altar.",
            entity: "altar",
            entityRarity: "epic" as const,
          },
        },
      ],
    },
  ]

  return mysteryEvents[Math.floor(Math.random() * mysteryEvents.length)]
}
