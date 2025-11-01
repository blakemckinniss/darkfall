---
name: game-entity-creator
description: Creates new game entities (enemies, locations, treasures, consumables, NPCs, objects) with proper TypeScript typing, balanced stats, and consistent patterns. Use when adding new content to the game, creating entities, or expanding the entity registry.
allowed-tools: Read, Edit, Write, mcp__serena__find_symbol, mcp__serena__get_symbols_overview, mcp__serena__insert_after_symbol
---

# Game Entity Creator

Creates new game entities for the Blackfell dungeon crawler following strict patterns, stat balancing, and TypeScript requirements.

## Entity Types

This skill handles all entity types defined in `lib/entities/schemas.ts`:
- **enemy**: Combat encounters with health, attack, defense
- **treasure**: Equippable items (weapon, armor, accessory) with stat bonuses
- **consumable**: Single-use items (healing, buffs)
- **map**: Unlockable map items that reveal locations
- **location**: Explorable areas with level requirements
- **encounter**: Event definitions with choices and outcomes
- **npc**: Non-player characters with dialogue
- **object**: Interactive environment objects

## Stat Balancing by Rarity

All entities follow strict rarity-based stat ranges:

### Common (White)
- Value: 5-20 gold
- Stats: +1 to +3
- Health: 20-40 (enemies)

### Uncommon (Green)
- Value: 20-40 gold
- Stats: +3 to +6
- Health: 40-60 (enemies)

### Rare (Blue)
- Value: 40-70 gold
- Stats: +6 to +10
- Health: 60-90 (enemies)

### Epic (Purple)
- Value: 70-100 gold
- Stats: +10 to +15
- Health: 90-130 (enemies)

### Legendary (Orange)
- Value: 100-150 gold
- Stats: +15 to +25
- Health: 130-200 (enemies)

## Required Schema Structure

### Base Entity Fields (All Types)
```typescript
{
  id: string,              // Format: "type:name_slug" (e.g., "enemy:fire_demon")
  entityType: EntityType,  // One of: enemy, treasure, consumable, map, location, encounter, npc, object
  name: string,
  description: string,
  rarity: Rarity,         // common, uncommon, rare, epic, legendary
  icon: string,           // react-icons-all format (e.g., "ra-fire-symbol")
  tags?: string[]         // Optional categorization
}
```

### Enemy Fields
```typescript
{
  health: number,
  attack: number,
  defense?: number,
  gold: number,
  exp: number,
  abilities?: string[]
}
```

### Treasure Fields
```typescript
{
  itemType: "weapon" | "armor" | "accessory",
  value: number,
  stats: {
    health?: number,
    attack?: number,
    defense?: number,
    goldBonus?: number,
    expBonus?: number
  }
}
```

### Consumable Fields
```typescript
{
  itemType: "healing" | "buff" | "debuff" | "special",
  value: number,
  effectType: "temporary" | "permanent",
  stats: {
    health?: number,
    attack?: number,
    defense?: number
  },
  duration?: number  // For temporary effects (turns)
}
```

### Location Fields
```typescript
{
  requiredLevel: number,
  description: string,
  encounters?: string[]  // IDs of encounter entities
}
```

## Instructions

### 1. Analyze Request
- Identify entity type from user description
- Determine appropriate rarity tier
- Check for similar existing entities to maintain consistency

### 2. Generate Balanced Stats
- Use rarity-based ranges (see Stat Balancing section)
- Ensure stats are appropriate for intended game stage
- Balance gold/exp rewards with difficulty (enemies)
- Balance value with stat benefits (treasures/consumables)

### 3. Create Entity Definition
- Add entity to appropriate file in `lib/entities/canonical/`
  - Enemies: `enemies.ts`
  - Treasures: `treasures.ts`
  - Consumables: `consumables.ts`
  - Locations: `locations.ts`
  - Encounters: `encounters.ts`
- Use `insert_after_symbol` to add after the last entity in the array
- Follow existing code style and structure exactly

### 4. Choose Appropriate Icon
Select from react-icons-all (commonly used prefixes):
- `ra-*`: RPG Awesome (fantasy/medieval)
- `gi-*`: Game Icons (items/weapons/creatures)
- `fa-*`: Font Awesome (general purpose)
- `bs-*`: Bootstrap Icons (UI elements)

Examples:
- Enemies: `ra-death-skull`, `gi-dragon`, `gi-wolf-head`
- Weapons: `gi-sword`, `gi-axe`, `gi-bow-arrow`
- Armor: `gi-chest-armor`, `gi-shield`, `gi-helmet`
- Consumables: `gi-potion`, `gi-scroll-unfurled`, `gi-heart-bottle`

### 5. Validate Against Schema
Ensure the entity matches the Zod schema in `lib/entities/schemas.ts`:
- All required fields present
- Correct types (no `undefined` for required fields)
- Valid enum values (entityType, rarity, itemType, effectType)
- No extraneous fields

### 6. Test Retrieval
After creating entity, verify it can be queried:
```typescript
ENTITIES.get("type:entity_slug")
ENTITIES.byType("enemy")
ENTITIES.byRarity("rare")
```

## Examples

### Example 1: Creating a Rare Enemy

**User Request**: "Add a fire demon enemy for mid-game encounters"

**Analysis**:
- Entity Type: enemy
- Suggested Rarity: rare (mid-game)
- Theme: Fire/demonic

**Generated Entity**:
```typescript
{
  id: "enemy:fire_demon",
  entityType: "enemy",
  name: "Fire Demon",
  description: "A malevolent demon wreathed in flames, its touch brings searing pain.",
  rarity: "rare",
  icon: "ra-fire-symbol",
  health: 75,        // Within rare range (60-90)
  attack: 18,        // Within rare range
  defense: 8,        // Within rare range
  gold: 55,          // Within rare range (40-70)
  exp: 60,
  tags: ["fire", "demon", "magical"],
  abilities: ["Fire Blast", "Flame Shield"]
}
```

**Location**: Add to `lib/entities/canonical/enemies.ts` after last enemy in the array.

### Example 2: Creating an Epic Treasure

**User Request**: "Create a legendary sword for late game"

**Analysis**:
- Entity Type: treasure
- Item Type: weapon
- Suggested Rarity: epic (user said "legendary" but let's use epic for balance)
- Theme: Powerful weapon

**Generated Entity**:
```typescript
{
  id: "treasure:dragonbane_sword",
  entityType: "treasure",
  name: "Dragonbane Sword",
  description: "Forged from the scale of an ancient dragon, this blade hums with power.",
  rarity: "epic",
  icon: "gi-sword-brandish",
  itemType: "weapon",
  value: 85,         // Within epic range (70-100)
  stats: {
    attack: 12,      // Within epic range (+10 to +15)
    health: 5
  },
  tags: ["weapon", "dragon", "melee"]
}
```

**Location**: Add to `lib/entities/canonical/treasures.ts` after last treasure in the array.

### Example 3: Creating a Consumable

**User Request**: "Add a health potion"

**Analysis**:
- Entity Type: consumable
- Item Type: healing
- Suggested Rarity: common
- Effect: Temporary health restoration

**Generated Entity**:
```typescript
{
  id: "consumable:health_potion",
  entityType: "consumable",
  name: "Health Potion",
  description: "A red liquid that restores vitality.",
  rarity: "common",
  icon: "gi-heart-bottle",
  itemType: "healing",
  value: 15,         // Within common range (5-20)
  effectType: "temporary",
  stats: {
    health: 30       // Immediate healing
  },
  tags: ["healing", "potion"]
}
```

**Location**: Add to `lib/entities/canonical/consumables.ts` after last consumable in the array.

## Edge Cases

### AI-Generated Entities
If entity is from AI generation API, use `ENTITIES.addAI()` instead of adding to canonical files:
```typescript
const result = ENTITIES.addAI(aiGeneratedEntity, {
  ttl: 3600000,      // 1 hour
  sessionOnly: false,
  tags: ["ai-generated"]
})
```

### Duplicate Names
If an entity with the same ID exists:
1. Check if it's a variant (suffix with " (AI)" or " II")
2. Or suggest a different name/slug
3. Never overwrite canonical entities

### Custom Colors
Entities can have custom `color` field for special theming:
```typescript
{
  color: "text-red-500",  // Tailwind class
  bgColor: "bg-red-900/20",
  borderColor: "border-red-500/30"
}
```

## Validation Checklist

Before completing entity creation:
- [ ] ID follows `type:name_slug` format
- [ ] Entity type is valid enum value
- [ ] Rarity is valid enum value
- [ ] Stats fall within rarity ranges
- [ ] All required fields present (no undefined)
- [ ] Icon is from react-icons-all
- [ ] Description is flavorful and concise
- [ ] Tags are relevant and lowercase
- [ ] File location is correct canonical file
- [ ] TypeScript strict mode passes (no type errors)

## Files to Reference

- **Schemas**: `lib/entities/schemas.ts` - All entity type definitions
- **Canonical Entities**: `lib/entities/canonical/*.ts` - Where to add new entities
- **Registry**: `lib/entities/registry.ts` - Entity management system
- **Colors**: `lib/entities/colors.ts` - Rarity color utilities

## Best Practices

1. **Be Conservative with Rarity**: Start one tier lower than user suggests for balance
2. **Thematic Consistency**: Match icon, description, and tags to entity theme
3. **Avoid Power Creep**: Check similar entities to maintain balance
4. **Test Queries**: Verify entity can be retrieved after creation
5. **Follow Patterns**: Match existing entity structure exactly
6. **Use Symbolic Tools**: Use serena's symbolic tools to read/edit canonical files efficiently
