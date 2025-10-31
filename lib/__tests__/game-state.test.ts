import { describe, it, expect, beforeEach, vi } from "vitest"
import { saveGameState, loadGameState, clearGameState, type GameState } from "../game-state"

describe("game-state", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  const mockGameState: GameState = {
    playerStats: {
      health: 100,
      maxHealth: 100,
      attack: 10,
      defense: 5,
      gold: 50,
      experience: 0,
      level: 1,
    },
    inventory: [
      {
        id: "item1",
        name: "Health Potion",
        type: "potion",
        value: 20,
        rarity: "common",
        icon: "ra-potion",
      },
    ],
    equippedItems: {
      weapon: {
        id: "sword1",
        name: "Steel Sword",
        type: "weapon",
        value: 15,
        rarity: "uncommon",
        icon: "ra-sword",
        stats: { attack: 8 },
      },
    },
    activeEffects: [],
    openLocations: [],
    activePortrait: null,
    generatedPortraits: [],
  }

  describe("saveGameState", () => {
    it("should save game state to localStorage", () => {
      saveGameState(mockGameState)

      const saved = localStorage.getItem("blackfell_game_state")
      expect(saved).not.toBeNull()

      const parsed = JSON.parse(saved!) as GameState
      expect(parsed.playerStats.health).toBe(100)
      expect(parsed.inventory).toHaveLength(1)
      expect(parsed.equippedItems.weapon?.name).toBe("Steel Sword")
    })

    it("should handle complex nested state structures", () => {
      const complexState: GameState = {
        ...mockGameState,
        activeEffects: [
          {
            id: "effect1",
            name: "Strength Boost",
            statChanges: { attack: 50 },
            endTime: Date.now() + 60000,
            rarity: "uncommon",
          },
        ],
        openLocations: [
          {
            id: "loc1",
            name: "Dragon's Lair",
            entrancesRemaining: 3,
            maxEntrances: 5,
            rarity: "legendary",
            stability: 85,
          },
        ],
        generatedPortraits: [
          {
            id: "portrait1",
            imageUrl: "https://example.com/image.png",
            prompt: "A brave warrior",
            timestamp: Date.now(),
          },
        ],
      }

      saveGameState(complexState)

      const saved = localStorage.getItem("blackfell_game_state")
      const parsed = JSON.parse(saved!) as GameState

      expect(parsed.activeEffects).toHaveLength(1)
      expect(parsed.activeEffects[0]?.name).toBe("Strength Boost")
      expect(parsed.openLocations).toHaveLength(1)
      expect(parsed.openLocations[0]?.stability).toBe(85)
      expect(parsed.generatedPortraits).toHaveLength(1)
    })

    it("should handle localStorage errors gracefully", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      const setItemSpy = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
        throw new Error("Storage quota exceeded")
      })

      // Should not throw
      expect(() => saveGameState(mockGameState)).not.toThrow()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[v0] Failed to save game state:",
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
      setItemSpy.mockRestore()
    })

    it("should overwrite existing state", () => {
      saveGameState(mockGameState)

      const updatedState: GameState = {
        ...mockGameState,
        playerStats: { ...mockGameState.playerStats, gold: 100 },
      }

      saveGameState(updatedState)

      const saved = localStorage.getItem("blackfell_game_state")
      const parsed = JSON.parse(saved!) as GameState
      expect(parsed.playerStats.gold).toBe(100)
    })
  })

  describe("loadGameState", () => {
    it("should load game state from localStorage", () => {
      saveGameState(mockGameState)

      const loaded = loadGameState()

      expect(loaded).not.toBeNull()
      expect(loaded?.playerStats.health).toBe(100)
      expect(loaded?.inventory).toHaveLength(1)
      expect(loaded?.equippedItems.weapon?.name).toBe("Steel Sword")
    })

    it("should return null when no saved state exists", () => {
      const loaded = loadGameState()
      expect(loaded).toBeNull()
    })

    it("should handle corrupted JSON gracefully", () => {
      localStorage.setItem("blackfell_game_state", "{ invalid json }")
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      const loaded = loadGameState()

      expect(loaded).toBeNull()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[v0] Failed to load game state:",
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })

    it("should handle localStorage.getItem errors gracefully", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      const getItemSpy = vi.spyOn(localStorage, "getItem").mockImplementation(() => {
        throw new Error("Storage access denied")
      })

      const loaded = loadGameState()

      expect(loaded).toBeNull()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[v0] Failed to load game state:",
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
      getItemSpy.mockRestore()
    })

    it("should handle empty string as no saved state", () => {
      localStorage.setItem("blackfell_game_state", "")

      const loaded = loadGameState()
      expect(loaded).toBeNull()
    })

    it("should correctly parse state with all optional fields", () => {
      const stateWithOptionals: GameState = {
        ...mockGameState,
        equippedItems: {
          armor: {
            id: "armor1",
            name: "Plate Armor",
            type: "armor",
            value: 35,
            rarity: "rare",
            icon: "ra-shield",
            stats: { defense: 12 },
          },
        },
        activePortrait: "portrait1",
      }

      saveGameState(stateWithOptionals)
      const loaded = loadGameState()

      expect(loaded?.equippedItems.weapon).toBeUndefined()
      expect(loaded?.equippedItems.armor?.name).toBe("Plate Armor")
      expect(loaded?.activePortrait).toBe("portrait1")
    })
  })

  describe("clearGameState", () => {
    it("should remove game state from localStorage", () => {
      saveGameState(mockGameState)
      expect(localStorage.getItem("blackfell_game_state")).not.toBeNull()

      clearGameState()

      expect(localStorage.getItem("blackfell_game_state")).toBeNull()
    })

    it("should handle clearing when no state exists", () => {
      // Should not throw
      expect(() => clearGameState()).not.toThrow()
    })

    it("should handle localStorage.removeItem errors gracefully", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      const removeItemSpy = vi.spyOn(localStorage, "removeItem").mockImplementation(() => {
        throw new Error("Storage access denied")
      })

      // Should not throw
      expect(() => clearGameState()).not.toThrow()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[v0] Failed to clear game state:",
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
      removeItemSpy.mockRestore()
    })

    it("should allow saving new state after clearing", () => {
      saveGameState(mockGameState)
      clearGameState()

      const newState: GameState = {
        ...mockGameState,
        playerStats: { ...mockGameState.playerStats, level: 2 },
      }

      saveGameState(newState)
      const loaded = loadGameState()

      expect(loaded?.playerStats.level).toBe(2)
    })
  })

  describe("integration tests", () => {
    it("should handle save, load, clear cycle", () => {
      // Save
      saveGameState(mockGameState)
      let loaded = loadGameState()
      expect(loaded?.playerStats.gold).toBe(50)

      // Update and save again
      const updated: GameState = {
        ...mockGameState,
        playerStats: { ...mockGameState.playerStats, gold: 75 },
      }
      saveGameState(updated)
      loaded = loadGameState()
      expect(loaded?.playerStats.gold).toBe(75)

      // Clear
      clearGameState()
      loaded = loadGameState()
      expect(loaded).toBeNull()
    })

    it("should handle rapid successive saves", () => {
      for (let i = 0; i < 10; i++) {
        const state: GameState = {
          ...mockGameState,
          playerStats: { ...mockGameState.playerStats, gold: i * 10 },
        }
        saveGameState(state)
      }

      const loaded = loadGameState()
      expect(loaded?.playerStats.gold).toBe(90)
    })
  })
})
