---
argument-hint: [type] [name] [rarity]
description: Create a new game entity (enemy, treasure, consumable, etc.)
---

# Create New Game Entity

Add a new entity to the game engine with proper balance and integration.

## Parameters

- **Type**: $1 (enemy, treasure, consumable, mapItem)
- **Name**: $2 (entity name/title)
- **Rarity**: $3 (common, uncommon, rare, legendary)

## Tasks

1. Review existing entities of type $1 in `lib/game-engine.ts`
2. Create new entity following the existing pattern
3. Balance stats appropriately for rarity tier $3
4. Add to the appropriate entity array
5. Ensure proper integration with `generateEvent()`
6. Test entity highlighting in `renderTextWithEntities()`

**Guidelines**:
- Follow stat ranges for the rarity tier
- Use appropriate emoji/symbols
- Write engaging description text
- Consider location-specific availability if applicable
