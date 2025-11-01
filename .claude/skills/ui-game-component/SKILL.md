---
name: ui-game-component
description: Creates new game UI components using shadcn/ui, Tailwind CSS, and React patterns with proper game state integration, fantasy theming, and responsive design. Use when building new UI features, modals, HUD elements, or interactive components.
allowed-tools: Read, Write, Edit, mcp__serena__find_symbol, mcp__serena__get_symbols_overview
---

# UI Game Component Builder

Creates production-ready UI components for the Blackfell dungeon crawler following established patterns, shadcn/ui components, and fantasy game aesthetics.

## UI Stack

- **Component Library**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS 4 with custom fantasy theme
- **Framework**: React 19 with Next.js 16
- **State**: React hooks + localStorage persistence
- **Types**: Strict TypeScript

## Component Categories

### 1. HUD Elements
Always-visible game interface:
- Health/stats bars
- Inventory quick-access
- Mini-map
- Resource counters
- Notifications/toasts

### 2. Modals & Dialogs
Popup interfaces:
- Character creation
- Equipment screens
- Shop interfaces
- Loot selection
- Settings/options

### 3. Interactive Panels
Collapsible/expandable sections:
- Inventory management
- Quest log
- Character sheet
- Bestiary/codex

### 4. Game Events
Dynamic event displays:
- Combat encounters
- Narrative choices
- Treasure discovery
- Level up celebrations

### 5. Visual Effects
Animations and feedback:
- Damage numbers
- Loot drops
- Skill effects
- Transitions

## Design System

### Color Palette (Tailwind Classes)

**Rarity Colors** (from `lib/entities/colors.ts`):
- Common: `text-gray-400` / `bg-gray-900/20` / `border-gray-500/30`
- Uncommon: `text-green-400` / `bg-green-900/20` / `border-green-500/30`
- Rare: `text-blue-400` / `bg-blue-900/20` / `border-blue-500/30`
- Epic: `text-purple-400` / `bg-purple-900/20` / `border-purple-500/30`
- Legendary: `text-orange-400` / `bg-orange-900/20` / `border-orange-500/30`

**UI Colors**:
- Background: `bg-background` (dark theme default)
- Foreground: `text-foreground`
- Primary: `bg-primary` / `text-primary`
- Secondary: `bg-secondary` / `text-secondary`
- Accent: `bg-accent` / `text-accent`
- Muted: `text-muted-foreground` / `bg-muted`
- Border: `border-border`

**State Colors**:
- Success: `text-green-400` / `bg-green-500/10`
- Warning: `text-yellow-400` / `bg-yellow-500/10`
- Danger: `text-red-400` / `bg-red-500/10`
- Info: `text-blue-400` / `bg-blue-500/10`

### Typography

- **Display**: `text-4xl font-bold` (titles)
- **Heading**: `text-2xl font-semibold` (section headers)
- **Subheading**: `text-xl font-medium` (subsections)
- **Body**: `text-base` (default)
- **Small**: `text-sm` (secondary info)
- **Tiny**: `text-xs` (labels, hints)

### Spacing & Layout

- **Padding**: Use `p-4`, `px-6`, `py-3` etc.
- **Gaps**: Use `gap-2`, `gap-4`, `gap-6` for flex/grid
- **Rounded**: Use `rounded-lg` (standard), `rounded-xl` (cards)
- **Borders**: Use `border border-border/30` for subtle outlines

## shadcn/ui Components Available

Located in `components/ui/`:
- `button.tsx` - Buttons with variants
- `dialog.tsx` - Modal dialogs
- `tabs.tsx` - Tab navigation
- `input.tsx` - Text inputs
- `card.tsx` - Card containers
- `badge.tsx` - Labels/tags
- `progress.tsx` - Progress bars
- `tooltip.tsx` - Hover tooltips
- `dropdown-menu.tsx` - Dropdown menus
- `select.tsx` - Select dropdowns
- `slider.tsx` - Range sliders
- `switch.tsx` - Toggle switches
- `scroll-area.tsx` - Scrollable containers

**Usage Pattern**:
```typescript
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
```

## Instructions

### 1. Analyze Component Requirements
From user request:
- **Purpose**: What does this component do?
- **Type**: HUD, modal, panel, event, effect?
- **Data**: What state/props does it need?
- **Interactions**: Click, drag, hover, etc.?
- **Integration**: Where does it fit in the game?

### 2. Plan Component Structure

```typescript
// Component Template
interface ComponentProps {
  // Props from parent
  data: DataType
  onAction?: () => void
  // Optional styling
  className?: string
}

export function ComponentName({ data, onAction, className }: ComponentProps) {
  // Local state
  const [state, setState] = useState(initialValue)

  // Event handlers
  const handleAction = () => {
    // Logic
    onAction?.()
  }

  // Render
  return (
    <div className={cn("base-styles", className)}>
      {/* Component markup */}
    </div>
  )
}
```

### 3. Use shadcn/ui Components
Leverage existing UI primitives:

```typescript
// Modal Dialog
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    <div className="p-6">
      {/* Content */}
    </div>
  </DialogContent>
</Dialog>

// Button with variant
<Button
  variant="outline"
  onClick={handleClick}
  className="bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30"
>
  Action
</Button>

// Tabs
<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>
```

### 4. Apply Fantasy Theme
Use fantasy-appropriate styling:

```typescript
// Card with fantasy styling
<div className="
  bg-gradient-to-br from-secondary/10 to-secondary/5
  border-2 border-border/30
  rounded-xl
  shadow-xl shadow-black/50
  p-6
  relative
  overflow-hidden
">
  {/* Optional decorative elements */}
  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl" />

  {/* Content */}
</div>

// Rarity-colored item
<div className={cn(
  "p-3 rounded-lg border-2",
  RARITY_BG_COLORS[item.rarity],
  RARITY_BORDER_COLORS[item.rarity]
)}>
  <span className={RARITY_COLORS[item.rarity]}>
    {item.name}
  </span>
</div>
```

### 5. Integrate with Game State
Connect to ENTITIES and game state:

```typescript
import { ENTITIES } from "@/lib/entities"
import { loadGameState, saveGameState } from "@/lib/game-state"

function InventoryPanel() {
  const [gameState, setGameState] = useState(() => loadGameState())

  const handleEquip = (itemId: string) => {
    const item = ENTITIES.get(itemId)
    if (!item) return

    // Update game state
    const updated = {
      ...gameState,
      equippedItems: {
        ...gameState.equippedItems,
        weapon: item
      }
    }

    setGameState(updated)
    saveGameState(updated)
  }

  return (
    <div>
      {gameState.inventory.map(item => (
        <ItemCard key={item.id} item={item} onEquip={handleEquip} />
      ))}
    </div>
  )
}
```

### 6. Add Animations & Transitions
Use Tailwind transitions:

```typescript
// Fade in
<div className="animate-in fade-in duration-300">
  Content
</div>

// Slide up
<div className="animate-in slide-in-from-bottom duration-500">
  Content
</div>

// Hover scale
<button className="transition-transform hover:scale-105 active:scale-95">
  Click me
</button>

// Smooth transitions
<div className="transition-all duration-200 hover:bg-secondary/20">
  Hoverable
</div>
```

### 7. Handle Drag & Drop (If Needed)
For inventory management:

```typescript
const [draggedItem, setDraggedItem] = useState<InventoryItem | null>(null)

const handleDragStart = (e: React.DragEvent, item: InventoryItem) => {
  setDraggedItem(item)
  e.dataTransfer.effectAllowed = "move"
}

const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault()
  e.dataTransfer.dropEffect = "move"
}

const handleDrop = (e: React.DragEvent, slot: string) => {
  e.preventDefault()
  if (!draggedItem) return

  // Handle equip logic
  handleEquipToSlot(draggedItem, slot)
  setDraggedItem(null)
}

return (
  <div
    draggable
    onDragStart={(e) => handleDragStart(e, item)}
    onDragOver={handleDragOver}
    onDrop={(e) => handleDrop(e, "weapon")}
  >
    Item
  </div>
)
```

### 8. Ensure Responsive Design
Mobile-friendly layouts:

```typescript
<div className="
  grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3
  gap-4
  p-4 md:p-6
  max-w-7xl mx-auto
">
  {/* Responsive grid */}
</div>

// Mobile-friendly text
<h2 className="text-xl md:text-2xl lg:text-3xl">
  Title
</h2>

// Hide on mobile
<div className="hidden md:block">
  Desktop only
</div>
```

### 9. Add Accessibility
ARIA attributes and keyboard support:

```typescript
<button
  aria-label="Close dialog"
  onClick={handleClose}
  className="..."
>
  <X className="w-4 h-4" />
</button>

// Keyboard navigation
<div
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      handleAction()
    }
  }}
>
  Clickable
</div>
```

### 10. Extract to Separate File (If Appropriate)
For reusable components:

```typescript
// components/inventory-item-card.tsx
interface InventoryItemCardProps {
  item: InventoryItem
  onEquip: (id: string) => void
  onSell: (id: string) => void
}

export function InventoryItemCard({ item, onEquip, onSell }: InventoryItemCardProps) {
  // Component logic
}

// Use in parent
import { InventoryItemCard } from "@/components/inventory-item-card"
```

## Examples

### Example 1: Enemy Encounter Card

**User Request**: "Create a card to display enemy encounters"

**Implementation**:

```typescript
// components/enemy-encounter-card.tsx
"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { RARITY_COLORS, RARITY_BG_COLORS, RARITY_BORDER_COLORS } from "@/lib/entities"
import type { Enemy } from "@/lib/entities"

interface EnemyEncounterCardProps {
  enemy: Enemy
  onAttack: () => void
  onFlee: () => void
  enemyHealth: number
  playerHealth: number
  playerMaxHealth: number
}

export function EnemyEncounterCard({
  enemy,
  onAttack,
  onFlee,
  enemyHealth,
  playerHealth,
  playerMaxHealth
}: EnemyEncounterCardProps) {
  const healthPercent = (enemyHealth / enemy.health) * 100

  return (
    <Card className={cn(
      "p-6 relative overflow-hidden border-2",
      RARITY_BG_COLORS[enemy.rarity],
      RARITY_BORDER_COLORS[enemy.rarity]
    )}>
      {/* Enemy Name */}
      <h2 className={cn(
        "text-2xl font-bold mb-2",
        RARITY_COLORS[enemy.rarity]
      )}>
        {enemy.name}
      </h2>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-4">
        {enemy.description}
      </p>

      {/* Health Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span>Enemy Health</span>
          <span>{enemyHealth} / {enemy.health}</span>
        </div>
        <Progress value={healthPercent} className="h-2" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
        <div className="bg-secondary/20 p-2 rounded text-center">
          <div className="text-muted-foreground">Attack</div>
          <div className="font-bold text-red-400">{enemy.attack}</div>
        </div>
        <div className="bg-secondary/20 p-2 rounded text-center">
          <div className="text-muted-foreground">Defense</div>
          <div className="font-bold text-blue-400">{enemy.defense || 0}</div>
        </div>
        <div className="bg-secondary/20 p-2 rounded text-center">
          <div className="text-muted-foreground">Reward</div>
          <div className="font-bold text-yellow-400">{enemy.gold}g</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={onAttack}
          className="flex-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50"
        >
          ⚔️ Attack
        </Button>
        <Button
          onClick={onFlee}
          variant="outline"
          className="bg-secondary/20 hover:bg-secondary/30"
        >
          🏃 Flee
        </Button>
      </div>

      {/* Player Health Warning */}
      {playerHealth < playerMaxHealth * 0.3 && (
        <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-400">
          ⚠️ Low health! Consider fleeing or using a potion.
        </div>
      )}
    </Card>
  )
}
```

### Example 2: Quest Log Panel

**User Request**: "Add a quest log panel"

**Implementation**:

```typescript
// components/quest-log-panel.tsx
"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Quest } from "@/lib/game-state"

interface QuestLogPanelProps {
  quests: Quest[]
  onSelectQuest: (questId: string) => void
}

export function QuestLogPanel({ quests, onSelectQuest }: QuestLogPanelProps) {
  const [selectedQuest, setSelectedQuest] = useState<string | null>(null)

  const activeQuests = quests.filter(q => !q.completed)
  const completedQuests = quests.filter(q => q.completed)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
      {/* Quest List */}
      <div className="lg:col-span-1">
        <h3 className="text-lg font-semibold mb-2">Active Quests</h3>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {activeQuests.map(quest => (
              <Card
                key={quest.id}
                className={cn(
                  "p-3 cursor-pointer transition-colors",
                  selectedQuest === quest.id
                    ? "bg-primary/20 border-primary"
                    : "hover:bg-secondary/20"
                )}
                onClick={() => {
                  setSelectedQuest(quest.id)
                  onSelectQuest(quest.id)
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium">{quest.name}</h4>
                  <Badge variant="outline" className="text-xs">
                    {quest.progress}/{quest.maxProgress}
                  </Badge>
                </div>
                <Progress
                  value={(quest.progress / quest.maxProgress) * 100}
                  className="h-1"
                />
              </Card>
            ))}
          </div>
        </ScrollArea>

        {completedQuests.length > 0 && (
          <>
            <h3 className="text-lg font-semibold mt-6 mb-2">Completed</h3>
            <div className="space-y-1">
              {completedQuests.map(quest => (
                <div
                  key={quest.id}
                  className="p-2 text-sm text-muted-foreground line-through"
                >
                  {quest.name}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Quest Details */}
      <div className="lg:col-span-2">
        {selectedQuest ? (
          <QuestDetails quest={quests.find(q => q.id === selectedQuest)!} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select a quest to view details
          </div>
        )}
      </div>
    </div>
  )
}

function QuestDetails({ quest }: { quest: Quest }) {
  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">{quest.name}</h2>
      <p className="text-muted-foreground mb-6">{quest.description}</p>

      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span>Progress</span>
          <span>{quest.progress} / {quest.maxProgress}</span>
        </div>
        <Progress value={(quest.progress / quest.maxProgress) * 100} />
      </div>

      {/* Objectives, rewards, etc. */}
    </Card>
  )
}
```

## Best Practices

1. **Use shadcn/ui First**: Leverage existing components before building custom
2. **Responsive by Default**: Always test on mobile, tablet, desktop
3. **Consistent Theming**: Use design system colors and spacing
4. **Accessible**: Add ARIA labels and keyboard support
5. **Performance**: Memoize expensive renders, use keys properly
6. **Type Safety**: Strict TypeScript, no `any` types
7. **Reusable**: Extract common patterns to separate components
8. **Animated**: Add subtle transitions for polish

## Files to Reference

- **UI Components**: `components/ui/*`
- **Main Game UI**: `components/dungeon-crawler.tsx`
- **Entity Colors**: `lib/entities/colors.ts`
- **Game State**: `lib/game-state.ts`
- **Type Definitions**: `lib/types.ts`
