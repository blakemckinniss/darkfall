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
