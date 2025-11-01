---
name: state-migration-helper
description: Safely evolves game state schema with backwards compatibility, localStorage migrations, and TypeScript type updates. Use when changing game state structure, adding new fields, or refactoring persisted data.
allowed-tools: Read, Edit, Write, mcp__serena__find_symbol, mcp__serena__replace_symbol_body, mcp__serena__get_symbols_overview
---

# State Migration Helper

Safely evolves the game state schema for Blackfell while maintaining backwards compatibility with existing player save files in localStorage.

## State Schema Location

All game state is managed through:
- **Schema Definition**: `lib/game-state.ts`
- **Persistence**: Browser localStorage
- **Keys**: `blackfell:gameState`, `blackfell:entities:dynamic`, `blackfell:entities:overrides`

## Current State Structure

```typescript
interface GameState {
  playerStats: {
    health: number
    maxHealth: number
    attack: number
    defense: number
    gold: number
    exp: number
    level: number
  }
  inventory: InventoryItem[]
  equippedItems: {
    weapon: InventoryItem | null
    armor: InventoryItem | null
    accessory: InventoryItem | null
  }
  activeEffects: ActiveEffect[]
  openLocations: string[]
  activePortrait: string | null
  generatedPortraits: GeneratedPortrait[]
}
```

## Migration Types

### 1. Adding Optional Fields
Safest migration - no breaking changes required.

**Example**: Adding `questLog` field
```typescript
interface GameState {
  // ... existing fields
  questLog?: Quest[]  // Optional, won't break existing saves
}
```

### 2. Adding Required Fields with Defaults
Requires migration function to populate missing data.

**Example**: Adding `achievements` field
```typescript
interface GameState {
  // ... existing fields
  achievements: Achievement[]  // Required, needs migration
}

function migrateToV2(oldState: unknown): GameState {
  const state = oldState as GameState
  return {
    ...state,
    achievements: state.achievements || []  // Provide default
  }
}
```

### 3. Renaming Fields
Requires migration to map old → new field names.

**Example**: Renaming `gold` to `currency`
```typescript
function migrateToV3(oldState: unknown): GameState {
  const state = oldState as any
  return {
    ...state,
    playerStats: {
      ...state.playerStats,
      currency: state.playerStats.gold,  // Map old to new
      gold: undefined  // Remove old (or keep for compatibility period)
    }
  }
}
```

### 4. Restructuring Nested Objects
Complex migration requiring deep transformations.

**Example**: Flattening inventory structure
```typescript
// Old: inventory: Array<{ id, name, stats, ... }>
// New: inventory: Array<string (IDs)>, inventoryData: Record<string, Item>

function migrateToV4(oldState: unknown): GameState {
  const state = oldState as any

  const inventoryData: Record<string, Item> = {}
  const inventoryIds: string[] = []

  state.inventory.forEach((item: any) => {
    inventoryData[item.id] = item
    inventoryIds.push(item.id)
  })

  return {
    ...state,
    inventory: inventoryIds,
    inventoryData
  }
}
```

### 5. Data Type Changes
Requires careful conversion and validation.

**Example**: Change `level` from number to object
```typescript
// Old: level: number
// New: level: { current: number, progress: number, next: number }

function migrateToV5(oldState: unknown): GameState {
  const state = oldState as any
  const level = state.playerStats.level

  return {
    ...state,
    playerStats: {
      ...state.playerStats,
      level: {
        current: level,
        progress: 0,
        next: level * 100  // XP needed for next level
      }
    }
  }
}
```

## Instructions

### 1. Analyze Change Request
Determine:
- What field(s) are changing?
- Is it addition, rename, restructure, or type change?
- Is the field optional or required?
- Will existing saves break without migration?

### 2. Update TypeScript Types
Edit types in `lib/game-state.ts`:

```typescript
// Add new field
interface GameState {
  // ... existing fields
  newField: NewType  // or NewType | undefined for optional
}
```

**Strict TypeScript Considerations**:
- Use `| undefined` for truly optional fields
- Don't use `?:` with explicit undefined values (violates exactOptionalPropertyTypes)
- For optional fields that may not exist in old saves, use conditional checks

### 3. Create Migration Function
Add migration function if needed:

```typescript
export function migrateGameState(savedState: unknown): GameState {
  // Check if migration is needed
  if (!savedState || typeof savedState !== 'object') {
    return getDefaultGameState()
  }

  const state = savedState as Partial<GameState>

  // Apply migrations in order
  let migrated = state

  // V1 → V2: Add achievements
  if (!migrated.achievements) {
    migrated = {
      ...migrated,
      achievements: []
    }
  }

  // V2 → V3: Rename gold → currency
  if (migrated.playerStats && 'gold' in migrated.playerStats) {
    migrated = {
      ...migrated,
      playerStats: {
        ...migrated.playerStats,
        currency: (migrated.playerStats as any).gold,
        gold: undefined
      }
    }
    delete (migrated.playerStats as any).gold
  }

  // Validate and return
  return migrated as GameState
}
```

### 4. Update loadGameState Function
Integrate migration into load logic:

```typescript
export function loadGameState(): GameState | null {
  if (typeof window === "undefined") return null

  try {
    const saved = localStorage.getItem("blackfell:gameState")
    if (!saved) return null

    const parsed = JSON.parse(saved)

    // Apply migrations
    const migrated = migrateGameState(parsed)

    // Save migrated state back
    saveGameState(migrated)

    return migrated
  } catch (error) {
    console.error("Failed to load game state:", error)
    return null
  }
}
```

### 5. Update saveGameState Function
Ensure new fields are persisted:

```typescript
export function saveGameState(state: GameState): void {
  if (typeof window === "undefined") return

  try {
    // Validate state before saving (optional but recommended)
    validateGameState(state)

    localStorage.setItem("blackfell:gameState", JSON.stringify(state))
  } catch (error) {
    console.error("Failed to save game state:", error)
  }
}
```

### 6. Add Validation (Optional but Recommended)
Create validation function:

```typescript
function validateGameState(state: GameState): boolean {
  // Check required fields exist
  if (!state.playerStats || !state.inventory) {
    throw new Error("Invalid game state: missing required fields")
  }

  // Check types
  if (typeof state.playerStats.health !== 'number') {
    throw new Error("Invalid game state: health must be a number")
  }

  // Check invariants
  if (state.playerStats.health > state.playerStats.maxHealth) {
    console.warn("Health exceeds max health, capping")
    state.playerStats.health = state.playerStats.maxHealth
  }

  return true
}
```

### 7. Update Component Usage
Update any components that read/write state:

```typescript
// In dungeon-crawler.tsx or other components
const [gameState, setGameState] = useState<GameState>(() => {
  const loaded = loadGameState()
  return loaded || getDefaultGameState()
})

// When using new fields, handle undefined cases
const achievements = gameState.achievements ?? []
```

### 8. Handle Strict TypeScript
For accessing potentially undefined fields:

```typescript
// ❌ Wrong: Direct access may fail
const firstItem = inventory[0].name  // Error: may be undefined

// ✓ Correct: Check for undefined
const firstItem = inventory[0]?.name ?? "Unknown"

// ✓ Correct: Conditional rendering
{inventory[0] && <div>{inventory[0].name}</div>}

// ✓ Correct: Use optional chaining and nullish coalescing
const health = gameState.playerStats?.health ?? 0
```

### 9. Test Migration
Create test scenarios:

```typescript
// Test migration with old save
const oldSave = {
  playerStats: { /* old structure */ },
  inventory: [],
  equippedItems: { weapon: null, armor: null, accessory: null },
  activeEffects: [],
  openLocations: []
  // missing new fields
}

const migrated = migrateGameState(oldSave)
console.log("Migrated state:", migrated)

// Verify new fields exist
if (!migrated.achievements) {
  console.error("Migration failed: achievements missing")
}
```

### 10. Document Migration
Add comments and changelog:

```typescript
/**
 * Game State Migrations
 *
 * V1 → V2 (2025-01-15): Added achievements array
 * V2 → V3 (2025-01-20): Renamed gold → currency
 * V3 → V4 (2025-01-25): Restructured inventory (normalized)
 */
```

## Examples

### Example 1: Adding Quest System

**User Request**: "Add a quest system to track player objectives"

**Implementation**:

```typescript
// 1. Define new types
interface Quest {
  id: string
  name: string
  description: string
  completed: boolean
  progress: number
  maxProgress: number
}

// 2. Update GameState interface
interface GameState {
  // ... existing fields
  quests: Quest[]  // Add quests array
}

// 3. Update migration
export function migrateGameState(savedState: unknown): GameState {
  // ... existing migrations

  // Add quests if missing
  if (!migrated.quests) {
    migrated = {
      ...migrated,
      quests: []  // Default to empty array
    }
  }

  return migrated as GameState
}

// 4. Update default state
export function getDefaultGameState(): GameState {
  return {
    // ... existing defaults
    quests: []
  }
}

// 5. Update components
// In dungeon-crawler.tsx
const quests = gameState.quests ?? []
```

### Example 2: Restructuring Player Stats

**User Request**: "Split playerStats into separate stats and resources objects"

**Implementation**:

```typescript
// 1. Define new structure
interface GameState {
  stats: {  // Permanent stats
    attack: number
    defense: number
    level: number
  }
  resources: {  // Current resources
    health: number
    maxHealth: number
    gold: number
    exp: number
  }
  // ... rest unchanged
}

// 2. Create migration
export function migrateGameState(savedState: unknown): GameState {
  const state = savedState as any

  // Check if old structure
  if (state.playerStats && !state.stats) {
    const { playerStats } = state

    migrated = {
      ...state,
      stats: {
        attack: playerStats.attack,
        defense: playerStats.defense,
        level: playerStats.level
      },
      resources: {
        health: playerStats.health,
        maxHealth: playerStats.maxHealth,
        gold: playerStats.gold,
        exp: playerStats.exp
      },
      playerStats: undefined  // Remove old field
    }

    delete migrated.playerStats
  }

  return migrated as GameState
}

// 3. Update all component references
// Replace gameState.playerStats.health with gameState.resources.health
// Replace gameState.playerStats.attack with gameState.stats.attack
```

## Best Practices

1. **Always Provide Defaults**: Never leave required fields undefined after migration
2. **Test with Real Saves**: Use actual player localStorage data for testing
3. **Version Your Migrations**: Track which migrations have been applied
4. **Keep Backwards Compatibility**: Support old saves for at least 2-3 versions
5. **Log Migrations**: Console.log when migrations run for debugging
6. **Validate After Migration**: Ensure migrated state is valid
7. **Document Changes**: Update comments and changelog
8. **Handle Edge Cases**: Consider corrupted or partial saves

## Files to Reference

- **State Management**: `lib/game-state.ts`
- **Main Component**: `components/dungeon-crawler.tsx`
- **Entity Persistence**: `lib/entities/persistence.ts`
- **Type Definitions**: `lib/types.ts`

## Safety Checklist

Before deploying state migration:
- [ ] TypeScript types updated
- [ ] Migration function created and tested
- [ ] Default state updated
- [ ] loadGameState integrates migration
- [ ] Components handle new fields safely
- [ ] Strict TypeScript passes (no undefined errors)
- [ ] Tested with old save data
- [ ] Tested with new save data
- [ ] Tested with corrupted/missing data
- [ ] Migration documented in comments
