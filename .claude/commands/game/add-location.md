---
argument-hint: [location-name] [required-level]
description: Add a new location to the game
---

# Add New Location

Create a new explorable location with appropriate difficulty and unlocks.

## Parameters

- **Location Name**: $1
- **Required Level**: $2 (minimum player level to access)

## Tasks

1. Review existing locations in `lib/game-engine.ts`
2. Create new location entry following the pattern
3. Balance difficulty appropriate for level $2
4. Add location-specific events or entities if needed
5. Update unlock conditions in game logic
6. Ensure location appears in UI properly
7. Test progression flow

**Considerations**:
- Location should have unique theme/description
- Consider what events should be more/less common here
- Think about rewards matching difficulty
- Plan unlock progression (what unlocks this location?)
