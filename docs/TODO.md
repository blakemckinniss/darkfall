# Portal Traversal Enhancement TODO

**Vision:** Incorporate Path of Adventure (POA) mechanics to enhance portal traversal with progress tracking, strategic choices, portal-scoped buffs, and exclusive artifacts.

**Total Estimated Time:** 8.5 hours
**Expert Validation:** ✅ Complete (Opus 4)
**Confidence Level:** 95%
**Status:** ✅ Phase 1A & 1B COMPLETE (Integration Done) | Testing Pending | Phases 2-3 Not Started
**Last Updated:** 2025-11-02 22:00
**Commits:**
- fe88570 - "feat: Implement portal traversal enhancements (Phase 1A & 1B)"
- 85fdb4e - "feat: Complete Phase 1B integration - AI treasure choices for portal traversal"
- 3d6032e - "feat: Add Portal Tools developer tab for easy map item generation"

---

## 📖 Start Here (For Fresh Sessions)

### 🎯 Current Priority: TESTING Phase 1A & 1B

**What's Been Done:**
- ✅ Phase 1A: Portal progress tracking UI (Room X/Y counter + progress bar)
- ✅ Phase 1B: AI treasure choices fully integrated with portal traversal
- ✅ Portal Tools developer tab for easy testing

**What Needs Testing (URGENT):**
- ❌ Portal progress display updates during traversal (NOT manually verified)
- ❌ AI-generated encounters with treasure choices in portals (NOT tested in gameplay)
- ❌ Portal theme influences AI encounter generation (dragons in Dragon's Lair, etc.)
- ❌ Treasure choice balance across rarities (needs gameplay feedback)

**How to Test (Use Portal Tools Tab):**
1. Open game → Developer tab → Portal Tools (🗺️ icon)
2. Click any map button to add it to inventory (try "Mystical Map" for legendary difficulty)
3. Switch to Portal tab → Click map → "Open Map"
4. Enter portal → Verify AI encounters with themed content and treasure choices
5. Play through multiple rooms → Check progress bar updates
6. Test different portal rarities (common → legendary)

---

### Essential Context

**What are Portals?**
- Portals are temporary dungeon locations created by consuming "Map Items" from inventory
- Each portal has 3-15 rooms (based on rarity) and a stability percentage (100% → 0%)
- Stability decreases with each room completed (percentage-based decay)
- Portals collapse when stability hits 0% OR when all rooms are explored
- Players navigate room-by-room through AI-generated encounters (combat, treasure, mystery, hazard, rest)
- **NEW:** All portal encounters now use `/api/generate-narrative` with portal context (theme, rarity, risk level)

**What is Path of Adventure (POA)?**
- POA is a web-based text RPG used as inspiration for portal enhancement mechanics
- Source: `docs/inspiration.md` (HTML dump of POA gameplay)
- Key mechanics analyzed: progress tracking, weapon conditions, artifacts, cursed items, choice groups, temporary effects
- 4 of these mechanics were selected as best fit for portal traversal enhancement

**Current Portal System Architecture:**
- Schemas: `lib/entities/schemas.ts` (MapItem, Location, portalMetadata, portalData) ✅ EXISTS
- Canonical maps: `lib/entities/canonical/maps.ts` (6 themed maps with metadata) ✅ EXISTS
- AI generation: `app/api/generate-narrative/route.ts` (accepts portalContext parameter) ✅ UPDATED
- Game logic: `components/dungeon-crawler.tsx` (generateAINarrative helper, handleChoice, handleTreasureChoice) ✅ UPDATED
- Developer tools: Portal Tools tab in developer panel ✅ NEW
- State: Tracked in openLocations array, persisted to localStorage

### Required Reading (Before Starting)

**📚 ADR-013** - `docs/ADR.md` (lines 528-703)
- Complete architectural decision for portal traversal enhancement
- Explains why these 4 mechanics were chosen (validated against Hades, Slay the Spire, Dead Cells)
- Documents critical fixes (stability decay edge case, room count variance)
- Trade-off analysis and consequences
- Expert validation notes

**📋 NOTES.md** - `docs/NOTES.md`
- Contains critical items (🔴/⭐ 76-100) that may need attention
- Portal traversal next steps logged at bottom
- Check before starting to ensure no blocking issues

**🎨 Inspiration Source** - `docs/inspiration.md`
- HTML dump of Path of Adventure gameplay
- Shows weapon conditions ("brand new"), artifact markers (crown icon), progress tracking (2/50)
- Reference for UI/UX patterns when implementing choices and progress indicators

---

## 🎯 The 4 Chosen Mechanics (POA-Inspired)

From POA analysis (10 mechanics evaluated), these 4 were selected:

1. **Portal Progress Tracking** ✅ COMPLETE - "Room 3/8" counter with visual progress bar (from POA's "2/50" path progress)
2. **Multi-Choice Treasure Events** ✅ COMPLETE (needs testing) - Select 1 of 2-3 treasure options (from POA's "Take Pitchfork OR Straw Shield")
3. **Portal-Scoped Consumables** 🔴 NOT STARTED - Temporary buffs active only in current portal (from POA's "end of day" effects)
4. **Portal-Exclusive Artifacts** 🔴 NOT STARTED - Rare items from specific portal themes (from POA's crown-marked artifacts)

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
**Files Modified:** `components/dungeon-crawler.tsx:1743-1772` (approx, may have shifted with new code)

**Completed:**
- [x] Portal progress display component (`Room X/Y` counter)
- [x] Visual progress bar with cyan theme
- [x] Bonus room indicator (`X/Y (bonus)`)
- [x] Positioned below stability bar
- [x] Updates on each room completion

**Testing Required (NEXT SESSION):**
- [ ] **CRITICAL:** Test progress display updates correctly during portal traversal
- [ ] Verify progress bar animation is smooth
- [ ] Test edge case: bonus rooms exceeding expected count
- [ ] Verify UI renders correctly on different screen sizes

---

### ✅ Phase 1B: Multi-Choice Treasure Events - COMPLETE (Integration Done)

**Status:** ✅ FULLY INTEGRATED in commits fe88570 + 85fdb4e
**Files Modified:**
- `lib/game-engine.ts` - TreasureChoice interface
- `app/api/generate-narrative/route.ts` - AI prompt + portal context + transformation
- `components/dungeon-crawler.tsx` - generateAINarrative helper, UI, handlers

**What Changed in Session 2025-11-02:**
- ✅ API route now accepts `portalContext` parameter (theme, rarity, riskLevel, currentRoom, expectedRooms, stability)
- ✅ AI system prompt adapts to portal theme (Dragon's Lair → dragon encounters, Crystal Caverns → crystal encounters)
- ✅ Created `generateAINarrative()` helper function for centralized AI generation
- ✅ Replaced ALL `generateEvent` calls with AI generation:
  * handleChoice (after player choice)
  * handleTreasureChoice (after treasure selection)
  * handleEnterLocation (initial portal entry)
  * handleEnterVoid (void entry)
- ✅ Portal metadata passed to AI for contextual encounters
- ✅ Fallback to static events if AI fails
- ✅ TypeScript strict mode compliance maintained

**Completed Implementation:**
- [x] Schema Extension - TreasureChoice interface added to game-engine.ts
- [x] AI Prompt Enhancement - 30% treasure event rate with balance rules
- [x] Treasure choice transformation logic (AI JSON → game format)
- [x] UI Component - Grid-based treasure choice cards
- [x] handleTreasureChoice function (item/gold/health rewards)
- [x] TypeScript fixes for global animation functions
- [x] Portal context integration (theme-based encounters)
- [x] All event generation points use AI (void + portals)

**Testing Required (NEXT SESSION - HIGH PRIORITY):**
- [ ] **CRITICAL:** Test AI-generated treasure choices appear in portal runs
- [ ] **CRITICAL:** Verify portal theme influences encounters (dragons in Dragon's Lair, crystals in Crystal Caverns)
- [ ] Validate treasure choice balance (equal value across options)
- [ ] Test across all 6 portal types (Catacombs, Library, Caverns, Lair, Mine, Temple)
- [ ] Test across all rarities (common → legendary)
- [ ] Verify AI fallback works if API fails
- [ ] Tune AI prompt based on gameplay feedback

**Known Issues (Session 2025-11-02):**
- ⚠️ NOT MANUALLY TESTED - integration complete but gameplay not verified
- ⚠️ AI treasure balance unvalidated in real gameplay
- ⚠️ Portal theme influence not confirmed (code complete, needs testing)

---

### 🛠️ Developer Tools: Portal Tools Tab - COMPLETE

**Status:** ✅ Implemented in commit 3d6032e
**Files Modified:** `components/dungeon-crawler.tsx`

**Features:**
- ✅ New "Portal Tools" tab in developer panel (🗺️ icon)
- ✅ Grid display of all 6 canonical maps
- ✅ One-click map generation (unique IDs, full portal metadata)
- ✅ Rich map cards showing: name, location, rarity, rooms, risk level, theme
- ✅ Testing guide with step-by-step instructions
- ✅ Debug log integration

**Available Maps:**
1. Crumbling Map → Forgotten Catacombs (common, 4 rooms, low risk)
2. Torn Map → Abandoned Mine (common, 3 rooms, low risk)
3. Weathered Map → Ancient Library (uncommon, 6 rooms, medium risk)
4. Ancient Map → Sunken Temple (uncommon, 5 rooms, medium risk)
5. Enchanted Map → Crystal Caverns (rare, 8 rooms, high risk)
6. Mystical Map → Dragon's Lair (legendary, 13 rooms, extreme risk)

**Usage:**
1. Developer tab → Portal Tools (4th tab)
2. Click any map button
3. Map added to inventory with unique ID
4. Switch to Portal tab → Open map → Test

---

### 🔧 Critical Fixes Completed

**Status:** ✅ Complete in commit fe88570

**Fix 1: Stability Decay Edge Case** - FIXED
- File: `components/dungeon-crawler.tsx` (handleChoice function)
- Added `Math.max(1, ...)` to prevent infinite low-stability loops
- [x] Ensures minimum 1-point decay per room

**Fix 2: Room Count Variance** - Already Fixed
- Investigation showed this was already implemented correctly
- Room count variance calculated once and stored in `portalData`

**Fix 3: TypeScript Strict Compliance** - FIXED
- Optional chaining for treasure choices (`entry.treasureChoices?.indexOf()`)
- Null checks for activeLocation (`activeLocation || "void"`)
- Type safety for map item generation (portalMetadata null check)

**Fix 4: Linting Errors** - FIXED
- Removed array index keys from treasure choice rendering
- Used composite keys: `treasure-choice-${entry.id}-${type}-${description}`

---

## 🚀 Next Session Priority: TESTING & VALIDATION

### URGENT: Manual Testing (Est: 1-2 hours)

**Goal:** Validate Phase 1A & 1B implementation in actual gameplay

**Testing Checklist:**

#### Phase 1A Testing (Portal Progress Tracking)
- [ ] Open a portal (use Portal Tools tab)
- [ ] Enter portal and verify progress bar appears
- [ ] Complete a room and verify counter updates (e.g., Room 1/8 → Room 2/8)
- [ ] Verify progress bar fills proportionally
- [ ] Test bonus rooms (play until rooms exceed expected count)
- [ ] Check "Room X/Y (bonus)" indicator appears
- [ ] Test on different screen sizes (desktop, mobile view)
- [ ] Verify UI doesn't break with long location names

#### Phase 1B Testing (AI Treasure Choices)
- [ ] Enter a portal and play through multiple rooms
- [ ] **CRITICAL:** Verify AI-generated encounters appear (not static generateEvent)
- [ ] **CRITICAL:** Verify treasure choice events appear (~30% of encounters)
- [ ] Click each treasure choice type (item, gold, health) and verify rewards work
- [ ] Test treasure choice UI on mobile view
- [ ] Verify treasure choices disappear after selection

#### Portal Theme Testing
- [ ] Test Dragon's Lair (legendary) - expect dragon-themed encounters
- [ ] Test Crystal Caverns (rare) - expect crystal/elemental encounters
- [ ] Test Ancient Library (uncommon) - expect knowledge/guardian encounters
- [ ] Test Forgotten Catacombs (common) - expect undead encounters
- [ ] Test Abandoned Mine (common) - expect mining/creature encounters
- [ ] Test Sunken Temple (uncommon) - expect water/ancient encounters

#### Balance Testing
- [ ] Play through 3+ portals and note treasure choices
- [ ] Verify choices feel roughly equal value
- [ ] Check if legendary portals have better treasure than common
- [ ] Note any obviously overpowered or underpowered choices
- [ ] Document feedback for AI prompt tuning

#### Fallback Testing
- [ ] Disable network and verify static event fallback works
- [ ] Re-enable network and verify AI generation resumes

**After Testing:**
- [ ] Document bugs found in NOTES.md
- [ ] Document balance issues for AI prompt tuning
- [ ] Commit test results summary to TODO.md
- [ ] Update TODO.md with "TESTED" status

---

### Phase 2: Portal-Scoped Consumables 🟡 MEDIUM PRIORITY (3 hours)

**Priority:** MEDIUM - Adds strategic depth, requires careful state management
**Dependencies:** Phase 1A & 1B TESTED
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
**Dependencies:** Phase 1B & Phase 2 TESTED
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

## 📊 Complete Testing Checklist

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

### Portal Theme Validation
- [ ] Dragon's Lair generates dragon encounters
- [ ] Crystal Caverns generates crystal encounters
- [ ] Ancient Library generates knowledge encounters
- [ ] Forgotten Catacombs generates undead encounters
- [ ] Abandoned Mine generates mining encounters
- [ ] Sunken Temple generates water/ancient encounters

### Portal-Scoped Consumables (Phase 2)
- [ ] Consumable applies to active portal
- [ ] Buff shows in portal UI
- [ ] Buff cleared on portal exit
- [ ] Buff cleared on portal collapse
- [ ] Multiple portals handled correctly
- [ ] Buff persistence across reload

### Portal-Exclusive Artifacts (Phase 3)
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
- [x] Position: Top of encounter screen, below stability bar
- [x] Style: Consistent with existing portal UI
- [x] Font: Match current UI typography
- [x] Colors: Use theme colors (cyan for progress bar)
- [x] Animation: Smooth fill animation on progress
- [ ] UNTESTED: Responsive - works on mobile/tablet

### Multi-Choice Treasure Cards
- [x] Layout: Grid or horizontal row of 2-3 cards
- [x] Card style: Similar to POA choice buttons
- [x] Hover effect: Scale/glow on hover
- [x] Selection: Disable other cards after selection
- [ ] UNTESTED: Visual feedback - checkmark or highlight on selected
- [ ] UNTESTED: Accessibility - keyboard navigation support

### Portal Buffs Indicator (Phase 2)
- [ ] Position: Portal sidebar or top bar
- [ ] Show: Buff name, effect, portal name
- [ ] Icon: Visual indicator (sparkle/glow)
- [ ] Tooltip: Detailed buff description
- [ ] Removal: Smooth fade-out when cleared

### Artifact Collection UI (Phase 3)
- [ ] Display: Grid of artifact slots
- [ ] Obtained: Full color with details
- [ ] Missing: Grayed out with "???"
- [ ] Progress: "5/10 Artifacts Found"
- [ ] Highlight: Pulse effect on new acquisition

---

## 📖 Documentation Updates Required

### ADR.md
- [ ] Document portal traversal mechanics decision (Phase 1)
- [ ] Explain POA inspiration and adaptation
- [ ] Detail AI integration for portal encounters
- [ ] Document portal context system (theme, rarity, risk level)
- [ ] Detail portal-scoped consumable pattern (Phase 2)
- [ ] Document artifact uniqueness approach (Phase 3)
- [ ] Include trade-off analysis

### CLAUDE.md
- [ ] Add notes on portal state management
- [ ] Document Portal Tools developer tab usage
- [ ] Document new consumable scope types (Phase 2)
- [ ] Explain artifact tracking in localStorage (Phase 3)
- [ ] Note critical fixes from expert review

### NOTES.md
- [ ] Log testing results for Phase 1A & 1B
- [ ] Document portal theme AI prompt effectiveness
- [ ] Document treasure choice balance findings
- [ ] Log portal-scoped consumable state management (Phase 2)
- [ ] Document edge cases for multiple open portals (Phase 2)
- [ ] Note AI choice balance tuning needs
- [ ] Record artifact drop rate baseline (Phase 3, 10-30%)

---

## ⚠️ Known Risks & Mitigations

### 1. Portal State Complexity (🟡45) - Phase 2
**Risk:** Multiple open portals with scoped buffs creates complex state management
**Mitigation:**
- Use explicit PortalSession tracking
- Clear separation of portal-specific state
- Thorough testing of multi-portal scenarios

### 2. AI Choice Balance (🟡35) - Phase 1B
**Risk:** AI may generate unbalanced treasure choices
**Mitigation:**
- Structured prompts with value guidelines
- Fallback to simple treasure if imbalanced
- Manual review of AI output during testing
- Iterative prompt tuning

### 3. Artifact Drop Rates (🟢25) - Phase 3
**Risk:** Drop rates may feel too rare or too common
**Mitigation:**
- Start with generous rates (10-30%)
- Gather playtest feedback
- Implement rate adjustments dynamically
- Consider pity system for very rare items

### 4. Performance - AI Generation (🟢20) - Phase 1B
**Risk:** Multiple AI calls may slow portal opening
**Mitigation:**
- Cache portal skeletons (24 hours)
- Progressive room loading
- Optimize AI prompts for speed
- Monitor API usage
- Fallback to static events on failure

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

## 📝 Session Handoff Notes

### Session 2025-11-02 Summary

**Commits Created:**
- 85fdb4e - "feat: Complete Phase 1B integration - AI treasure choices for portal traversal"
- 3d6032e - "feat: Add Portal Tools developer tab for easy map item generation"

**Files Modified:**
- `app/api/generate-narrative/route.ts` - Portal context support
- `components/dungeon-crawler.tsx` - generateAINarrative helper, Portal Tools tab
- All portal event generation now uses AI (4 locations updated)

**What Works (Code Complete):**
- ✅ Portal progress tracking (Room X/Y display)
- ✅ AI narrative generation for all locations (void + portals)
- ✅ Portal context passed to AI (theme, rarity, risk level, progress, stability)
- ✅ Treasure choice UI and handlers
- ✅ Treasure choice rewards (item/gold/health)
- ✅ Portal Tools developer tab for map generation
- ✅ TypeScript strict mode compliance
- ✅ Linting clean

**What's Pending (Needs Testing):**
- ❌ Phase 1A & 1B NOT manually tested in gameplay
- ❌ Portal theme influence NOT verified (dragons in Dragon's Lair, etc.)
- ❌ Treasure choice balance NOT validated
- ❌ AI fallback NOT tested
- ❌ Mobile responsiveness NOT verified

**Next Session Priority:**
1. **URGENT:** Manual testing using Portal Tools tab
2. Play through multiple portals across all 6 types
3. Document test results
4. Tune AI prompts based on feedback
5. Mark phases as TESTED in TODO.md
6. Begin Phase 2 (Portal-Scoped Consumables) ONLY after testing complete

---

**Last Updated:** 2025-11-02 22:00
**Status:** Phase 1 Code Complete - Testing Required Before Phase 2
**Next Action:** Manual Testing Session (Use Portal Tools Tab)
