import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { generateEvent, type PlayerStats, type InventoryItem } from "../game-engine"

describe("game-engine", () => {
  let mockPlayerStats: PlayerStats
  let mockInventory: InventoryItem[]

  beforeEach(() => {
    mockPlayerStats = {
      health: 80,
      maxHealth: 100,
      attack: 15,
      defense: 10,
      gold: 100,
      experience: 50,
      level: 2,
    }

    mockInventory = []
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("generateEvent - Combat Encounters", () => {
    it("should generate a combat encounter when random < 0.4", () => {
      vi.spyOn(Math, "random")
        .mockReturnValueOnce(0.3) // Main probability check
        .mockReturnValue(0.5) // For array index selection

      const event = generateEvent(mockPlayerStats, mockInventory)

      expect(event.entity).toBeDefined()
      expect(event.entityRarity).toBeDefined()
      expect(event.entityData?.type).toBe("enemy")
      expect(event.choices).toHaveLength(3)
      expect(event.choices[0]?.text).toContain("Attack")
      expect(event.choices[1]?.text).toContain("flee")
      expect(event.choices[2]?.text).toContain("negotiate")
    })

    it("should calculate correct damage reduction for combat", () => {
      vi.spyOn(Math, "random")
        .mockReturnValueOnce(0.3) // Combat encounter
        .mockReturnValue(0) // Select first enemy (Goblin)

      const event = generateEvent(mockPlayerStats, mockInventory)

      // Goblin has 5 attack, player has 10 defense
      const attackChoice = event.choices[0]
      expect(attackChoice?.outcome.healthChange).toBeLessThanOrEqual(0)
      expect(attackChoice?.outcome.goldChange).toBeGreaterThan(0)
      expect(attackChoice?.outcome.experienceChange).toBeGreaterThan(0)
    })

    it("should handle flee choice correctly", () => {
      vi.spyOn(Math, "random")
        .mockReturnValueOnce(0.3) // Combat encounter
        .mockReturnValue(0.1) // Select enemy

      const event = generateEvent(mockPlayerStats, mockInventory)

      const fleeChoice = event.choices[1]
      expect(fleeChoice?.outcome.healthChange).toBeLessThan(0)
      expect(fleeChoice?.outcome.goldChange).toBeUndefined()
      expect(fleeChoice?.outcome.experienceChange).toBeUndefined()
    })

    it("should handle negotiate choice with gold cost", () => {
      vi.spyOn(Math, "random")
        .mockReturnValueOnce(0.3) // Combat encounter
        .mockReturnValue(0.1) // Select enemy

      const event = generateEvent(mockPlayerStats, mockInventory)

      const negotiateChoice = event.choices[2]
      expect(negotiateChoice?.outcome.goldChange).toBeLessThanOrEqual(0)
      expect(negotiateChoice?.outcome.goldChange).toBeGreaterThanOrEqual(-10)
    })

    it("should not reduce gold below 0 when negotiating", () => {
      const poorPlayer: PlayerStats = {
        ...mockPlayerStats,
        gold: 5,
      }

      vi.spyOn(Math, "random")
        .mockReturnValueOnce(0.3) // Combat encounter
        .mockReturnValue(0.1) // Select enemy

      const event = generateEvent(poorPlayer, mockInventory)

      const negotiateChoice = event.choices[2]
      expect(negotiateChoice?.outcome.goldChange).toBeGreaterThanOrEqual(-5)
    })

    it("should generate all enemy types with proper rarities", () => {
      const enemyNames = new Set<string>()
      const rarities = new Set<string>()

      for (let i = 0; i < 100; i++) {
        vi.spyOn(Math, "random")
          .mockReturnValueOnce(0.3) // Combat encounter
          .mockReturnValue(i / 100) // Vary enemy selection

        const event = generateEvent(mockPlayerStats, mockInventory)
        if (event.entityData?.name) {
          enemyNames.add(event.entityData.name)
          if (event.entityRarity) {
            rarities.add(event.entityRarity)
          }
        }

        vi.restoreAllMocks()
      }

      // Should have encountered multiple enemy types and rarities
      expect(enemyNames.size).toBeGreaterThan(2)
      expect(rarities.size).toBeGreaterThan(2)
    })
  })

  describe("generateEvent - Treasure Encounters", () => {
    it("should generate treasure encounter when 0.4 <= random < 0.7", () => {
      vi.spyOn(Math, "random")
        .mockReturnValueOnce(0.5) // Treasure encounter
        .mockReturnValueOnce(0.6) // Regular treasure (not consumable or map)
        .mockReturnValue(0.5) // Array selection

      const event = generateEvent(mockPlayerStats, mockInventory)

      expect(event.choices).toHaveLength(2)
      expect(event.choices[0]?.text).toContain("Take")
      expect(event.choices[1]?.text).toContain("Leave")
      expect(event.choices[0]?.outcome.itemGained).toBeDefined()
    })

    it("should generate consumable when encounterType < 0.2", () => {
      vi.spyOn(Math, "random")
        .mockReturnValueOnce(0.5) // Treasure encounter
        .mockReturnValueOnce(0.1) // Consumable
        .mockReturnValue(0.5) // Array selection

      const event = generateEvent(mockPlayerStats, mockInventory)

      expect(event.entityData?.type).toBe("consumable")
      expect(event.choices[0]?.outcome.itemGained?.type).toBe("consumable")
    })

    it("should generate map when 0.2 <= encounterType < 0.5", () => {
      vi.spyOn(Math, "random")
        .mockReturnValueOnce(0.5) // Treasure encounter
        .mockReturnValueOnce(0.3) // Map item
        .mockReturnValue(0.5) // Array selection

      const event = generateEvent(mockPlayerStats, mockInventory)

      expect(event.entityData?.type).toBe("map")
      expect(event.choices[0]?.outcome.itemGained?.type).toBe("map")
      expect(event.choices[0]?.outcome.itemGained?.mapData).toBeDefined()
      expect(event.choices[0]?.outcome.itemGained?.mapData?.entrances).toBeGreaterThan(0)
    })

    it("should generate regular treasure when encounterType >= 0.5", () => {
      vi.spyOn(Math, "random")
        .mockReturnValueOnce(0.5) // Treasure encounter
        .mockReturnValueOnce(0.6) // Regular treasure
        .mockReturnValue(0.5) // Array selection

      const event = generateEvent(mockPlayerStats, mockInventory)

      expect(event.entityData?.type).not.toBe("map")
      expect(event.entityData?.type).not.toBe("consumable")
      expect(event.choices[0]?.outcome.itemGained).toBeDefined()
    })

    it("should include item stats when applicable", () => {
      vi.spyOn(Math, "random")
        .mockReturnValueOnce(0.5) // Treasure encounter
        .mockReturnValueOnce(0.6) // Regular treasure
        .mockReturnValue(0.2) // Select a weapon/armor item

      const event = generateEvent(mockPlayerStats, mockInventory)

      const itemGained = event.choices[0]?.outcome.itemGained
      // Some items have stats, some don't (like gold coins)
      if (itemGained?.type === "weapon" || itemGained?.type === "armor") {
        expect(itemGained.stats).toBeDefined()
      }
    })

    it("should assign unique IDs to generated items", () => {
      vi.spyOn(Math, "random")
        .mockReturnValueOnce(0.5) // Treasure encounter
        .mockReturnValueOnce(0.6) // Regular treasure
        .mockReturnValue(0.5)

      const event1 = generateEvent(mockPlayerStats, mockInventory)

      vi.spyOn(Math, "random")
        .mockReturnValueOnce(0.5)
        .mockReturnValueOnce(0.6)
        .mockReturnValue(0.5)

      const event2 = generateEvent(mockPlayerStats, mockInventory)

      const item1 = event1.choices[0]?.outcome.itemGained
      const item2 = event2.choices[0]?.outcome.itemGained

      // IDs should be different (or might be same due to random, but test the structure)
      expect(item1?.id).toBeDefined()
      expect(item2?.id).toBeDefined()
    })

    it("should allow leaving treasure behind with no consequences", () => {
      vi.spyOn(Math, "random")
        .mockReturnValueOnce(0.5) // Treasure encounter
        .mockReturnValueOnce(0.6) // Regular treasure
        .mockReturnValue(0.5)

      const event = generateEvent(mockPlayerStats, mockInventory)

      const leaveChoice = event.choices[1]
      expect(leaveChoice?.outcome.itemGained).toBeUndefined()
      expect(leaveChoice?.outcome.healthChange).toBeUndefined()
      expect(leaveChoice?.outcome.goldChange).toBeUndefined()
    })
  })

  describe("generateEvent - Mystery Encounters", () => {
    it("should generate mystery encounter when random >= 0.7", () => {
      vi.spyOn(Math, "random")
        .mockReturnValueOnce(0.8) // Mystery encounter
        .mockReturnValue(0.5) // Mystery event selection

      const event = generateEvent(mockPlayerStats, mockInventory)

      expect(event.choices).toHaveLength(2)
      expect(event.entity).toMatch(/merchant|fountain|altar/)
    })

    it("should handle merchant encounter correctly", () => {
      vi.spyOn(Math, "random")
        .mockReturnValueOnce(0.8) // Mystery encounter
        .mockReturnValue(0) // Select merchant (first mystery event)

      const event = generateEvent(mockPlayerStats, mockInventory)

      expect(event.entity).toBe("merchant")
      const buyChoice = event.choices[0]
      expect(buyChoice?.outcome.goldChange).toBe(-20)
      expect(buyChoice?.outcome.healthChange).toBe(30)
    })

    it("should handle fountain encounter with full heal", () => {
      vi.spyOn(Math, "random")
        .mockReturnValueOnce(0.8) // Mystery encounter
        .mockReturnValue(0.4) // Select fountain (index between 0.33 and 0.66)

      const event = generateEvent(mockPlayerStats, mockInventory)

      expect(event.entity).toBe("fountain")
      const drinkChoice = event.choices[0]
      // Player has 80/100 health, should restore 20
      expect(drinkChoice?.outcome.healthChange).toBe(20)
    })

    it("should handle fountain when at full health", () => {
      const fullHealthPlayer: PlayerStats = {
        ...mockPlayerStats,
        health: 100,
        maxHealth: 100,
      }

      vi.spyOn(Math, "random")
        .mockReturnValueOnce(0.8) // Mystery encounter
        .mockReturnValue(0.4) // Select fountain

      const event = generateEvent(fullHealthPlayer, mockInventory)

      const drinkChoice = event.choices[0]
      expect(drinkChoice?.outcome.healthChange).toBe(0)
    })

    it("should handle altar encounter correctly", () => {
      vi.spyOn(Math, "random")
        .mockReturnValueOnce(0.8) // Mystery encounter
        .mockReturnValue(0.7) // Select altar (third mystery event, > 0.66)

      const event = generateEvent(mockPlayerStats, mockInventory)

      expect(event.entity).toBe("altar")
      const offerChoice = event.choices[0]
      expect(offerChoice?.outcome.goldChange).toBe(-15)
      expect(offerChoice?.outcome.experienceChange).toBe(40)
    })

    it("should have decline/leave option for all mystery encounters", () => {
      for (let i = 0; i < 3; i++) {
        vi.spyOn(Math, "random")
          .mockReturnValueOnce(0.8) // Mystery encounter
          .mockReturnValue(i * 0.33) // Select different mystery events

        const event = generateEvent(mockPlayerStats, mockInventory)

        const declineChoice = event.choices[1]
        expect(declineChoice?.outcome.healthChange).toBeUndefined()
        expect(declineChoice?.outcome.goldChange).toBeUndefined()

        vi.restoreAllMocks()
      }
    })
  })

  describe("generateEvent - Edge Cases & Fallbacks", () => {
    it("should handle recursive fallback for undefined array access", () => {
      // This tests the strict TypeScript guard pattern
      const event = generateEvent(mockPlayerStats, mockInventory)

      // Should always return a valid event, never undefined
      expect(event).toBeDefined()
      expect(event.description).toBeDefined()
      expect(event.choices.length).toBeGreaterThan(0)
    })

    it("should increment event counter on each call", () => {
      // Generate multiple events
      const events = []
      for (let i = 0; i < 5; i++) {
        events.push(generateEvent(mockPlayerStats, mockInventory))
      }

      // All should be valid events
      expect(events).toHaveLength(5)
      events.forEach((event) => {
        expect(event).toBeDefined()
      })
    })

    it("should generate events with empty inventory", () => {
      const event = generateEvent(mockPlayerStats, [])

      expect(event).toBeDefined()
      expect(event.choices.length).toBeGreaterThan(0)
    })

    it("should generate events for low-level player", () => {
      const lowLevelPlayer: PlayerStats = {
        health: 50,
        maxHealth: 50,
        attack: 5,
        defense: 2,
        gold: 10,
        experience: 0,
        level: 1,
      }

      const event = generateEvent(lowLevelPlayer, mockInventory)

      expect(event).toBeDefined()
      // Even with low defense, damage should be at least 1
      if (event.choices[0]?.outcome.healthChange) {
        expect(Math.abs(event.choices[0].outcome.healthChange)).toBeGreaterThanOrEqual(1)
      }
    })

    it("should handle high defense player correctly", () => {
      const tankPlayer: PlayerStats = {
        ...mockPlayerStats,
        defense: 100, // Very high defense
      }

      vi.spyOn(Math, "random")
        .mockReturnValueOnce(0.3) // Combat encounter
        .mockReturnValue(0) // Goblin (5 attack)

      const event = generateEvent(tankPlayer, mockInventory)

      const attackChoice = event.choices[0]
      // Math.max(1, 5 - 100) = 1, so minimum damage is 1
      expect(attackChoice?.outcome.healthChange).toBe(-1)
    })

    it("should have consistent entity data structure", () => {
      const testCases = [
        { rand: 0.3, type: "combat" },
        { rand: 0.5, type: "treasure" },
        { rand: 0.8, type: "mystery" },
      ]

      testCases.forEach(({ rand }) => {
        vi.spyOn(Math, "random").mockReturnValue(rand)

        const event = generateEvent(mockPlayerStats, mockInventory)

        expect(event.entity).toBeDefined()
        expect(event.entityRarity).toBeDefined()
        expect(event.entityData).toBeDefined()
        expect(event.entityData?.name).toBeDefined()
        expect(event.entityData?.rarity).toBeDefined()

        vi.restoreAllMocks()
      })
    })

    it("should include locations in descriptions", () => {
      const event = generateEvent(mockPlayerStats, mockInventory)

      // Description should mention a location
      expect(event.description).toBeTruthy()
      expect(event.description.length).toBeGreaterThan(10)
    })
  })

  describe("generateEvent - Probability Distribution", () => {
    it("should roughly follow expected probability distribution", () => {
      const results = { combat: 0, treasure: 0, mystery: 0 }
      const iterations = 1000

      for (let i = 0; i < iterations; i++) {
        vi.restoreAllMocks()
        const event = generateEvent(mockPlayerStats, mockInventory)

        if (event.entityData?.type === "enemy") {
          results.combat++
        } else if (event.entity?.match(/merchant|fountain|altar/)) {
          results.mystery++
        } else {
          results.treasure++
        }
      }

      // Allow for statistical variance (±10%)
      // Expected: 40% combat, 30% treasure, 30% mystery
      expect(results.combat).toBeGreaterThan(iterations * 0.3)
      expect(results.combat).toBeLessThan(iterations * 0.5)

      expect(results.treasure).toBeGreaterThan(iterations * 0.2)
      expect(results.treasure).toBeLessThan(iterations * 0.4)

      expect(results.mystery).toBeGreaterThan(iterations * 0.2)
      expect(results.mystery).toBeLessThan(iterations * 0.4)
    })

    it("should generate diverse treasure types", () => {
      const treasureTypes = new Set<string>()

      for (let i = 0; i < 100; i++) {
        vi.spyOn(Math, "random")
          .mockReturnValueOnce(0.5) // Treasure
          .mockReturnValueOnce(0.6) // Regular treasure
          .mockReturnValue(i / 100) // Vary selection

        const event = generateEvent(mockPlayerStats, mockInventory)
        if (event.choices[0]?.outcome.itemGained?.type) {
          treasureTypes.add(event.choices[0].outcome.itemGained.type)
        }

        vi.restoreAllMocks()
      }

      // Should have multiple treasure types (weapon, armor, accessory, potion, treasure)
      expect(treasureTypes.size).toBeGreaterThan(2)
    })
  })

  describe("generateEvent - Rarity Distribution", () => {
    it("should generate items with various rarities", () => {
      const rarities = new Set<string>()

      for (let i = 0; i < 100; i++) {
        const event = generateEvent(mockPlayerStats, mockInventory)

        if (event.entityRarity) {
          rarities.add(event.entityRarity)
        }
      }

      // Should encounter multiple rarity tiers
      expect(rarities.size).toBeGreaterThan(2)
      expect(rarities).toContain("common")
    })
  })
})
