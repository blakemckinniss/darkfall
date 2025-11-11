# Architecture Decision Records (ADR)

This document captures key architectural decisions made during the development of the Blackfell dungeon crawler game. Each decision includes context, rationale, and implications.

---

## Project-Specific Information

### Overview

This is a fantasy dungeon crawler web game built with Next.js 16, React 19, and TypeScript. The game features AI-generated content including character portraits (via fal.ai) and items (via Groq AI), along with a turn-based exploration system where players navigate locations, encounter enemies, and collect loot.

### Development Commands

#### Build and Run
```bash
# Development server (default: http://localhost:3000)
pnpm dev

# Production build
pnpm build

# Start production server
pnpm start

# Lint codebase
pnpm lint
```

#### Environment Setup
Required environment variables:
- `FAL_KEY` - API key for fal.ai (portrait generation)
- `GROQ_API_KEY` - API key for Groq (item generation via AI SDK)

### Architecture Overview

#### Core Game Systems

**State Management** (`lib/game-state.ts`)
- Centralized game state persisted to localStorage
- Schema includes: playerStats, inventory, equippedItems, activeEffects, openLocations, activePortrait, generatedPortraits
- Functions: `loadGameState()`, `saveGameState()`, `clearGameState()`

**Game Engine** (`lib/game-engine.ts`)
- Event generation system with weighted probability
- Defines game entities: locations, enemies, treasures, consumables, mapItems
- Core function: `generateEvent()` creates random encounters based on current location
- Event system supports choices with outcomes (stat changes, items, unlocks)

**Main Game Component** (`components/dungeon-crawler.tsx`)
- Single large component managing game UI and interactions
- Handles drag-and-drop for inventory management
- Manages equipment system (weapon, armor, accessory slots)
- Integrates AI generation modals for portraits and items

#### AI Integration

**Portrait Generation** (`app/api/generate-portrait/route.ts`)
- Uses fal.ai's flux/schnell model
- POST endpoint accepting a text prompt
- Returns imageUrl for generated portrait
- Safety checker disabled to allow fantasy content

**Item Generation** (`app/api/generate-item/route.ts`)
- Uses Groq's mixtral-8x7b-32768 model via AI SDK
- POST endpoint accepting item description
- Returns structured JSON with item stats based on rarity tiers
- Rarity affects value and stat ranges (common: 5-20 value, legendary: 100-150)

#### UI Framework

- **shadcn/ui components** in `components/ui/` - Extensive component library built on Radix UI
- **Tailwind CSS 4** for styling with PostCSS
- **Path alias**: `@/*` maps to project root

#### Data Flow

1. Game state loaded from localStorage on mount
2. User actions trigger state updates (explore, equip, use item)
3. `generateEvent()` creates encounters with entity data and choices
4. Choices resolve to outcomes affecting player stats/inventory
5. AI APIs generate dynamic content on demand
6. State persisted back to localStorage after changes

### Game-Specific Slash Commands

Custom slash commands for game development workflows:
- `/game:*` - Game entity creation and testing commands
- `/game:new-entity [type] [name] [rarity]` - Create new game entities
- `/game:test-ai` - Test AI integration endpoints
- `/game:validate-state` - Validate game state schema

### Implementation Notes

- TypeScript build errors are ignored in production (`ignoreBuildErrors: true`) - see ADR-009
- Next.js image optimization is disabled (`unoptimized: true`) - see ADR-011
- Game uses client-side only state management (no server-side persistence) - see ADR-001
- Entity highlighting in event text uses special syntax parsed by `renderTextWithEntities()` - see ADR-010

---

## ADR-001: Client-Side Only State Management

**Date:** 2024
**Status:** Accepted

### Context
The game needed a state management solution for player progress, inventory, and game world state.

### Decision
Use client-side state management with localStorage persistence, with no server-side state or database.

### Rationale
- **Simplicity:** Single-page application with no backend complexity
- **Performance:** Instant state access without network latency
- **Cost:** Zero server/database hosting costs
- **Privacy:** Player data stays on their device
- **Offline:** Game works without internet connection

### Consequences
- **Positive:**
  - Fast development iteration
  - No authentication/authorization complexity
  - Zero operational costs
  - Instant save/load
- **Negative:**
  - No cross-device sync
  - State loss if localStorage cleared
  - No multiplayer capabilities
  - No server-side validation

### Implementation
See `lib/game-state.ts` for state schema and persistence functions.

---

## ADR-002: Single Large Component vs. Component Decomposition

**Date:** 2024
**Status:** Accepted (with technical debt)

### Context
The main game UI could be split into dozens of smaller components or kept as one large component.

### Decision
Maintain a single large component (`components/dungeon-crawler.tsx`) for the main game logic.

### Rationale
- **State Locality:** All game state in one place reduces prop drilling
- **Comprehension:** Easier to understand game flow in one file
- **Performance:** Fewer component boundaries, less re-rendering overhead
- **Rapid Development:** Faster iteration without managing component interfaces

### Consequences
- **Positive:**
  - Single source of truth for game state
  - No complex state management library needed
  - Easy to trace game logic flow
- **Negative:**
  - Large file size (technical debt)
  - Harder to test individual features in isolation
  - Risk of merge conflicts in team settings
  - Violates typical React best practices

### Future Considerations
If the component exceeds ~2000 lines or team size grows, consider decomposing into:
- Layout components (header, sidebar, main area)
- Feature components (inventory, equipment, events)
- Shared UI components (modals, cards, buttons)

---

## ADR-003: AI Integration via External APIs

**Date:** 2024
**Status:** Accepted

### Context
The game needed AI-generated content for character portraits and procedural item generation.

### Decision
Use external AI APIs:
- **fal.ai** (flux/schnell) for character portrait generation
- **Groq AI** (mixtral-8x7b-32768 via Vercel AI SDK) for item generation

### Rationale
- **Quality:** State-of-the-art models for image/text generation
- **Cost:** Pay-per-use vs. self-hosting GPUs
- **Maintenance:** No model management or infrastructure
- **Speed:** Optimized inference endpoints
- **Flexibility:** Easy to swap providers or models

### Consequences
- **Positive:**
  - High-quality AI content without infrastructure
  - Fast generation times
  - Predictable costs per request
- **Negative:**
  - Dependency on external services
  - API keys required in environment
  - Rate limiting concerns
  - Network latency
  - Potential service downtime

### Implementation
- Portrait API: `app/api/generate-portrait/route.ts`
- Item API: `app/api/generate-item/route.ts`
- Environment variables: `FAL_KEY`, `GROQ_API_KEY`

---

## ADR-004: Strict TypeScript Configuration

**Date:** 2024
**Status:** Accepted

### Context
TypeScript's default settings allow many runtime errors to slip through.

### Decision
Enable all strict type-checking options in `tsconfig.json`:
```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noFallthroughCasesInSwitch": true,
  "exactOptionalPropertyTypes": true
}
```

### Rationale
- **Safety:** Catch errors at compile-time, not runtime
- **Refactoring:** Safer code changes with compiler guarantees
- **Documentation:** Types serve as inline documentation
- **IDE Support:** Better autocomplete and error detection
- **Team Alignment:** Enforced consistency across contributors

### Consequences
- **Positive:**
  - Dramatically fewer runtime errors
  - Improved code quality and maintainability
  - Better developer experience with IDE hints
- **Negative:**
  - Steeper learning curve for contributors
  - More verbose code (explicit undefined checks)
  - Slower initial development
  - Some library types may conflict

### Guidelines
- Array access always returns `T | undefined` - check before use
- Remove unused variables/parameters (no underscore prefix)
- Optional props: use conditional spreading for `undefined` values
- Recursive fallback patterns are acceptable for array access

---

## ADR-005: Event-Driven Game Engine with Weighted Probabilities

**Date:** 2024
**Status:** Accepted

### Context
The game needed a system for generating varied encounters as players explore.

### Decision
Implement an event generation system with:
- Weighted probability pools for event types
- Entity definitions (enemies, treasures, consumables, locations)
- Choice-based outcomes affecting player state

### Rationale
- **Variety:** Random encounters keep gameplay fresh
- **Balance:** Weighted probabilities control difficulty curve
- **Extensibility:** Easy to add new entities and event types
- **Player Agency:** Choices create meaningful decisions
- **Simplicity:** No complex AI or pathfinding needed

### Consequences
- **Positive:**
  - Infinite replayability through randomization
  - Easy to balance by adjusting weights
  - Simple to add new content
- **Negative:**
  - Can feel repetitive with limited entity pool
  - No persistent world or exploration memory
  - Difficulty scaling requires manual weight tuning

### Implementation
See `lib/game-engine.ts` for event generation and entity definitions.

---

## ADR-006: Tailwind CSS 4 + shadcn/ui Component Library

**Date:** 2024
**Status:** Accepted

### Context
The game needed a styling solution and component library for rapid UI development.

### Decision
Use Tailwind CSS 4 (PostCSS) with shadcn/ui components built on Radix UI.

### Rationale
- **Utility-First:** Rapid styling without leaving JSX
- **Consistency:** Design tokens enforce visual coherence
- **Accessibility:** Radix UI primitives are WCAG compliant
- **Customization:** Full control over component source code
- **Bundle Size:** Only includes used utilities
- **DX:** Excellent autocomplete and IDE support

### Consequences
- **Positive:**
  - Fast UI development
  - Consistent design system
  - Accessible by default
  - No CSS file sprawl
- **Negative:**
  - HTML verbosity with long className strings
  - Learning curve for Tailwind conventions
  - Migration difficulty if switching frameworks

### Implementation
- Tailwind config: `tailwind.config.ts`
- Component library: `components/ui/*`
- Global styles: `app/globals.css`

---

## ADR-007: No Server-Side Rendering (SSR)

**Date:** 2024
**Status:** Accepted

### Context
Next.js supports SSR, but the game is entirely client-side interactive.

### Decision
Build as a client-side only application with minimal SSR.

### Rationale
- **Game Nature:** No SEO requirements, full interactivity needed immediately
- **State:** Game state is client-side only (localStorage)
- **Performance:** No server round-trips during gameplay
- **Simplicity:** Fewer deployment concerns, simpler architecture
- **Hydration:** Avoid SSR hydration mismatches with dynamic state

### Consequences
- **Positive:**
  - No hydration bugs
  - Simpler deployment (static hosting possible)
  - Faster development (no server/client sync concerns)
- **Negative:**
  - Larger initial bundle size
  - Slower first paint
  - No SEO benefits (not needed for game)

---

## ADR-008: Drag-and-Drop Inventory Management

**Date:** 2024
**Status:** Accepted

### Context
Players needed an intuitive way to manage inventory and equipment.

### Decision
Implement drag-and-drop using HTML5 Drag and Drop API:
- Drag items from inventory to equipment slots
- Drag equipped items back to inventory
- Visual feedback during drag operations

### Rationale
- **UX:** Natural interaction pattern familiar to players
- **Visual:** Clear affordances for what can go where
- **Mobile:** Touch events can be added later
- **No Dependencies:** Built-in browser API

### Consequences
- **Positive:**
  - Intuitive item management
  - Satisfying player interaction
  - No additional bundle size
- **Negative:**
  - Accessibility concerns (keyboard navigation needed)
  - Mobile support requires touch event polyfill
  - Browser inconsistencies in drag/drop behavior

---

## ADR-009: No Build Error Enforcement in Production

**Date:** 2024
**Status:** Accepted (with technical debt)

### Context
TypeScript build errors could block production deployments.

### Decision
Set `ignoreBuildErrors: true` in `next.config.ts` for production builds.

### Rationale
- **Development Velocity:** Allows deployment of features with non-critical type issues
- **Iteration Speed:** Unblocks releases during rapid development
- **Progressive Enhancement:** Type safety improved over time

### Consequences
- **Positive:**
  - Never blocked on type errors during deployment
  - Can ship features faster
- **Negative:**
  - Runtime errors possible from ignored type issues
  - Technical debt accumulation
  - False sense of safety

### Mitigation
- Local development enforces strict types
- CI/CD should warn on type errors (not fail)
- Regular type error cleanup sessions

**Status:** This is technical debt and should be removed once type coverage is comprehensive.

---

## ADR-010: Entity Highlighting in Event Text

**Date:** 2024
**Status:** Accepted

### Context
Event descriptions reference game entities (enemies, items, locations) that should be visually distinct.

### Decision
Use special syntax in event text that gets parsed and rendered with styled spans:
- Enemies: `[Enemy Name]`
- Items: `{Item Name}`
- Locations: `<Location Name>`

### Rationale
- **Visual Clarity:** Players instantly recognize interactive elements
- **Theming:** Different entity types get distinct colors
- **Simplicity:** No complex markdown parser needed
- **Flexibility:** Easy to add new entity types

### Consequences
- **Positive:**
  - Enhanced readability
  - Clear visual hierarchy
  - Easy to implement
- **Negative:**
  - Manual text formatting required
  - Parser fragility with edge cases
  - Requires consistent authoring

### Implementation
See `renderTextWithEntities()` in `components/dungeon-crawler.tsx`.

---

## ADR-011: No Image Optimization

**Date:** 2024
**Status:** Accepted

### Context
Next.js provides automatic image optimization via next/image.

### Decision
Disable Next.js image optimization (`unoptimized: true`).

### Rationale
- **AI Images:** Portraits are dynamically generated, not static assets
- **Caching:** No benefit for one-time generated images
- **Complexity:** Simpler to use standard `<img>` tags
- **Performance:** Portraits are small and infrequent

### Consequences
- **Positive:**
  - Simpler image handling
  - No optimization overhead for dynamic content
  - Faster builds
- **Negative:**
  - No automatic WebP conversion
  - No responsive image sizes
  - Larger network transfers (if used with static images)

---

## ADR-012: Custom Slash Commands for Claude Code

**Date:** 2024
**Status:** Accepted

### Context
Repetitive development workflows benefit from automation.

### Decision
Create custom slash commands in `.claude/commands/` for:
- Game entity creation (`/game:*`)
- Code quality audits (`/audit:*`)
- Maintenance tasks (`/maintenance:*`)
- Universal task execution (`/do`)

### Rationale
- **Efficiency:** Single command vs. multi-step manual process
- **Consistency:** Standardized workflows across team
- **Documentation:** Commands serve as runnable documentation
- **Discoverability:** Easy to find available workflows

### Consequences
- **Positive:**
  - Faster development iteration
  - Reduced cognitive load
  - Self-documenting processes
- **Negative:**
  - Maintenance overhead for commands
  - Learning curve for new contributors
  - Potential for outdated commands

### Implementation
See `.claude/commands/README.md` for full command documentation.

---

## ADR-013: Portal Traversal Enhancement with POA-Inspired Mechanics

**Date:** 2025-11-02
**Status:** Accepted

### Context
Portal traversal (map items → temporary locations with multiple rooms) lacked depth and player engagement. Players needed:
- Better sense of progression through portals
- More strategic decision points during traversal
- Meaningful goals beyond simple room completion
- Enhanced risk/reward dynamics specific to portals

Path of Adventure (POA) game mechanics were analyzed as inspiration for enhancing the portal experience.

### Decision
Incorporate 4 POA-inspired mechanics specifically designed to enhance portal traversal:

1. **Portal Progress Tracking** - Visual "Room X/Y" counter with progress bar
2. **Multi-Choice Treasure Events** - Player selects 1 of 2-3 treasure options
3. **Portal-Scoped Consumables** - Temporary buffs active only in current portal
4. **Portal-Exclusive Artifacts** - Rare items obtainable only from specific portal themes

### Rationale

**Why These 4 Mechanics:**
- Validated against roguelike best practices (Hades, Slay the Spire, Dead Cells)
- Each directly enhances the **traversal experience** (not general game systems)
- Fits the temporary/high-stakes nature of portals
- Integrates cleanly with existing portal architecture
- Provides incremental implementation path (8.5 hours total)

**Why Portal-Specific:**
- Portals are ephemeral (collapse after X rooms or 0% stability)
- Players can't return to collapsed portals
- Risk escalates as stability decreases
- Theme consistency across portal rooms
- Distinct from permanent "The Void" location

**Why Not Other POA Mechanics:**
- Weapon condition system: Too punishing for portal-only degradation
- Cursed items: Interesting but needs careful balancing (lower priority)
- Enchanted weapons: Already covered by existing stat system
- Limited slots: Already implemented via inventory management

### Architecture Impact

**Schema Extensions:**
```typescript
// Consumable scope for portal-scoped buffs
consumableEffect: {
  scope: "global" | "portal" | "encounter" // NEW
  portalRestriction?: string // Portal theme/ID
}

// Portal-exclusive artifact tracking
portalExclusive: {
  requiredPortalTheme?: string
  requiredRarity?: Rarity
  dropChance: number (0-1)
  globallyUnique: boolean
}
```

**New State Management:**
- `PortalSession` tracking for multi-portal buff management
- Global artifact collection in localStorage
- Room progress counter in `portalData.currentRoomCount`

**AI Generation Changes:**
- Multi-choice treasure prompts require structured JSON output
- Choice options must be balanced (similar value)
- Fallback to simple treasure if AI generation fails

### Critical Fixes (Expert-Identified)

**1. Stability Decay Edge Case:**
```typescript
// BEFORE (broken): At low stability, decay rounds to 0
const decay = Math.floor(stability * (decayRate / 100));

// AFTER (fixed): Ensures minimum 1-point decay
const decay = Math.max(1, Math.floor(stability * (decayRate / 100)));
```

**2. Room Count Variance Consistency:**
```typescript
// BEFORE (inconsistent): Recalculates on every access
const roomCount = baseRooms + Math.floor(Math.random() * 3) - 1;

// AFTER (consistent): Determine once at portal creation
portalData.actualRoomCount = portalData.baseRoomCount + variance;
```

### Consequences

**Positive:**
- **Progress Tracking:** Reduces player anxiety, improves UX (30 mins implementation)
- **Multi-Choice:** Player agency >>> RNG, increases strategic depth (2 hours)
- **Portal Buffs:** Pre-portal strategic decisions, portal-specific economy (3 hours)
- **Exclusive Artifacts:** Aspirational goals, replayability driver (3 hours + content)
- All mechanics enhance portal-specific gameplay
- Incremental delivery - each phase provides standalone value
- No breaking changes to existing portal system

**Negative:**
- **State Complexity (🟡45):** Multiple open portals with scoped buffs needs careful management
- **AI Balance (🟡35):** Multi-choice treasures require prompt tuning for fair options
- **Drop Rate Tuning (🟢25):** Exclusive artifacts need playtesting (10-30% baseline)
- **Maintenance:** Portal-exclusive artifacts require content creation (5-10 items per portal theme)

**Trade-Offs:**
- Portal-scoped consumables add complexity but provide meaningful strategic depth
- Multi-choice treasure generation has AI reliability risk but fallback mitigates
- Exclusive artifacts require ongoing content creation but drive long-term engagement
- Progress tracking has zero downside (pure UX improvement)

### Implementation

**Phased Roadmap:**
1. **Phase 1A (30 mins):** Portal progress UI - Immediate UX win
2. **Phase 1B (2 hours):** Multi-choice treasures - High gameplay impact
3. **Phase 2 (3 hours):** Portal-scoped consumables - Strategic depth
4. **Phase 3 (3 hours):** Portal-exclusive artifacts - Replayability

**Key Files:**
- `components/dungeon-crawler.tsx` - UI, progress display, choice handling
- `lib/entities/schemas.ts` - Schema extensions for consumables and artifacts
- `lib/game-engine.ts` - Portal session tracking, buff management
- `app/api/generate-narrative/route.ts` - Multi-choice treasure prompts
- `lib/entities/canonical/consumables.ts` - Portal-scoped consumables
- `lib/entities/canonical/treasures.ts` - Exclusive artifacts

**Detailed Task Breakdown:**
See `/docs/TODO.md` for comprehensive implementation checklist with:
- Specific tasks for each phase
- Acceptance criteria
- Testing requirements
- UI/UX specifications
- Risk mitigations

### Validation

**Expert Review (Opus 4):**
- ✅ Architecture is production-ready
- ✅ Incremental delivery approach validated
- ✅ POA mechanics integration well-scoped
- ✅ Critical fixes identified (stability decay, room count)
- ✅ Trade-offs clearly documented

**Web Research:**
- ✅ Roguelike patterns validated (Hades, Slay the Spire, Dead Cells)
- ✅ Progress tracking universal in successful roguelikes
- ✅ Run-scoped power creates meaningful decision points
- ✅ Multiple reward choices increase player agency
- ✅ Exclusive incentives drive exploration

### Future Considerations

**Optional Enhancements (Not in Current Scope):**
- Portal modifiers (cursed/blessed portals with trade-offs)
- Portal chains (completing one unlocks related portal)
- Dynamic difficulty adjustment based on player performance
- Portal challenges (optional objectives for bonus rewards)
- Portal crafting (combine map fragments for custom portals)

**Performance Optimizations:**
- AI generation caching (24-hour cache for portal skeletons)
- Progressive room loading (generate on-demand vs. upfront)
- localStorage cleanup for completed portals

**Balance Tuning Needed:**
- Portal-scoped consumable effectiveness
- Multi-choice treasure value parity
- Exclusive artifact drop rates
- Portal-specific economy pricing

---

## ADR-014: Portal-Scoped State Management & Buff Lifecycle

**Status:** ✅ Accepted (Validated by Zen MCP Opus 4 - 92% Confidence)
**Date:** 2025-11-02
**Context:** Phase 2 & 3 Implementation (Portal-Scoped Consumables + Portal-Exclusive Artifacts)
**Related:** ADR-013 (Portal Traversal Enhancement)

### Problem Statement

Phase 2 requires portal-scoped consumables (temporary buffs active only within specific portal instances), and Phase 3 requires portal-exclusive artifacts (rare themed items that only drop in specific portal types). The architecture must support:

1. **Portal Session Tracking** - Track which buffs are active in which portals
2. **Multiple Portal Edge Case** - Handle scenario where player has multiple portals open simultaneously
3. **Buff Lifecycle Management** - Apply buffs on consumable use, clear on portal collapse
4. **Persistence Strategy** - Buffs should persist across page reload (roguelike continuity)
5. **Artifact Uniqueness** - Track obtained artifacts globally to prevent duplicates
6. **Drop Logic Integration** - Where to check for artifact drops without disrupting gameplay

### Architectural Analysis (Zen MCP)

Comprehensive analysis performed using Zen MCP (anthropic/claude-opus-4) with websearch enabled. Analysis examined:
- Current state management pattern (React hooks + localStorage)
- Component size and maintainability (3100 lines approaching threshold)
- Scalability characteristics (multiple portals, localStorage limits)
- Security posture (client-side state, localhost game)
- Complexity assessment (no overengineering, appropriately minimal)

**Key Findings:**
- ✅ Architecture can support Phase 2+3 without major refactoring
- ✅ Monolithic component pattern acceptable for solo developer scope
- ✅ Multiple portals already supported via `openLocations` array
- ✅ Schema extensions complete (scope, portalRestriction, PortalBuff, PortalSession)
- ⚠️ Component approaching 3500+ lines after implementation (monitor size)

### Decision: Portal Session State Pattern

**Chosen Approach:** `portalSessions: Record<locationId, PortalSession>`

**Implementation:**
```typescript
// State
const [portalSessions, setPortalSessions] = useState<Record<string, PortalSession>>({})

// PortalSession interface (lib/game-engine.ts)
interface PortalSession {
  locationId: string
  enteredAt: number
  activeBuffs: PortalBuff[]
  roomsVisited: number
}

// PortalBuff interface (lib/game-engine.ts)
interface PortalBuff {
  id: string
  name: string
  statChanges: Stats
  consumableId: string
  appliedAt: number
  rarity: Rarity
}
```

**Rationale:**
- **O(1) lookup** - Fast access to portal buffs by locationId
- **Clean separation** - Portal state separate from openLocations
- **Easy persistence** - Serialize Record<string, PortalSession> to localStorage
- **Simple cleanup** - Delete portalSessions[locationId] on collapse

**Alternatives Considered:**
1. **Embedded in Location.portalData** - Would couple buff state to location state, harder to manage lifecycle
2. **Separate array: PortalSession[]** - O(n) lookup, unnecessary overhead
3. **Global buff queue** - Ambiguous which portal gets buff, complex edge cases

### Decision: Multiple Portal Edge Case Handling

**Chosen Approach:** "Active Location" Pattern

When player uses portal-scoped consumable:
- Check if `activeLocation` exists and is not "void"
- Apply buff to `portalSessions[activeLocation]`
- Show error if used outside portal: "Portal-scoped consumables only work in portals!"

**Rationale:**
- **Clear semantics** - Buff applies to portal you're currently in
- **Player intent** - When in portal, player wants buff for that portal
- **No ambiguity** - activeLocation always defined when in portal
- **Simple implementation** - No need for buff queue or selection UI

**Alternatives Considered:**
1. **Next Entered Portal** - Complex state (pending buffs queue), unintuitive UX
2. **Ask User** - Adds friction, breaks flow, unnecessary for common case
3. **Most Recent Portal** - Ambiguous, could apply to wrong portal

### Decision: Buff Persistence Strategy

**Chosen Approach:** localStorage persistence with portal validation

**Implementation:**
```typescript
// GameState interface (lib/game-state.ts)
interface GameState {
  // ... existing fields
  portalSessions: Record<string, PortalSession>
}

// On load: validate portal IDs still exist
useEffect(() => {
  const savedState = loadGameState()
  if (savedState?.portalSessions) {
    // Remove sessions for portals that no longer exist
    const validSessions = Object.fromEntries(
      Object.entries(savedState.portalSessions)
        .filter(([locationId]) =>
          savedState.openLocations.some(loc => loc.id === locationId)
        )
    )
    setPortalSessions(validSessions)
  }
}, [])
```

**Rationale:**
- **Roguelike continuity** - Buffs persist across page reload
- **State recovery** - Player doesn't lose progress on refresh
- **Cleanup validation** - Remove stale sessions on load
- **Consistent with patterns** - Matches existing localStorage usage

**Trade-offs:**
- +Storage overhead (~50KB per portal session)
- +Validation logic on load
- -Risk of stale data (mitigated by validation)

### Decision: Buff Lifecycle Hooks

**Apply:** On consumable use in handleUseConsumable
**Clear:** On portal collapse in handleChoice

**Implementation:**
```typescript
// Apply (handleUseConsumable)
if (effect.scope === "portal") {
  if (!activeLocation || activeLocation === "void") {
    addLogEntry("Portal-scoped consumables only work in portals!")
    return
  }
  const buff: PortalBuff = {
    id: Math.random().toString(36).substr(2, 9),
    name: item.name,
    statChanges: effect.statChanges,
    consumableId: item.id,
    appliedAt: Date.now(),
    rarity: item.rarity,
  }
  setPortalSessions(prev => ({
    ...prev,
    [activeLocation]: {
      ...prev[activeLocation],
      activeBuffs: [...(prev[activeLocation]?.activeBuffs || []), buff],
    }
  }))
}

// Clear (handleChoice - on portal collapse)
if (roomLimitReached || stabilityDepleted) {
  setTimeout(() => {
    setOpenLocations(current => current.filter(l => l.id !== activeLocation))
    setPortalSessions(prev => {
      const next = {...prev}
      delete next[activeLocation!]
      return next
    })
    setActiveTab("portal")
    setActiveLocation(null)
  }, 1000)
}
```

**Rationale:**
- **Single responsibility** - Apply in consumable handler, clear in collapse logic
- **Atomic updates** - State changes happen together
- **No memory leaks** - Sessions deleted when portal closes
- **TypeScript safe** - Non-null assertion after validation

### Decision: Artifact Drop Integration

**Chosen Approach:** Integrate with handleTreasureChoice (treasure events)

**Implementation:**
```typescript
// In handleTreasureChoice after treasure selection
const currentLoc = openLocations.find(loc => loc.id === activeLocation)
if (currentLoc?.portalData) {
  const artifactChance = checkPortalExclusiveDrop(currentLoc, obtainedArtifacts)
  if (artifactChance) {
    // Add artifact to loot
    // Mark as obtained in global tracking
  }
}
```

**Rationale:**
- **Natural integration** - Treasure events already handle loot
- **Thematic fit** - Artifacts are special treasures
- **Minimal disruption** - No new event types needed
- **Player expectation** - Artifacts appear alongside treasure choices

**Alternatives Considered:**
1. **Every room** - Too frequent, diminishes rarity
2. **Final room only** - Too restrictive, punishes early collapse
3. **Separate artifact events** - Adds complexity, breaks flow

### Decision: UI Integration Points

**Portal Buffs:** Below portal progress bar (components/dungeon-crawler.tsx:1822+)
**Artifact Collection:** New developer tab "Artifacts" (matches existing pattern)

**Rationale:**
- **Contextual placement** - Buffs shown where portal info is
- **Consistent patterns** - Follows existing UI structure
- **No clutter** - Separate concerns (buffs in portal, collection in dev)
- **Easy to implement** - Extends existing layouts

### Consequences

**Positive:**
- Clear state management pattern (Record<locationId, Session>)
- No ambiguity in multiple portal scenarios
- Buff persistence improves roguelike experience
- Clean lifecycle management (apply/clear)
- Natural artifact integration with treasure system
- UI follows established patterns

**Negative:**
- Component size increases ~500 lines (3100 → 3600)
- localStorage overhead (~50KB per session)
- Additional validation logic on load
- Must monitor component size threshold

**Risks & Mitigations:**
- **Component size**: Monitor, extract custom hooks if exceeds 3500 lines
- **localStorage limit**: Validate sessions on load, cleanup on collapse
- **State corruption**: Robust validation, fallback to empty sessions
- **Multiple portals**: Clear semantics (activeLocation), documented edge cases

### Testing Strategy

**Playwright MCP Automated Testing:**
1. Use portal-scoped consumable → verify buff applies to current portal
2. Open multiple portals → verify buffs don't cross-contaminate
3. Portal collapse → verify buff cleared
4. Page reload → verify buff persists
5. Use consumable in Void → verify error message
6. Artifact drops → verify theme matching and uniqueness

**Manual Testing:**
- Balance portal-scoped consumable effectiveness
- Tune artifact drop rates (10-30% baseline)
- Validate UI responsiveness (mobile/tablet)

### References

- **Zen MCP Analysis:** 2025-11-02 (anthropic/claude-opus-4, 92% confidence)
- **Related ADR:** ADR-013 (Portal Traversal Enhancement)
- **Files Modified:** lib/game-engine.ts, lib/game-state.ts, components/dungeon-crawler.tsx
- **Commits:** a84f64b (schema extensions), 0c43549 (TypeScript fixes)

---

## Future ADRs to Consider

As the project evolves, document decisions for:
- Multiplayer/networking architecture (if implemented)
- Backend persistence layer (if added)
- Mobile responsiveness approach
- Testing strategy (unit/integration/e2e)
- Content management system for entities
- Analytics/telemetry implementation
- Monetization/pricing model
- Localization/i18n approach

---

## ADR-CC001: Confidence Calibration System for Claude Code Hooks

**Date:** 2025-11-11  
**Status:** Accepted  
**Context:** Claude Code hook system for self-calibrating confidence assessment  

### Context

Claude Code lacks a systematic way to assess and calibrate confidence in its responses. This leads to:
- Overconfidence in uncertain situations
- Underconfidence in well-understood tasks
- No feedback loop for improving accuracy over time
- Difficulty distinguishing between task complexity levels

**Problem:** How do we build a confidence calibration system that:
1. Accurately assesses task complexity and risk
2. Provides calibrated confidence scores (not just gut feelings)
3. Learns from outcomes to improve over time
4. Integrates seamlessly into the hook system
5. Performs efficiently (<200ms target)

### Decision

Implement a **4-tier confidence calibration framework** based on:
- Task classification (atomic/routine/complex/risky/open_world)
- Multi-axis risk assessment (novelty, externality, blast radius, reversibility, exposure)
- Bayesian calibration with historical outcomes
- Safety tripwires and verification budgets
- Zen MCP integration for conflict detection

### Mathematical Framework

#### 1. Task Classification

**Classes:**
- **Atomic** (p≥0.85): Single-file edits, simple fixes, <5 actions
- **Routine** (p≥0.75): Multi-file changes, standard patterns, 5-10 actions
- **Complex** (p≥0.70): Architecture changes, new patterns, 10-15 actions
- **Risky** (p≥0.70): Production impact, irreversible, requires dry-run
- **Open World** (p≥0.65): External research, novel solutions, 15+ actions

**Classification Logic:**
```python
if blast_radius < 0.1 and actions <= 5:
    return "atomic"
elif risk_score > 0.6 or reversibility < 0.5:
    return "risky"
elif externality > 0.7 or novelty > 0.7:
    return "open_world"
elif complexity_score > 0.6:
    return "complex"
else:
    return "routine"
```

#### 2. Confidence Model

**Raw Confidence (p_raw):**
```python
logit = (
    spec_completeness * 2.0 +
    context_grounding * 1.5 +
    tooling_path * 1.0 +
    empirical_verification * 2.5 +
    source_diversity * 0.8 +
    time_relevance * 0.5 +
    reproducibility * 1.2 -
    assumption_risk * 1.5 -
    contradiction_risk * 2.0 -
    novelty_penalty * 1.0
)
p_raw = 1 / (1 + exp(-logit))
```

**Calibrated Confidence (p_correct_mean):**
- **Platt Scaling** (if samples ≥ 30): `p_cal = 1 / (1 + exp(-(A*p_raw + B)))`
- **Isotonic Regression** (if samples ≥ 50): Non-parametric monotonic fit
- **Fallback**: Conservative discount: `p_cal = p_raw * 0.85`

**Conservative Lower Bound (p_correct_low):**
```python
# Beta distribution with Wilson score interval
successes, failures = get_bucket_history(bucket)
alpha, beta_param = successes + 1, failures + 1
p_correct_low = beta.ppf(0.05, alpha, beta_param)  # 5th percentile
```

#### 3. Impact Model

**Three-Axis Assessment:**
```python
impact = (
    (1 - reversibility) * 0.4 +  # How hard to undo?
    blast_radius * 0.4 +          # How much affected?
    exposure * 0.2                # Production vs dev?
)
```

**Expected Risk:**
```python
expected_risk = impact * (1 - p_correct_low)
```

#### 4. Gate Decisions

**Decision Thresholds:**
```python
if expected_risk < 0.05:
    gate = "proceed"
elif expected_risk < 0.15:
    gate = "caution"  # Suggest additional verification
elif expected_risk < 0.30:
    gate = "ask"      # Require user approval
else:
    gate = "stop"     # Block until risk mitigated
```

**Tripwire Overrides:**
- No empirical verification + risky task → Force "ask"
- Single source + open-world → Force "caution"
- Contradiction detected → Force "stop"
- Missing dry-run + irreversible → Force "stop"
- Budget exceeded → Force "ask"

### Architecture

#### Component Structure

```
.claude/hooks/
├── lib/                          # Core mathematical models
│   ├── task_classifier.py        # 5-class classification
│   ├── confidence_model.py       # Logistic regression
│   ├── impact_model.py           # Risk assessment
│   ├── beta_bounds.py            # Bayesian bounds
│   ├── calibration_engine.py     # Platt + Isotonic
│   ├── conflict_detector_zen.py  # Zen MCP integration
│   ├── nli_heuristics.py         # Fallback NLI
│   ├── tripwires.py              # Safety rules
│   ├── verification_budget.py    # Action/time limits
│   ├── action_gates.py           # Gate logic
│   └── rubric_schema.py          # JSON validation
├── confidence-classifier.sh      # UserPromptSubmit hook
├── confidence-auditor.py         # PostToolUse hook
├── synthetic-bootstrap.py        # 100-entry seed data
└── CONFIDENCE_SYSTEM.md          # Full documentation
```

#### Hook Integration

**UserPromptSubmit Hook** (`confidence-classifier.sh`):
1. Classifies task from user prompt keywords
2. Displays rubric requirements to Claude
3. Shows verification budget constraints
4. Lists mandatory checks (e.g., WebSearch for open-world)

**PostToolUse Hook** (`confidence-auditor.py`):
1. Extracts confidence rubric JSON from Claude's response
2. Calls conflict detector (Zen MCP or heuristic fallback)
3. Recalculates confidence with updated metrics
4. Loads historical data for calibration
5. Applies tripwires and budget constraints
6. Determines gate decision
7. Logs to `confidence_history.jsonl`
8. Returns audit guidance to Claude

#### Performance Optimizations

**Caching** (5-minute TTL):
```python
cache_key = sha256(canonical_evidence)
if cached := cache.get(cache_key):
    return cached
```

**Retry Logic** (3 attempts, exponential backoff):
```python
for attempt in range(3):
    try:
        return zen_mcp_call()
    except (ConnectionError, Timeout):
        time.sleep(0.1 * (2 ** attempt))
```

**Continuation ID Strategy** (task-scoped context):

**Critical Design Decision:**
- **Cache keys MUST include continuation_id** to prevent stale responses
- **Task-scoped > Session-wide** for predictability and reliability
- **Reset on topic change** to prevent context pollution

```python
# CORRECT: Cache key includes continuation_id
def _create_cache_key(self, evidence: List[Evidence]) -> str:
    evidence_hash = sha256(canonical_evidence).hexdigest()
    if self.continuation_id:
        return f"{evidence_hash}:{self.continuation_id}"  # Context-aware caching
    return evidence_hash

# Task-scoped lifecycle
detector = ConflictDetectorZen(
    working_directory=cwd,
    continuation_id=f"conflict-detection-{task_id}"  # One ID per logical task
)
```

**Why Task-Scoped Wins Over Session-Wide:**

| Aspect | Task-Scoped ✅ (Implemented) | Session-Wide ❌ (Avoided) |
|--------|------------------------------|---------------------------|
| **Context Relevance** | High - focused on specific task | Variable - cross-task pollution |
| **Predictability** | High - consistent behavior | Low - unpredictable model drift |
| **Debugging** | Easy - short relevant history | Very difficult - mixed operations |
| **Quality** | Reliable | Can degrade from early confusion |
| **Cost** | Low (short contexts) | High (growing context window) |
| **Latency** | Low (small payloads) | Higher (large payloads) |

**Logical Task Boundaries:**
- **Conflict Detection**: One continuation_id per evidence analysis session
- **Task Classification**: New ID per user prompt (no cross-contamination)
- **Calibration Tuning**: One ID per tuning iteration
- **Multi-Step Analysis**: Reuse ID for follow-ups/refinements within same goal

**Lifecycle Management:**
- Create new continuation_id when user starts distinct logical operation
- Reuse same ID for follow-ups, clarifications, related sub-tasks
- Reset to new ID when user clearly shifts to different logical task
- Optimal conversation length: 5-20 turns before considering reset
- Avoid session-wide IDs (risk of context drift and quality degradation)

**Performance & Cost Implications:**
- Longer conversations under single ID → larger payloads → higher costs
- Task-scoped IDs keep contexts short → faster inference, lower token usage
- Cache hit rate improves with task-scoped keys (more reuse within task)

**Critical Bug Prevention:**
- ❌ **WRONG**: Cache key without continuation_id → serves stale responses
- ✅ **CORRECT**: Cache key with continuation_id → context-aware results
- Example: Same evidence analyzed with different conversation context will correctly trigger new Zen MCP call instead of returning cached result from first analysis

### Zen MCP Integration

**Model Selection:**
- **gemini-2.5-pro**: Fast responses, research, conflict detection
- **claude-opus**: Coding tasks, instruction-intensive
- **gpt-5**: Planning, brainpower, systematic thinking

**Conflict Detection Prompt:**
```
System: Analyze evidence for contradictions. Return JSON only.
User: Evidence list with sources, timestamps, credibility
Response: {
  "conflicts_found": boolean,
  "conflicting_pairs": [
    {"evidence_ids": [1,2], "severity": "high|medium|low", ...}
  ]
}
```

**Fallback Strategy:**
1. Try Zen MCP (with cache check first)
2. On failure: NLI heuristics (keyword + pattern matching)
3. On total failure: assume no conflicts (conservative)

### Calibration Strategy

#### Synthetic Bootstrap (Week 1)
- 100 hand-crafted seed entries across all buckets
- Representative task distributions
- Balanced outcomes (60% success, 40% failure)
- Used for initial calibration curves

#### Pilot Testing (Week 4)
- 50-task real-world dataset
- Track outcomes manually or via success/failure markers
- Tune thresholds based on calibration error
- Aim for Brier score < 0.15

#### Continuous Improvement
- Log every rubric to `confidence_history.jsonl`
- Retrain calibration models weekly
- Adjust tripwire thresholds based on false positive rate
- Review gate effectiveness (% of "stop" that were actually risky)

### Verification Budgets

**Purpose:** Prevent unbounded work on uncertain tasks

**Budget Constraints per Task Class:**
| Class       | Max Actions | Max Time | Allowed Tools                    | Mandatory Checks |
|-------------|-------------|----------|----------------------------------|------------------|
| Atomic      | 5           | 30s      | Read, Grep, Glob                 | None             |
| Routine     | 10          | 120s     | +Bash, WebSearch                 | None             |
| Complex     | 15          | 300s     | +WebFetch                        | None             |
| Risky       | 20          | 600s     | All                              | dry_run + backup |
| Open World  | 15          | 300s     | All                              | WebSearch        |

**Enforcement:**
- Hard limits: Stop if exceeded (gate = "ask")
- Soft limits: Warning at 80% consumption
- Excuse field: Allow budget overrun with justification

### Tripwires

**Five Critical Safety Rules:**

1. **OPEN_WORLD_SINGLE_SOURCE**
   - Trigger: open_world task + source_count < 2
   - Action: Force "caution" gate
   - Rationale: External research requires diverse sources

2. **RISKY_NO_EMPIRICAL**
   - Trigger: risky task + empirical_verification < 0.3
   - Action: Force "ask" gate
   - Rationale: High-impact changes need testing

3. **CONTRADICTION_DETECTED**
   - Trigger: contradiction_risk > 0.4
   - Action: Force "stop" gate
   - Rationale: Conflicting evidence = halt until resolved

4. **IRREVERSIBLE_NO_BACKUP**
   - Trigger: reversibility < 0.5 + no backup + no dry_run
   - Action: Force "stop" gate
   - Rationale: Can't undo = must simulate first

5. **PRODUCTION_NO_TESTS**
   - Trigger: exposure > 0.5 + test_coverage = "weak_tests"
   - Action: Force "ask" gate
   - Rationale: Production code needs good tests

### Consequences

**Benefits:**
- ✅ Systematic confidence assessment (not gut feelings)
- ✅ Calibration improves with feedback (Bayesian learning)
- ✅ Safety tripwires prevent high-risk mistakes
- ✅ Verification budgets bound work on uncertain tasks
- ✅ Zen MCP conflict detection catches contradictions
- ✅ Performance optimized (caching, retry, continuation_id)

**Trade-offs:**
- ⚠️ Adds ~15s latency (5s classify + 10s audit)
- ⚠️ Requires rubric discipline from Claude
- ⚠️ JSON parsing can fail on malformed rubrics
- ⚠️ Calibration requires outcome tracking (manual initially)
- ⚠️ Zen MCP costs $ per API call

**Risks:**
- 📊 Calibration drift if outcomes not tracked
- 📊 Cache stale data (5min TTL mitigates)
- 📊 Overfitting to synthetic bootstrap data
- 📊 Tripwires too strict (false positives)
- 📊 Rubric gaming (inflated confidence)

**Mitigations:**
- Weekly calibration retraining
- Pilot testing with real tasks (Week 4)
- Threshold tuning based on empirical data
- Rubric auditing for consistency
- Fallback to heuristics if Zen MCP unavailable

### Implementation Timeline

**Week 1 (Days 1-7):** Core Mathematical Models ✅
- Task classification, confidence model, impact model
- Bayesian bounds, calibration engine
- Synthetic bootstrap data generation

**Week 2 (Days 8-14):** Conflict Detection + Safety ✅
- Zen MCP conflict detector with caching/retry
- NLI heuristics fallback
- Tripwires and verification budgets
- Action gates

**Week 3 (Days 15-21):** Hook Integration ✅
- confidence-classifier.sh (UserPromptSubmit)
- confidence-auditor.py (PostToolUse)
- JSON schema validation
- Settings integration

**Week 4 (Days 22-28):** Pilot + Polish (In Progress)
- Outcome tracking mechanism
- Calibration metrics report
- Threshold tuning
- Documentation completion

### Future Work

**Phase 1: Enhanced Features**
- File-based cache persistence
- Cache size limits (LRU eviction)
- Metrics dashboard (hit rates, latency)
- Automated outcome tracking via hook analysis

**Phase 2: Advanced Calibration**
- Per-user calibration profiles
- Task-specific calibration curves
- Temporal drift detection
- Active learning (query hard cases)

**Phase 3: Integration**
- GitHub PR comments with confidence scores
- Slack notifications for risky tasks
- Dashboard UI for calibration curves
- A/B testing framework

### References

- **Platt Scaling:** Platt, J. (1999). "Probabilistic Outputs for Support Vector Machines"
- **Isotonic Regression:** Zadrozny & Elkan (2002). "Transforming Classifier Scores into Accurate Multiclass Probability Estimates"
- **Bayesian Bounds:** Wilson Score Interval with Beta priors
- **Brier Score:** Brier, G.W. (1950). "Verification of Forecasts Expressed in Terms of Probability"

### Related Decisions

- See `.claude/hooks/CONFIDENCE_SYSTEM.md` for detailed usage guide
- See `synthetic_history_seed.jsonl` for bootstrap data examples
- See `example_rubric.json` for complete rubric schema

---

