/**
 * Shared type definitions used across the game
 */

/**
 * Rarity levels for items, enemies, locations, and effects
 * Affects value, stats, and visual styling
 */
export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary"

/**
 * Item types available in the game
 * Determines how items function and where they can be equipped
 */
export type ItemType =
  | "weapon"
  | "armor"
  | "accessory"
  | "potion"
  | "treasure"
  | "map"
  | "consumable"

/**
 * Effect types for consumables and temporary buffs
 * Determines whether an effect is permanent or expires after a duration
 */
export type EffectType = "permanent" | "temporary"

/**
 * Stats interface for player and item statistics
 * Used across items, effects, and player state
 */
export interface Stats {
  attack?: number
  defense?: number
  health?: number
  maxHealth?: number
}
