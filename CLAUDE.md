# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a fantasy dungeon crawler web game built with Next.js 16, React 19, and TypeScript. The game features AI-generated content including character portraits (via fal.ai) and items (via Groq AI), along with a turn-based exploration system where players navigate locations, encounter enemies, and collect loot.

## Development Commands

### Build and Run
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

### Environment Setup
Required environment variables:
- `FAL_KEY` - API key for fal.ai (portrait generation)
- `GROQ_API_KEY` - API key for Groq (item generation via AI SDK)

## Architecture

### Core Game Systems

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

### AI Integration

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

### UI Framework

- **shadcn/ui components** in `components/ui/` - Extensive component library built on Radix UI
- **Tailwind CSS 4** for styling with PostCSS
- **Path alias**: `@/*` maps to project root

### Data Flow

1. Game state loaded from localStorage on mount
2. User actions trigger state updates (explore, equip, use item)
3. `generateEvent()` creates encounters with entity data and choices
4. Choices resolve to outcomes affecting player stats/inventory
5. AI APIs generate dynamic content on demand
6. State persisted back to localStorage after changes

## TypeScript Configuration

This project enforces **strict TypeScript settings** to ensure maximum type safety and prevent runtime errors. The following compiler options are enabled in `tsconfig.json` and **must remain enabled**:

- `strict: true` - Enables all strict type-checking options
- `noUncheckedIndexedAccess: true` - Arrays/objects accessed with indices return `T | undefined`
- `noUnusedLocals: true` - Reports errors on unused local variables
- `noUnusedParameters: true` - Reports errors on unused function parameters
- `noFallthroughCasesInSwitch: true` - Prevents accidental fallthrough in switch statements
- `exactOptionalPropertyTypes: true` - Optional properties cannot be assigned `undefined` explicitly

**Guidelines for strict TypeScript:**
- When accessing arrays with indices, always check for `undefined` before use
- Remove unused variables and parameters (prefixing with `_` is not sufficient)
- For optional props in components, use conditional spreading: `{...(value !== undefined && { propName: value })}`
- Recursively calling functions as fallback is acceptable when array access might be undefined
- All type errors must be resolved before committing - the build enforces these rules

## Development Guidelines

- **Never write documentation** unless explicitly requested by the user
- **Check for existing functionality** before creating new files - avoid duplication
- **UI/UX is critical** - always consider visual design, user experience, and aesthetics in all changes
- **Be assertive and opinionated** - question the user if requirements are unclear or if you see potential issues
- **Utilize MCP tools** - leverage available MCP servers (serena, tavily, etc.) whenever possible
- **Provide next steps** - after completing a task, always suggest follow-up considerations or improvements
- **Avoid migrations** - prefer incremental changes over large-scale refactors
- **No demos or examples** - build production-ready features, not throwaway code
- **Prevent technical debt** - write clean, maintainable code from the start
- **Never version files** - overwrite the previous version instead of creating file.v2.ts; git handles version control
- **Commit after major changes** - create git commits when significant work is complete

## Important Notes

- TypeScript build errors are ignored in production (`ignoreBuildErrors: true`)
- Next.js image optimization is disabled (`unoptimized: true`)
- Game uses client-side only state management (no server-side persistence)
- Entity highlighting in event text uses special syntax parsed by `renderTextWithEntities()`
