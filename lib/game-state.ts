"use client"

import type {
  PlayerStats,
  InventoryItem,
  Location,
  ActiveEffect,
  PortalSession,
} from "./game-engine"

export interface GeneratedPortrait {
  id: string
  imageUrl: string
  prompt: string
  timestamp: number
  isFavorite?: boolean
}

export interface GameState {
  playerStats: PlayerStats
  inventory: InventoryItem[]
  equippedItems: {
    weapon?: InventoryItem
    armor?: InventoryItem
    accessory?: InventoryItem
  }
  activeEffects: ActiveEffect[]
  openLocations: Location[]
  portalSessions: Record<string, PortalSession>
  obtainedArtifacts: string[] // IDs of portal-exclusive artifacts obtained globally
  activePortrait: string | null
  generatedPortraits: GeneratedPortrait[]
}

const GAME_STATE_KEY = "blackfell_game_state"

export function saveGameState(state: GameState) {
  try {
    localStorage.setItem(GAME_STATE_KEY, JSON.stringify(state))
  } catch (error) {
    console.error("[v0] Failed to save game state:", error)
  }
}

export function loadGameState(): GameState | null {
  try {
    const saved = localStorage.getItem(GAME_STATE_KEY)
    if (!saved) return null
    return JSON.parse(saved)
  } catch (error) {
    console.error("[v0] Failed to load game state:", error)
    return null
  }
}

export function clearGameState() {
  try {
    localStorage.removeItem(GAME_STATE_KEY)
  } catch (error) {
    console.error("[v0] Failed to clear game state:", error)
  }
}
