# Testing AI Entity Variants

This guide demonstrates how to test the AI entity variant system that automatically creates suffixed variants when AI generates entities with duplicate names.

## Overview

The entity registry is configured with `overrideMode: "variant"` which means:
- When AI generates an entity with an existing name, it automatically adds " (AI)" suffix
- Canonical entities remain immutable
- Multiple variants can exist for the same base entity
- Each variant has a unique ID and is tracked separately

## Quick Test via Developer Tab

1. **Start the development server**:
   ```bash
   pnpm dev
   ```

2. **Navigate to Developer Tab** in the game UI

3. **Test Variant Creation**:
   - Click the **"Test AI Variants (Demo)"** button
   - This will create two test entities:
     - First: "Goblin" → Becomes "Goblin (AI)" (canonical "Goblin" exists)
     - Second: "Goblin (AI)" → Becomes "Goblin (AI) (AI)" (first variant exists)

4. **Verify in Entity Browser**:
   - Scroll to **Entity Browser** section
   - Click on **"enemy"** to expand
   - You should see:
     - `Goblin` (common) - no AI badge (canonical)
     - `Goblin (AI)` (common) - AI badge (first variant)
     - `Goblin (AI) (AI)` (uncommon) - AI badge (nested variant)

5. **Check Statistics**:
   - **Total Entities** should increase by 2
   - **AI Generated** should show 2 new entities
   - **Canonical** remains unchanged (6)

6. **View in Game Log**:
   - Check the left panel game log
   - Should show messages:
     - "Created AI variant: Goblin (AI) (ID: ...)"
     - "Created nested variant: Goblin (AI) (AI) (ID: ...)"

## Testing with Groq Narrative Generator

### Method 1: Portal Events (Void Tab)

1. **Navigate to Void Tab** (requires unlocking via Maps tab first)

2. **Click "Enter The Void"**

3. **Groq generates a narrative** with an enemy entity

4. **If Groq generates an enemy named "Goblin"**:
   - Entity will be registered as "Goblin (AI)"
   - Check Developer Tab → Entity Browser → enemy
   - Verify AI badge appears next to the entity

5. **Repeat multiple times**:
   - If Groq generates "Goblin" again, it becomes "Goblin (AI) (AI)"
   - Each variant is tracked separately with unique stats

### Method 2: Manual Testing via Console

Open browser console and run:

```javascript
// Import ENTITIES global
const { ENTITIES } = window

// Test 1: Create variant of canonical "Goblin"
const result1 = ENTITIES.addAI({
  entityType: "enemy",
  name: "Goblin",
  health: 25,
  attack: 6,
  gold: 12,
  exp: 18,
  rarity: "common",
  icon: "ra-monster-skull"
}, {
  ttl: 60000, // 1 minute
  sessionOnly: false,
  tags: ["test"]
})

console.log("Variant 1:", result1.data.name) // Should be "Goblin (AI)"

// Test 2: Create another variant
const result2 = ENTITIES.addAI({
  entityType: "enemy",
  name: "Goblin (AI)",
  health: 30,
  attack: 7,
  gold: 15,
  exp: 20,
  rarity: "uncommon",
  icon: "ra-monster-skull"
}, {
  ttl: 60000,
  sessionOnly: false,
  tags: ["test"]
})

console.log("Variant 2:", result2.data.name) // Should be "Goblin (AI) (AI)"

// View all enemies
console.log("All enemies:", ENTITIES.byType("enemy"))
```

## Expected Behavior

### Variant Naming
- **Base canonical**: `Goblin`
- **First AI variant**: `Goblin (AI)`
- **Second AI variant**: `Goblin (AI) (AI)`
- **Third AI variant**: `Goblin (AI) (AI) (AI)` (and so on...)

### Entity IDs
- Each variant gets a unique timestamped ID:
  - `enemy:ai_1234567890123`
  - `enemy:ai_1234567890456`

### TTL (Time-To-Live)
- Test variants expire after 1 minute (60000ms)
- Groq narrative entities expire after 1 week
- Use **"Prune Expired Entities"** button to clean up

### localStorage Persistence
- AI variants are saved to localStorage
- Survive page refreshes
- Can be cleared with management buttons

## Cleanup After Testing

1. **Prune Expired Entities**:
   - Click "Prune Expired Entities" to remove test variants (1-minute TTL)

2. **Clear AI Entities**:
   - Click "Clear AI Entities" to remove all AI-generated entities

3. **Clear All Dynamic**:
   - Click "Clear All Dynamic" to reset registry to canonical only

## Verification Checklist

- [ ] Test button creates two variants
- [ ] Variants appear in Entity Browser with AI badges
- [ ] Statistics update correctly (AI Generated count increases)
- [ ] Game log shows variant creation messages
- [ ] Variants have different IDs and stats
- [ ] Canonical "Goblin" remains unchanged
- [ ] Groq narrative events register AI entities
- [ ] Variants persist across page refresh
- [ ] Prune button removes expired entities
- [ ] Clear buttons work correctly

## Troubleshooting

**Variants not appearing?**
- Check browser console for errors
- Click "Refresh Stats" button
- Verify Developer Tab is visible

**Groq not generating entities?**
- Check `GROQ_API_KEY` environment variable
- Verify Void tab is unlocked (use Maps tab first)
- Check network tab for API errors

**Variants not persisting?**
- Check localStorage in browser DevTools
- Look for keys: `game-entities-dynamic`, `game-entities-overrides`
- Verify `autoSave: true` in registry config

## Advanced: Override Modes

The registry supports three override modes (configured in `lib/entities/index.ts`):

### 1. Variant Mode (Current)
```typescript
overrideMode: "variant"
```
- Creates suffixed variants: "Goblin (AI)"
- Preserves all entities
- Allows multiple versions

### 2. Override Mode
```typescript
overrideMode: "override"
```
- Replaces existing entity completely
- Only one version exists
- Last AI generation wins

### 3. Unique Mode
```typescript
overrideMode: "unique"
```
- Rejects duplicates entirely
- Returns error on conflict
- Strict uniqueness enforcement

To change modes, edit `lib/entities/index.ts` and restart dev server.
