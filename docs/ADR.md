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
