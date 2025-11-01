# Entity Registry System

## Overview

The Entity Registry is a **dual-layer, extremely flexible** system for managing game entities (enemies, treasures, consumables, maps, locations, encounters). It serves as the Single Source of Truth (SSOT) for both **predefined canonical entities** and **AI-generated dynamic entities**.

## Architecture

```
lib/entities/
├── index.ts                    # Main entry point - exports everything
├── registry.ts                 # Core registry with dual-layer management
├── schemas.ts                  # Zod validation schemas
├── persistence.ts              # localStorage integration with TTL
└── canonical/                  # Static predefined entities
    ├── enemies.ts
    ├── treasures.ts
    ├── consumables.ts
    ├── maps.ts
    └── encounters.ts
```

## Key Features

### 1. **Dual-Layer Architecture**
- **Canonical Layer**: Immutable, predefined entities shipped with the game
- **Dynamic Layer**: Mutable, AI-generated or runtime-modified entities
- Components query through unified API - don't care about source

### 2. **Flexible Override Modes**
Configure behavior when AI generates entities with existing names:

```typescript
import { ENTITIES } from '@/lib/entities'

// Configure override mode
ENTITIES.configure({
  overrideMode: 'variant',  // Options: 'variant' | 'override' | 'unique'
})
```

- **`variant`** (default): Creates variants with suffix (e.g., "Goblin" → "Goblin (AI)")
- **`override`**: Replaces canonical entity in dynamic layer
- **`unique`**: Rejects duplicate names entirely

### 3. **Runtime Validation**
- All entities validated with Zod schemas at runtime
- Strict TypeScript types + runtime safety
- Graceful error handling with detailed validation messages

### 4. **Flexible Persistence**
- **Persistent**: AI entities saved to localStorage by default
- **Session-only**: `sessionOnly: true` flag for temporary entities
- **TTL Support**: Auto-expiring entities with timestamp-based expiration
- **Manual clearing**: Clear AI entities, session entities, or all dynamic data

### 5. **Entity Metadata**
Every entity has rich metadata:

```typescript
{
  id: string              // Unique identifier (e.g., "enemy:goblin")
  entityType: string      // Type discriminator
  source: 'canonical' | 'ai' | 'modified'
  version: number         // Version tracking
  sessionOnly: boolean    // Session-only flag
  tags: string[]          // Searchable tags
  color?: string          // Optional custom color (Tailwind class)
  createdAt?: number      // Timestamp
  expiresAt?: number      // TTL expiration timestamp
}
```

### 6. **Entity Color System**
Entities can have custom colors for visual distinction beyond rarity:

**Default Rarity Colors:**
- `common`: Gray-400
- `uncommon`: Green-400
- `rare`: Blue-400
- `epic`: Purple-400
- `legendary`: Amber-400

**Custom Colors (optional):**
Add a `color` field with Tailwind text color class to override rarity color:

```typescript
{
  id: "enemy:ancient_dragon",
  name: "Ancient Dragon",
  rarity: "legendary",
  color: "text-red-500",  // Fire-themed boss
  // ... other fields
}
```

**Thematic Color Examples:**
- Fire/Lava: `text-red-500`, `text-orange-500`
- Ice/Frost: `text-cyan-400`, `text-blue-300`
- Poison/Corruption: `text-green-600`, `text-lime-500`
- Shadow/Void: `text-violet-400`, `text-purple-600`
- Holy/Divine: `text-yellow-300`, `text-amber-400`
- Healing/Water: `text-cyan-400`, `text-teal-400`
- Mystical/Ritual: `text-indigo-400`, `text-fuchsia-400`

**Color Utility Functions:**
```typescript
import {
  getEntityTextColor,      // Get text color class
  getEntityBgColor,        // Get background color class
  getEntityBorderColor,    // Get border color class
  getEntityColorClasses    // Get all at once
} from '@/lib/entities'

// Usage
const textColor = getEntityTextColor(entity)  // Uses custom or falls back to rarity
const allColors = getEntityColorClasses(entity)  // { text, bg, border }
```

**Visual Effects:**
Legendary and epic items automatically receive glow effects in the UI:
- Drop shadow with `currentColor`
- Pulse animation for emphasis

## Usage Guide

### Import

```typescript
import { ENTITIES, registry, TTL } from '@/lib/entities'
```

### Basic Operations

```typescript
// Get entity by ID
const goblin = ENTITIES.get('enemy:goblin')

// Get random enemy
const randomEnemy = ENTITIES.random('enemy')
const rareEnemy = ENTITIES.random('enemy', 'rare')

// Get all entities of type
const allEnemies = ENTITIES.byType('enemy')
const rareTreasures = ENTITIES.byType('treasure').filter(t => t.rarity === 'rare')

// Search by name
const results = ENTITIES.search('dragon')

// Get by tag
const fireEntities = ENTITIES.byTag('fire')

// Get all entities
const everything = ENTITIES.all()
```

### Adding AI-Generated Entities

```typescript
// Simple add (with validation)
const result = ENTITIES.add({
  id: 'enemy:ai_demon',
  entityType: 'enemy',
  name: 'Cursed Demon',
  health: 100,
  attack: 25,
  gold: 80,
  exp: 60,
  rarity: 'epic',
  icon: 'ra-demon-skull',
  source: 'ai',
  version: 1,
  sessionOnly: false,
  tags: ['demon', 'cursed'],
})

if (result.success) {
  console.log('Entity added:', result.data)
} else {
  console.error('Validation failed:', result.error)
}

// AI-specific helper (auto-adds metadata)
const aiResult = ENTITIES.addAI(
  {
    entityType: 'enemy',
    name: 'Shadow Beast',
    health: 90,
    attack: 22,
    gold: 70,
    exp: 55,
    rarity: 'rare',
    icon: 'ra-beast',
  },
  {
    ttl: TTL.HOUR,           // Expires in 1 hour
    sessionOnly: false,      // Persist to localStorage
    tags: ['shadow', 'beast']
  }
)

// Force override (bypass duplicate checking)
ENTITIES.add(entityData, { force: true })
```

### Updating Entities

```typescript
// Update any field
ENTITIES.update('enemy:goblin', {
  health: 30,  // Buff the goblin
  attack: 8,
})

// Updates canonical entities via overrides (non-destructive)
// Updates dynamic entities directly
```

### TTL (Time-To-Live)

```typescript
import { TTL, createTTL } from '@/lib/entities'

// Predefined durations
TTL.MINUTE   // 60 seconds
TTL.HOUR     // 1 hour
TTL.DAY      // 24 hours
TTL.WEEK     // 7 days
TTL.MONTH    // 30 days

// Custom TTL
const customExpiry = createTTL(5 * TTL.MINUTE)  // 5 minutes

// Add with expiration
ENTITIES.addAI(entityData, { ttl: TTL.DAY })
```

### Cleanup & Maintenance

```typescript
// Remove specific entity
ENTITIES.remove('enemy:ai_demon')

// Clear only AI-generated entities
ENTITIES.clearAI()

// Clear only session entities
ENTITIES.clearSession()

// Clear everything dynamic (AI + overrides)
ENTITIES.clear()

// Prune expired entities
const prunedCount = ENTITIES.pruneExpired()

// Get statistics
const stats = ENTITIES.stats()
// {
//   canonical: 30,
//   dynamic: 12,
//   overrides: 3,
//   total: 45,
//   byType: { enemy: 10, treasure: 20, ... },
//   bySource: { canonical: 30, ai: 15 }
// }
```

### Configuration

```typescript
ENTITIES.configure({
  overrideMode: 'variant',        // variant | override | unique
  autoSave: true,                 // Auto-save to localStorage
  autoVariantSuffix: ' (AI)',     // Suffix for variants
  validateOnAdd: true,            // Validate entities on add
  coerceValidation: true,         // Coerce types during validation
})

const config = ENTITIES.getConfig()
```

## Entity Types

### Enemy
```typescript
{
  entityType: 'enemy',
  name: string,
  health: number,
  attack: number,
  gold: number,
  exp: number,
  rarity: Rarity,
  icon: string,
  description?: string,
}
```

### Treasure (Weapons/Armor/Accessories)
```typescript
{
  entityType: 'treasure',
  name: string,
  type: 'weapon' | 'armor' | 'accessory' | 'potion' | 'treasure',
  value: number,
  rarity: Rarity,
  icon: string,
  stats?: { health?: number; attack?: number; defense?: number },
  description?: string,
}
```

### Consumable
```typescript
{
  entityType: 'consumable',
  name: string,
  type: 'consumable',
  value: number,
  rarity: Rarity,
  icon: string,
  consumableEffect: {
    type: 'temporary' | 'permanent',
    duration?: number,  // for temporary effects
    statChanges: Stats,
  },
  description?: string,
}
```

### Map
```typescript
{
  entityType: 'map',
  name: string,
  locationName: string,
  entrances: number,
  rarity: Rarity,
  value: number,
  icon: string,
  description?: string,
}
```

### Encounter (Mystery Events)
```typescript
{
  entityType: 'encounter',
  name: string,
  rarity: Rarity,
  icon: string,
  description: string,
  choices: Array<{
    text: string,
    outcome: {
      message: string,
      healthChange?: number,
      goldChange?: number,
      experienceChange?: number,
      statChanges?: Stats,
    }
  }>,
}
```

## Integration with Groq AI

When generating entities via Groq AI:

```typescript
// 1. Call Groq API to generate entity
const aiResponse = await generateEntityWithGroq(prompt)

// 2. Register the AI-generated entity
const result = ENTITIES.addAI(aiResponse, {
  ttl: TTL.WEEK,              // Expires in 7 days
  sessionOnly: false,         // Persist across sessions
  tags: ['ai-generated', 'portal-event']
})

// 3. Handle validation errors gracefully
if (!result.success) {
  console.error('AI entity validation failed:', result.error, result.issues)
  // Fallback to canonical entity
  const fallback = ENTITIES.random(desiredType, desiredRarity)
  return fallback
}

// 4. Use the validated entity
return result.data
```

## Next Steps

1. **Update `game-engine.ts`** to use the registry instead of static arrays
2. **Integrate with Groq portal events** to generate dynamic entities
3. **Add UI controls** for managing AI entities (clear, view stats, etc.)
4. **Create entity inspector** for debugging/development

## Advanced Registry API

For advanced use cases, access the registry directly:

```typescript
import { registry } from '@/lib/entities'

// Initialize with custom entities
registry.init(myCanonicalEntities)

// Direct access to internal methods
registry.getEntitiesByTypeAndRarity('enemy', 'legendary')
registry.findByName('Ancient Dragon')
registry.save()  // Manual save
```

## Benefits

✅ **Single Source of Truth**: All entities in one place
✅ **Type-Safe**: Runtime validation + TypeScript types
✅ **Flexible**: Supports both static and dynamic entities
✅ **Persistent**: Auto-saves with localStorage
✅ **Extensible**: Easy to add new entity types
✅ **AI-Ready**: Built for Groq narrative integration
✅ **Queryable**: Rich search and filter API
✅ **Maintainable**: Well-organized, clean architecture
