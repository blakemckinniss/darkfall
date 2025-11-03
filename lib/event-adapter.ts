/**
 * Event Adapter
 *
 * Bridges between new Phase 0 GameEvent format and legacy game-engine GameEvent format.
 * This allows incremental migration without breaking existing UI code.
 */

import type { GameEvent as NewGameEvent } from "./event-templates"
import type { GameEvent as OldGameEvent } from "./game-engine"

/**
 * Convert new Phase 0 GameEvent to legacy format
 * This maintains backwards compatibility with dungeon-crawler.tsx
 */
export function adaptNewEventToLegacy(newEvent: NewGameEvent): OldGameEvent {
  return {
    eventType: newEvent.type,
    description: newEvent.entity.description,
    entity: newEvent.entity.name,
    entityRarity: newEvent.entity.rarity,
    entityData: {
      name: newEvent.entity.name,
      rarity: newEvent.entity.rarity,
      icon: newEvent.entity.icon,
      ...(newEvent.stats && {
        stats: {
          attack: newEvent.stats.attack,
          defense: newEvent.stats.defense,
          health: newEvent.stats.health,
        },
        health: newEvent.stats.health,
        attack: newEvent.stats.attack,
      }),
      ...(newEvent.rewards && {
        gold: newEvent.rewards.gold,
        exp: newEvent.rewards.exp,
      }),
    },
    choices: newEvent.choices.map((choice) => ({
      text: choice.text,
      outcome: {
        message: choice.outcome?.message || "",
        ...(choice.outcome?.healthChange && { healthChange: choice.outcome.healthChange }),
        ...(choice.outcome?.goldChange && { goldChange: choice.outcome.goldChange }),
        ...(choice.outcome?.expChange && { experienceChange: choice.outcome.expChange }),
      },
    })),
  }
}
