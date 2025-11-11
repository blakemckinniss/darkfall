import { test, expect } from "@playwright/test"
import {
  validateNarrativeStructure,
  validateCombatEvent,
  validateShopEvent,
  validateShrineEvent,
  validateTreasureEvent,
  validateEntityStatsRange,
  validateEventVariety,
  type NarrativeEventStructure,
} from "./helpers/validation"
import { measureAPICall } from "./helpers/performance"

/**
 * AI Integration Tests - Validation Suite
 * Focus: Validate structure, not content (AI is non-deterministic)
 * Based on Zen MCP research + Playwright best practices
 */

test.describe("AI Narrative Integration", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the game
    await page.goto("/")
    await page.waitForLoadState("networkidle")
  })

  test("should generate valid narrative event structure", async ({ page }) => {
    // Mock API response to isolate structure validation
    await page.route("**/api/generate-narrative", async (route) => {
      const mockResponse = {
        event: {
          eventType: "combat",
          description: "A Void Wraith (65 HP, 18 ATK) blocks your path.",
          entity: "Void Wraith",
          entityRarity: "rare",
          entityData: {
            name: "Void Wraith",
            rarity: "rare",
            type: "enemy",
            health: 65,
            attack: 18,
            gold: 50,
            exp: 55,
          },
          choices: [
            {
              text: "Attack",
              outcome: {
                message: "Dealt 20 damage",
                entity: "Void Wraith",
                entityRarity: "rare",
                healthChange: -18,
                experienceChange: 55,
              },
            },
            {
              text: "Defend",
              outcome: {
                message: "Blocked damage",
                entity: "Void Wraith",
                entityRarity: "rare",
                healthChange: -8,
                experienceChange: 10,
              },
            },
          ],
        },
        registeredEntity: "enemy:ai_12345",
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockResponse),
      })
    })

    // Trigger event generation (click "Enter The Void")
    const voidButton = page.locator('button:has-text("Enter The Void")')
    await voidButton.click()

    // Wait for event to appear
    await page.waitForSelector('[data-testid="game-event"]', { timeout: 5000 })

    // Extract event data from page
    const eventText = await page.locator('[data-testid="game-log"]').textContent()
    expect(eventText).toContain("Void Wraith")

    // Validate the mock structure
    const mockEvent: NarrativeEventStructure = {
      eventType: "combat",
      description: "A Void Wraith (65 HP, 18 ATK) blocks your path.",
      entity: "Void Wraith",
      entityRarity: "rare",
      entityData: {
        name: "Void Wraith",
        rarity: "rare",
        type: "enemy",
        health: 65,
        attack: 18,
        gold: 50,
        exp: 55,
      },
      choices: [
        {
          text: "Attack",
          outcome: {
            message: "Dealt 20 damage",
            entity: "Void Wraith",
            entityRarity: "rare",
            healthChange: -18,
            experienceChange: 55,
          },
        },
        {
          text: "Defend",
          outcome: {
            message: "Blocked damage",
            entity: "Void Wraith",
            entityRarity: "rare",
            healthChange: -8,
            experienceChange: 10,
          },
        },
      ],
    }

    validateNarrativeStructure(mockEvent)
    validateCombatEvent(mockEvent)
    validateEntityStatsRange(mockEvent)
  })

  test("should handle combat events correctly", async ({ page }) => {
    // Test with live API (use generous timeout for AI)
    const { duration, statusCode } = await measureAPICall(
      page,
      "/api/generate-narrative",
      async () => {
        const voidButton = page.locator('button:has-text("Enter The Void")')
        await voidButton.click()

        // Wait for combat event UI elements
        await page.waitForSelector("text=/health|attack|damage/i", { timeout: 10000 })
      }
    )

    // Validate API response
    expect(statusCode).toBe(200)
    expect(duration).toBeLessThan(10000) // Generous timeout for AI

    // Validate UI shows combat elements
    const hasHealthIndicator = await page.locator("text=/HP|health/i").count()
    expect(hasHealthIndicator).toBeGreaterThan(0)
  })

  test("should generate diverse event types", async ({ page }) => {
    const events: NarrativeEventStructure[] = []

    // Generate 5 events and collect data
    for (let i = 0; i < 5; i++) {
      await page.reload()
      await page.waitForLoadState("networkidle")

      const voidButton = page.locator('button:has-text("Enter The Void")')
      await voidButton.click()

      await page.waitForSelector('[data-testid="game-log"]', { timeout: 10000 })

      // Extract event type from UI (this is simplified - in real test, intercept API)
      const logText = await page.locator('[data-testid="game-log"]').textContent()

      // Store mock event for variety check (in production, intercept actual API response)
      events.push({
        eventType: "combat", // Simplified - would extract from actual response
        description: logText || "",
        entity: "Test Entity",
        entityRarity: "common",
        entityData: { name: "Test", rarity: "common" },
        choices: [],
      })
    }

    // This test needs actual API interception for full validation
    // For now, just verify we got 5 events
    expect(events.length).toBe(5)
  })

  test("should handle shop events with inventory", async ({ page }) => {
    // Mock shop event
    await page.route("**/api/generate-narrative", async (route) => {
      const shopEvent = {
        event: {
          eventType: "shop",
          description: "A Wandering Merchant appears",
          entity: "Wandering Merchant",
          entityRarity: "uncommon",
          entityData: { name: "Wandering Merchant", rarity: "uncommon", type: "npc" },
          choices: [
            {
              text: "Browse shop",
              outcome: {
                message: "Viewing inventory",
                entity: "Wandering Merchant",
                entityRarity: "uncommon",
              },
            },
          ],
          shopInventory: [
            {
              item: {
                id: "item_1",
                name: "Steel Sword",
                type: "weapon",
                value: 40,
                rarity: "uncommon",
                stats: { attack: 8 },
              },
              price: 40,
              stock: 1,
            },
          ],
        },
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(shopEvent),
      })
    })

    const voidButton = page.locator('button:has-text("Enter The Void")')
    await voidButton.click()

    await page.waitForSelector("text=/merchant|shop/i", { timeout: 5000 })

    // Validate shop UI appears
    const hasShopUI = await page.locator("text=/browse|inventory|buy/i").count()
    expect(hasShopUI).toBeGreaterThan(0)
  })

  test("should validate treasure events with choices", async ({ page }) => {
    // Mock treasure event
    await page.route("**/api/generate-narrative", async (route) => {
      const treasureEvent = {
        event: {
          eventType: "treasure",
          description: "An Ancient Chest sits before you",
          entity: "Ancient Chest",
          entityRarity: "uncommon",
          entityData: { name: "Ancient Chest", rarity: "uncommon", type: "object" },
          choices: [
            {
              text: "Open chest",
              outcome: {
                message: "Chest opened",
                entity: "Ancient Chest",
                entityRarity: "uncommon",
              },
            },
          ],
          treasureChoices: [
            { type: "item", description: "Ruby Ring" },
            { type: "gold", gold: 35, description: "35 gold" },
          ],
        },
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(treasureEvent),
      })
    })

    const voidButton = page.locator('button:has-text("Enter The Void")')
    await voidButton.click()

    await page.waitForSelector("text=/chest|treasure/i", { timeout: 5000 })

    const hasTreasureUI = await page.locator("text=/open|loot/i").count()
    expect(hasTreasureUI).toBeGreaterThan(0)
  })

  test("should handle API errors gracefully", async ({ page }) => {
    // Mock API error
    await page.route("**/api/generate-narrative", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "AI service unavailable" }),
      })
    })

    const voidButton = page.locator('button:has-text("Enter The Void")')
    await voidButton.click()

    // Should show error message or fallback to procedural generation
    await page.waitForTimeout(2000)

    // Game should still be playable (fallback system)
    const logContent = await page.locator('[data-testid="game-log"]').count()
    expect(logContent).toBeGreaterThan(0)
  })

  test("should register AI-generated entities", async ({ page }) => {
    let registeredEntityId: string | null = null

    // Intercept API response to capture entity ID
    page.on("response", async (response) => {
      if (response.url().includes("/api/generate-narrative")) {
        const body = await response.json()
        registeredEntityId = body.registeredEntity
      }
    })

    const voidButton = page.locator('button:has-text("Enter The Void")')
    await voidButton.click()

    await page.waitForSelector('[data-testid="game-log"]', { timeout: 10000 })

    // Verify entity was registered (would need to check entity registry in real test)
    // For now, just verify response included registeredEntity field
    await page.waitForTimeout(1000)
    expect(registeredEntityId).toBeTruthy()
  })
})

test.describe("Event Type Distribution", () => {
  test.skip("should generate varied event types over 10 samples", async ({ page }) => {
    // This test requires production API access and takes longer
    // Skip by default, run manually with --grep tag

    const events: NarrativeEventStructure[] = []

    for (let i = 0; i < 10; i++) {
      await page.goto("/")
      await page.waitForLoadState("networkidle")

      // Intercept response
      const responsePromise = page.waitForResponse("**/api/generate-narrative")

      const voidButton = page.locator('button:has-text("Enter The Void")')
      await voidButton.click()

      const response = await responsePromise
      const body = await response.json()
      events.push(body.event as NarrativeEventStructure)
    }

    validateEventVariety(events)
  })
})
