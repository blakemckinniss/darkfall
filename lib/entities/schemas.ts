import { z } from "zod"

// Base schemas matching existing types
export const raritySchema = z.enum(["common", "uncommon", "rare", "epic", "legendary"])
export const itemTypeSchema = z.enum([
  "weapon",
  "armor",
  "accessory",
  "potion",
  "treasure",
  "consumable",
  "map",
])
export const effectTypeSchema = z.enum(["temporary", "permanent"])
export const entityTypeSchema = z.enum([
  "enemy",
  "treasure",
  "consumable",
  "map",
  "location",
  "encounter",
  "npc",
  "object",
])

export const statsSchema = z.object({
  health: z.number().optional(),
  attack: z.number().optional(),
  defense: z.number().optional(),
})

// Text effect schema for advanced entity text rendering
export const textEffectSchema = z
  .object({
    type: z.enum(["shimmer", "gradient", "glow", "per-letter", "default"]),
    colors: z.array(z.string()).min(1).default(["text-foreground"]), // Tailwind classes or hex codes
    animationDuration: z.string().default("3s"), // e.g., "3s", "5s", "8s"
    intensity: z.enum(["subtle", "medium", "strong"]).default("medium"),
    customClass: z.string().optional(), // For AI-generated unique CSS classes
  })
  .optional()

// Entity metadata for flexible management
export const entityMetadataSchema = z.object({
  id: z.string(),
  source: z.enum(["canonical", "ai", "modified"]),
  createdAt: z.number().optional(), // timestamp
  expiresAt: z.number().optional(), // timestamp for TTL
  sessionOnly: z.boolean(),
  version: z.number(),
  tags: z.array(z.string()),
  color: z.string().optional(), // Optional color override (Tailwind class or hex)
  textEffect: textEffectSchema, // Optional advanced text rendering effects
})

// Enemy schema
export const enemySchema = entityMetadataSchema.extend({
  entityType: z.literal("enemy"),
  name: z.string().min(1),
  health: z.number().positive(),
  attack: z.number().nonnegative(),
  gold: z.number().nonnegative().default(0),
  exp: z.number().nonnegative().default(0),
  rarity: raritySchema,
  icon: z.string().default("ra-monster-skull"),
  description: z.string().optional(),
})

// Treasure schema
export const treasureSchema = entityMetadataSchema.extend({
  entityType: z.literal("treasure"),
  name: z.string().min(1),
  type: itemTypeSchema,
  value: z.number().nonnegative().default(0),
  rarity: raritySchema,
  icon: z.string().default("ra-crystal-ball"),
  stats: statsSchema.optional(),
  description: z.string().optional(),
  portalExclusive: z
    .object({
      requiredPortalTheme: z.string().optional(), // Portal theme required for drop (e.g., "Dragon's Lair")
      requiredRarity: raritySchema.optional(), // Min portal rarity required
      dropChance: z.number().min(0).max(1).default(0.15), // 15% default drop rate
      globallyUnique: z.boolean().default(true), // Can only be obtained once per game
    })
    .optional(),
})

// Consumable schema
export const consumableSchema = entityMetadataSchema.extend({
  entityType: z.literal("consumable"),
  name: z.string().min(1),
  type: z.literal("consumable"),
  value: z.number().nonnegative().default(0),
  rarity: raritySchema,
  icon: z.string().default("ra-potion"),
  consumableEffect: z.object({
    type: effectTypeSchema,
    duration: z.number().optional(),
    statChanges: statsSchema,
    scope: z.enum(["global", "portal", "encounter"]).default("global"),
    portalRestriction: z.string().optional(), // Specific portal theme/ID
  }),
  description: z.string().optional(),
})

// Portal metadata schema for map items
export const portalMetadataSchema = z.object({
  expectedRoomCount: z.number().int().min(3).max(15),
  stabilityDecayRate: z.object({
    min: z.number().min(5).max(20),
    max: z.number().min(10).max(35),
  }),
  eventDiversity: z.array(z.enum(["combat", "treasure", "mystery", "hazard", "rest"])).min(1),
  riskLevel: z.enum(["low", "medium", "high", "extreme"]),
  theme: z.string().optional(),
  themeColor: z.string().optional(),
})

// Map schema
export const mapSchema = entityMetadataSchema.extend({
  entityType: z.literal("map"),
  name: z.string().min(1),
  locationName: z.string().min(1),
  entrances: z.number().int().positive(),
  rarity: raritySchema,
  value: z.number().nonnegative().default(0),
  icon: z.string().default("ra-scroll-unfurled"),
  description: z.string().optional(),
  portalMetadata: portalMetadataSchema.optional(),
})

// Portal data schema for location entities
export const portalDataSchema = z.object({
  expectedRoomCount: z.number().int(),
  currentRoomCount: z.number().int().default(0),
  stabilityDecayRate: z.object({
    min: z.number(),
    max: z.number(),
  }),
  eventDiversity: z.array(z.string()),
  riskLevel: z.enum(["low", "medium", "high", "extreme"]),
  theme: z.string(),
  aiGeneratedDescription: z.string().optional(),
  sourceMapId: z.string().optional(),
})

// Location schema
export const locationSchema = entityMetadataSchema.extend({
  entityType: z.literal("location"),
  name: z.string().min(1),
  entrancesRemaining: z.number().int().nonnegative(),
  maxEntrances: z.number().int().positive(),
  rarity: raritySchema,
  stability: z.number().min(0).max(100).default(100),
  description: z.string().optional(),
  portalData: portalDataSchema.optional(),
})

// Encounter schema (for mystery encounters like merchant, fountain, altar)
export const encounterSchema = entityMetadataSchema.extend({
  entityType: z.literal("encounter"),
  name: z.string().min(1),
  rarity: raritySchema,
  icon: z.string().default("ra-crystal-ball"),
  description: z.string(),
  // Encounters contain choice data
  choices: z
    .array(
      z.object({
        text: z.string(),
        outcome: z.object({
          message: z.string(),
          healthChange: z.number().optional(),
          goldChange: z.number().optional(),
          experienceChange: z.number().optional(),
          statChanges: statsSchema.optional(),
        }),
      })
    )
    .min(1),
})

// Union of all entity types
export const entitySchema = z.discriminatedUnion("entityType", [
  enemySchema,
  treasureSchema,
  consumableSchema,
  mapSchema,
  locationSchema,
  encounterSchema,
])

// Type exports
export type Rarity = z.infer<typeof raritySchema>
export type ItemType = z.infer<typeof itemTypeSchema>
export type EffectType = z.infer<typeof effectTypeSchema>
export type EntityType = z.infer<typeof entityTypeSchema>
export type Stats = z.infer<typeof statsSchema>
export type TextEffect = z.infer<typeof textEffectSchema>
export type EntityMetadata = z.infer<typeof entityMetadataSchema>
export type PortalMetadata = z.infer<typeof portalMetadataSchema>
export type PortalData = z.infer<typeof portalDataSchema>
export type Enemy = z.infer<typeof enemySchema>
export type Treasure = z.infer<typeof treasureSchema>
export type Consumable = z.infer<typeof consumableSchema>
export type MapItem = z.infer<typeof mapSchema>
export type Location = z.infer<typeof locationSchema>
export type Encounter = z.infer<typeof encounterSchema>
export type Entity = z.infer<typeof entitySchema>

// Validation result type
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; issues: z.ZodIssue[] }

// Validation functions with coercion support
export function validateEntity(data: unknown, _coerce = true): ValidationResult<Entity> {
  try {
    const result = entitySchema.safeParse(data)

    if (result.success) {
      return { success: true, data: result.data }
    } else {
      return {
        success: false,
        error: result.error.message,
        issues: result.error.issues,
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown validation error",
      issues: [],
    }
  }
}

// Specific validators
export function validateEnemy(data: unknown, _coerce = true): ValidationResult<Enemy> {
  const result = enemySchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  } else {
    return { success: false, error: result.error.message, issues: result.error.issues }
  }
}

export function validateTreasure(data: unknown, _coerce = true): ValidationResult<Treasure> {
  const result = treasureSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  } else {
    return { success: false, error: result.error.message, issues: result.error.issues }
  }
}

export function validateConsumable(data: unknown, _coerce = true): ValidationResult<Consumable> {
  const result = consumableSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  } else {
    return { success: false, error: result.error.message, issues: result.error.issues }
  }
}

export function validateMap(data: unknown, _coerce = true): ValidationResult<MapItem> {
  const result = mapSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  } else {
    return { success: false, error: result.error.message, issues: result.error.issues }
  }
}

export function validateLocation(data: unknown, _coerce = true): ValidationResult<Location> {
  const result = locationSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  } else {
    return { success: false, error: result.error.message, issues: result.error.issues }
  }
}

export function validateEncounter(data: unknown, _coerce = true): ValidationResult<Encounter> {
  const result = encounterSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  } else {
    return { success: false, error: result.error.message, issues: result.error.issues }
  }
}
