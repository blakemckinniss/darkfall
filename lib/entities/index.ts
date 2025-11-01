// Main entry point for entity registry system

// Export registry singleton
export { registry, TTL, createTTL, type OverrideMode, type RegistryConfig } from "./registry"

// Export schemas and types
export type {
  Entity,
  EntityType,
  Rarity,
  ItemType,
  EffectType,
  Stats,
  EntityMetadata,
  Enemy,
  Treasure,
  Consumable,
  MapItem,
  Location,
  Encounter,
  ValidationResult,
} from "./schemas"

export {
  raritySchema,
  itemTypeSchema,
  effectTypeSchema,
  entityTypeSchema,
  statsSchema,
  entityMetadataSchema,
  enemySchema,
  treasureSchema,
  consumableSchema,
  mapSchema,
  locationSchema,
  encounterSchema,
  entitySchema,
  validateEntity,
  validateEnemy,
  validateTreasure,
  validateConsumable,
  validateMap,
  validateLocation,
  validateEncounter,
} from "./schemas"

// Export persistence utilities
export {
  loadDynamicEntities,
  saveDynamicEntities,
  loadOverrides,
  saveOverrides,
  clearAllEntityData,
  clearDynamicEntities,
  clearOverrides,
  pruneExpiredEntities,
  isExpired,
  getStorageStats,
  type PersistenceConfig,
} from "./persistence"

// Export canonical entities
export {
  enemies,
  treasures,
  consumables,
  maps,
  encounters,
  allCanonicalEntities,
  canonicalCounts,
} from "./canonical"

// Export color utilities
export {
  RARITY_COLORS,
  RARITY_BG_COLORS,
  RARITY_BORDER_COLORS,
  getEntityTextColor,
  getEntityBgColor,
  getEntityBorderColor,
  getEntityColorClasses,
} from "./colors"

// Initialize registry with canonical entities
import { registry } from "./registry"
import { allCanonicalEntities } from "./canonical"

// Auto-initialize on import
if (typeof window !== "undefined") {
  registry.init(allCanonicalEntities)

  // Configure registry for AI entity generation
  registry.configure({
    overrideMode: "variant", // Creates variants with suffix for AI duplicates
    autoSave: true, // Auto-save to localStorage
    autoVariantSuffix: " (AI)", // Suffix for AI variants
    validateOnAdd: true, // Validate entities on add
    coerceValidation: true, // Coerce types during validation
  })
}

// Helper functions for common operations
export const ENTITIES = {
  // Get entity by ID
  get: (id: string) => registry.getEntity(id),

  // Get random entity
  random: (type?: EntityType, rarity?: Rarity) => registry.getRandomEntity(type, rarity),

  // Get by type
  byType: (type: EntityType) => registry.getEntitiesByType(type),

  // Get by rarity
  byRarity: (rarity: Rarity) => registry.getEntitiesByRarity(rarity),

  // Search by name
  search: (query: string) => registry.searchEntities(query),

  // Get by tag
  byTag: (tag: string) => registry.getEntitiesByTag(tag),

  // Add new entity (AI or manual)
  add: (entity: unknown, options?: { force?: boolean; ttl?: number }) =>
    registry.registerEntity(entity, options),

  // Add AI entity with metadata
  addAI: (aiData: unknown, options?: { ttl?: number; sessionOnly?: boolean; tags?: string[] }) =>
    registry.registerAIEntity(aiData, options),

  // Update entity
  update: (id: string, updates: Record<string, unknown>) => registry.updateEntity(id, updates),

  // Remove entity
  remove: (id: string) => registry.removeEntity(id),

  // Find by name
  findByName: (name: string) => registry.findByName(name),

  // Get all entities
  all: () => registry.getAllEntities(),

  // Get stats
  stats: () => registry.getStats(),

  // Configuration
  configure: (config: Partial<RegistryConfig>) => registry.configure(config),
  getConfig: () => registry.getConfig(),

  // Maintenance
  save: () => registry.save(),
  clear: () => registry.clear(),
  clearAI: () => registry.clearAIEntities(),
  clearSession: () => registry.clearSessionEntities(),
  pruneExpired: () => registry.pruneExpired(),
}

// Type re-export for convenience
import type { EntityType, Rarity, RegistryConfig } from "./registry"
