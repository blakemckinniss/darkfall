import type { Entity, EntityType, Rarity, ValidationResult } from "./schemas"
import { validateEntity } from "./schemas"
import {
  loadDynamicEntities,
  saveDynamicEntities,
  loadOverrides,
  saveOverrides,
  clearAllEntityData,
  pruneExpiredEntities,
  isExpired,
  createTTL,
  TTL,
} from "./persistence"

// Override behavior modes
export type OverrideMode = "variant" | "override" | "unique"

// Configuration for registry behavior
export interface RegistryConfig {
  overrideMode: OverrideMode
  autoSave: boolean
  autoVariantSuffix: string
  validateOnAdd: boolean
  coerceValidation: boolean
}

const DEFAULT_CONFIG: RegistryConfig = {
  overrideMode: "variant",
  autoSave: true,
  autoVariantSuffix: " (AI)",
  validateOnAdd: true,
  coerceValidation: true,
}

// Registry class
class EntityRegistry {
  private canonical: Map<string, Entity> = new Map()
  private dynamic: Map<string, Entity> = new Map()
  private overrides: Map<string, Record<string, unknown>> = new Map()
  private config: RegistryConfig = { ...DEFAULT_CONFIG }
  private initialized = false

  // Initialize registry (load canonical and dynamic data)
  init(canonicalEntities: Entity[] = []): void {
    if (this.initialized) return

    // Load canonical entities
    canonicalEntities.forEach((entity) => {
      this.canonical.set(entity.id, entity)
    })

    // Load dynamic entities from localStorage
    const dynamicEntities = loadDynamicEntities()
    dynamicEntities.forEach((entity) => {
      this.dynamic.set(entity.id, entity)
    })

    // Load overrides
    this.overrides = loadOverrides()

    // Prune expired entities
    pruneExpiredEntities()

    this.initialized = true
  }

  // Configure registry behavior
  configure(config: Partial<RegistryConfig>): void {
    this.config = { ...this.config, ...config }
  }

  getConfig(): RegistryConfig {
    return { ...this.config }
  }

  // Get entity by ID (checks dynamic/overrides first, then canonical)
  getEntity(id: string): Entity | undefined {
    // Check dynamic first
    const dynamicEntity = this.dynamic.get(id)
    if (dynamicEntity && !isExpired(dynamicEntity)) {
      return this.applyOverrides(dynamicEntity)
    }

    // Fallback to canonical
    const canonicalEntity = this.canonical.get(id)
    if (canonicalEntity) {
      return this.applyOverrides(canonicalEntity)
    }

    return undefined
  }

  // Apply overrides to an entity
  private applyOverrides(entity: Entity): Entity {
    const override = this.overrides.get(entity.id)
    if (!override) return entity
    return { ...entity, ...override }
  }

  // Get all entities of a specific type
  getEntitiesByType(type: EntityType): Entity[] {
    const entities: Entity[] = []

    // Collect from canonical
    for (const entity of this.canonical.values()) {
      if (entity.entityType === type) {
        entities.push(this.applyOverrides(entity))
      }
    }

    // Collect from dynamic (excluding expired)
    for (const entity of this.dynamic.values()) {
      if (entity.entityType === type && !isExpired(entity)) {
        entities.push(this.applyOverrides(entity))
      }
    }

    return entities
  }

  // Get entities by rarity
  getEntitiesByRarity(rarity: Rarity): Entity[] {
    const entities: Entity[] = []

    for (const entity of this.canonical.values()) {
      if (entity.rarity === rarity) {
        entities.push(this.applyOverrides(entity))
      }
    }

    for (const entity of this.dynamic.values()) {
      if (entity.rarity === rarity && !isExpired(entity)) {
        entities.push(this.applyOverrides(entity))
      }
    }

    return entities
  }

  // Get entities by type AND rarity
  getEntitiesByTypeAndRarity(type: EntityType, rarity?: Rarity): Entity[] {
    const entities = this.getEntitiesByType(type)
    if (!rarity) return entities
    return entities.filter((entity) => entity.rarity === rarity)
  }

  // Get random entity (optionally filtered by type/rarity)
  getRandomEntity(type?: EntityType, rarity?: Rarity): Entity | undefined {
    let pool: Entity[] = []

    if (type && rarity) {
      pool = this.getEntitiesByTypeAndRarity(type, rarity)
    } else if (type) {
      pool = this.getEntitiesByType(type)
    } else if (rarity) {
      pool = this.getEntitiesByRarity(rarity)
    } else {
      // All entities
      pool = this.getAllEntities()
    }

    if (pool.length === 0) return undefined

    const randomIndex = Math.floor(Math.random() * pool.length)
    return pool[randomIndex]
  }

  // Get all entities (canonical + dynamic, with overrides applied)
  getAllEntities(): Entity[] {
    const entities: Entity[] = []
    const seenIds = new Set<string>()

    // Collect dynamic (overrides canonical)
    for (const entity of this.dynamic.values()) {
      if (!isExpired(entity)) {
        entities.push(this.applyOverrides(entity))
        seenIds.add(entity.id)
      }
    }

    // Collect canonical (skip if dynamic exists)
    for (const entity of this.canonical.values()) {
      if (!seenIds.has(entity.id)) {
        entities.push(this.applyOverrides(entity))
      }
    }

    return entities
  }

  // Search entities by name (fuzzy match)
  searchEntities(query: string): Entity[] {
    const lowerQuery = query.toLowerCase()
    return this.getAllEntities().filter((entity) => entity.name.toLowerCase().includes(lowerQuery))
  }

  // Get entities by tag
  getEntitiesByTag(tag: string): Entity[] {
    return this.getAllEntities().filter((entity) => entity.tags.includes(tag))
  }

  // Register new entity (respects override mode)
  registerEntity(
    entity: Entity | unknown,
    options: { force?: boolean; ttl?: number } = {}
  ): ValidationResult<Entity> {
    // Validate if enabled
    if (this.config.validateOnAdd) {
      const validation = validateEntity(entity, this.config.coerceValidation)
      if (!validation.success) {
        return validation
      }
      entity = validation.data
    }

    const validEntity = entity as Entity

    // Apply TTL if specified
    if (options.ttl) {
      validEntity.expiresAt = createTTL(options.ttl)
    }

    // Check for conflicts based on override mode
    const existingById = this.getEntity(validEntity.id)
    const existingByName = this.findByName(validEntity.name)

    if (existingById && !options.force) {
      // Entity with this ID exists
      if (this.config.overrideMode === "unique") {
        return {
          success: false,
          error: `Entity with ID "${validEntity.id}" already exists`,
          issues: [],
        }
      } else if (this.config.overrideMode === "variant") {
        // Create variant with suffix
        validEntity.name = `${validEntity.name}${this.config.autoVariantSuffix}`
        validEntity.id = `${validEntity.id}-${Date.now()}`
      }
      // If mode is "override", we'll just replace it below
    } else if (existingByName && existingByName.id !== validEntity.id && !options.force) {
      // Entity with this name exists (different ID)
      if (this.config.overrideMode === "unique") {
        return {
          success: false,
          error: `Entity with name "${validEntity.name}" already exists`,
          issues: [],
        }
      } else if (this.config.overrideMode === "variant") {
        // Create variant with suffix
        validEntity.name = `${validEntity.name}${this.config.autoVariantSuffix}`
        validEntity.id = `${validEntity.id}-${Date.now()}`
      }
    }

    // Mark as AI-generated if not already marked
    if (!validEntity.source) {
      validEntity.source = "ai"
    }

    // Add timestamp if not present
    if (!validEntity.createdAt) {
      validEntity.createdAt = Date.now()
    }

    // Add to dynamic registry
    this.dynamic.set(validEntity.id, validEntity)

    // Auto-save if enabled
    if (this.config.autoSave) {
      this.save(true)
    }

    return { success: true, data: validEntity }
  }

  // Update existing entity
  updateEntity(id: string, updates: Record<string, unknown>): ValidationResult<Entity> {
    const existing = this.getEntity(id)
    if (!existing) {
      return {
        success: false,
        error: `Entity with ID "${id}" not found`,
        issues: [],
      }
    }

    // Merge updates
    const updated = { ...existing, ...updates, version: existing.version + 1 }

    // Validate if enabled
    if (this.config.validateOnAdd) {
      const validation = validateEntity(updated, this.config.coerceValidation)
      if (!validation.success) {
        return validation
      }
    }

    // Check if it's canonical or dynamic
    if (this.canonical.has(id)) {
      // Update via overrides
      const currentOverride = this.overrides.get(id)
      const newOverride = currentOverride ? { ...currentOverride, ...updates } : updates
      this.overrides.set(id, newOverride)
      if (this.config.autoSave) {
        saveOverrides(this.overrides, true)
      }
    } else {
      // Update dynamic directly
      this.dynamic.set(id, updated as Entity)
      if (this.config.autoSave) {
        this.save(true)
      }
    }

    return { success: true, data: updated as Entity }
  }

  // Remove entity (only from dynamic)
  removeEntity(id: string): boolean {
    const existed = this.dynamic.has(id)
    this.dynamic.delete(id)

    // Also remove overrides
    this.overrides.delete(id)

    if (existed && this.config.autoSave) {
      this.save(true)
      saveOverrides(this.overrides, true)
    }

    return existed
  }

  // Find entity by name
  findByName(name: string): Entity | undefined {
    return this.getAllEntities().find((entity) => entity.name === name)
  }

  // AI-specific helper: register entity from AI response
  registerAIEntity(
    aiData: unknown,
    options: { ttl?: number; sessionOnly?: boolean; tags?: string[] } = {}
  ): ValidationResult<Entity> {
    // Enhance with metadata
    const entityData = {
      ...(aiData as Record<string, unknown>),
      source: "ai",
      createdAt: Date.now(),
      ...(options.sessionOnly !== undefined && { sessionOnly: options.sessionOnly }),
      ...(options.tags !== undefined && { tags: options.tags }),
    }

    const registerOptions: { force?: boolean; ttl?: number } = {}
    if (options.ttl !== undefined) {
      registerOptions.ttl = options.ttl
    }

    return this.registerEntity(entityData, registerOptions)
  }

  // Save to localStorage
  save(debounced = false): void {
    const dynamicArray = Array.from(this.dynamic.values())
    saveDynamicEntities(dynamicArray, debounced)
    saveOverrides(this.overrides, debounced)
  }

  // Clear all dynamic data
  clear(): void {
    this.dynamic.clear()
    this.overrides.clear()
    clearAllEntityData()
  }

  // Clear only AI-generated entities
  clearAIEntities(): void {
    const aiEntities = Array.from(this.dynamic.entries()).filter(
      ([, entity]) => entity.source === "ai"
    )
    aiEntities.forEach(([id]) => this.dynamic.delete(id))
    this.save()
  }

  // Clear only session entities
  clearSessionEntities(): void {
    const sessionEntities = Array.from(this.dynamic.entries()).filter(
      ([, entity]) => entity.sessionOnly
    )
    sessionEntities.forEach(([id]) => this.dynamic.delete(id))
    // Don't save - these are session-only
  }

  // Prune expired entities
  pruneExpired(): number {
    let count = 0
    for (const [id, entity] of this.dynamic.entries()) {
      if (isExpired(entity)) {
        this.dynamic.delete(id)
        count++
      }
    }
    if (count > 0) {
      this.save()
    }
    return count
  }

  // Get stats
  getStats(): {
    canonical: number
    dynamic: number
    overrides: number
    total: number
    byType: Record<string, number>
    bySource: Record<string, number>
  } {
    const allEntities = this.getAllEntities()
    const byType: Record<string, number> = {}
    const bySource: Record<string, number> = {}

    allEntities.forEach((entity) => {
      byType[entity.entityType] = (byType[entity.entityType] ?? 0) + 1
      bySource[entity.source] = (bySource[entity.source] ?? 0) + 1
    })

    return {
      canonical: this.canonical.size,
      dynamic: this.dynamic.size,
      overrides: this.overrides.size,
      total: allEntities.length,
      byType,
      bySource,
    }
  }
}

// Export singleton instance
export const registry = new EntityRegistry()

// Export helpers
export { TTL, createTTL }

// Export types
export type { Entity, EntityType, Rarity, ValidationResult }
