/**
 * Portal-Exclusive Artifacts
 *
 * Rare treasures that can only be obtained from specific portal themes.
 * Each artifact is globally unique (can only be obtained once per game).
 */

import { Treasure } from "../schemas"

export const PORTAL_ARTIFACTS: Treasure[] = [
  // ==================== DRAGON'S LAIR (Legendary) ====================
  {
    id: "artifact:dragons_scale",
    entityType: "treasure",
    name: "Dragon's Scale",
    type: "armor",
    value: 500,
    rarity: "legendary",
    icon: "ra-dragon",
    stats: {
      defense: 15,
      health: 50,
    },
    description:
      "A shimmering scale from an ancient dragon. Provides exceptional protection and vitality. Can only be found in the Dragon's Lair.",
    portalExclusive: {
      requiredPortalTheme: "Dragon's Lair",
      requiredRarity: "legendary",
      dropChance: 0.1, // 10% drop rate
      globallyUnique: true,
    },
    source: "canonical",
    createdAt: Date.now(),
    sessionOnly: false,
    version: 1,
    tags: ["portal-exclusive", "dragon", "armor", "legendary"],
  },
  {
    id: "artifact:scorched_blade",
    entityType: "treasure",
    name: "Scorched Blade",
    type: "weapon",
    value: 450,
    rarity: "epic",
    icon: "ra-burning-embers",
    stats: {
      attack: 18,
      defense: 3,
    },
    description:
      "A sword forged in dragonfire, eternally burning with volcanic heat. Deals devastating damage. Found only in the Dragon's Lair.",
    portalExclusive: {
      requiredPortalTheme: "Dragon's Lair",
      requiredRarity: "legendary",
      dropChance: 0.15, // 15% drop rate
      globallyUnique: true,
    },
    source: "canonical",
    createdAt: Date.now(),
    sessionOnly: false,
    version: 1,
    tags: ["portal-exclusive", "dragon", "weapon", "epic"],
  },

  // ==================== CRYSTAL CAVERNS (Rare) ====================
  {
    id: "artifact:crystal_heart",
    entityType: "treasure",
    name: "Crystal Heart",
    type: "accessory",
    value: 300,
    rarity: "rare",
    icon: "ra-crystal-cluster",
    stats: {
      attack: 8,
      defense: 8,
      health: 30,
    },
    description:
      "A perfectly formed crystal pulsing with arcane energy. Enhances all attributes. Exclusive to the Crystal Caverns.",
    portalExclusive: {
      requiredPortalTheme: "Crystal Caverns",
      requiredRarity: "rare",
      dropChance: 0.15, // 15% drop rate
      globallyUnique: true,
    },
    source: "canonical",
    createdAt: Date.now(),
    sessionOnly: false,
    version: 1,
    tags: ["portal-exclusive", "crystal", "accessory", "rare"],
  },
  {
    id: "artifact:luminous_shard",
    entityType: "treasure",
    name: "Luminous Shard",
    type: "accessory",
    value: 250,
    rarity: "rare",
    icon: "ra-crystal-shine",
    stats: {
      attack: 5,
      defense: 10,
    },
    description:
      "A shard of pure crystalline light. Provides protection and insight. Found only in the Crystal Caverns.",
    portalExclusive: {
      requiredPortalTheme: "Crystal Caverns",
      requiredRarity: "rare",
      dropChance: 0.2, // 20% drop rate
      globallyUnique: true,
    },
    source: "canonical",
    createdAt: Date.now(),
    sessionOnly: false,
    version: 1,
    tags: ["portal-exclusive", "crystal", "accessory", "rare"],
  },

  // ==================== SUNKEN TEMPLE (Uncommon) ====================
  {
    id: "artifact:sunken_relic",
    entityType: "treasure",
    name: "Sunken Relic",
    type: "accessory",
    value: 200,
    rarity: "uncommon",
    icon: "ra-relic-blade",
    stats: {
      defense: 12,
      health: 25,
    },
    description:
      "An ancient artifact from a forgotten civilization. Grants resilience against the depths. Exclusive to the Sunken Temple.",
    portalExclusive: {
      requiredPortalTheme: "Sunken Temple",
      requiredRarity: "uncommon",
      dropChance: 0.25, // 25% drop rate
      globallyUnique: true,
    },
    source: "canonical",
    createdAt: Date.now(),
    sessionOnly: false,
    version: 1,
    tags: ["portal-exclusive", "temple", "accessory", "uncommon"],
  },
  {
    id: "artifact:ancient_seal",
    entityType: "treasure",
    name: "Ancient Seal",
    type: "accessory",
    value: 180,
    rarity: "uncommon",
    icon: "ra-bindle",
    stats: {
      defense: 8,
      health: 20,
    },
    description:
      "A protective seal from ancient temple guardians. Wards against corruption. Found only in the Sunken Temple.",
    portalExclusive: {
      requiredPortalTheme: "Sunken Temple",
      requiredRarity: "uncommon",
      dropChance: 0.3, // 30% drop rate
      globallyUnique: true,
    },
    source: "canonical",
    createdAt: Date.now(),
    sessionOnly: false,
    version: 1,
    tags: ["portal-exclusive", "temple", "accessory", "uncommon"],
  },

  // ==================== FORGOTTEN CATACOMBS (Common) ====================
  {
    id: "artifact:bone_charm",
    entityType: "treasure",
    name: "Bone Charm",
    type: "accessory",
    value: 100,
    rarity: "common",
    icon: "ra-bone-knife",
    stats: {
      attack: 8,
      defense: 4,
    },
    description:
      "A charm carved from ancient bones. Grants power over the undead. Exclusive to the Forgotten Catacombs.",
    portalExclusive: {
      requiredPortalTheme: "Forgotten Catacombs",
      requiredRarity: "common",
      dropChance: 0.3, // 30% drop rate
      globallyUnique: true,
    },
    source: "canonical",
    createdAt: Date.now(),
    sessionOnly: false,
    version: 1,
    tags: ["portal-exclusive", "undead", "accessory", "common"],
  },

  // ==================== ANCIENT LIBRARY (Uncommon) ====================
  {
    id: "artifact:tome_of_knowledge",
    entityType: "treasure",
    name: "Tome of Knowledge",
    type: "accessory",
    value: 220,
    rarity: "uncommon",
    icon: "ra-book",
    stats: {
      attack: 6,
      defense: 6,
      health: 15,
    },
    description:
      "An ancient tome containing forgotten wisdom. Enhances all abilities. Found only in the Ancient Library.",
    portalExclusive: {
      requiredPortalTheme: "Ancient Library",
      requiredRarity: "uncommon",
      dropChance: 0.25, // 25% drop rate
      globallyUnique: true,
    },
    source: "canonical",
    createdAt: Date.now(),
    sessionOnly: false,
    version: 1,
    tags: ["portal-exclusive", "knowledge", "accessory", "uncommon"],
  },

  // ==================== ABANDONED MINE (Common) ====================
  {
    id: "artifact:miners_pickaxe",
    entityType: "treasure",
    name: "Miner's Pickaxe",
    type: "weapon",
    value: 120,
    rarity: "common",
    icon: "ra-mining",
    stats: {
      attack: 10,
      defense: 2,
    },
    description:
      "A legendary pickaxe used by master miners. Strikes with precision and power. Exclusive to the Abandoned Mine.",
    portalExclusive: {
      requiredPortalTheme: "Abandoned Mine",
      requiredRarity: "common",
      dropChance: 0.3, // 30% drop rate
      globallyUnique: true,
    },
    source: "canonical",
    createdAt: Date.now(),
    sessionOnly: false,
    version: 1,
    tags: ["portal-exclusive", "mining", "weapon", "common"],
  },
]

/**
 * Get all portal-exclusive artifacts
 */
export function getAllPortalArtifacts(): Treasure[] {
  return [...PORTAL_ARTIFACTS]
}

/**
 * Get artifacts for a specific portal theme
 */
export function getArtifactsByTheme(theme: string): Treasure[] {
  return PORTAL_ARTIFACTS.filter(
    (artifact) => artifact.portalExclusive?.requiredPortalTheme === theme
  )
}

/**
 * Get artifact by ID
 */
export function getArtifactById(id: string): Treasure | undefined {
  return PORTAL_ARTIFACTS.find((artifact) => artifact.id === id)
}
