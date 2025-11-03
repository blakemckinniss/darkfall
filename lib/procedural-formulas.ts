import type { Rarity } from "./entities/schemas"

/**
 * Procedural Formula Library
 *
 * Game mechanics, stats, and balance formulas calculated locally.
 * Groq AI provides creative flavor only - this handles the math.
 *
 * Architecture: "Procedural Skeleton + AI Flesh"
 * - These formulas ensure game balance and fairness
 * - AI generates names, descriptions, and narrative flavor
 */

// Base stat values by rarity
const BASE_HP: Record<Rarity, number> = {
  common: 30,
  uncommon: 50,
  rare: 70,
  epic: 90,
  legendary: 120,
}

const BASE_ATK: Record<Rarity, number> = {
  common: 8,
  uncommon: 12,
  rare: 16,
  epic: 22,
  legendary: 30,
}

const BASE_DEF: Record<Rarity, number> = {
  common: 3,
  uncommon: 5,
  rare: 8,
  epic: 12,
  legendary: 18,
}

// Base reward values by rarity
const BASE_GOLD: Record<Rarity, number> = {
  common: 15,
  uncommon: 25,
  rare: 40,
  epic: 65,
  legendary: 100,
}

const BASE_EXP: Record<Rarity, number> = {
  common: 20,
  uncommon: 35,
  rare: 55,
  epic: 80,
  legendary: 120,
}

// Shop pricing multipliers by rarity
const PRICE_MULTIPLIER: Record<Rarity, number> = {
  common: 1.5,
  uncommon: 2.5,
  rare: 4.0,
  epic: 6.5,
  legendary: 10.0,
}

/**
 * Combat Statistics
 * Calculate enemy/player stats based on rarity and difficulty
 */
export const PROCEDURAL_FORMULAS = {
  stats: {
    /**
     * Calculate health based on rarity and difficulty
     * @param rarity Entity rarity
     * @param difficulty Difficulty modifier (0-10, where 5 is baseline)
     * @returns Calculated health value
     */
    health: (rarity: Rarity, difficulty: number = 5): number => {
      return Math.floor(BASE_HP[rarity] * (1 + (difficulty - 5) * 0.1))
    },

    /**
     * Calculate attack based on rarity and difficulty
     */
    attack: (rarity: Rarity, difficulty: number = 5): number => {
      return Math.floor(BASE_ATK[rarity] * (1 + (difficulty - 5) * 0.1))
    },

    /**
     * Calculate defense based on rarity and difficulty
     */
    defense: (rarity: Rarity, difficulty: number = 5): number => {
      return Math.floor(BASE_DEF[rarity] * (1 + (difficulty - 5) * 0.1))
    },
  },

  rewards: {
    /**
     * Calculate gold reward based on rarity and player level
     * @param rarity Entity rarity
     * @param level Player level (affects scaling)
     * @returns Gold amount
     */
    gold: (rarity: Rarity, level: number = 1): number => {
      return Math.floor(BASE_GOLD[rarity] * (1 + level * 0.05))
    },

    /**
     * Calculate experience reward based on rarity and player level
     */
    exp: (rarity: Rarity, level: number = 1): number => {
      return Math.floor(BASE_EXP[rarity] * (1 + level * 0.05))
    },

    /**
     * Calculate item value based on stats and rarity
     */
    itemValue: (
      rarity: Rarity,
      stats?: { attack?: number; defense?: number; health?: number }
    ): number => {
      const baseValue = BASE_GOLD[rarity]
      const statBonus = stats
        ? (stats.attack || 0) * 2 + (stats.defense || 0) * 2 + (stats.health || 0) * 0.5
        : 0
      return Math.floor(baseValue + statBonus)
    },
  },

  shop: {
    /**
     * Calculate shop item price based on value and rarity
     */
    price: (itemValue: number, rarity: Rarity): number => {
      return Math.floor(itemValue * PRICE_MULTIPLIER[rarity])
    },

    /**
     * Calculate stock quantity based on rarity (rarer = less stock)
     */
    stock: (rarity: Rarity): number => {
      const stockValues: Record<Rarity, number> = {
        common: 5,
        uncommon: 3,
        rare: 2,
        epic: 1,
        legendary: 1,
      }
      return stockValues[rarity]
    },
  },

  shrine: {
    /**
     * Calculate shrine offering cost based on rarity and type
     */
    offeringCost: (rarity: Rarity, costType: "health" | "gold"): number => {
      if (costType === "health") {
        const healthCosts: Record<Rarity, number> = {
          common: 10,
          uncommon: 15,
          rare: 20,
          epic: 30,
          legendary: 40,
        }
        return healthCosts[rarity]
      } else {
        // Gold cost
        return Math.floor(BASE_GOLD[rarity] * 1.5)
      }
    },

    /**
     * Calculate boon/bane chance based on rarity
     * Higher rarity = better odds
     */
    boonChance: (rarity: Rarity): number => {
      const chances: Record<Rarity, number> = {
        common: 0.5, // 50%
        uncommon: 0.6, // 60%
        rare: 0.7, // 70%
        epic: 0.8, // 80%
        legendary: 0.9, // 90%
      }
      return chances[rarity]
    },

    /**
     * Calculate boon reward magnitude based on offering
     */
    boonReward: (offeringCost: number, multiplier: number = 2): number => {
      return Math.floor(offeringCost * multiplier)
    },

    /**
     * Calculate bane penalty magnitude based on offering
     */
    banePenalty: (offeringCost: number, multiplier: number = 0.5): number => {
      return Math.floor(offeringCost * multiplier)
    },
  },

  trap: {
    /**
     * Calculate trap risk based on treasure rarity
     * Higher rarity = more dangerous traps
     */
    failChance: (rarity: Rarity): number => {
      const failChances: Record<Rarity, number> = {
        common: 0.1, // 10%
        uncommon: 0.15, // 15%
        rare: 0.2, // 20%
        epic: 0.25, // 25%
        legendary: 0.3, // 30%
      }
      return failChances[rarity]
    },

    /**
     * Calculate trap damage based on treasure rarity
     */
    damage: (rarity: Rarity): number => {
      const trapDamage: Record<Rarity, number> = {
        common: 5,
        uncommon: 10,
        rare: 15,
        epic: 20,
        legendary: 30,
      }
      return trapDamage[rarity]
    },
  },

  items: {
    /**
     * Generate weapon stats based on rarity
     */
    weaponStats: (rarity: Rarity, level: number = 1): { attack: number; defense: number } => {
      return {
        attack: Math.floor(BASE_ATK[rarity] * (1 + level * 0.05)),
        defense: Math.floor(BASE_DEF[rarity] * 0.3), // Weapons have minor defense
      }
    },

    /**
     * Generate armor stats based on rarity
     */
    armorStats: (rarity: Rarity, level: number = 1): { attack: number; defense: number } => {
      return {
        attack: Math.floor(BASE_ATK[rarity] * 0.2), // Armor has minor attack
        defense: Math.floor(BASE_DEF[rarity] * (1 + level * 0.05)),
      }
    },

    /**
     * Generate accessory stats based on rarity (balanced)
     */
    accessoryStats: (
      rarity: Rarity,
      level: number = 1
    ): { attack: number; defense: number; health: number } => {
      return {
        attack: Math.floor(BASE_ATK[rarity] * 0.6 * (1 + level * 0.05)),
        defense: Math.floor(BASE_DEF[rarity] * 0.6 * (1 + level * 0.05)),
        health: Math.floor(BASE_HP[rarity] * 0.3 * (1 + level * 0.05)),
      }
    },

    /**
     * Generate consumable effect magnitude based on rarity
     */
    consumableEffect: (rarity: Rarity, effectType: "health" | "attack" | "defense"): number => {
      const effectMagnitudes: Record<string, Record<Rarity, number>> = {
        health: {
          common: 20,
          uncommon: 35,
          rare: 50,
          epic: 75,
          legendary: 100,
        },
        attack: {
          common: 3,
          uncommon: 5,
          rare: 8,
          epic: 12,
          legendary: 18,
        },
        defense: {
          common: 3,
          uncommon: 5,
          rare: 8,
          epic: 12,
          legendary: 18,
        },
      }
      const effectMap = effectMagnitudes[effectType]
      if (!effectMap) {
        throw new Error(`Unknown effect type: ${effectType}`)
      }
      return effectMap[rarity]
    },
  },

  difficulty: {
    /**
     * Calculate difficulty modifier based on room depth and portal stability
     * @param roomNumber Current room number in portal (1-15)
     * @param stability Portal stability (0-100)
     * @returns Difficulty modifier (0-10)
     */
    calculateDifficulty: (roomNumber: number, stability: number): number => {
      const roomFactor = Math.min(roomNumber / 15, 1) // 0 to 1
      const stabilityFactor = (100 - stability) / 100 // 0 to 1 (lower stability = harder)
      return Math.floor(5 + roomFactor * 3 + stabilityFactor * 2) // 5 to 10
    },
  },
}

/**
 * Utility: Select rarity based on probability weights
 * Used for procedural entity generation
 */
export const selectRarity = (difficultyModifier: number = 0): Rarity => {
  // Base probabilities (sum to 1.0)
  const baseProbabilities: Record<Rarity, number> = {
    common: 0.5, // 50%
    uncommon: 0.25, // 25%
    rare: 0.15, // 15%
    epic: 0.08, // 8%
    legendary: 0.02, // 2%
  }

  // Adjust for difficulty (higher difficulty = better rarity odds)
  const adjustedProbabilities = Object.entries(baseProbabilities).map(
    ([rarity, prob]): [string, number] => {
      if (rarity === "legendary") {
        return [rarity, prob * (1 + difficultyModifier * 0.1)]
      } else if (rarity === "epic") {
        return [rarity, prob * (1 + difficultyModifier * 0.15)]
      } else if (rarity === "rare") {
        return [rarity, prob * (1 + difficultyModifier * 0.2)]
      }
      return [rarity, prob * (1 - difficultyModifier * 0.05)] // Reduce common/uncommon chance
    }
  )

  // Normalize probabilities to sum to 1.0
  const total = adjustedProbabilities.reduce((sum, [, prob]) => sum + (prob as number), 0)
  const normalizedProbs = adjustedProbabilities.map(([rarity, prob]) => [
    rarity,
    (prob as number) / total,
  ])

  // Weighted random selection
  const roll = Math.random()
  let cumulative = 0
  for (const [rarity, prob] of normalizedProbs) {
    cumulative += prob as number
    if (roll <= cumulative) {
      return rarity as Rarity
    }
  }

  return "common" // Fallback
}

/**
 * Utility: Calculate combat damage
 */
export const calculateDamage = (
  attacker: { attack: number },
  defender: { defense: number },
  variance: number = 0.1
): number => {
  const baseDamage = Math.max(1, attacker.attack - defender.defense)
  const varianceFactor = 1 + (Math.random() * 2 - 1) * variance // ±10% variance
  return Math.floor(baseDamage * varianceFactor)
}

/**
 * Utility: Check if action succeeds based on probability
 */
export const rollSuccess = (successChance: number): boolean => {
  return Math.random() < successChance
}
