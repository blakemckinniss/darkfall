import { expect } from "@playwright/test"

/**
 * AI Response Validation Helpers
 * Based on Zen MCP research: Validate structure, not specific content (AI is non-deterministic)
 */

export interface NarrativeEventStructure {
  eventType: "combat" | "shop" | "shrine" | "treasure" | "encounter"
  description: string
  entity: string
  entityRarity: "common" | "uncommon" | "rare" | "epic" | "legendary"
  entityData: {
    name: string
    rarity: string
    type?: string
    health?: number
    attack?: number
    gold?: number
    exp?: number
  }
  choices: Array<{
    text: string
    outcome: {
      message: string
      entity: string
      entityRarity: string
      healthChange?: number
      goldChange?: number
      experienceChange?: number
    }
  }>
  treasureChoices?: unknown[]
  shopInventory?: unknown[]
  shrineOffer?: unknown
  trapRisk?: unknown
}

/**
 * Validate that AI-generated narrative has correct structure
 */
export function validateNarrativeStructure(event: unknown): void {
  expect(event).toBeTruthy()
  expect(typeof event).toBe("object")

  const narrative = event as NarrativeEventStructure

  // Required fields
  expect(narrative.eventType).toBeTruthy()
  expect(["combat", "shop", "shrine", "treasure", "encounter"]).toContain(narrative.eventType)

  expect(narrative.description).toBeTruthy()
  expect(typeof narrative.description).toBe("string")
  expect(narrative.description.length).toBeGreaterThan(10)

  expect(narrative.entity).toBeTruthy()
  expect(typeof narrative.entity).toBe("string")
  expect(narrative.entity.length).toBeGreaterThan(2)

  expect(narrative.entityRarity).toBeTruthy()
  expect(["common", "uncommon", "rare", "epic", "legendary"]).toContain(narrative.entityRarity)

  // Validate entityData
  expect(narrative.entityData).toBeTruthy()
  expect(narrative.entityData.name).toBeTruthy()
  expect(narrative.entityData.rarity).toBeTruthy()

  // Validate choices (minimum 2)
  expect(narrative.choices).toBeTruthy()
  expect(Array.isArray(narrative.choices)).toBe(true)
  expect(narrative.choices.length).toBeGreaterThanOrEqual(2)

  // Validate each choice
  narrative.choices.forEach((choice, index) => {
    expect(choice.text, `Choice ${index} must have text`).toBeTruthy()
    expect(choice.outcome, `Choice ${index} must have outcome`).toBeTruthy()
    expect(choice.outcome.message, `Choice ${index} outcome must have message`).toBeTruthy()
  })
}

/**
 * Validate combat event has required combat fields
 */
export function validateCombatEvent(event: NarrativeEventStructure): void {
  expect(event.eventType).toBe("combat")
  expect(event.entityData.health).toBeGreaterThan(0)
  expect(event.entityData.attack).toBeGreaterThan(0)

  // Combat events should have stat changes in choices
  const hasStatChanges = event.choices.some(
    (choice) =>
      choice.outcome.healthChange !== undefined ||
      choice.outcome.goldChange !== undefined ||
      choice.outcome.experienceChange !== undefined
  )
  expect(hasStatChanges).toBe(true)
}

/**
 * Validate shop event has inventory
 */
export function validateShopEvent(event: NarrativeEventStructure): void {
  expect(event.eventType).toBe("shop")
  expect(event.shopInventory).toBeTruthy()
  expect(Array.isArray(event.shopInventory)).toBe(true)
  expect(event.shopInventory!.length).toBeGreaterThan(0)
}

/**
 * Validate shrine event has offer
 */
export function validateShrineEvent(event: NarrativeEventStructure): void {
  expect(event.eventType).toBe("shrine")
  expect(event.shrineOffer).toBeTruthy()
}

/**
 * Validate treasure event has choices
 */
export function validateTreasureEvent(event: NarrativeEventStructure): void {
  expect(event.eventType).toBe("treasure")
  expect(event.treasureChoices).toBeTruthy()
  expect(Array.isArray(event.treasureChoices)).toBe(true)
  expect(event.treasureChoices!.length).toBeGreaterThan(0)
}

/**
 * Validate entity stats are within expected ranges based on rarity
 */
export function validateEntityStatsRange(event: NarrativeEventStructure): void {
  if (event.eventType !== "combat") return

  const { health, attack } = event.entityData
  const rarity = event.entityRarity

  const ranges = {
    common: { minHP: 20, maxHP: 30, minATK: 5, maxATK: 10 },
    uncommon: { minHP: 40, maxHP: 50, minATK: 8, maxATK: 15 },
    rare: { minHP: 60, maxHP: 70, minATK: 12, maxATK: 20 },
    epic: { minHP: 80, maxHP: 90, minATK: 18, maxATK: 28 },
    legendary: { minHP: 100, maxHP: 120, minATK: 25, maxATK: 35 },
  }

  const range = ranges[rarity]
  if (health) {
    expect(health).toBeGreaterThanOrEqual(range.minHP)
    expect(health).toBeLessThanOrEqual(range.maxHP)
  }

  if (attack) {
    expect(attack).toBeGreaterThanOrEqual(range.minATK)
    expect(attack).toBeLessThanOrEqual(range.maxATK)
  }
}

/**
 * Validate AI variety - events should differ across multiple generations
 */
export function validateEventVariety(events: NarrativeEventStructure[]): void {
  expect(events.length).toBeGreaterThan(1)

  // Check entity name variety
  const uniqueEntities = new Set(events.map((e) => e.entity))
  const varietyScore = uniqueEntities.size / events.length

  // At least 70% unique entities (allows some repetition for common types)
  expect(varietyScore).toBeGreaterThanOrEqual(0.7)

  // Check event type distribution
  const eventTypes = events.map((e) => e.eventType)
  const uniqueEventTypes = new Set(eventTypes)

  // Should have at least 3 different event types in 10+ samples
  if (events.length >= 10) {
    expect(uniqueEventTypes.size).toBeGreaterThanOrEqual(3)
  }
}
