"use client"

import type React from "react"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AnimatedNumber } from "@/components/animated-number"
import { FloatingNumberContainer } from "@/components/floating-number"
import { LootAnimationContainer } from "@/components/loot-animation"
import { Input } from "@/components/ui/input"
import {
  generateEvent,
  type GameEvent,
  type PlayerStats,
  type InventoryItem,
  type Location,
  type ActiveEffect,
  type TreasureChoice,
} from "@/lib/game-engine"
import { saveGameState, loadGameState, type GeneratedPortrait } from "@/lib/game-state"
import type { Rarity, Stats } from "@/lib/types"
import { ENTITIES, RARITY_COLORS, type EntityType } from "@/lib/entities"
import type { DamageSource } from "@/lib/animations"

interface LogEntry {
  id: string
  text: string
  timestamp: number
  entity?: string | undefined
  entityRarity?: Rarity | undefined
  entityData?:
    | {
        name: string
        rarity: Rarity
        type?: string | undefined
        stats?: Stats | undefined
        gold?: number | undefined
        exp?: number | undefined
        entrances?: number | undefined
      }
    | undefined
  choices?: GameEvent["choices"] | undefined
  showChoices?: boolean | undefined
  treasureChoices?: TreasureChoice[] | undefined
  showTreasureChoices?: boolean | undefined
}

interface EquippedItems {
  weapon?: InventoryItem
  armor?: InventoryItem
  accessory?: InventoryItem
}

export function DungeonCrawler() {
  const [baseStats, setBaseStats] = useState<PlayerStats>({
    health: 100,
    maxHealth: 100,
    attack: 10,
    defense: 5,
    gold: 50,
    experience: 0,
    level: 1,
  })

  const [inventory, setInventory] = useState<InventoryItem[]>([
    {
      id: "1",
      name: "Rusty Sword",
      type: "weapon",
      value: 5,
      stats: { attack: 3 },
      rarity: "common",
      icon: "ra-sword",
    },
    {
      id: "2",
      name: "Leather Armor",
      type: "armor",
      value: 3,
      stats: { defense: 2 },
      rarity: "common",
      icon: "ra-shield",
    },
    {
      id: "3",
      name: "Iron Ring",
      type: "accessory",
      value: 8,
      stats: { attack: 1, defense: 1 },
      rarity: "common",
      icon: "ra-gem-pendant",
    },
    {
      id: "4",
      name: "Steel Dagger",
      type: "weapon",
      value: 15,
      stats: { attack: 6 },
      rarity: "uncommon",
      icon: "ra-dagger",
    },
    {
      id: "5",
      name: "Enchanted Bow",
      type: "weapon",
      value: 35,
      stats: { attack: 10 },
      rarity: "rare",
      icon: "ra-bow",
    },
    {
      id: "6",
      name: "Dragon Scale Armor",
      type: "armor",
      value: 75,
      stats: { defense: 15, health: 20 },
      rarity: "epic",
      icon: "ra-shield",
    },
    {
      id: "7",
      name: "Crown of the Ancients",
      type: "accessory",
      value: 150,
      stats: { attack: 12, defense: 12, health: 30 },
      rarity: "legendary",
      icon: "ra-crown",
    },
  ])

  const [equippedItems, setEquippedItems] = useState<EquippedItems>({
    weapon: {
      id: "1",
      name: "Rusty Sword",
      type: "weapon",
      value: 5,
      stats: { attack: 3 },
      rarity: "common",
      icon: "ra-sword",
    },
    armor: {
      id: "2",
      name: "Leather Armor",
      type: "armor",
      value: 3,
      stats: { defense: 2 },
      rarity: "common",
      icon: "ra-shield",
    },
  })

  const [activeEffects, setActiveEffects] = useState<ActiveEffect[]>([])

  const [openLocations, setOpenLocations] = useState<Location[]>([])
  const [activeTab, setActiveTab] = useState<string>("portal")
  const [activeLocation, setActiveLocation] = useState<string | null>(null)

  const [logEntries, setLogEntries] = useState<LogEntry[]>([])
  const [currentEvent, setCurrentEvent] = useState<GameEvent | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalContent, setModalContent] = useState<{ title: string; description: string } | null>(
    null
  )
  const logContainerRef = useRef<HTMLDivElement>(null)

  const [draggedItemId, setDraggedItemId] = useState<string | null>(null)
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null)

  const [playerPortrait, setPlayerPortrait] = useState<string | null>(null)
  const [isGeneratingPortrait, setIsGeneratingPortrait] = useState(false)
  const [portraitPrompt, setPortraitPrompt] = useState("Dark Wizard Witch")
  const [generatedPortraits, setGeneratedPortraits] = useState<GeneratedPortrait[]>([])
  const [currentPortraitIndex, setCurrentPortraitIndex] = useState(0)

  const [itemPrompt, setItemPrompt] = useState("")
  const [isGeneratingItem, setIsGeneratingItem] = useState(false)

  // Entity registry state
  const [entityStats, setEntityStats] = useState(() => ENTITIES.stats())
  const [expandedEntityType, setExpandedEntityType] = useState<string | null>(null)

  // Developer panel tab state with localStorage persistence
  const [developerActiveTab, setDeveloperActiveTab] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("developerActiveTab") || "ai-tools"
    }
    return "ai-tools"
  })

  // Debug console state
  interface DebugLogEntry {
    id: string
    timestamp: number
    type: "game" | "ai" | "state" | "error" | "system"
    message: string
    data?: unknown
  }
  const [debugLogs, setDebugLogs] = useState<DebugLogEntry[]>(() => {
    // Load persisted logs from localStorage (max 100 entries)
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("debugLogs")
        if (saved) {
          const parsed = JSON.parse(saved) as DebugLogEntry[]
          return parsed.slice(-100) // Keep only last 100
        }
      } catch (error) {
        console.error("[Debug] Failed to load persisted logs:", error)
      }
    }
    return []
  })
  const debugLogRef = useRef<HTMLDivElement>(null)
  const [debugLogFilters, setDebugLogFilters] = useState<Set<DebugLogEntry["type"]>>(() => {
    // Load persisted filters from localStorage
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("debugLogFilters")
        if (saved) {
          const parsed = JSON.parse(saved) as string[]
          return new Set(parsed as DebugLogEntry["type"][])
        }
      } catch (error) {
        console.error("[Debug] Failed to load persisted filters:", error)
      }
    }
    return new Set(["system", "state", "game", "ai", "error"])
  })
  const [debugLogSearchQuery, setDebugLogSearchQuery] = useState("")
  const [debugTimestampFormat, setDebugTimestampFormat] = useState<"absolute" | "relative">(
    "absolute"
  )
  const [expandedLogData, setExpandedLogData] = useState<Set<string>>(new Set())
  const [, setRefreshTimestamp] = useState(Date.now())

  // Helper function to add debug logs
  const addDebugLog = (type: DebugLogEntry["type"], message: string, data?: unknown) => {
    const newLog: DebugLogEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type,
      message,
      data,
    }
    setDebugLogs((prev) => [...prev.slice(-99), newLog]) // Keep last 100 logs
  }

  // Helper to toggle log filter
  const toggleLogFilter = (type: DebugLogEntry["type"]) => {
    setDebugLogFilters((prev) => {
      const newFilters = new Set(prev)
      if (newFilters.has(type)) {
        newFilters.delete(type)
      } else {
        newFilters.add(type)
      }
      return newFilters
    })
  }

  // Helper to export logs
  const exportDebugLogs = () => {
    const logsText = debugLogs
      .map((log) => {
        const time = new Date(log.timestamp).toISOString()
        const dataStr = log.data ? `\n  ${JSON.stringify(log.data, null, 2)}` : ""
        return `[${time}] [${log.type.toUpperCase()}] ${log.message}${dataStr}`
      })
      .join("\n\n")

    const blob = new Blob([logsText], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `debug-logs-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`
    a.click()
    URL.revokeObjectURL(url)
    addDebugLog("system", `Exported ${debugLogs.length} logs to file`)
  }

  // Helper to clear logs with persistence cleanup
  const clearDebugLogs = () => {
    setDebugLogs([])
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("debugLogs")
      } catch (error) {
        console.error("[Debug] Failed to clear persisted logs:", error)
      }
    }
  }

  // Helper to format relative time
  const formatRelativeTime = (timestamp: number): string => {
    const now = Date.now()
    const diff = now - timestamp
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (seconds < 5) return "just now"
    if (seconds < 60) return `${seconds}s ago`
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  // Helper to copy log to clipboard
  const copyLogToClipboard = (log: DebugLogEntry) => {
    const time = new Date(log.timestamp).toISOString()
    const dataStr = log.data ? `\n${JSON.stringify(log.data, null, 2)}` : ""
    const text = `[${time}] [${log.type.toUpperCase()}] ${log.message}${dataStr}`

    navigator.clipboard
      .writeText(text)
      .then(() => {
        addDebugLog("system", `Copied log to clipboard: ${log.message.substring(0, 50)}...`)
      })
      .catch((error) => {
        console.error("[Debug] Failed to copy to clipboard:", error)
      })
  }

  // Helper to highlight search matches in text
  const highlightSearchMatch = (text: string, query: string): React.ReactNode => {
    if (!query) return text

    const parts = text.split(new RegExp(`(${query})`, "gi"))

    return (
      <>
        {parts.map((part, index) => {
          // Generate stable key using part content and position in the full text
          const stableKey = `${part.slice(0, 20)}-${index}-${part.length}`
          return part.toLowerCase() === query.toLowerCase() ? (
            <mark key={`match-${stableKey}`} className="bg-yellow-500/30 text-yellow-200">
              {part}
            </mark>
          ) : (
            <span key={`text-${stableKey}`}>{part}</span>
          )
        })}
      </>
    )
  }

  // Helper to toggle expanded data for a log entry
  const toggleLogDataExpanded = (logId: string) => {
    setExpandedLogData((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(logId)) {
        newSet.delete(logId)
      } else {
        newSet.add(logId)
      }
      return newSet
    })
  }

  // Helper to get severity badge emoji
  const getSeverityBadge = (type: DebugLogEntry["type"]): string => {
    if (type === "error") return "🔴"
    if (type === "ai") return "🟣"
    if (type === "state") return "🔵"
    if (type === "game") return "🟢"
    return "🟡"
  }

  // Performance optimization: ref for debounced save timeout
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    const savedState = loadGameState()
    if (savedState) {
      console.log("[v0] Loading saved game state:", savedState)
      addDebugLog("system", "Loading saved game state from localStorage")
      setBaseStats(savedState.playerStats)
      setInventory(savedState.inventory)
      setEquippedItems(savedState.equippedItems)
      setActiveEffects(savedState.activeEffects.filter((effect) => effect.endTime > Date.now()))
      setOpenLocations(savedState.openLocations)
      setPlayerPortrait(savedState.activePortrait)
      setGeneratedPortraits(savedState.generatedPortraits || [])
      console.log("[v0] Player portrait loaded:", savedState.activePortrait)
      console.log("[v0] Generated portraits loaded:", savedState.generatedPortraits)
      addDebugLog(
        "state",
        `Game loaded: Level ${savedState.playerStats.level}, ${savedState.inventory.length} items`
      )
    } else {
      addDebugLog("system", "No saved game state found - starting fresh")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Performance optimization: Debounced game state save (P0)
  useEffect(() => {
    clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      const gameState = {
        playerStats: baseStats,
        inventory,
        equippedItems,
        activeEffects,
        openLocations,
        activePortrait: playerPortrait,
        generatedPortraits,
      }
      saveGameState(gameState)
    }, 500) // Save 500ms after last state change

    return () => clearTimeout(saveTimeoutRef.current)
  }, [
    baseStats,
    inventory,
    equippedItems,
    activeEffects,
    openLocations,
    playerPortrait,
    generatedPortraits,
  ])

  // Persist developer tab selection to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("developerActiveTab", developerActiveTab)
    }
  }, [developerActiveTab])

  // Persist debug logs to localStorage (debounced to avoid excessive writes)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (typeof window !== "undefined" && debugLogs.length > 0) {
        try {
          localStorage.setItem("debugLogs", JSON.stringify(debugLogs.slice(-100)))
        } catch (error) {
          console.error("[Debug] Failed to persist logs:", error)
        }
      }
    }, 500) // Debounce 500ms

    return () => clearTimeout(timeoutId)
  }, [debugLogs])

  // Persist debug log filters to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("debugLogFilters", JSON.stringify(Array.from(debugLogFilters)))
      } catch (error) {
        console.error("[Debug] Failed to persist filters:", error)
      }
    }
  }, [debugLogFilters])

  // Auto-refresh relative timestamps every second
  useEffect(() => {
    if (debugTimestampFormat === "relative") {
      const interval = setInterval(() => {
        setRefreshTimestamp(Date.now())
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [debugTimestampFormat])

  // Auto-scroll debug logs
  useEffect(() => {
    if (debugLogRef.current) {
      debugLogRef.current.scrollTop = debugLogRef.current.scrollHeight
    }
  }, [debugLogs])

  // Force save on tab close/navigation to prevent data loss
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Clear pending timeout and save immediately
      clearTimeout(saveTimeoutRef.current)
      const gameState = {
        playerStats: baseStats,
        inventory,
        equippedItems,
        activeEffects,
        openLocations,
        activePortrait: playerPortrait,
        generatedPortraits,
      }
      saveGameState(gameState)
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [
    baseStats,
    inventory,
    equippedItems,
    activeEffects,
    openLocations,
    playerPortrait,
    generatedPortraits,
  ])

  // Performance optimization: Reduced effect polling interval (P0)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setActiveEffects((prev) => prev.filter((effect) => effect.endTime > now))
    }, 1000) // Changed from 100ms to 1000ms (1 second is sufficient)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const generateInitialPortrait = async () => {
      // Check localStorage directly to avoid race condition
      const savedState = loadGameState()
      if (
        savedState?.activePortrait ||
        (savedState?.generatedPortraits && savedState.generatedPortraits.length > 0)
      ) {
        console.log(
          "[v0] Skipping initial portrait generation - portraits already exist in localStorage"
        )
        return
      }

      console.log("[v0] Generating initial portrait - no saved portraits found")
      setIsGeneratingPortrait(true)
      try {
        const response = await fetch("/api/generate-portrait", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: "Dark Wizard Witch, fantasy portrait, detailed face, mystical atmosphere",
          }),
        })
        const result = await response.json()

        if (result.imageUrl) {
          const newPortrait: GeneratedPortrait = {
            id: crypto.randomUUID(),
            imageUrl: result.imageUrl,
            prompt: "Dark Wizard Witch",
            timestamp: Date.now(),
          }
          setPlayerPortrait(result.imageUrl)
          setGeneratedPortraits([newPortrait])
          console.log("[v0] Initial portrait generated")
        }
      } catch (error) {
        console.error("[v0] Failed to generate initial portrait:", error)
      }
      setIsGeneratingPortrait(false)
    }

    generateInitialPortrait()
  }, [])

  // Performance optimization: Memoized stat calculation (P0)
  const totalStats = useMemo(() => {
    let bonusAttack = 0
    let bonusDefense = 0
    let bonusHealth = 0

    Object.values(equippedItems).forEach((item) => {
      if (item?.stats) {
        bonusAttack += item.stats.attack || 0
        bonusDefense += item.stats.defense || 0
        bonusHealth += item.stats.health || 0
      }
    })

    let effectAttack = 0
    let effectDefense = 0
    let effectHealth = 0

    activeEffects.forEach((effect) => {
      effectAttack += effect.statChanges.attack || 0
      effectDefense += effect.statChanges.defense || 0
      effectHealth += effect.statChanges.health || 0
    })

    return {
      attack: baseStats.attack + bonusAttack + effectAttack,
      defense: baseStats.defense + bonusDefense + effectDefense,
      maxHealth: baseStats.maxHealth + bonusHealth + effectHealth,
      bonusAttack,
      bonusDefense,
      bonusHealth,
      effectAttack,
      effectDefense,
      effectHealth,
    }
  }, [baseStats, equippedItems, activeEffects])

  const playerStats = {
    ...baseStats,
    attack: totalStats.attack,
    defense: totalStats.defense,
    maxHealth: totalStats.maxHealth,
  }

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logEntries])

  const addLogEntry = (
    text: string,
    entity?: string,
    entityRarity?: Rarity,
    choices?: GameEvent["choices"],
    entityData?: LogEntry["entityData"],
    treasureChoices?: TreasureChoice[]
  ) => {
    const newEntry: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      text,
      timestamp: Date.now(),
      entity,
      entityRarity,
      entityData,
      choices,
      showChoices: false,
      treasureChoices,
      showTreasureChoices: false,
    }

    setLogEntries([newEntry])

    if (choices || treasureChoices) {
      setTimeout(
        () => {
          setLogEntries((prev) =>
            prev.map((entry) =>
              entry.id === newEntry.id
                ? {
                    ...entry,
                    showChoices: !!choices,
                    showTreasureChoices: !!treasureChoices,
                  }
                : entry
            )
          )
        },
        text.length * 20 + 200
      )
    }
  }

  const handleChoice = (choice: GameEvent["choices"][0]) => {
    if (!currentEvent) return

    addDebugLog("game", `Player chose: "${choice.text}"`)
    setLogEntries([])

    if (activeLocation && activeLocation !== "void") {
      setOpenLocations((prev) =>
        prev.map((loc) => {
          if (loc.id === activeLocation) {
            // Increment room counter
            const newRoomCount = (loc.portalData?.currentRoomCount || 0) + 1

            // Calculate stability decay (percentage-based if portalData exists)
            let stabilityDecay
            if (loc.portalData) {
              const { min, max } = loc.portalData.stabilityDecayRate
              const decayPercent = min + Math.random() * (max - min)
              // Ensure minimum 1-point decay to prevent infinite low-stability loops
              stabilityDecay = Math.max(1, Math.floor(loc.stability * (decayPercent / 100)))
            } else {
              // Legacy: fixed 10-25 decay for backward compatibility
              stabilityDecay = Math.floor(Math.random() * 15 + 10)
            }

            const newStability = Math.max(0, loc.stability - stabilityDecay)

            // Check dual collapse conditions
            const roomLimitReached =
              newRoomCount >= (loc.portalData?.expectedRoomCount || loc.maxEntrances)
            const stabilityDepleted = newStability <= 0

            if (roomLimitReached || stabilityDepleted) {
              setTimeout(() => {
                setOpenLocations((current) => current.filter((l) => l.id !== activeLocation))
                setActiveTab("portal")
                setActiveLocation(null)
                const reason = roomLimitReached ? "fully explored" : "unstable"
                addLogEntry(
                  `The portal collapses (${reason})! Returning to the portal nexus.`,
                  "portal"
                )
              }, 1000)
            }

            return {
              ...loc,
              stability: newStability,
              ...(loc.portalData && {
                portalData: {
                  ...loc.portalData,
                  currentRoomCount: newRoomCount,
                },
              }),
            }
          }
          return loc
        })
      )
    }

    const outcome = choice.outcome
    const newStats = { ...baseStats }
    let newInventory = [...inventory]

    // Helper to determine damage source based on event context
    const getDamageSourceFromEvent = (): DamageSource => {
      if (currentEvent.entity === "enemy" || currentEvent.entityData?.type === "enemy") {
        return "enemy"
      }
      if (
        currentEvent.entity === "location" ||
        currentEvent.entityData?.type === "location" ||
        activeLocation
      ) {
        return "environment"
      }
      return "self"
    }

    if (outcome.healthChange) {
      newStats.health = Math.max(
        0,
        Math.min(playerStats.maxHealth, newStats.health + outcome.healthChange)
      )
      addDebugLog(
        "game",
        `Health changed: ${outcome.healthChange > 0 ? "+" : ""}${outcome.healthChange} (${newStats.health}/${playerStats.maxHealth})`
      )

      // Show floating number with directional animation
      const damageSource: DamageSource =
        outcome.healthChange > 0 ? "heal" : getDamageSourceFromEvent()
      // @ts-expect-error - Global function added by FloatingNumberContainer
      window.showFloatingNumber?.(outcome.healthChange, damageSource)
    }
    if (outcome.goldChange) {
      newStats.gold = Math.max(0, newStats.gold + outcome.goldChange)
      addDebugLog(
        "game",
        `Gold changed: ${outcome.goldChange > 0 ? "+" : ""}${outcome.goldChange} (total: ${newStats.gold})`
      )
    }
    if (outcome.experienceChange) {
      newStats.experience += outcome.experienceChange
      addDebugLog(
        "game",
        `XP gained: +${outcome.experienceChange} (${newStats.experience}/${newStats.level * 100})`
      )
      if (newStats.experience >= newStats.level * 100) {
        newStats.level += 1
        newStats.maxHealth += 10
        newStats.health = newStats.maxHealth
        newStats.attack += 2
        newStats.defense += 1
        addLogEntry(`Level up! You are now level ${newStats.level}`, "level")
        addDebugLog("game", `LEVEL UP! Now level ${newStats.level} (ATK+2, DEF+1, HP+10)`)
      }
    }
    if (outcome.itemGained) {
      newInventory.push(outcome.itemGained)
      addLogEntry(`Gained: ${outcome.itemGained.name}`, "item")
      addDebugLog("game", `Item gained: ${outcome.itemGained.name} (${outcome.itemGained.rarity})`)

      // Trigger loot drop animation based on rarity
      // @ts-expect-error - Global function for animations
      if (window.triggerLootAnimation) {
        // @ts-expect-error - Global function
        window.triggerLootAnimation(outcome.itemGained)
      }
    }
    if (outcome.itemLost) {
      newInventory = newInventory.filter((item) => item.id !== outcome.itemLost)
      addLogEntry(`Lost: ${inventory.find((i) => i.id === outcome.itemLost)?.name}`, "item")
      addDebugLog("game", `Item lost: ${inventory.find((i) => i.id === outcome.itemLost)?.name}`)
    }

    setBaseStats(newStats)
    setInventory(newInventory)

    addLogEntry(outcome.message, outcome.entity, outcome.entityRarity)

    setTimeout(async () => {
      if (activeLocation === "void") {
        // Generate AI narrative for The Void
        addDebugLog("ai", "Requesting AI narrative generation for The Void")
        const startTime = performance.now()
        try {
          const response = await fetch("/api/generate-narrative", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ playerStats: newStats }),
          })
          const duration = Math.round(performance.now() - startTime)

          if (!response.ok) {
            addDebugLog(
              "error",
              `API /api/generate-narrative failed: ${response.status} ${response.statusText} (${duration}ms)`
            )
            throw new Error("Failed to generate narrative")
          }

          const { event } = await response.json()
          addDebugLog("ai", `Narrative generated: ${event.entity} encounter [${duration}ms]`, event)
          setCurrentEvent(event)
          addLogEntry(
            event.description,
            event.entity,
            event.entityRarity,
            event.choices,
            event.entityData
          )
        } catch (error) {
          const duration = Math.round(performance.now() - startTime)
          addDebugLog("error", `Failed to generate narrative after ${duration}ms: ${error}`)
          console.error("Error generating void narrative:", error)
          // Fallback to static event
          const fallbackEvent = generateEvent(newStats, newInventory)
          setCurrentEvent(fallbackEvent)
          addLogEntry(
            fallbackEvent.description,
            fallbackEvent.entity,
            fallbackEvent.entityRarity,
            fallbackEvent.choices,
            fallbackEvent.entityData
          )
        }
      } else {
        // Use static generation for other locations
        const nextEvent = generateEvent(newStats, newInventory)
        setCurrentEvent(nextEvent)
        addLogEntry(
          nextEvent.description,
          nextEvent.entity,
          nextEvent.entityRarity,
          nextEvent.choices,
          nextEvent.entityData
        )
      }
    }, 500)
  }

  const handleTreasureChoice = (choice: TreasureChoice) => {
    addDebugLog("game", `Player selected treasure: ${choice.description}`)

    // Apply the chosen reward
    if (choice.type === "item" && choice.item) {
      setInventory((prev) => [...prev, choice.item!])
      addFloatingNumber(`+${choice.item.name}`, "item")
      addLootAnimation(choice.item)
    } else if (choice.type === "gold" && choice.gold) {
      setBaseStats((prev) => ({ ...prev, gold: prev.gold + choice.gold! }))
      addFloatingNumber(`+${choice.gold}g`, "gold")
    } else if (choice.type === "health" && choice.healthRestore) {
      setBaseStats((prev) => ({
        ...prev,
        health: Math.min(prev.maxHealth, prev.health + choice.healthRestore!),
      }))
      addFloatingNumber(`+${choice.healthRestore} HP`, "heal")
    }

    // Clear treasure choices from log
    setLogEntries((prev) => prev.map((entry) => ({ ...entry, showTreasureChoices: false })))

    // Generate next event after brief delay
    setTimeout(() => {
      const nextEvent = generateEvent(playerStats, inventory)
      setCurrentEvent(nextEvent)
      addDebugLog("game", `Next event generated: ${nextEvent.entity || "random encounter"}`)
      addLogEntry(
        nextEvent.description,
        nextEvent.entity,
        nextEvent.entityRarity,
        nextEvent.choices,
        nextEvent.entityData
      )
    }, 500)
  }

  const handleOpenMap = (mapItem: InventoryItem) => {
    if (!mapItem.mapData) return

    // For now, use the existing locationName (AI generation will be added in Phase 4)
    const locationName = mapItem.mapData.locationName

    // Apply room count variance (±1) if portal metadata exists
    const baseRoomCount = mapItem.portalMetadata?.expectedRoomCount || mapItem.mapData.entrances
    const roomCountVariance = Math.floor(Math.random() * 3) - 1 // -1, 0, or 1
    const finalRoomCount = Math.max(1, baseRoomCount + roomCountVariance)

    const newLocation: Location = {
      id: Math.random().toString(36).substr(2, 9),
      name: locationName,
      entrancesRemaining: finalRoomCount,
      maxEntrances: finalRoomCount,
      rarity: mapItem.mapData.rarity,
      stability: 100,
      ...(mapItem.portalMetadata && {
        portalData: {
          expectedRoomCount: finalRoomCount,
          currentRoomCount: 0,
          stabilityDecayRate: mapItem.portalMetadata.stabilityDecayRate,
          eventDiversity: mapItem.portalMetadata.eventDiversity,
          riskLevel: mapItem.portalMetadata.riskLevel,
          theme: mapItem.portalMetadata.theme || "",
          sourceMapId: mapItem.id,
        },
      }),
    }

    setOpenLocations((prev) => [...prev, newLocation])
    setInventory((prev) => prev.filter((item) => item.id !== mapItem.id))
    setModalOpen(false)
  }

  const handleEnterLocation = (locationId: string) => {
    const location = openLocations.find((loc) => loc.id === locationId)
    if (!location) return

    addDebugLog("game", `Entering location: ${location.name} (stability: ${location.stability}%)`)
    setActiveLocation(locationId)
    setActiveTab(locationId)

    const firstEvent = generateEvent(playerStats, inventory)
    setCurrentEvent(firstEvent)
    addDebugLog("game", `Event generated: ${firstEvent.entity || "random encounter"}`)
    addLogEntry(
      firstEvent.description,
      firstEvent.entity,
      firstEvent.entityRarity,
      firstEvent.choices,
      firstEvent.entityData
    )

    setOpenLocations((prev) =>
      prev.map((loc) => {
        if (loc.id === locationId) {
          const newEntrances = loc.entrancesRemaining - 1
          if (newEntrances <= 0) {
            setTimeout(() => {
              setOpenLocations((current) => current.filter((l) => l.id !== locationId))
              setActiveTab("portal")
              setActiveLocation(null)
            }, 100)
          }
          return { ...loc, entrancesRemaining: newEntrances }
        }
        return loc
      })
    )
  }

  const handleEnterVoid = async () => {
    setActiveLocation("void")
    setActiveTab("void")

    addDebugLog("ai", "Entering The Void - requesting initial AI narrative")
    const startTime = performance.now()
    try {
      const response = await fetch("/api/generate-narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerStats }),
      })
      const duration = Math.round(performance.now() - startTime)

      if (!response.ok) {
        addDebugLog(
          "error",
          `API /api/generate-narrative failed: ${response.status} ${response.statusText} (${duration}ms)`
        )
        throw new Error("Failed to generate narrative")
      }

      const { event } = await response.json()
      addDebugLog(
        "ai",
        `Initial Void narrative generated: ${event.entity} encounter [${duration}ms]`,
        event
      )
      setCurrentEvent(event)
      addLogEntry(
        event.description,
        event.entity,
        event.entityRarity,
        event.choices,
        event.entityData
      )
    } catch (error) {
      const duration = Math.round(performance.now() - startTime)
      addDebugLog(
        "error",
        `Failed to generate initial Void narrative after ${duration}ms: ${error}`
      )
      console.error("Error generating void narrative:", error)
      // Fallback to static event
      const fallbackEvent = generateEvent(playerStats, inventory)
      setCurrentEvent(fallbackEvent)
      addLogEntry(
        fallbackEvent.description,
        fallbackEvent.entity,
        fallbackEvent.entityRarity,
        fallbackEvent.choices,
        fallbackEvent.entityData
      )
    }
  }

  const openModal = (title: string, description: string, _item?: InventoryItem) => {
    setModalContent({ title, description })
    setModalOpen(true)
  }

  const renderTextWithEntities = (text: string, entity?: string, entityRarity?: Rarity) => {
    if (!entity) return text

    const parts = text.split(new RegExp(`(${entity})`, "gi"))
    return parts.map((part, index) =>
      part.toLowerCase() === entity.toLowerCase() ? (
        // eslint-disable-next-line react/no-array-index-key
        <span key={index} className={getRarityColor(entityRarity)}>
          {part}
        </span>
      ) : (
        part
      )
    )
  }

  const getRarityColor = (rarity?: string, withGlow = false) => {
    if (!rarity) return "text-foreground"
    const colorClass = RARITY_COLORS[rarity as Rarity]
    const baseClass = colorClass ? `${colorClass} font-semibold` : "text-foreground font-semibold"

    // Add glow effect for legendary and epic items
    if (withGlow) {
      if (rarity === "legendary") {
        // Legendary: Strong glow with pulse
        return `${baseClass} drop-shadow-[0_0_12px_currentColor] animate-pulse`
      } else if (rarity === "epic") {
        // Epic: Medium glow with slower pulse
        return `${baseClass} drop-shadow-[0_0_8px_currentColor] animate-pulse [animation-duration:3s]`
      } else if (rarity === "rare") {
        // Rare: Subtle glow without pulse
        return `${baseClass} drop-shadow-[0_0_4px_currentColor]`
      }
    }

    return baseClass
  }

  const getEntityGlow = (entity?: { tags?: string[]; rarity?: string }) => {
    if (!entity) return ""

    // Boss entities get extra strong red glow
    if (entity.tags?.includes("boss")) {
      return "drop-shadow-[0_0_16px_rgba(239,68,68,0.8)] animate-pulse"
    }

    // Healing entities get cyan glow
    if (entity.tags?.includes("healing")) {
      return "drop-shadow-[0_0_10px_rgba(34,211,238,0.6)]"
    }

    // Elemental entities get thematic glow based on element
    if (entity.tags?.includes("fire")) {
      return "drop-shadow-[0_0_10px_rgba(249,115,22,0.7)]"
    }
    if (entity.tags?.includes("ice")) {
      return "drop-shadow-[0_0_10px_rgba(103,232,249,0.6)]"
    }
    if (entity.tags?.includes("poison")) {
      return "drop-shadow-[0_0_10px_rgba(34,197,94,0.6)]"
    }
    if (entity.tags?.includes("void")) {
      return "drop-shadow-[0_0_10px_rgba(168,85,247,0.7)]"
    }

    return ""
  }

  const renderEntityCard = (entityData: LogEntry["entityData"]) => {
    if (!entityData) return null

    // Get entity-specific glow based on tags (for ENTITIES registry lookups)
    const entityGlow = getEntityGlow(entityData as unknown as { tags?: string[]; rarity?: string })

    return (
      <div className="my-3 p-4 bg-secondary/30 rounded border border-accent/30 animate-in fade-in duration-300 shadow-lg shadow-accent/5">
        <div className={`text-sm mb-2 ${getRarityColor(entityData.rarity, true)} ${entityGlow}`}>
          {entityData.name}
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {entityData.type && (
            <div className="flex items-center gap-1">
              <span className="text-accent">Type:</span>
              <span className="capitalize">{entityData.type}</span>
            </div>
          )}
          {entityData.stats?.attack !== undefined && (
            <div className="flex items-center gap-1">
              <span className="text-accent">ATK:</span>
              <span>
                {entityData.stats.attack > 0
                  ? `+${entityData.stats.attack}`
                  : entityData.stats.attack}
              </span>
            </div>
          )}
          {entityData.stats?.defense !== undefined && (
            <div className="flex items-center gap-1">
              <span className="text-accent">DEF:</span>
              <span>
                {entityData.stats.defense > 0
                  ? `+${entityData.stats.defense}`
                  : entityData.stats.defense}
              </span>
            </div>
          )}
          {entityData.stats?.health !== undefined && (
            <div className="flex items-center gap-1">
              <span className="text-accent">HP:</span>
              <span>
                {entityData.stats.health > 0
                  ? `+${entityData.stats.health}`
                  : entityData.stats.health}
              </span>
            </div>
          )}
          {entityData.gold !== undefined && (
            <div className="flex items-center gap-1">
              <span className="text-accent">Gold:</span>
              <span>{entityData.gold}</span>
            </div>
          )}
          {entityData.exp !== undefined && (
            <div className="flex items-center gap-1">
              <span className="text-accent">EXP:</span>
              <span>{entityData.exp}</span>
            </div>
          )}
          {entityData.entrances !== undefined && (
            <div className="flex items-center gap-1">
              <span className="text-accent">Entrances:</span>
              <span>{entityData.entrances}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <span className="text-accent">Rarity:</span>
            <span className={`capitalize ${getRarityColor(entityData.rarity)}`}>
              {entityData.rarity}
            </span>
          </div>
        </div>
      </div>
    )
  }

  const handleUseConsumable = (item: InventoryItem) => {
    if (!item.consumableEffect) return

    const effect = item.consumableEffect
    addDebugLog("game", `Using consumable: ${item.name} (${effect.type})`)

    if (effect.type === "permanent") {
      setBaseStats((prev) => ({
        ...prev,
        attack: prev.attack + (effect.statChanges.attack || 0),
        defense: prev.defense + (effect.statChanges.defense || 0),
        maxHealth: prev.maxHealth + (effect.statChanges.maxHealth || 0),
      }))
      addLogEntry(`You consumed ${item.name}. Its effects are permanent!`, item.name, item.rarity)
      addDebugLog(
        "game",
        `Permanent effect applied: ATK${(effect.statChanges.attack || 0) > 0 ? "+" : ""}${effect.statChanges.attack || 0}, DEF${(effect.statChanges.defense || 0) > 0 ? "+" : ""}${effect.statChanges.defense || 0}, HP${(effect.statChanges.maxHealth || 0) > 0 ? "+" : ""}${effect.statChanges.maxHealth || 0}`
      )
    } else if (effect.type === "temporary" && effect.duration) {
      const newEffect: ActiveEffect = {
        id: Math.random().toString(36).substr(2, 9),
        name: item.name,
        statChanges: effect.statChanges,
        endTime: Date.now() + effect.duration * 1000,
        rarity: item.rarity,
      }
      setActiveEffects((prev) => [...prev, newEffect])
      addLogEntry(
        `You consumed ${item.name}. Its effects will last for ${effect.duration} seconds!`,
        item.name,
        item.rarity
      )
      addDebugLog(
        "game",
        `Temporary effect active for ${effect.duration}s: ATK${(effect.statChanges.attack || 0) > 0 ? "+" : ""}${effect.statChanges.attack || 0}, DEF${(effect.statChanges.defense || 0) > 0 ? "+" : ""}${effect.statChanges.defense || 0}`
      )
    }

    setInventory((prev) => prev.filter((i) => i.id !== item.id))
    setModalOpen(false)
  }

  const getRemainingTime = (endTime: number) => {
    const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000))
    const minutes = Math.floor(remaining / 60)
    const seconds = remaining % 60
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItemId(itemId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent, itemId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverItemId(itemId)
  }

  const handleDragLeave = () => {
    setDragOverItemId(null)
  }

  const handleDrop = (e: React.DragEvent, targetItemId: string) => {
    e.preventDefault()

    if (!draggedItemId || draggedItemId === targetItemId) {
      setDraggedItemId(null)
      setDragOverItemId(null)
      return
    }

    const draggedIndex = inventory.findIndex((item) => item.id === draggedItemId)
    const targetIndex = inventory.findIndex((item) => item.id === targetItemId)

    if (draggedIndex === -1 || targetIndex === -1) return

    const newInventory = [...inventory]
    const [draggedItem] = newInventory.splice(draggedIndex, 1)
    if (!draggedItem) return
    newInventory.splice(targetIndex, 0, draggedItem)

    setInventory(newInventory)
    setDraggedItemId(null)
    setDragOverItemId(null)
  }

  const handleDragEnd = () => {
    setDraggedItemId(null)
    setDragOverItemId(null)
  }

  const handleGeneratePortrait = async () => {
    setIsGeneratingPortrait(true)
    addDebugLog("ai", `Requesting portrait generation: "${portraitPrompt}"`)
    const startTime = performance.now()
    try {
      const response = await fetch("/api/generate-portrait", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `${portraitPrompt}, fantasy portrait, detailed face, mystical atmosphere`,
        }),
      })
      const duration = Math.round(performance.now() - startTime)

      if (!response.ok) {
        addDebugLog(
          "error",
          `API /api/generate-portrait failed: ${response.status} ${response.statusText} (${duration}ms)`
        )
        throw new Error("Failed to generate portrait")
      }

      const result = await response.json()

      if (result.imageUrl) {
        const newPortrait: GeneratedPortrait = {
          id: crypto.randomUUID(),
          imageUrl: result.imageUrl,
          prompt: portraitPrompt,
          timestamp: Date.now(),
        }
        setGeneratedPortraits((prev) => [newPortrait, ...prev])
        setPlayerPortrait(result.imageUrl)
        addDebugLog("ai", `Portrait generated successfully [${duration}ms]`)
        console.log("[v0] Portrait generated and added to gallery:", newPortrait)
        console.log("[v0] Total portraits in gallery:", generatedPortraits.length + 1)
      }
    } catch (error) {
      const duration = Math.round(performance.now() - startTime)
      console.error("[v0] Failed to generate portrait:", error)
      addDebugLog("error", `Failed to generate portrait after ${duration}ms: ${error}`)
    }
    setIsGeneratingPortrait(false)
  }

  const handleSelectPortrait = (portraitId: string) => {
    const portrait = generatedPortraits.find((p) => p.id === portraitId)
    if (portrait) {
      setPlayerPortrait(portrait.imageUrl)
    }
  }

  const handleDeletePortrait = (portraitId: string) => {
    const portrait = generatedPortraits.find((p) => p.id === portraitId)
    if (portrait && playerPortrait === portrait.imageUrl) {
      setPlayerPortrait(null)
    }
    setGeneratedPortraits((prev) => {
      const newPortraits = prev.filter((p) => p.id !== portraitId)
      // Adjust carousel index if needed
      if (currentPortraitIndex >= newPortraits.length && newPortraits.length > 0) {
        setCurrentPortraitIndex(newPortraits.length - 1)
      } else if (newPortraits.length === 0) {
        setCurrentPortraitIndex(0)
      }
      return newPortraits
    })
    addDebugLog("system", `Deleted portrait: ${portrait?.prompt || portraitId}`)
  }

  const handleToggleFavorite = (portraitId: string) => {
    setGeneratedPortraits((prev) =>
      prev.map((p) => (p.id === portraitId ? { ...p, isFavorite: !p.isFavorite } : p))
    )
  }

  const handleDownloadPortrait = async (portrait: GeneratedPortrait) => {
    try {
      const response = await fetch(portrait.imageUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `portrait-${portrait.prompt.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      addDebugLog("system", `Downloaded portrait: ${portrait.prompt}`)
    } catch (error) {
      console.error("[Debug] Failed to download portrait:", error)
      addDebugLog("error", `Failed to download portrait: ${error}`)
    }
  }

  const handleNextPortrait = useCallback(() => {
    const sortedPortraits = generatedPortraits.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1
      if (!a.isFavorite && b.isFavorite) return 1
      return b.timestamp - a.timestamp
    })
    setCurrentPortraitIndex((prev) => (prev + 1) % sortedPortraits.length)
  }, [generatedPortraits])

  const handlePrevPortrait = useCallback(() => {
    const sortedPortraits = generatedPortraits.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1
      if (!a.isFavorite && b.isFavorite) return 1
      return b.timestamp - a.timestamp
    })
    setCurrentPortraitIndex((prev) => (prev - 1 + sortedPortraits.length) % sortedPortraits.length)
  }, [generatedPortraits])

  // Keyboard navigation for portrait carousel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if developer panel is open and AI Tools tab is active
      if (developerActiveTab !== "ai-tools" || generatedPortraits.length <= 1) return

      if (e.key === "ArrowLeft") {
        e.preventDefault()
        handlePrevPortrait()
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        handleNextPortrait()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [developerActiveTab, generatedPortraits.length, handlePrevPortrait, handleNextPortrait])

  const handleGenerateItem = async () => {
    if (!itemPrompt.trim()) return

    setIsGeneratingItem(true)
    addDebugLog("ai", `Requesting item generation: "${itemPrompt}"`)
    const startTime = performance.now()
    try {
      console.log("[v0] Generating item with prompt:", itemPrompt)
      const response = await fetch("/api/generate-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: itemPrompt }),
      })
      const duration = Math.round(performance.now() - startTime)

      if (!response.ok) {
        addDebugLog(
          "error",
          `API /api/generate-item failed: ${response.status} ${response.statusText} (${duration}ms)`
        )
        throw new Error("Failed to generate item")
      }

      const { item } = await response.json()
      console.log("[v0] Item generated:", item)
      addDebugLog("ai", `Item generated: ${item.name} (${item.rarity}) [${duration}ms]`, item)

      // Add the generated item to inventory
      setInventory((prev) => [...prev, item])
      addLogEntry(`Generated: ${item.name} (${item.rarity})`, item.name, item.rarity)

      // Clear the prompt
      setItemPrompt("")
    } catch (error) {
      const duration = Math.round(performance.now() - startTime)
      console.error("[v0] Failed to generate item:", error)
      addDebugLog("error", `Failed to generate item after ${duration}ms: ${error}`)
      addLogEntry("Failed to generate item. Please try again.", "error")
    }
    setIsGeneratingItem(false)
  }

  // Entity management handlers
  const refreshEntityStats = () => {
    setEntityStats(ENTITIES.stats())
  }

  const handlePruneExpired = () => {
    const prunedCount = ENTITIES.pruneExpired()
    refreshEntityStats()
    addLogEntry(
      `Pruned ${prunedCount} expired ${prunedCount === 1 ? "entity" : "entities"} from registry`
    )
  }

  const handleClearAI = () => {
    ENTITIES.clearAI()
    refreshEntityStats()
    addLogEntry("Cleared all AI-generated entities from registry")
  }

  const handleClearSession = () => {
    ENTITIES.clearSession()
    refreshEntityStats()
    addLogEntry("Cleared all session-only entities from registry")
  }

  const handleClearAll = () => {
    ENTITIES.clear()
    refreshEntityStats()
    addLogEntry("Cleared all dynamic entities from registry")
  }

  // Test variant creation by adding duplicate entities
  const handleTestVariants = () => {
    // Test 1: Create AI entity with canonical name (should become "Goblin (AI)")
    const goblinVariant = ENTITIES.addAI(
      {
        entityType: "enemy",
        name: "Goblin", // Matches canonical entity
        health: 25,
        attack: 6,
        gold: 12,
        exp: 18,
        rarity: "common",
        icon: "ra-monster-skull",
      },
      {
        ttl: 60000, // 1 minute for testing
        sessionOnly: false,
        tags: ["test", "variant"],
      }
    )

    if (goblinVariant.success) {
      addLogEntry(
        `Created AI variant: ${goblinVariant.data.name} (ID: ${goblinVariant.data.id})`,
        goblinVariant.data.name,
        goblinVariant.data.rarity
      )
    }

    // Test 2: Create another with same name (should become "Goblin (AI) (AI)")
    const goblinVariant2 = ENTITIES.addAI(
      {
        entityType: "enemy",
        name: "Goblin (AI)", // Matches first variant
        health: 30,
        attack: 7,
        gold: 15,
        exp: 20,
        rarity: "uncommon",
        icon: "ra-monster-skull",
      },
      {
        ttl: 60000,
        sessionOnly: false,
        tags: ["test", "variant"],
      }
    )

    if (goblinVariant2.success) {
      addLogEntry(
        `Created nested variant: ${goblinVariant2.data.name} (ID: ${goblinVariant2.data.id})`,
        goblinVariant2.data.name,
        goblinVariant2.data.rarity
      )
    }

    refreshEntityStats()
  }

  // Determine mood color based on recent events
  const getMoodOverlay = () => {
    const lastEntry = logEntries[logEntries.length - 1]
    if (!lastEntry) return "bg-transparent"

    // Enemy encounters: slight red tint
    if (
      lastEntry.entity?.toLowerCase().includes("enemy") ||
      lastEntry.text.toLowerCase().includes("attack")
    ) {
      return "bg-red-500/3"
    }
    // Treasure/loot: warm gold tint
    if (
      lastEntry.entity?.toLowerCase().includes("treasure") ||
      lastEntry.entity?.toLowerCase().includes("chest")
    ) {
      return "bg-amber-500/3"
    }
    // Void location: purple tint
    if (activeLocation === "void") {
      return "bg-purple-500/3"
    }
    // Default: neutral
    return "bg-transparent"
  }

  return (
    <div className="h-screen w-screen bg-background text-foreground flex items-center justify-center p-6 relative">
      {/* Vignette effect overlay */}
      <div className="fixed inset-0 pointer-events-none bg-gradient-radial from-transparent via-transparent to-background/40" />

      {/* Mood-based color overlay */}
      <div
        className={`fixed inset-0 pointer-events-none transition-colors duration-1000 ${getMoodOverlay()}`}
      />

      <FloatingNumberContainer />
      <LootAnimationContainer />
      <div
        className="fixed top-6 left-6 text-2xl font-light tracking-wider text-accent font-inter"
        style={{ textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}
      >
        BLACKFELL
      </div>

      <div className="w-full max-w-7xl h-full grid grid-cols-4 gap-6">
        <div className="col-span-1 pt-20 pb-6 px-6 flex flex-col gap-4 overflow-hidden">
          {playerPortrait && (
            <div className="mb-4 rounded overflow-hidden border border-border/30 max-h-[30vh] sm:max-h-[40vh] md:max-h-none">
              <img
                src={playerPortrait || "/placeholder.svg"}
                alt="Player Portrait"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          {isGeneratingPortrait && !playerPortrait && (
            <div className="mb-4 rounded border border-border/30 bg-secondary/20 aspect-[2/3] max-h-[30vh] sm:max-h-[40vh] md:max-h-none flex items-center justify-center">
              <div className="text-xs text-muted-foreground">Generating portrait...</div>
            </div>
          )}

          <div className="flex flex-col gap-4 text-sm">
            <div>
              <div className="text-muted-foreground text-xs mb-1.5 uppercase tracking-wider">
                Level
              </div>
              <div className="text-accent font-mono text-2xl font-light">
                <AnimatedNumber value={baseStats.level} />
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs mb-1.5 uppercase tracking-wider">
                Health
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-secondary/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500/70 transition-all duration-300"
                    style={{ width: `${(baseStats.health / playerStats.maxHealth) * 100}%` }}
                  />
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  <AnimatedNumber value={baseStats.health} />/
                  <AnimatedNumber value={playerStats.maxHealth} />
                </span>
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs mb-1.5 uppercase tracking-wider">
                Experience
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-secondary/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-300"
                    style={{ width: `${(baseStats.experience / (baseStats.level * 100)) * 100}%` }}
                  />
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  <AnimatedNumber value={baseStats.experience} />/
                  <AnimatedNumber value={baseStats.level * 100} />
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-3">
              <div>
                <div className="text-muted-foreground text-xs uppercase tracking-wider">Attack</div>
                <div className="font-mono text-lg font-light flex items-baseline gap-1.5">
                  <span
                    className={
                      totalStats.bonusAttack + totalStats.effectAttack > 0
                        ? "text-green-500 font-semibold stat-glow-green"
                        : totalStats.bonusAttack + totalStats.effectAttack < 0
                          ? "text-red-500 font-semibold stat-glow-red"
                          : "text-foreground"
                    }
                  >
                    <AnimatedNumber value={totalStats.attack} />
                  </span>
                  {totalStats.bonusAttack + totalStats.effectAttack !== 0 && (
                    <span className="text-accent text-sm">
                      {totalStats.bonusAttack + totalStats.effectAttack > 0
                        ? `+${totalStats.bonusAttack + totalStats.effectAttack}`
                        : totalStats.bonusAttack + totalStats.effectAttack}
                    </span>
                  )}
                </div>
                {totalStats.effectAttack !== 0 && (
                  <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                    (
                    {getRemainingTime(
                      activeEffects.find((e) => e.statChanges.attack)?.endTime || 0
                    )}
                    )
                  </div>
                )}
              </div>
              <div>
                <div className="text-muted-foreground text-xs uppercase tracking-wider">
                  Defense
                </div>
                <div className="font-mono text-lg font-light flex items-baseline gap-1.5">
                  <span
                    className={
                      totalStats.bonusDefense + totalStats.effectDefense > 0
                        ? "text-green-500 font-semibold stat-glow-green"
                        : totalStats.bonusDefense + totalStats.effectDefense < 0
                          ? "text-red-500 font-semibold stat-glow-red"
                          : "text-foreground"
                    }
                  >
                    <AnimatedNumber value={totalStats.defense} />
                  </span>
                  {totalStats.bonusDefense + totalStats.effectDefense !== 0 && (
                    <span className="text-accent text-sm">
                      {totalStats.bonusDefense + totalStats.effectDefense > 0
                        ? `+${totalStats.bonusDefense + totalStats.effectDefense}`
                        : totalStats.bonusDefense + totalStats.effectDefense}
                    </span>
                  )}
                </div>
                {totalStats.effectDefense !== 0 && (
                  <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                    (
                    {getRemainingTime(
                      activeEffects.find((e) => e.statChanges.defense)?.endTime || 0
                    )}
                    )
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-2 flex flex-col overflow-hidden min-w-0 w-full">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex flex-col h-full overflow-hidden w-full min-w-0"
          >
            <TabsList className="bg-transparent border-0 p-0 h-auto mb-6 flex-shrink-0">
              {!activeLocation && (
                <TabsTrigger
                  value="portal"
                  className="border-0 bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-accent text-muted-foreground hover:text-foreground transition-colors font-light text-sm px-4 py-2"
                >
                  portal
                </TabsTrigger>
              )}

              {activeLocation === "void" && (
                <TabsTrigger
                  value="void"
                  className="border-0 bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-accent text-muted-foreground hover:text-foreground transition-colors font-light text-sm px-4 py-2"
                >
                  the void
                </TabsTrigger>
              )}

              {openLocations.map((location) =>
                activeLocation === location.id ? (
                  <TabsTrigger
                    key={location.id}
                    value={location.id}
                    className="border-0 bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-accent text-muted-foreground hover:text-foreground transition-colors font-light text-sm px-4 py-2"
                  >
                    {location.name.toLowerCase()}
                  </TabsTrigger>
                ) : null
              )}

              <TabsTrigger
                value="equipment"
                className="border-0 bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-accent text-muted-foreground hover:text-foreground transition-colors font-light text-sm px-4 py-2"
              >
                equipment
              </TabsTrigger>

              <TabsTrigger
                value="developer"
                className="border-0 bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-accent text-muted-foreground hover:text-foreground transition-colors font-light text-sm px-4 py-2"
              >
                developer
              </TabsTrigger>
            </TabsList>

            {activeLocation && activeLocation !== "void" && (
              <div className="mb-4 pb-4 border-b border-border/30">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground uppercase tracking-wider">
                    Portal Stability
                  </span>
                  <span
                    className={`font-mono ${
                      openLocations.find((loc) => loc.id === activeLocation)?.stability! > 50
                        ? "text-accent"
                        : openLocations.find((loc) => loc.id === activeLocation)?.stability! > 25
                          ? "text-yellow-500"
                          : "text-red-500"
                    }`}
                  >
                    {openLocations.find((loc) => loc.id === activeLocation)?.stability}%
                  </span>
                </div>
                <div className="mt-2 h-1 bg-secondary/30 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      openLocations.find((loc) => loc.id === activeLocation)?.stability! > 50
                        ? "bg-accent"
                        : openLocations.find((loc) => loc.id === activeLocation)?.stability! > 25
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    }`}
                    style={{
                      width: `${openLocations.find((loc) => loc.id === activeLocation)?.stability || 0}%`,
                    }}
                  />
                </div>

                {/* Portal Progress Tracking */}
                {(() => {
                  const currentLoc = openLocations.find((loc) => loc.id === activeLocation)
                  if (currentLoc?.portalData) {
                    const { currentRoomCount, expectedRoomCount } = currentLoc.portalData
                    const isBonus = currentRoomCount > expectedRoomCount
                    const progressPercent = Math.min(
                      100,
                      (currentRoomCount / expectedRoomCount) * 100
                    )

                    return (
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground uppercase tracking-wider">
                            Progress
                          </span>
                          <span className="font-mono text-accent">
                            Room {currentRoomCount}/{expectedRoomCount}
                            {isBonus && <span className="text-yellow-500 ml-1">(bonus)</span>}
                          </span>
                        </div>
                        <div className="mt-2 h-1 bg-secondary/30 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-cyan-500 transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    )
                  }
                  return null
                })()}
              </div>
            )}

            <TabsContent
              value="portal"
              className="flex-1 flex flex-col overflow-hidden mt-0 min-w-0 w-full"
            >
              <div className="flex-1 flex flex-col gap-6 justify-start">
                <div className="text-sm text-muted-foreground font-light">
                  Select a location to explore. Open maps from your inventory to discover new
                  portals.
                </div>

                <div
                  className="p-4 bg-secondary/20 rounded border border-border/30 hover:border-accent/50 hover:scale-[1.02] hover:shadow-lg hover:shadow-accent/5 active:scale-[0.98] transition-all duration-300 cursor-pointer shadow-md"
                  onClick={handleEnterVoid}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-accent font-light mb-1">The Void</div>
                      <div className="text-xs text-muted-foreground">
                        The most basic realm. Always accessible.
                      </div>
                    </div>
                    <div className="text-xs text-accent">∞ entrances</div>
                  </div>
                </div>

                {openLocations.map((location) => (
                  <div
                    key={location.id}
                    className="p-4 bg-secondary/20 rounded border border-border/30 hover:border-accent/50 hover:scale-[1.02] hover:shadow-lg hover:shadow-accent/5 active:scale-[0.98] transition-all duration-300 cursor-pointer shadow-md"
                    onClick={() => handleEnterLocation(location.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className={`font-light mb-1 ${getRarityColor(location.rarity)}`}>
                          {location.name}
                        </div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {location.rarity} location
                        </div>
                      </div>
                      <div className="text-xs text-accent">
                        {location.entrancesRemaining}/{location.maxEntrances} entrances
                      </div>
                    </div>
                  </div>
                ))}

                {openLocations.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-8 font-light">
                    No additional locations discovered. Find maps to unlock new portals.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent
              value="void"
              className="flex-1 flex flex-col overflow-hidden mt-0 min-w-0 w-full"
            >
              <div className="flex-1 flex flex-col gap-4 justify-start">
                {logEntries.map((entry, index) => {
                  const opacity =
                    index === logEntries.length - 1 ? 1 : 0.3 + (index / logEntries.length) * 0.7
                  return (
                    <div
                      key={entry.id}
                      className="transition-opacity duration-500"
                      style={{ opacity }}
                    >
                      <div className="typewriter-line text-sm leading-relaxed font-light">
                        {renderTextWithEntities(entry.text, entry.entity, entry.entityRarity)}
                      </div>
                      {entry.entityData && renderEntityCard(entry.entityData)}
                      {entry.choices && entry.showChoices && (
                        <div className="mt-3 flex flex-col gap-2 animate-in fade-in duration-300">
                          {entry.choices.map((choice, choiceIndex) => (
                            <Button
                              // eslint-disable-next-line react/no-array-index-key
                              key={choiceIndex}
                              variant="ghost"
                              className="choice-stagger justify-start text-left h-auto py-2 px-3 hover:bg-accent/10 hover:text-accent hover:translate-x-1 active:scale-[0.98] transition-all duration-200 font-light text-sm"
                              style={{ animationDelay: `${choiceIndex * 50}ms` }}
                              onClick={() => handleChoice(choice)}
                            >
                              <span className="text-accent mr-2">›</span>
                              {choice.text}
                            </Button>
                          ))}
                        </div>
                      )}
                      {entry.treasureChoices && entry.showTreasureChoices && (
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 animate-in fade-in duration-300">
                          {entry.treasureChoices.map((treasureChoice, choiceIndex) => (
                            <div
                              key={choiceIndex}
                              className="choice-stagger p-4 bg-secondary/30 rounded border border-border/50 hover:border-accent hover:bg-accent/5 cursor-pointer transition-all duration-200 active:scale-95"
                              style={{ animationDelay: `${choiceIndex * 100}ms` }}
                              onClick={() => handleTreasureChoice(treasureChoice)}
                            >
                              <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
                                {treasureChoice.type}
                              </div>
                              <div className="text-sm font-light text-foreground mb-2">
                                {treasureChoice.description}
                              </div>
                              {treasureChoice.item && (
                                <div className="text-xs text-muted-foreground">
                                  {treasureChoice.item.stats?.attack &&
                                    `+${treasureChoice.item.stats.attack} ATK `}
                                  {treasureChoice.item.stats?.defense &&
                                    `+${treasureChoice.item.stats.defense} DEF `}
                                  {treasureChoice.item.stats?.health &&
                                    `+${treasureChoice.item.stats.health} HP`}
                                </div>
                              )}
                              {treasureChoice.gold && (
                                <div className="text-xs text-yellow-500">
                                  +{treasureChoice.gold} gold
                                </div>
                              )}
                              {treasureChoice.healthRestore && (
                                <div className="text-xs text-green-500">
                                  Restore {treasureChoice.healthRestore} HP
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </TabsContent>

            {openLocations.map((location) => (
              <TabsContent
                key={location.id}
                value={location.id}
                className="flex-1 flex flex-col overflow-hidden mt-0 min-w-0 w-full"
              >
                <div className="flex-1 flex flex-col gap-4 justify-start">
                  {activeLocation === location.id &&
                    logEntries.map((entry, index) => {
                      const opacity =
                        index === logEntries.length - 1
                          ? 1
                          : 0.3 + (index / logEntries.length) * 0.7
                      return (
                        <div
                          key={entry.id}
                          className="transition-opacity duration-500"
                          style={{ opacity }}
                        >
                          <div className="typewriter-line text-sm leading-relaxed font-light">
                            {renderTextWithEntities(entry.text, entry.entity, entry.entityRarity)}
                          </div>
                          {entry.entityData && renderEntityCard(entry.entityData)}
                          {entry.choices && entry.showChoices && (
                            <div className="mt-3 flex flex-col gap-2 animate-in fade-in duration-300">
                              {entry.choices.map((choice, choiceIndex) => (
                                <Button
                                  // eslint-disable-next-line react/no-array-index-key
                                  key={choiceIndex}
                                  variant="ghost"
                                  className="choice-stagger justify-start text-left h-auto py-2 px-3 hover:bg-accent/10 hover:text-accent hover:translate-x-1 active:scale-[0.98] transition-all duration-200 font-light text-sm"
                                  style={{ animationDelay: `${choiceIndex * 50}ms` }}
                                  onClick={() => handleChoice(choice)}
                                >
                                  <span className="text-accent mr-2">›</span>
                                  {choice.text}
                                </Button>
                              ))}
                            </div>
                          )}
                          {entry.treasureChoices && entry.showTreasureChoices && (
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 animate-in fade-in duration-300">
                              {entry.treasureChoices.map((treasureChoice, choiceIndex) => (
                                <div
                                  key={choiceIndex}
                                  className="choice-stagger p-4 bg-secondary/30 rounded border border-border/50 hover:border-accent hover:bg-accent/5 cursor-pointer transition-all duration-200 active:scale-95"
                                  style={{ animationDelay: `${choiceIndex * 100}ms` }}
                                  onClick={() => handleTreasureChoice(treasureChoice)}
                                >
                                  <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
                                    {treasureChoice.type}
                                  </div>
                                  <div className="text-sm font-light text-foreground mb-2">
                                    {treasureChoice.description}
                                  </div>
                                  {treasureChoice.item && (
                                    <div className="text-xs text-muted-foreground">
                                      {treasureChoice.item.stats?.attack &&
                                        `+${treasureChoice.item.stats.attack} ATK `}
                                      {treasureChoice.item.stats?.defense &&
                                        `+${treasureChoice.item.stats.defense} DEF `}
                                      {treasureChoice.item.stats?.health &&
                                        `+${treasureChoice.item.stats.health} HP`}
                                    </div>
                                  )}
                                  {treasureChoice.gold && (
                                    <div className="text-xs text-yellow-500">
                                      +{treasureChoice.gold} gold
                                    </div>
                                  )}
                                  {treasureChoice.healthRestore && (
                                    <div className="text-xs text-green-500">
                                      Restore {treasureChoice.healthRestore} HP
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>
              </TabsContent>
            ))}

            <TabsContent
              value="equipment"
              className="flex-1 flex flex-col gap-6 overflow-y-auto overflow-x-hidden mt-0 min-w-0 w-full max-w-full hide-scrollbar"
            >
              <div className="flex flex-col gap-4 min-w-0 w-full">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  Equipped Gear
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {/* Weapon Slot */}
                  <div className="flex flex-col gap-1.5">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider text-center">
                      Weapon
                    </div>
                    {equippedItems.weapon ? (
                      <div
                        className="p-1.5 bg-accent/10 rounded border border-accent/20 hover:bg-accent/15 transition-all cursor-pointer"
                        onClick={() => {
                          const item = equippedItems.weapon
                          if (item) {
                            openModal(
                              item.name,
                              `Type: ${item.type}\nValue: ${item.value}\n${
                                item.stats
                                  ? `\nStats:\n${Object.entries(item.stats)
                                      .map(([stat, value]) => `${stat}: +${value}`)
                                      .join("\n")}`
                                  : ""
                              }\n\nA valuable item in your possession.`,
                              item
                            )
                          }
                        }}
                      >
                        <div
                          className={`text-sm font-light text-center ${getRarityColor(equippedItems.weapon.rarity, true)}`}
                        >
                          {equippedItems.weapon.name}
                        </div>
                      </div>
                    ) : (
                      <div className="p-1.5 bg-secondary/20 rounded border border-border/30 text-xs text-muted-foreground text-center">
                        Empty
                      </div>
                    )}
                  </div>

                  {/* Armor Slot */}
                  <div className="flex flex-col gap-1.5">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider text-center">
                      Armor
                    </div>
                    {equippedItems.armor ? (
                      <div
                        className="p-1.5 bg-accent/10 rounded border border-accent/20 hover:bg-accent/15 transition-all cursor-pointer"
                        onClick={() => {
                          const item = equippedItems.armor
                          if (item) {
                            openModal(
                              item.name,
                              `Type: ${item.type}\nValue: ${item.value}\n${
                                item.stats
                                  ? `\nStats:\n${Object.entries(item.stats)
                                      .map(([stat, value]) => `${stat}: +${value}`)
                                      .join("\n")}`
                                  : ""
                              }\n\nA valuable item in your possession.`,
                              item
                            )
                          }
                        }}
                      >
                        <div
                          className={`text-sm font-light text-center ${getRarityColor(equippedItems.armor.rarity, true)}`}
                        >
                          {equippedItems.armor.name}
                        </div>
                      </div>
                    ) : (
                      <div className="p-1.5 bg-secondary/20 rounded border border-border/30 text-xs text-muted-foreground text-center">
                        Empty
                      </div>
                    )}
                  </div>

                  {/* Accessory Slot */}
                  <div className="flex flex-col gap-1.5">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider text-center">
                      Accessory
                    </div>
                    {equippedItems.accessory ? (
                      <div
                        className="p-1.5 bg-accent/10 rounded border border-accent/20 hover:bg-accent/15 transition-all cursor-pointer"
                        onClick={() => {
                          const item = equippedItems.accessory
                          if (item) {
                            openModal(
                              item.name,
                              `Type: ${item.type}\nValue: ${item.value}\n${
                                item.stats
                                  ? `\nStats:\n${Object.entries(item.stats)
                                      .map(([stat, value]) => `${stat}: +${value}`)
                                      .join("\n")}`
                                  : ""
                              }\n\nA valuable item in your possession.`,
                              item
                            )
                          }
                        }}
                      >
                        <div
                          className={`text-sm font-light text-center ${getRarityColor(equippedItems.accessory.rarity, true)}`}
                        >
                          {equippedItems.accessory.name}
                        </div>
                      </div>
                    ) : (
                      <div className="p-1.5 bg-secondary/20 rounded border border-border/30 text-xs text-muted-foreground text-center">
                        Empty
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent
              value="developer"
              className="flex-1 flex flex-col overflow-hidden mt-0 min-w-0 w-full max-w-full"
            >
              <Tabs
                value={developerActiveTab}
                onValueChange={setDeveloperActiveTab}
                className="flex-1 flex flex-col overflow-hidden min-w-0 w-full"
              >
                <TabsList className="bg-secondary/20 border border-border/30 p-1 h-auto mb-4 flex-shrink-0 w-full">
                  <TabsTrigger
                    value="ai-tools"
                    className="flex-1 data-[state=active]:bg-accent/20 data-[state=active]:text-accent text-xs py-2 flex items-center justify-center gap-1.5"
                  >
                    <span className="text-base">🤖</span>
                    <span>AI Tools</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="entity-registry"
                    className="flex-1 data-[state=active]:bg-accent/20 data-[state=active]:text-accent text-xs py-2 flex items-center justify-center gap-1.5"
                  >
                    <span className="text-base">📊</span>
                    <span>Entity Registry</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="debug-console"
                    className="flex-1 data-[state=active]:bg-accent/20 data-[state=active]:text-accent text-xs py-2 flex items-center justify-center gap-1.5"
                  >
                    <span className="text-base">🐛</span>
                    <span>Debug Console</span>
                  </TabsTrigger>
                </TabsList>

                {/* AI Tools Tab */}
                <TabsContent
                  value="ai-tools"
                  className="flex-1 overflow-y-auto overflow-x-hidden mt-0 min-w-0 w-full hide-scrollbar"
                >
                  {/* 2-Column Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-[45%_55%] gap-6 h-full">
                    {/* Left Column: AI Generators */}
                    <div className="flex flex-col gap-4">
                      {/* AI Item Generator */}
                      <div className="pb-4 border-b border-border/30">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                          <span>🤖</span>
                          <span>AI Item Generator</span>
                        </div>

                        <div className="flex flex-col gap-2.5">
                          <div>
                            <label className="text-[10px] text-muted-foreground mb-1.5 block">
                              Item Description
                            </label>
                            <Input
                              value={itemPrompt}
                              onChange={(e) => setItemPrompt(e.target.value)}
                              placeholder="e.g., a legendary fire sword with high attack"
                              className="bg-secondary/20 border-border/30 text-foreground text-sm h-9"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !isGeneratingItem) {
                                  handleGenerateItem()
                                }
                              }}
                            />
                          </div>

                          <Button
                            onClick={handleGenerateItem}
                            disabled={isGeneratingItem || !itemPrompt.trim()}
                            className="bg-accent hover:bg-accent/80 text-background h-9 text-sm"
                          >
                            {isGeneratingItem ? "Generating..." : "Generate Item"}
                          </Button>

                          <div className="text-[10px] text-muted-foreground leading-relaxed">
                            <span className="text-accent/80 font-medium">Groq AI</span> • Describe
                            any item and it will be generated with appropriate stats and rarity.
                          </div>
                        </div>
                      </div>

                      {/* Portrait Generator */}
                      <div className="pb-4">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                          <span>🎨</span>
                          <span>Portrait Generator</span>
                        </div>

                        <div className="flex flex-col gap-2.5">
                          <div>
                            <label className="text-[10px] text-muted-foreground mb-1.5 block">
                              Character Description
                            </label>
                            <Input
                              value={portraitPrompt}
                              onChange={(e) => setPortraitPrompt(e.target.value)}
                              placeholder="e.g., Dark Wizard Witch"
                              className="bg-secondary/20 border-border/30 text-foreground text-sm h-9"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !isGeneratingPortrait) {
                                  handleGeneratePortrait()
                                }
                              }}
                            />
                          </div>

                          <Button
                            onClick={handleGeneratePortrait}
                            disabled={isGeneratingPortrait}
                            className="bg-accent hover:bg-accent/80 text-background h-9 text-sm"
                          >
                            {isGeneratingPortrait ? "Generating..." : "Generate Portrait"}
                          </Button>

                          <div className="text-[10px] text-muted-foreground leading-relaxed">
                            <span className="text-accent/80 font-medium">fal.ai</span> • Creates
                            fantasy character portraits using Flux AI.
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Portrait Gallery */}
                    <div className="flex flex-col min-h-0">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span>🖼️</span>
                        <span>Portrait Gallery</span>
                        {generatedPortraits.length > 0 && (
                          <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full">
                            {generatedPortraits.length}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col">
                        {generatedPortraits.length > 0 ? (
                          <>
                            {/* Carousel Container */}
                            <div className="relative flex items-start justify-center">
                              {(() => {
                                const sortedPortraits = generatedPortraits.sort((a, b) => {
                                  if (a.isFavorite && !b.isFavorite) return -1
                                  if (!a.isFavorite && b.isFavorite) return 1
                                  return b.timestamp - a.timestamp
                                })
                                const currentPortrait = sortedPortraits[currentPortraitIndex]
                                if (!currentPortrait) return null

                                return (
                                  <div className="w-full max-w-[280px]">
                                    <div
                                      className={`group relative rounded overflow-hidden border-2 transition-all ${
                                        playerPortrait === currentPortrait.imageUrl
                                          ? "border-accent shadow-lg shadow-accent/20"
                                          : "border-border/30"
                                      }`}
                                    >
                                      {/* Favorite Badge */}
                                      {currentPortrait.isFavorite && (
                                        <div className="absolute top-2 left-2 z-10 bg-amber-500/90 text-white text-xs px-2 py-1 rounded-sm flex items-center gap-1">
                                          ⭐
                                        </div>
                                      )}

                                      {/* Image Area - Clickable */}
                                      <div
                                        className="cursor-pointer hover:opacity-95 transition-opacity"
                                        onClick={() => handleSelectPortrait(currentPortrait.id)}
                                      >
                                        <img
                                          src={currentPortrait.imageUrl || "/placeholder.svg"}
                                          alt={currentPortrait.prompt}
                                          className="w-full h-auto object-cover aspect-[2/3] max-h-[380px]"
                                        />
                                      </div>

                                      {/* Info & Actions */}
                                      <div className="p-2.5 bg-secondary/30">
                                        <div className="text-[10px] text-muted-foreground mb-1.5 line-clamp-2">
                                          {currentPortrait.prompt}
                                        </div>
                                        {playerPortrait === currentPortrait.imageUrl && (
                                          <div className="text-[10px] text-accent mb-1.5 flex items-center gap-1">
                                            <span>✓</span>
                                            <span>Active</span>
                                          </div>
                                        )}

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-1.5">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleToggleFavorite(currentPortrait.id)
                                            }}
                                            className={`flex-1 text-[10px] px-2 py-1 rounded transition-colors ${
                                              currentPortrait.isFavorite
                                                ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                                                : "bg-secondary/50 text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                                            }`}
                                            title={
                                              currentPortrait.isFavorite ? "Unfavorite" : "Favorite"
                                            }
                                          >
                                            {currentPortrait.isFavorite ? "⭐" : "☆"}
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleDownloadPortrait(currentPortrait)
                                            }}
                                            className="px-2 py-1 rounded bg-secondary/50 text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors text-[10px]"
                                            title="Download"
                                          >
                                            ⬇️
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleDeletePortrait(currentPortrait.id)
                                            }}
                                            className="px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors text-[10px]"
                                            title="Delete"
                                          >
                                            🗑️
                                          </button>
                                        </div>
                                      </div>

                                      {/* Navigation Arrows */}
                                      {sortedPortraits.length > 1 && (
                                        <>
                                          <button
                                            onClick={handlePrevPortrait}
                                            className="absolute left-1 top-1/2 -translate-y-1/2 bg-accent/90 hover:bg-accent text-background rounded-md px-2 py-3 transition-all shadow-lg hover:shadow-xl hover:scale-110"
                                            title="Previous portrait (←)"
                                          >
                                            <svg
                                              width="12"
                                              height="12"
                                              viewBox="0 0 12 12"
                                              fill="none"
                                              xmlns="http://www.w3.org/2000/svg"
                                            >
                                              <path
                                                d="M7.5 2L3.5 6L7.5 10"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                              />
                                            </svg>
                                          </button>
                                          <button
                                            onClick={handleNextPortrait}
                                            className="absolute right-1 top-1/2 -translate-y-1/2 bg-accent/90 hover:bg-accent text-background rounded-md px-2 py-3 transition-all shadow-lg hover:shadow-xl hover:scale-110"
                                            title="Next portrait (→)"
                                          >
                                            <svg
                                              width="12"
                                              height="12"
                                              viewBox="0 0 12 12"
                                              fill="none"
                                              xmlns="http://www.w3.org/2000/svg"
                                            >
                                              <path
                                                d="M4.5 2L8.5 6L4.5 10"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                              />
                                            </svg>
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )
                              })()}
                            </div>

                            {/* Carousel Dots */}
                            {generatedPortraits.length > 1 && (
                              <div className="flex items-center justify-center gap-1.5 mt-3 pb-2">
                                {generatedPortraits
                                  .sort((a, b) => {
                                    if (a.isFavorite && !b.isFavorite) return -1
                                    if (!a.isFavorite && b.isFavorite) return 1
                                    return b.timestamp - a.timestamp
                                  })
                                  .map((portrait, index) => (
                                    <button
                                      key={portrait.id}
                                      onClick={() => setCurrentPortraitIndex(index)}
                                      className={`transition-all ${
                                        index === currentPortraitIndex
                                          ? "w-6 h-2 bg-accent"
                                          : "w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                                      } rounded-full`}
                                      title={`Go to portrait ${index + 1}`}
                                    />
                                  ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center justify-center py-8">
                            <div className="text-sm text-muted-foreground text-center py-8 bg-secondary/10 rounded border border-border/20 max-w-[280px] w-full">
                              <div className="text-3xl mb-2 opacity-30">🎨</div>
                              <div className="text-xs">No portraits yet</div>
                              <div className="text-[10px] mt-1 opacity-70">Generate above</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Entity Registry Tab */}
                <TabsContent
                  value="entity-registry"
                  className="flex-1 overflow-y-auto overflow-x-hidden mt-0 min-w-0 w-full hide-scrollbar"
                >
                  <div className="flex flex-col gap-6">
                    {/* Registry Statistics */}
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
                        Registry Statistics
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-secondary/20 rounded p-3 border border-border/30">
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                            Total Entities
                          </div>
                          <div className="text-2xl font-mono text-accent">{entityStats.total}</div>
                        </div>
                        <div className="bg-secondary/20 rounded p-3 border border-border/30">
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                            Canonical
                          </div>
                          <div className="text-2xl font-mono text-green-500">
                            {entityStats.canonical}
                          </div>
                        </div>
                        <div className="bg-secondary/20 rounded p-3 border border-border/30">
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                            AI Generated
                          </div>
                          <div className="text-2xl font-mono text-purple-500">
                            {entityStats.bySource.ai || 0}
                          </div>
                        </div>
                        <div className="bg-secondary/20 rounded p-3 border border-border/30">
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                            Overrides
                          </div>
                          <div className="text-2xl font-mono text-amber-500">
                            {entityStats.overrides}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Entity Type Breakdown */}
                    <div className="pb-6 border-b border-border/30">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">
                        By Type
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(entityStats.byType).map(([type, count]) => (
                          <div
                            key={type}
                            className="bg-secondary/10 rounded px-3 py-2 border border-border/20 flex justify-between items-center"
                          >
                            <span className="text-xs capitalize">{type}</span>
                            <span className="text-xs font-mono text-muted-foreground">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Management Actions */}
                    <div className="pb-6 border-b border-border/30">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">
                        Management Actions
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={refreshEntityStats}
                          variant="outline"
                          className="bg-secondary/20 hover:bg-secondary/30 border-border/30 text-foreground text-xs"
                        >
                          Refresh Stats
                        </Button>
                        <Button
                          onClick={handleTestVariants}
                          variant="outline"
                          className="bg-accent/10 hover:bg-accent/20 border-accent/30 text-accent text-xs"
                        >
                          Test AI Variants
                        </Button>
                        <Button
                          onClick={handlePruneExpired}
                          variant="outline"
                          className="bg-secondary/20 hover:bg-secondary/30 border-border/30 text-foreground text-xs"
                        >
                          Prune Expired
                        </Button>
                        <Button
                          onClick={handleClearAI}
                          variant="outline"
                          className="bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30 text-purple-400 text-xs"
                        >
                          Clear AI
                        </Button>
                        <Button
                          onClick={handleClearSession}
                          variant="outline"
                          className="bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 text-blue-400 text-xs"
                        >
                          Clear Session
                        </Button>
                        <Button
                          onClick={handleClearAll}
                          variant="outline"
                          className="bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-400 text-xs"
                        >
                          Clear All
                        </Button>
                      </div>
                    </div>

                    {/* Entity Browser */}
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">
                        Entity Browser
                      </div>
                      <div className="flex flex-col gap-2">
                        {Object.entries(entityStats.byType).map(([type, count]) => (
                          <div
                            key={type}
                            className="border border-border/30 rounded overflow-hidden"
                          >
                            <button
                              onClick={() =>
                                setExpandedEntityType(expandedEntityType === type ? null : type)
                              }
                              className="w-full px-3 py-2 bg-secondary/20 hover:bg-secondary/30 flex justify-between items-center text-xs transition-colors"
                            >
                              <span className="capitalize">{type}</span>
                              <span className="text-muted-foreground">
                                {expandedEntityType === type ? "▼" : "▶"} {count}
                              </span>
                            </button>
                            {expandedEntityType === type && (
                              <div className="p-2 bg-secondary/10 max-h-64 overflow-y-auto">
                                {ENTITIES.byType(type as EntityType).map((entity) => (
                                  <div
                                    key={entity.id}
                                    className="text-[10px] py-1 px-2 hover:bg-secondary/20 rounded flex justify-between items-center transition-colors"
                                  >
                                    <span className="truncate flex-1">{entity.name}</span>
                                    <div className="flex gap-2 items-center">
                                      <span
                                        className={`capitalize ${getRarityColor(entity.rarity)}`}
                                      >
                                        {entity.rarity}
                                      </span>
                                      {entity.source === "ai" && (
                                        <span className="text-purple-400 text-[8px]">AI</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Debug Console Tab */}
                <TabsContent
                  value="debug-console"
                  className="flex-1 flex flex-col overflow-hidden mt-0 min-w-0 w-full"
                >
                  <div className="flex flex-col h-full gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Debug Console (
                        {
                          debugLogs.filter(
                            (log) =>
                              debugLogFilters.has(log.type) &&
                              (debugLogSearchQuery === "" ||
                                log.message
                                  .toLowerCase()
                                  .includes(debugLogSearchQuery.toLowerCase()))
                          ).length
                        }
                        /{debugLogs.length})
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setDebugTimestampFormat((prev) =>
                              prev === "absolute" ? "relative" : "absolute"
                            )
                          }
                          className="h-6 text-[9px] px-2 rounded border border-border/30 bg-secondary/20 hover:bg-secondary/30 transition-colors text-muted-foreground"
                          title="Toggle timestamp format"
                        >
                          {debugTimestampFormat === "absolute" ? "⏰" : "⏱"}
                        </button>
                        <Button
                          onClick={exportDebugLogs}
                          variant="outline"
                          disabled={debugLogs.length === 0}
                          className="h-6 text-[10px] px-2 bg-accent/10 hover:bg-accent/20 border-accent/30 text-accent"
                        >
                          Export
                        </Button>
                        <Button
                          onClick={clearDebugLogs}
                          variant="outline"
                          disabled={debugLogs.length === 0}
                          className="h-6 text-[10px] px-2 bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-400"
                        >
                          Clear
                        </Button>
                      </div>
                    </div>

                    {/* Search input */}
                    <Input
                      type="text"
                      placeholder="Search logs..."
                      value={debugLogSearchQuery}
                      onChange={(e) => setDebugLogSearchQuery(e.target.value)}
                      className="h-7 text-[11px] bg-black/40 border-border/30"
                    />

                    {/* Log type filters */}
                    <div className="flex flex-wrap gap-2">
                      {(["system", "state", "game", "ai", "error"] as const).map((type) => {
                        const isActive = debugLogFilters.has(type)
                        const count = debugLogs.filter((log) => log.type === type).length
                        const getSeverityBadge = () => {
                          if (type === "error") return "🔴"
                          if (type === "ai") return "🟣"
                          if (type === "state") return "🔵"
                          if (type === "game") return "🟢"
                          return "🟡"
                        }
                        const color =
                          type === "error"
                            ? "text-red-400 border-red-400/30"
                            : type === "ai"
                              ? "text-purple-400 border-purple-400/30"
                              : type === "state"
                                ? "text-blue-400 border-blue-400/30"
                                : type === "game"
                                  ? "text-green-400 border-green-400/30"
                                  : "text-amber-400 border-amber-400/30"

                        return (
                          <button
                            key={type}
                            onClick={() => toggleLogFilter(type)}
                            className={`text-[9px] px-2 py-1 rounded border transition-all flex items-center gap-1 ${color} ${
                              isActive ? "bg-current/10 opacity-100" : "opacity-30 hover:opacity-60"
                            }`}
                          >
                            <span>{getSeverityBadge()}</span>
                            <span>
                              {type.toUpperCase()} ({count})
                            </span>
                          </button>
                        )
                      })}
                    </div>

                    <div
                      ref={debugLogRef}
                      className="flex-1 overflow-y-auto bg-black/40 rounded border border-border/30 p-3 font-mono text-[10px] leading-relaxed"
                    >
                      {debugLogs.filter(
                        (log) =>
                          debugLogFilters.has(log.type) &&
                          (debugLogSearchQuery === "" ||
                            log.message.toLowerCase().includes(debugLogSearchQuery.toLowerCase()))
                      ).length === 0 ? (
                        <div className="text-muted-foreground text-center py-8">
                          {debugLogs.length === 0
                            ? "No debug logs yet. Interact with the game to see events logged here."
                            : "No logs match current filters or search query."}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {debugLogs
                            .filter(
                              (log) =>
                                debugLogFilters.has(log.type) &&
                                (debugLogSearchQuery === "" ||
                                  log.message
                                    .toLowerCase()
                                    .includes(debugLogSearchQuery.toLowerCase()))
                            )
                            .map((log) => {
                              const time =
                                debugTimestampFormat === "absolute"
                                  ? new Date(log.timestamp).toLocaleTimeString("en-US", {
                                      hour12: false,
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      second: "2-digit",
                                      fractionalSecondDigits: 3,
                                    })
                                  : formatRelativeTime(log.timestamp)
                              const typeColor =
                                log.type === "error"
                                  ? "text-red-400"
                                  : log.type === "ai"
                                    ? "text-purple-400"
                                    : log.type === "state"
                                      ? "text-blue-400"
                                      : log.type === "game"
                                        ? "text-green-400"
                                        : "text-amber-400"
                              const isExpanded = expandedLogData.has(log.id)
                              const severityBadge = getSeverityBadge(log.type)

                              return (
                                <div
                                  key={log.id}
                                  className="group hover:bg-secondary/20 px-1 rounded transition-colors relative"
                                >
                                  <div className="flex items-start gap-1">
                                    <span className="text-muted-foreground text-[10px]">
                                      [{time}]
                                    </span>
                                    <span className={`${typeColor} text-[11px]`} title={log.type}>
                                      {severityBadge}
                                    </span>
                                    <span className="flex-1 text-foreground text-[10px]">
                                      {highlightSearchMatch(log.message, debugLogSearchQuery)}
                                    </span>
                                    <button
                                      onClick={() => copyLogToClipboard(log)}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] px-1 hover:text-accent"
                                      title="Copy to clipboard"
                                    >
                                      📋
                                    </button>
                                  </div>
                                  {log.data !== undefined && (
                                    <div className="ml-6 mt-0.5">
                                      <button
                                        onClick={() => toggleLogDataExpanded(log.id)}
                                        className="text-[9px] text-muted-foreground hover:text-foreground transition-colors"
                                      >
                                        {isExpanded ? "▼ Hide data" : "▶ Show data"}
                                      </button>
                                      {isExpanded && (
                                        <pre className="mt-1 text-muted-foreground text-[9px] whitespace-pre-wrap break-all bg-black/20 p-2 rounded border border-border/20">
                                          {JSON.stringify(log.data, null, 2)}
                                        </pre>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                        </div>
                      )}
                    </div>

                    <div className="text-[9px] text-muted-foreground">
                      Logs are automatically cleared after 100 entries. Types: SYSTEM (startup),
                      STATE (saves), GAME (events), AI (generation), ERROR (failures)
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
        </div>

        <div className="col-span-1 pt-20 pb-6 px-6 flex flex-col gap-4 overflow-hidden">
          <div className="pb-4 border-b border-border/30">
            <div className="text-muted-foreground text-xs mb-1.5 uppercase tracking-wider">
              Gold
            </div>
            <div className="font-mono text-amber-500 text-2xl font-light">
              <AnimatedNumber value={baseStats.gold} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 overflow-y-auto">
            {inventory.map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item.id)}
                onDragOver={(e) => handleDragOver(e, item.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, item.id)}
                onDragEnd={handleDragEnd}
                className={`p-1.5 bg-secondary/20 rounded hover:bg-accent/10 transition-all cursor-pointer ${
                  draggedItemId === item.id ? "opacity-50" : ""
                } ${dragOverItemId === item.id ? "border-2 border-accent" : ""}`}
                onClick={() => {
                  if (item.type === "map" && item.mapData) {
                    const meta = item.portalMetadata
                    setModalContent({
                      title: item.name,
                      description: `Location: ${item.mapData.locationName}
Entrances: ~${meta?.expectedRoomCount || item.mapData.entrances} rooms${meta ? " (±1 variance)" : ""}
Rarity: ${item.mapData.rarity}
${
  meta
    ? `
Risk Level: ${meta.riskLevel}
Stability Decay: ${meta.stabilityDecayRate.min}-${meta.stabilityDecayRate.max}% per room
Events: ${meta.eventDiversity.join(", ")}${meta.theme ? `\nTheme: ${meta.theme}` : ""}`
    : ""
}

Open this map to unlock a portal to ${item.mapData.locationName}.`,
                    })
                    setModalOpen(true)
                  } else if (item.type === "consumable" && item.consumableEffect) {
                    const effect = item.consumableEffect
                    const effectDesc = Object.entries(effect.statChanges)
                      .map(([stat, value]) => `${stat}: ${value > 0 ? "+" : ""}${value}`)
                      .join("\n")
                    setModalContent({
                      title: item.name,
                      description: `Type: ${effect.type}\n${effect.duration ? `Duration: ${effect.duration}s\n` : ""}Effects:\n${effectDesc}\n\nUse this consumable to gain its effects.`,
                    })
                    setModalOpen(true)
                  } else {
                    openModal(
                      item.name,
                      `Type: ${item.type}\nValue: ${item.value}\n\nA valuable item in your possession.`,
                      item
                    )
                  }
                }}
              >
                <div className={`text-sm font-light ${getRarityColor(item.rarity)}`}>
                  {item.name}
                </div>
              </div>
            ))}
            {inventory.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-8 font-light">
                Your inventory is empty
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-card/95 backdrop-blur-sm border-border/50">
          <DialogHeader>
            <DialogTitle className="text-accent font-light">{modalContent?.title}</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-foreground whitespace-pre-line leading-relaxed font-light">
            {modalContent?.description}
          </div>
          {inventory.find((item) => item.name === modalContent?.title && item.type === "map") && (
            <Button
              className="mt-4 bg-accent hover:bg-accent/80 text-background"
              onClick={() => {
                const mapItem = inventory.find(
                  (item) => item.name === modalContent?.title && item.type === "map"
                )
                if (mapItem) handleOpenMap(mapItem)
              }}
            >
              Open Map
            </Button>
          )}
          {inventory.find(
            (item) => item.name === modalContent?.title && item.type === "consumable"
          ) && (
            <Button
              className="mt-4 bg-accent hover:bg-accent/80 text-background"
              onClick={() => {
                const consumableItem = inventory.find(
                  (item) => item.name === modalContent?.title && item.type === "consumable"
                )
                if (consumableItem) handleUseConsumable(consumableItem)
              }}
            >
              Use Consumable
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
