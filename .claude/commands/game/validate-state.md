---
description: Validate game state schema and localStorage structure
---

# Validate Game State

Review game state management for schema consistency and potential issues.

## Review Areas

1. **Schema Definition** (`lib/game-state.ts`)
   - Review GameState interface
   - Check all properties are properly typed
   - Verify default values in `loadGameState()`

2. **State Persistence**
   - Check localStorage key usage
   - Verify serialization/deserialization
   - Test error handling for corrupted data

3. **State Usage** (`components/dungeon-crawler.tsx`)
   - Review all state update patterns
   - Check for potential race conditions
   - Verify save timing is appropriate

4. **Migration Strategy**
   - Identify if schema changes would break existing saves
   - Suggest versioning strategy if not present
   - Recommend migration path for breaking changes

5. **Data Integrity**
   - Check for orphaned references
   - Verify inventory/equipment consistency
   - Validate stat boundaries

Provide recommendations for schema improvements and data safety.
