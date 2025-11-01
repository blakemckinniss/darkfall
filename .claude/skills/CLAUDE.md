# Blackfell Agent Skills

This directory contains specialized Agent Skills for the Blackfell dungeon crawler game. These skills extend Claude's capabilities with domain-specific knowledge about game development, entity management, AI integration, and more.

## Available Skills

### 1. game-entity-creator
**Trigger**: "Add a new enemy", "create a treasure", "generate new location"

Creates new game entities (enemies, locations, treasures, consumables) with:
- Proper TypeScript typing
- Balanced stats by rarity tier
- Consistent patterns matching existing entities
- Schema validation

**Use Cases**:
- Adding new enemies with balanced stats
- Creating treasures/weapons/armor
- Designing new locations
- Adding consumables and potions

### 2. ai-endpoint-builder
**Trigger**: "Create an AI endpoint", "add generation API", "integrate Groq/fal.ai"

Scaffolds AI generation API endpoints with:
- fal.ai integration (image generation)
- Groq integration (structured data via AI SDK)
- Proper error handling
- Type-safe schemas
- Game state integration

**Use Cases**:
- Adding new AI generation features
- Creating portrait/art generation endpoints
- Building narrative generation APIs
- Integrating third-party AI services

### 3. game-balance-auditor
**Trigger**: "Check game balance", "audit entity stats", "find overpowered items"

Analyzes game balance across:
- Stat range compliance by rarity
- Economy balance (gold/value ratios)
- Difficulty progression
- Rarity distribution
- Power outliers

**Use Cases**:
- Pre-release balance checks
- Finding overpowered/underpowered entities
- Validating new content
- Economic analysis

### 4. state-migration-helper
**Trigger**: "Update game state schema", "add new field to state", "migrate localStorage"

Safely evolves game state with:
- Backwards compatibility
- Migration functions
- TypeScript type updates
- localStorage handling
- Strict TypeScript compliance

**Use Cases**:
- Adding new state fields
- Restructuring player data
- Renaming properties
- Data type changes

### 5. ui-game-component
**Trigger**: "Create a new component", "build a modal", "add UI element"

Creates game UI components with:
- shadcn/ui components
- Tailwind CSS styling
- Fantasy game theming
- Game state integration
- Responsive design

**Use Cases**:
- Building new modals/dialogs
- Creating HUD elements
- Designing inventory panels
- Adding visual effects

## How Skills Work

Skills are **model-invoked** - Claude autonomously decides when to use them based on your request and the skill's description. You don't need to explicitly invoke them; just ask naturally:

- ❌ Don't say: "Use the game-entity-creator skill to add an enemy"
- ✅ Do say: "Add a fire demon enemy for mid-game"

## Tool Permissions

Some skills have restricted tool access via `allowed-tools` to ensure safe, focused operations:

- **game-entity-creator**: Read/Edit/Write + symbolic tools (no arbitrary code execution)
- **ai-endpoint-builder**: Read/Write/Edit + symbolic tools
- **game-balance-auditor**: Read-only + symbolic search tools
- **state-migration-helper**: Full editing access
- **ui-game-component**: Full editing access

## Skill Statistics

- **Total Skills**: 5
- **Total Documentation**: 2,272 lines
- **Average Skill Size**: ~454 lines
- **Coverage**: Entity management, AI integration, game balance, state management, UI development

## Testing Skills

To test if Claude recognizes a skill:

```
# Test game-entity-creator
"Add a legendary dragon enemy"

# Test ai-endpoint-builder
"Create an endpoint to generate enemy descriptions with AI"

# Test game-balance-auditor
"Check if any treasures are overpowered"

# Test state-migration-helper
"I want to add a quest system to the game state"

# Test ui-game-component
"Create a loot chest modal component"
```

## Best Practices

1. **Be Specific**: Describe what you want clearly
2. **Provide Context**: Mention rarity, theme, or purpose
3. **Trust the Skills**: They follow project patterns automatically
4. **Review Output**: Always review generated code
5. **Iterate**: Refine based on skill recommendations

## Updating Skills

Skills are stored in `.claude/skills/` and committed to git. To update:

1. Edit the `SKILL.md` file directly
2. Restart Claude Code to reload skills
3. Test the updated skill

## Project Integration

These skills integrate with:
- **Entity Registry**: `lib/entities/`
- **Game State**: `lib/game-state.ts`
- **Game Engine**: `lib/game-engine.ts`
- **API Routes**: `app/api/`
- **UI Components**: `components/`

## Resources

- [Agent Skills Documentation](https://docs.anthropic.com/claude/docs/agents-and-tools/agent-skills)
- [Best Practices Guide](https://docs.anthropic.com/claude/docs/agents-and-tools/agent-skills/best-practices)
- Project Instructions: `CLAUDE.md`
- Entity Registry: `ENTITY_REGISTRY.md`
