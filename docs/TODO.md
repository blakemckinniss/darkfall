# Portal Traversal Enhancement TODO

**Vision:** Incorporate Path of Adventure (POA) mechanics to enhance portal traversal with progress tracking, strategic choices, portal-scoped buffs, and exclusive artifacts.

**Total Estimated Time:** 8.5 hours
**Expert Validation:** ✅ Complete (Opus 4)
**Confidence Level:** 95%
**Status:** ✅ Phase 1 Complete | Phases 2-3 Pending
**Last Updated:** 2025-11-02 18:00
**Commit:** fe88570 - "feat: Implement portal traversal enhancements (Phase 1A & 1B)"

---

## 📖 Start Here (For Fresh Sessions)

### Essential Context

**What are Portals?**
- Portals are temporary dungeon locations created by consuming "Map Items" from inventory
- Each portal has 3-15 rooms (based on rarity) and a stability percentage (100% → 0%)
- Stability decreases with each room completed (percentage-based decay)
- Portals collapse when stability hits 0% OR when all rooms are explored
- Players navigate room-by-room through AI-generated encounters (combat, treasure, mystery, hazard, rest)
- Current implementation: Map Item → Location entity → Room-by-room traversal → Collapse

**What is Path of Adventure (POA)?**
- POA is a web-based text RPG used as inspiration for portal enhancement mechanics
- Source: `docs/inspiration.md` (HTML dump of POA gameplay)
- Key mechanics analyzed: progress tracking, weapon conditions, artifacts, cursed items, choice groups, temporary effects
- 4 of these mechanics were selected as best fit for portal traversal enhancement

**Current Portal System Architecture:**
- Schemas: `lib/entities/schemas.ts` (MapItem, Location, portalMetadata, portalData) ✅ EXISTS
- Canonical maps: `lib/entities/canonical/maps.ts` (6 themed maps with metadata) ✅ EXISTS
- AI generation: `app/api/generate-narrative/route.ts` (room encounters) ✅ EXISTS
- Game logic: `components/dungeon-crawler.tsx` (handleOpenMap, handleEnterLocation, handleChoice) ✅ EXISTS
- State: Tracked in openLocations array, persisted to localStorage
- **Planned:** `app/api/generate-portal/route.ts` (Phase 4 - optional portal skeleton generation)

### Required Reading (Before Starting)

**📚 ADR-013** - `docs/ADR.md` (lines 528-703)
- Complete architectural decision for portal traversal enhancement
- Explains why these 4 mechanics were chosen (validated against Hades, Slay the Spire, Dead Cells)
- Documents critical fixes (stability decay edge case, room count variance)
- Trade-off analysis and consequences
- Expert validation notes

**📋 NOTES.md** - `docs/NOTES.md`
- Contains 19 critical items (🔴/⭐ 76-100) that may need attention
- Portal traversal next steps logged at bottom (2025-11-02)
- Check before starting to ensure no blocking issues

**🎨 Inspiration Source** - `docs/inspiration.md`
- HTML dump of Path of Adventure gameplay
- Shows weapon conditions ("brand new"), artifact markers (crown icon), progress tracking (2/50)
- Reference for UI/UX patterns when implementing choices and progress indicators

### Quick Start Checklist

**Before implementing ANY phase:**
- [ ] Read ADR-013 in `docs/ADR.md` (understand the "why")
- [ ] Review current portal system in `lib/entities/schemas.ts` (portalMetadata structure)
- [ ] Check `docs/NOTES.md` for blocking critical items
- [ ] Fix linting errors (currently 4 files with issues)
- [ ] Commit uncommitted changes (currently 8 modified files)

**To begin Phase 1A (Portal Progress Tracking):**
1. Locate `components/dungeon-crawler.tsx`
2. Find encounter rendering section (search for "activeLocation")
3. Access `portalData.currentRoomCount` and `portalData.expectedRoomCount`
4. Add UI component between stability bar and encounter description
5. Style to match existing portal UI (Tailwind, consistent colors)

---

## 🎯 The 4 Chosen Mechanics (POA-Inspired)

From POA analysis (10 mechanics evaluated), these 4 were selected:

1. **Portal Progress Tracking** - "Room 3/8" counter with visual progress bar (from POA's "2/50" path progress)
2. **Multi-Choice Treasure Events** - Select 1 of 2-3 treasure options (from POA's "Take Pitchfork OR Straw Shield")
3. **Portal-Scoped Consumables** - Temporary buffs active only in current portal (from POA's "end of day" effects)
4. **Portal-Exclusive Artifacts** - Rare items from specific portal themes (from POA's crown-marked artifacts)

**Why These 4?**
- Each directly enhances portal **traversal** (not general game systems)
- Fits ephemeral/high-stakes nature of temporary portals
- Validated against roguelike best practices (see ADR-013)
- Integrates cleanly with existing portal architecture
- Incremental implementation (each phase delivers standalone value)

**Why NOT Other POA Mechanics?**
- Weapon condition system: Too punishing for portal-only degradation
- Cursed items: Needs careful balancing (lower priority)
- Enchanted weapons: Already covered by existing stat system
- Limited slots: Already implemented via inventory

---

## 🎯 Implementation Status

### ✅ Phase 1A: Portal Progress Tracking - COMPLETE

**Status:** ✅ Implemented in commit fe88570
**Files Modified:** `components/dungeon-crawler.tsx:1743-1772`

**Completed:**
- [x] Portal progress display component (`Room X/Y` counter)
- [x] Visual progress bar with cyan theme
- [x] Bonus room indicator (`X/Y (bonus)`)
- [x] Positioned below stability bar

**Testing Required:**
- [ ] Test progress display updates correctly during portal traversal
- [ ] Verify progress bar animation is smooth
- [ ] Test edge case: bonus rooms exceeding expected count

---

### ✅ Phase 1B: Multi-Choice Treasure Events - COMPLETE (Backend)

**Status:** ✅ Backend implemented in commit fe88570 | ⚠️ Integration with portal AI pending
**Files Modified:**
- `lib/game-engine.ts` - TreasureChoice interface
- `app/api/generate-narrative/route.ts` - AI prompt + transformation
- `components/dungeon-crawler.tsx` - UI + handler

**Completed:**
- [x] Schema Extension - TreasureChoice interface added to game-engine.ts
- [x] AI Prompt Enhancement - 30% treasure event rate with balance rules
- [x] Treasure choice transformation logic (AI JSON → game format)
- [x] UI Component - Grid-based treasure choice cards
- [x] handleTreasureChoice function (item/gold/health rewards)
- [x] TypeScript fixes for global animation functions

**Pending (Next Session):**
- [ ] **CRITICAL:** Integrate treasure choices with portal AI generation
- [ ] Connect `/api/generate-narrative` to portal traversal events
- [ ] Test AI-generated treasure choices in actual portal runs
- [ ] Validate treasure choice balance (equal value across options)
- [ ] Tune AI prompt based on real gameplay feedback

**Known Issues:**
- Treasure choices only work with `/api/generate-narrative` (void encounters)
- Portal traversal still uses old `generateEvent` function (no treasure choices)
- Need to replace portal event generation with AI endpoint calls

---

### 🔧 Critical Fixes Completed

**Status:** ✅ Complete in commit fe88570

**Fix 1: Stability Decay Edge Case** - FIXED
- File: `components/dungeon-crawler.tsx:661`
- Added `Math.max(1, ...)` to prevent infinite low-stability loops
- [x] Ensures minimum 1-point decay per room

**Fix 2: Room Count Variance** - Already Fixed
- Investigation showed this was already implemented correctly
- Room count variance calculated once and stored in `portalData`

---

## 🚀 Next Session: Phase 1B Integration + Phases 2-3

### Priority 1: Complete Phase 1B Integration (1-2 hours)

**Goal:** Connect treasure choices to portal traversal system

**Tasks:**
- [ ] Modify portal event generation to call `/api/generate-narrative`
- [ ] Pass portal metadata (theme, rarity) to AI for contextual treasures
- [ ] Update handleChoice to support treasure choice events
- [ ] Test treasure choices appear in portal runs (not just void)
- [ ] Validate balance across different portal rarities

---

### Phase 2: Portal-Scoped Consumables 🟡 MEDIUM PRIORITY (3 hours)
  ```typescript
  interface TreasureChoice {
    type: "item" | "gold" | "health" | "buff";
    item?: InventoryItem;
    gold?: number;
    healthRestore?: number;
    buffEffect?: TemporaryEffect;
    description: string;
  }
  ```
- [ ] Add `choices?: TreasureChoice[]` to encounter schema

#### 2. AI Prompt Enhancement (30 mins)
- [ ] Update `/api/generate-narrative` system prompt for treasure events
- [ ] Add structured JSON output for 2-3 balanced choices
- [ ] Include examples in prompt:
  - Combat focus: weapon vs. armor vs. consumable
  - Treasure focus: gold vs. rare item vs. bulk items
  - Mixed: healing vs. buff vs. utility item
- [ ] Add fallback logic if AI doesn't generate valid choices
- [ ] Test AI generates balanced options

#### 3. Game Engine Integration (45 mins)
- [ ] Add `handleTreasureChoice(choice: TreasureChoice)` function
- [ ] Update treasure event handler to check for choices
- [ ] Apply selected choice effects (add item, gold, health, buff)
- [ ] Remove unselected choices from consideration
- [ ] Track choice selection in encounter history

#### 4. UI Implementation (30 mins)
- [ ] Create treasure choice UI component
- [ ] Display 2-3 choice cards with:
  - [ ] Item/reward name
  - [ ] Description
  - [ ] Visual preview (icon, stats)
  - [ ] Select button
- [ ] Style choice cards similar to POA choice groups
- [ ] Add hover states and selection feedback
- [ ] Disable other choices after selection

**Acceptance Criteria:**
- [ ] AI generates 2-3 balanced treasure choices
- [ ] Player can select one choice
- [ ] Selected reward is applied correctly
- [ ] Fallback to simple treasure if AI fails
- [ ] UI clearly shows choice options and consequences

---

### Phase 2: Portal-Scoped Consumables 🟡 MEDIUM PRIORITY (3 hours)

**Priority:** MEDIUM - Adds strategic depth, requires careful state management
**Dependencies:** Phase 1A complete (for testing)
**Files:** `lib/entities/schemas.ts`, `lib/game-engine.ts`, `components/dungeon-crawler.tsx`, `lib/entities/canonical/consumables.ts`

**Tasks:**

#### 1. Schema Extension (30 mins)
- [ ] Extend `consumableEffect` schema with `scope` field:
  ```typescript
  scope: z.enum(["global", "portal", "encounter"]).default("global")
  ```
- [ ] Add optional `portalRestriction?: string` (specific portal theme/ID)
- [ ] Update consumable validation functions
- [ ] Add TypeScript types for new fields

#### 2. Portal Session Tracking (1 hour)
- [ ] Create `PortalSession` interface:
  ```typescript
  interface PortalSession {
    locationId: string;
    enteredAt: number;
    activeBuffs: PortalBuff[];
    roomsVisited: Set<string>;
  }
  ```
- [ ] Add portal session state management
- [ ] Track active portal ID in game state
- [ ] Create `activatePortalBuff(buff, portalId)` function
- [ ] Create `clearPortalBuffs(portalId)` function
- [ ] Hook into portal enter/exit/collapse events

#### 3. Consumable Handling (45 mins)
- [ ] Update `handleUseConsumable` to check scope
- [ ] For "portal" scope:
  - [ ] Validate portal is active
  - [ ] Apply buff to portal session
  - [ ] Add buff to activePortalBuffs array
  - [ ] Update player stats temporarily
- [ ] Clear portal buffs when:
  - [ ] Portal exits normally
  - [ ] Portal collapses (0% stability or room limit)
  - [ ] Player switches portals
- [ ] Test buff stacking (newer overwrites, no stacking)

#### 4. Create Portal-Scoped Consumables (45 mins)
**Note:** `lib/entities/canonical/consumables.ts` exists with 8+ current consumables. Add 5 new portal-scoped ones:

- [ ] Add to `lib/entities/canonical/consumables.ts`:
  - [ ] **Portal Anchor** - +15% stability retention
  - [ ] **Dimensional Ward** - Reduce damage 20% in portals
  - [ ] **Explorer's Blessing** - +10% treasure find
  - [ ] **Cavern Blessing** - +20% stability decay resistance
  - [ ] **Portal Resilience** - +10 max health while in portal
- [ ] Set appropriate rarities and values
- [ ] Add clear descriptions indicating portal-scoped effect

#### 5. UI Indicators (30 mins)
- [ ] Add active portal buffs display to portal UI
- [ ] Show "Active in: [Portal Name]" indicator
- [ ] Display buff countdown/status
- [ ] Add visual feedback when buff applies/expires
- [ ] Update consumable tooltips to show scope

**Critical Implementation Notes:**
- [ ] **Fix from Expert:** Handle edge case of multiple open portals
- [ ] **Fix from Expert:** Buff applies to "next entered portal" if multiple open
- [ ] Test buff persistence through page reload
- [ ] Test buff cleanup on unexpected portal collapse

**Acceptance Criteria:**
- [ ] Portal-scoped consumables can be used
- [ ] Buffs only active in specified portal
- [ ] Clear UI shows active portal buffs
- [ ] Buffs clear on portal exit/collapse
- [ ] No bugs with multiple simultaneous portals

---

### Phase 3: Portal-Exclusive Artifacts 🔵 POLISH (3 hours + content)

**Priority:** POLISH - Long-term replayability, higher maintenance
**Dependencies:** Phase 1B complete (for drop testing)
**Files:** `lib/entities/schemas.ts`, `lib/game-engine.ts`, `lib/entities/canonical/treasures.ts`

**Tasks:**

#### 1. Schema Extension (30 mins)
- [ ] Add `portalExclusive` field to treasure schema:
  ```typescript
  portalExclusive: z.object({
    requiredPortalTheme: z.string().optional(),
    requiredRarity: raritySchema.optional(),
    dropChance: z.number().min(0).max(1),
    globallyUnique: z.boolean().default(true)
  }).optional()
  ```
- [ ] Add `obtainedArtifacts: string[]` to player state
- [ ] Update treasure validation

#### 2. Drop Logic Implementation (1 hour)
- [ ] Create `checkPortalExclusiveDrop(portal, playerState)` function
- [ ] Match portal theme against artifact requirements
- [ ] Check if artifact already obtained (globallyUnique)
- [ ] Roll drop chance
- [ ] Add artifact to loot pool if eligible
- [ ] Track obtained artifacts in localStorage

#### 3. Artifact Tracking (45 mins)
- [ ] Load obtained artifacts from localStorage on game start
- [ ] Save obtained artifacts on artifact acquisition
- [ ] Add `hasObtainedArtifact(artifactId)` helper
- [ ] Display obtained artifacts in collection UI (optional)
- [ ] Add visual indicator for "new" artifacts

#### 4. Create Portal-Exclusive Artifacts (45 mins + content)
Create 5-10 themed artifacts:

**Dragon's Lair (Legendary):**
- [ ] **Dragon's Scale** - Legendary defense item (10% drop)
- [ ] **Scorched Blade** - Fire damage weapon (15% drop)

**Crystal Caverns (Rare):**
- [ ] **Crystal Heart** - Mana/magic boost (15% drop)
- [ ] **Luminous Shard** - Vision/detection buff (20% drop)

**Sunken Temple (Uncommon):**
- [ ] **Sunken Relic** - Water resistance (25% drop)
- [ ] **Ancient Seal** - Curse protection (20% drop)

**Forgotten Catacombs (Common):**
- [ ] **Bone Charm** - Undead damage bonus (30% drop)

**Ancient Library (Uncommon):**
- [ ] **Tome of Knowledge** - XP boost (25% drop)

**Abandoned Mine (Common):**
- [ ] **Miner's Pickaxe** - Resource gathering (30% drop)

- [ ] Set appropriate stats, effects, and descriptions
- [ ] Add visual indicators (crown icon for artifacts)
- [ ] Balance drop rates through playtesting

#### 5. UI Enhancements (30 mins)
- [ ] Add "Portal Exclusive" badge to artifact items
- [ ] Show collection progress (X/10 artifacts found)
- [ ] Add artifact preview in portal UI ("Can drop: Dragon's Scale")
- [ ] Highlight new artifact acquisitions

**Critical Implementation Notes:**
- [ ] **Expert Suggestion:** Global tracking in localStorage prevents duplicates
- [ ] Drop rates: 10-30% baseline (tune with playtesting)
- [ ] Consider "pity system" (guaranteed drop after X portals)

**Acceptance Criteria:**
- [ ] 5+ themed artifacts created
- [ ] Artifacts only drop in specified portal types
- [ ] No duplication (tracked globally)
- [ ] Drop rates feel fair (not too rare/common)
- [ ] Visual indication of exclusive status

---

## 🔧 Critical Fixes (Expert-Identified)

### Fix 1: Stability Decay Edge Case  CRITICAL
**Issue:** Percentage-based decay asymptotically approaches 0 at low stability values
**File:** `components/dungeon-crawler.tsx` (handleChoice function)

**Current (Broken):**
```typescript
const decay = Math.floor(stability * (decayRate / 100));
// At stability=1, decayRate=20%: 1 * 0.20 = 0.2  rounds to 0 (no decay!)
```

**Fixed:**
```typescript
const decay = Math.max(1, Math.floor(stability * (decayRate / 100)));
// Ensures minimum 1-point decay, prevents infinite low-stability states
```

**Tasks:**
- [ ] Update stability decay calculation in `handleChoice`
- [ ] Test low stability scenarios (1-5 stability)
- [ ] Verify portals collapse predictably at low values

---

### Fix 2: Room Count Variance Consistency  IMPORTANT
**Issue:** Room count should be determined once, not recalculated on every access
**File:** `components/dungeon-crawler.tsx` (handleOpenMap function)

**Current (Inconsistent):**
```typescript
const roomCount = baseRooms + Math.floor(Math.random() * 3) - 1;
// Recalculates every time, leads to inconsistent count
```

**Fixed:**
```typescript
// Determine once at portal creation, store in portalData
const variance = Math.floor(Math.random() * 3) - 1;
portalData.actualRoomCount = portalData.baseRoomCount + variance;
```

**Tasks:**
- [ ] Store final room count in `portalData.actualRoomCount`
- [ ] Use stored value consistently throughout portal lifecycle
- [ ] Update progress tracking to use stored value
- [ ] Test room count remains consistent across multiple checks

---

## 📊 Testing Checklist

### Portal Progress Tracking
- [ ] Progress displays correctly on first room
- [ ] Progress updates after each room completion
- [ ] Progress bar animates smoothly
- [ ] Bonus rooms show correctly (X/Y bonus)
- [ ] Progress persists through page reload

### Multi-Choice Treasures
- [ ] AI generates 2-3 valid choices
- [ ] Choices are balanced (similar value)
- [ ] Player can select one choice
- [ ] Selected reward applies correctly
- [ ] Fallback works if AI fails
- [ ] Choice selection feels intuitive

### Portal-Scoped Consumables
- [ ] Consumable applies to active portal
- [ ] Buff shows in portal UI
- [ ] Buff cleared on portal exit
- [ ] Buff cleared on portal collapse
- [ ] Multiple portals handled correctly
- [ ] Buff persistence across reload

### Portal-Exclusive Artifacts
- [ ] Artifacts only drop in correct portals
- [ ] Drop rates feel fair
- [ ] No duplicate artifacts obtained
- [ ] Global tracking persists
- [ ] Collection progress displays
- [ ] Visual indicators clear

### Critical Fixes
- [ ] Low stability portals collapse predictably
- [ ] Room count consistent throughout portal
- [ ] No infinite low-stability loops
- [ ] Progress tracking matches actual rooms

---

## 🎨 UI/UX Enhancements

### Portal Progress Display
- [ ] Position: Top of encounter screen, below stability bar
- [ ] Style: Consistent with existing portal UI
- [ ] Font: Match current UI typography
- [ ] Colors: Use theme colors (cyan for progress bar)
- [ ] Animation: Smooth fill animation on progress
- [ ] Responsive: Works on mobile/tablet

### Multi-Choice Treasure Cards
- [ ] Layout: Grid or horizontal row of 2-3 cards
- [ ] Card style: Similar to POA choice buttons
- [ ] Hover effect: Scale/glow on hover
- [ ] Selection: Disable other cards after selection
- [ ] Visual feedback: Checkmark or highlight on selected
- [ ] Accessibility: Keyboard navigation support

### Portal Buffs Indicator
- [ ] Position: Portal sidebar or top bar
- [ ] Show: Buff name, effect, portal name
- [ ] Icon: Visual indicator (sparkle/glow)
- [ ] Tooltip: Detailed buff description
- [ ] Removal: Smooth fade-out when cleared

### Artifact Collection UI
- [ ] Display: Grid of artifact slots
- [ ] Obtained: Full color with details
- [ ] Missing: Grayed out with "???"
- [ ] Progress: "5/10 Artifacts Found"
- [ ] Highlight: Pulse effect on new acquisition

---

## 📖 Documentation Updates

### ADR.md
- [ ] Document portal traversal mechanics decision
- [ ] Explain POA inspiration and adaptation
- [ ] Detail portal-scoped consumable pattern
- [ ] Document artifact uniqueness approach
- [ ] Include trade-off analysis

### CLAUDE.md
- [ ] Add notes on portal state management
- [ ] Document new consumable scope types
- [ ] Explain artifact tracking in localStorage
- [ ] Note critical fixes from expert review

### NOTES.md
- [ ] Log portal-scoped consumable state management
- [ ] Document edge cases for multiple open portals
- [ ] Note AI choice balance tuning needs
- [ ] Record artifact drop rate baseline (10-30%)

---

## ⚠️ Known Risks & Mitigations

### 1. Portal State Complexity (🟡45)
**Risk:** Multiple open portals with scoped buffs creates complex state management
**Mitigation:**
- Use explicit PortalSession tracking
- Clear separation of portal-specific state
- Thorough testing of multi-portal scenarios

### 2. AI Choice Balance (🟡35)
**Risk:** AI may generate unbalanced treasure choices
**Mitigation:**
- Structured prompts with value guidelines
- Fallback to simple treasure if imbalanced
- Manual review of AI output during testing
- Iterative prompt tuning

### 3. Artifact Drop Rates (🟢25)
**Risk:** Drop rates may feel too rare or too common
**Mitigation:**
- Start with generous rates (10-30%)
- Gather playtest feedback
- Implement rate adjustments dynamically
- Consider pity system for very rare items

### 4. Performance - AI Generation (🟢20)
**Risk:** Multiple AI calls may slow portal opening
**Mitigation:**
- Cache portal skeletons (24 hours)
- Progressive room loading
- Optimize AI prompts for speed
- Monitor API usage

---

## 🚀 Optional Future Enhancements

**Not in current scope, consider after Phase 3:**

- [ ] **Portal Modifiers** - Buffs/debuffs that affect entire portal (e.g., "Cursed" portal with 2x rewards but 1.5x difficulty)
- [ ] **Portal Chains** - Completing one portal unlocks access to related portal
- [ ] **Dynamic Difficulty** - Portal adjusts based on player performance
- [ ] **Portal Challenges** - Optional objectives for bonus rewards
- [ ] **Portal Leaderboards** - Track fastest/most efficient clears
- [ ] **Portal Crafting** - Combine map fragments to create custom portals
- [ ] **Portal Events** - Timed special portals with unique rewards
- [ ] **Portal Achievements** - Track exploration milestones

---

## 📝 Implementation Notes

### Development Tips
1. Start with Phase 1A for immediate visual feedback
2. Test each phase thoroughly before moving to next
3. Use git commits after each major task completion
4. Monitor bundle size impact
5. Profile performance with React DevTools

### Code Style
- Follow existing TypeScript patterns
- Use Zod schemas for validation
- Maintain consistent naming conventions
- Add JSDoc comments for complex functions
- Keep components focused and composable

### Git Workflow
- Branch naming: `feature/portal-traversal-phaseX`
- Commit messages: Conventional commits format
- PR after each phase completion
- Tag releases: `v1.x-portal-enhancement`

---

**Last Updated:** 2025-11-02
**Status:** Ready for Implementation
**Next Action:** Begin Phase 1A - Portal Progress Tracking
