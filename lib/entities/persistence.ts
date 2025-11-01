import type { Entity } from "./schemas"

const STORAGE_KEYS = {
  DYNAMIC: "blackfell:entities:dynamic",
  OVERRIDES: "blackfell:entities:overrides",
  CONFIG: "blackfell:entities:config",
} as const

export interface PersistenceConfig {
  autoSave: boolean
  debounceMs: number
  pruneExpired: boolean
}

const DEFAULT_CONFIG: PersistenceConfig = {
  autoSave: true,
  debounceMs: 500,
  pruneExpired: true,
}

// Debounce helper
let saveTimeout: NodeJS.Timeout | null = null

function debounce(fn: () => void, ms: number) {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
  saveTimeout = setTimeout(fn, ms)
}

// Check if entity is expired
export function isExpired(entity: Entity): boolean {
  if (!entity.expiresAt) return false
  return Date.now() > entity.expiresAt
}

// Filter out expired and session-only entities
export function filterPersistable(entities: Entity[]): Entity[] {
  return entities.filter((entity) => {
    // Don't persist session-only entities
    if (entity.sessionOnly) return false
    // Don't persist expired entities if pruning enabled
    if (isExpired(entity)) return false
    return true
  })
}

// Load dynamic entities from localStorage
export function loadDynamicEntities(): Entity[] {
  if (typeof window === "undefined") return []

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.DYNAMIC)
    if (!stored) return []

    const parsed = JSON.parse(stored) as Entity[]
    // Filter expired entities on load
    return parsed.filter((entity) => !isExpired(entity))
  } catch (error) {
    console.error("Failed to load dynamic entities:", error)
    return []
  }
}

// Save dynamic entities to localStorage
// Note: All entity fields (including custom 'color') are preserved via JSON serialization
export function saveDynamicEntities(entities: Entity[], debounced = false): void {
  if (typeof window === "undefined") return

  const saveAction = () => {
    try {
      const persistable = filterPersistable(entities)
      // JSON.stringify preserves all entity fields including custom colors
      localStorage.setItem(STORAGE_KEYS.DYNAMIC, JSON.stringify(persistable))
    } catch (error) {
      console.error("Failed to save dynamic entities:", error)
    }
  }

  if (debounced) {
    debounce(saveAction, DEFAULT_CONFIG.debounceMs)
  } else {
    saveAction()
  }
}

// Load entity overrides from localStorage
export function loadOverrides(): Map<string, Record<string, unknown>> {
  if (typeof window === "undefined") return new Map()

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.OVERRIDES)
    if (!stored) return new Map()

    const parsed = JSON.parse(stored) as Record<string, Record<string, unknown>>
    return new Map(Object.entries(parsed))
  } catch (error) {
    console.error("Failed to load overrides:", error)
    return new Map()
  }
}

// Save entity overrides to localStorage
export function saveOverrides(
  overrides: Map<string, Record<string, unknown>>,
  debounced = false
): void {
  if (typeof window === "undefined") return

  const saveAction = () => {
    try {
      const obj = Object.fromEntries(overrides)
      localStorage.setItem(STORAGE_KEYS.OVERRIDES, JSON.stringify(obj))
    } catch (error) {
      console.error("Failed to save overrides:", error)
    }
  }

  if (debounced) {
    debounce(saveAction, DEFAULT_CONFIG.debounceMs)
  } else {
    saveAction()
  }
}

// Clear all dynamic entities
export function clearDynamicEntities(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(STORAGE_KEYS.DYNAMIC)
}

// Clear all overrides
export function clearOverrides(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(STORAGE_KEYS.OVERRIDES)
}

// Clear all entity data
export function clearAllEntityData(): void {
  clearDynamicEntities()
  clearOverrides()
}

// Prune expired entities from storage
export function pruneExpiredEntities(): number {
  if (typeof window === "undefined") return 0

  const entities = loadDynamicEntities()
  const beforeCount = entities.length
  const validEntities = entities.filter((entity) => !isExpired(entity))
  const afterCount = validEntities.length

  if (beforeCount !== afterCount) {
    saveDynamicEntities(validEntities, false)
  }

  return beforeCount - afterCount
}

// Get storage stats
export function getStorageStats(): {
  dynamicCount: number
  overrideCount: number
  totalSize: number
  expiredCount: number
} {
  if (typeof window === "undefined") {
    return { dynamicCount: 0, overrideCount: 0, totalSize: 0, expiredCount: 0 }
  }

  const dynamicEntities = loadDynamicEntities()
  const allStored = localStorage.getItem(STORAGE_KEYS.DYNAMIC)
  const allParsed = allStored ? (JSON.parse(allStored) as Entity[]) : []
  const expiredCount = allParsed.filter((entity) => isExpired(entity)).length

  const overrides = loadOverrides()

  const dynamicSize = localStorage.getItem(STORAGE_KEYS.DYNAMIC)?.length ?? 0
  const overrideSize = localStorage.getItem(STORAGE_KEYS.OVERRIDES)?.length ?? 0
  const totalSize = dynamicSize + overrideSize

  return {
    dynamicCount: dynamicEntities.length,
    overrideCount: overrides.size,
    totalSize,
    expiredCount,
  }
}

// Create TTL timestamp helper
export function createTTL(durationMs: number): number {
  return Date.now() + durationMs
}

// Common TTL durations
export const TTL = {
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
} as const
