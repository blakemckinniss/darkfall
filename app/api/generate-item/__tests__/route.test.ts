import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { NextRequest } from "next/server"
import { POST } from "../route"

// Mock AI SDK
vi.mock("ai", () => ({
  generateText: vi.fn(),
}))

// Mock crypto.randomUUID
vi.stubGlobal("crypto", {
  randomUUID: vi.fn(() => "test-uuid-12345"),
})

import { generateText } from "ai"

describe("POST /api/generate-item", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock console methods
    vi.spyOn(console, "log").mockImplementation(() => {})
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const createMockRequest = (body: unknown): NextRequest => {
    return {
      json: () => Promise.resolve(body),
    } as NextRequest
  }

  describe("Success Cases", () => {
    it("should generate item with valid prompt", async () => {
      const mockItemData = {
        name: "Flame Sword",
        type: "weapon",
        value: 50,
        rarity: "rare",
        icon: "ra-fire-sword",
        stats: { attack: 15 },
      }

      vi.mocked(generateText).mockResolvedValue({
        text: JSON.stringify(mockItemData),
      } as Awaited<ReturnType<typeof generateText>>)

      const request = createMockRequest({ prompt: "A flaming sword" })
      const response = await POST(request)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.item.name).toBe("Flame Sword")
      expect(data.item.type).toBe("weapon")
      expect(data.item.id).toBe("test-uuid-12345")
      expect(data.item.stats).toEqual({ attack: 15 })
    })

    it("should call generateText with correct parameters", async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: JSON.stringify({
          name: "Test",
          type: "potion",
          value: 10,
          rarity: "common",
          icon: "ra-potion",
        }),
      } as Awaited<ReturnType<typeof generateText>>)

      const request = createMockRequest({ prompt: "A healing potion" })
      await POST(request)

      expect(generateText).toHaveBeenCalledWith({
        model: expect.objectContaining({ modelId: "mixtral-8x7b-32768" }),
        system: expect.stringContaining("game item generator"),
        prompt: "A healing potion",
        temperature: 0.8,
      })
    })

    it("should handle markdown code blocks in response", async () => {
      const mockItemData = {
        name: "Iron Shield",
        type: "armor",
        value: 30,
        rarity: "uncommon",
        icon: "ra-shield",
        stats: { defense: 8 },
      }

      vi.mocked(generateText).mockResolvedValue({
        text: `\`\`\`json\n${JSON.stringify(mockItemData)}\n\`\`\``,
      } as Awaited<ReturnType<typeof generateText>>)

      const request = createMockRequest({ prompt: "A sturdy shield" })
      const response = await POST(request)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.item.name).toBe("Iron Shield")
      expect(data.item.type).toBe("armor")
    })

    it("should generate common rarity items", async () => {
      const commonItem = {
        name: "Rusty Dagger",
        type: "weapon",
        value: 10,
        rarity: "common",
        icon: "ra-sword",
        stats: { attack: 3 },
      }

      vi.mocked(generateText).mockResolvedValue({
        text: JSON.stringify(commonItem),
      } as Awaited<ReturnType<typeof generateText>>)

      const request = createMockRequest({ prompt: "A simple dagger" })
      const response = await POST(request)

      const data = await response.json()
      expect(data.item.rarity).toBe("common")
      expect(data.item.value).toBeLessThan(25)
    })

    it("should generate legendary rarity items", async () => {
      const legendaryItem = {
        name: "Excalibur",
        type: "weapon",
        value: 120,
        rarity: "legendary",
        icon: "ra-sword",
        stats: { attack: 35 },
      }

      vi.mocked(generateText).mockResolvedValue({
        text: JSON.stringify(legendaryItem),
      } as Awaited<ReturnType<typeof generateText>>)

      const request = createMockRequest({ prompt: "A legendary sword" })
      const response = await POST(request)

      const data = await response.json()
      expect(data.item.rarity).toBe("legendary")
      expect(data.item.value).toBeGreaterThan(100)
    })

    it("should generate items without stats (potions, treasures)", async () => {
      const potion = {
        name: "Health Potion",
        type: "potion",
        value: 15,
        rarity: "common",
        icon: "ra-potion",
      }

      vi.mocked(generateText).mockResolvedValue({
        text: JSON.stringify(potion),
      } as Awaited<ReturnType<typeof generateText>>)

      const request = createMockRequest({ prompt: "A health potion" })
      const response = await POST(request)

      const data = await response.json()
      expect(data.item.stats).toBeUndefined()
      expect(data.item.type).toBe("potion")
    })

    it("should generate accessories with mixed stats", async () => {
      const accessory = {
        name: "Amulet of Protection",
        type: "accessory",
        value: 40,
        rarity: "rare",
        icon: "ra-gem-pendant",
        stats: { attack: 5, defense: 5, health: 10 },
      }

      vi.mocked(generateText).mockResolvedValue({
        text: JSON.stringify(accessory),
      } as Awaited<ReturnType<typeof generateText>>)

      const request = createMockRequest({ prompt: "A protective amulet" })
      const response = await POST(request)

      const data = await response.json()
      expect(data.item.type).toBe("accessory")
      expect(data.item.stats).toBeDefined()
    })

    it("should add unique ID to generated items", async () => {
      const mockItem = {
        name: "Test Item",
        type: "treasure",
        value: 25,
        rarity: "uncommon",
        icon: "ra-gold-bar",
      }

      vi.mocked(generateText).mockResolvedValue({
        text: JSON.stringify(mockItem),
      } as Awaited<ReturnType<typeof generateText>>)

      const request = createMockRequest({ prompt: "Some treasure" })
      const response = await POST(request)

      const data = await response.json()
      expect(data.item.id).toBe("test-uuid-12345")
    })
  })

  describe("Error Cases", () => {
    it("should return 400 when prompt is missing", async () => {
      const request = createMockRequest({})
      const response = await POST(request)

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBe("Prompt is required")
    })

    it("should return 400 when prompt is empty string", async () => {
      const request = createMockRequest({ prompt: "" })
      const response = await POST(request)

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBe("Prompt is required")
    })

    it("should return 400 when prompt is null", async () => {
      const request = createMockRequest({ prompt: null })
      const response = await POST(request)

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBe("Prompt is required")
    })

    it("should handle AI API errors", async () => {
      vi.mocked(generateText).mockRejectedValue(new Error("API error"))

      const request = createMockRequest({ prompt: "Test item" })
      const response = await POST(request)

      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.error).toBe("Failed to generate item. Please try again.")
    })

    it("should handle invalid JSON from AI", async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: "This is not JSON",
      } as Awaited<ReturnType<typeof generateText>>)

      const request = createMockRequest({ prompt: "Test item" })
      const response = await POST(request)

      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.error).toBe("Failed to generate item. Please try again.")
    })

    it("should handle malformed JSON from AI", async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: '{"name": "Test", "type": "weapon", invalid json',
      } as Awaited<ReturnType<typeof generateText>>)

      const request = createMockRequest({ prompt: "Test item" })
      const response = await POST(request)

      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.error).toBe("Failed to generate item. Please try again.")
    })

    it("should handle network errors", async () => {
      vi.mocked(generateText).mockRejectedValue(new Error("Network timeout"))

      const request = createMockRequest({ prompt: "Test item" })
      const response = await POST(request)

      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.error).toBe("Failed to generate item. Please try again.")
    })

    it("should handle invalid JSON in request", async () => {
      const request = {
        json: () => Promise.reject(new Error("Invalid JSON")),
      } as unknown as NextRequest

      const response = await POST(request)

      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.error).toBe("Failed to generate item. Please try again.")
    })
  })

  describe("System Prompt", () => {
    it("should include comprehensive item type options", async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: JSON.stringify({
          name: "Test",
          type: "weapon",
          value: 10,
          rarity: "common",
          icon: "ra-sword",
        }),
      } as Awaited<ReturnType<typeof generateText>>)

      const request = createMockRequest({ prompt: "Test" })
      await POST(request)

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining("weapon"),
        })
      )

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining("armor"),
        })
      )

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining("consumable"),
        })
      )
    })

    it("should include rarity guidelines", async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: JSON.stringify({
          name: "Test",
          type: "weapon",
          value: 10,
          rarity: "common",
          icon: "ra-sword",
        }),
      } as Awaited<ReturnType<typeof generateText>>)

      const request = createMockRequest({ prompt: "Test" })
      await POST(request)

      const callArgs = vi.mocked(generateText).mock.calls[0]
      const systemPrompt = callArgs?.[0]?.system ?? ""

      expect(systemPrompt).toContain("Common items")
      expect(systemPrompt).toContain("Legendary items")
      expect(systemPrompt).toContain("value")
    })

    it("should specify JSON-only response format", async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: JSON.stringify({
          name: "Test",
          type: "weapon",
          value: 10,
          rarity: "common",
          icon: "ra-sword",
        }),
      } as Awaited<ReturnType<typeof generateText>>)

      const request = createMockRequest({ prompt: "Test" })
      await POST(request)

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining("ONLY with valid JSON"),
        })
      )
    })
  })

  describe("Logging", () => {
    it("should log generation request", async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: JSON.stringify({
          name: "Test",
          type: "weapon",
          value: 10,
          rarity: "common",
          icon: "ra-sword",
        }),
      } as Awaited<ReturnType<typeof generateText>>)

      const request = createMockRequest({ prompt: "Test prompt" })
      await POST(request)

      expect(console.log).toHaveBeenCalledWith(
        "[v0] Generating item with Groq for prompt:",
        "Test prompt"
      )
    })

    it("should log generated item", async () => {
      const mockItem = {
        name: "Test",
        type: "weapon",
        value: 10,
        rarity: "common",
        icon: "ra-sword",
      }

      vi.mocked(generateText).mockResolvedValue({
        text: JSON.stringify(mockItem),
      } as Awaited<ReturnType<typeof generateText>>)

      const request = createMockRequest({ prompt: "Test" })
      await POST(request)

      expect(console.log).toHaveBeenCalledWith(
        "[v0] Generated item:",
        expect.objectContaining({ id: expect.any(String) })
      )
    })

    it("should log errors", async () => {
      vi.mocked(generateText).mockRejectedValue(new Error("Test error"))

      const request = createMockRequest({ prompt: "Test" })
      await POST(request)

      expect(console.error).toHaveBeenCalledWith("[v0] Error generating item:", expect.any(Error))
    })
  })

  describe("Response Cleaning", () => {
    it("should handle multiple code block formats", async () => {
      const mockItem = {
        name: "Test",
        type: "weapon",
        value: 10,
        rarity: "common",
        icon: "ra-sword",
      }

      const formats = [
        `\`\`\`json\n${JSON.stringify(mockItem)}\n\`\`\``,
        `\`\`\`\n${JSON.stringify(mockItem)}\n\`\`\``,
        `\`\`\`json${JSON.stringify(mockItem)}\`\`\``,
        JSON.stringify(mockItem),
      ]

      await Promise.all(
        formats.map(async (format) => {
          vi.clearAllMocks()

          vi.mocked(generateText).mockResolvedValue({
            text: format,
          } as Awaited<ReturnType<typeof generateText>>)

          const request = createMockRequest({ prompt: "Test" })
          const response = await POST(request)

          expect(response.status).toBe(200)

          const data = await response.json()
          expect(data.item.name).toBe("Test")
        })
      )
    })

    it("should trim whitespace", async () => {
      const mockItem = {
        name: "Test",
        type: "weapon",
        value: 10,
        rarity: "common",
        icon: "ra-sword",
      }

      vi.mocked(generateText).mockResolvedValue({
        text: `   \n${JSON.stringify(mockItem)}\n   `,
      } as Awaited<ReturnType<typeof generateText>>)

      const request = createMockRequest({ prompt: "Test" })
      const response = await POST(request)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.item.name).toBe("Test")
    })
  })
})
