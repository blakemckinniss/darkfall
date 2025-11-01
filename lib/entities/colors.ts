import type { Rarity, Entity } from "./schemas"

/**
 * Rarity-based color system for entities
 * Uses Tailwind color classes for consistent styling
 */
export const RARITY_COLORS: Record<Rarity, string> = {
  common: "text-gray-400",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-amber-400",
}

/**
 * Background color variants for cards/badges
 */
export const RARITY_BG_COLORS: Record<Rarity, string> = {
  common: "bg-gray-500/20 border-gray-500/50",
  uncommon: "bg-green-500/20 border-green-500/50",
  rare: "bg-blue-500/20 border-blue-500/50",
  epic: "bg-purple-500/20 border-purple-500/50",
  legendary: "bg-amber-500/20 border-amber-500/50",
}

/**
 * Border color variants
 */
export const RARITY_BORDER_COLORS: Record<Rarity, string> = {
  common: "border-gray-500",
  uncommon: "border-green-500",
  rare: "border-blue-500",
  epic: "border-purple-500",
  legendary: "border-amber-500",
}

/**
 * Get text color for an entity
 * Returns custom color if set, otherwise falls back to rarity color
 */
export function getEntityTextColor(entity: Entity | { rarity: Rarity; color?: string }): string {
  if (entity.color) {
    return entity.color
  }
  return RARITY_COLORS[entity.rarity]
}

/**
 * Get background color for an entity
 * Returns custom color with opacity if set, otherwise falls back to rarity bg color
 */
export function getEntityBgColor(entity: Entity | { rarity: Rarity; color?: string }): string {
  if (entity.color) {
    // If custom color is provided, create a background variant
    // Assumes Tailwind color class format
    return entity.color.replace("text-", "bg-") + "/20"
  }
  return RARITY_BG_COLORS[entity.rarity]
}

/**
 * Get border color for an entity
 */
export function getEntityBorderColor(entity: Entity | { rarity: Rarity; color?: string }): string {
  if (entity.color) {
    // If custom color is provided, create a border variant
    return entity.color.replace("text-", "border-")
  }
  return RARITY_BORDER_COLORS[entity.rarity]
}

/**
 * Get full color classes for an entity card/badge
 * Combines text, background, and border colors
 */
export function getEntityColorClasses(entity: Entity | { rarity: Rarity; color?: string }): {
  text: string
  bg: string
  border: string
} {
  return {
    text: getEntityTextColor(entity),
    bg: getEntityBgColor(entity),
    border: getEntityBorderColor(entity),
  }
}
