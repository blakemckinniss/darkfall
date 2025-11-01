"use client"

import type React from "react"

import { useState, useEffect, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AnimatedNumber } from "@/components/animated-number"
import { Input } from "@/components/ui/input"
import {
  generateEvent,
  type GameEvent,
  type PlayerStats,
  type InventoryItem,
  type Location,
  type ActiveEffect,
} from "@/lib/game-engine"
import { saveGameState, loadGameState, type GeneratedPortrait } from "@/lib/game-state"
import type { Rarity, Stats } from "@/lib/types"
import { ENTITIES, RARITY_COLORS, type EntityType } from "@/lib/entities"

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

  // Performance optimization: ref for debounced save timeout
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    const savedState = loadGameState()
    if (savedState) {
      console.log("[v0] Loading saved game state:", savedState)
      setBaseStats(savedState.playerStats)
      setInventory(savedState.inventory)
      setEquippedItems(savedState.equippedItems)
      setActiveEffects(savedState.activeEffects.filter((effect) => effect.endTime > Date.now()))
      setOpenLocations(savedState.openLocations)
      setPlayerPortrait(savedState.activePortrait)
      setGeneratedPortraits(savedState.generatedPortraits || [])
      console.log("[v0] Player portrait loaded:", savedState.activePortrait)
      console.log("[v0] Generated portraits loaded:", savedState.generatedPortraits)
    }
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
    entityData?: LogEntry["entityData"]
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
    }

    setLogEntries([newEntry])

    if (choices) {
      setTimeout(
        () => {
          setLogEntries((prev) =>
            prev.map((entry) =>
              entry.id === newEntry.id ? { ...entry, showChoices: true } : entry
            )
          )
        },
        text.length * 20 + 200
      )
    }
  }

  const handleChoice = (choice: GameEvent["choices"][0]) => {
    if (!currentEvent) return

    setLogEntries([])

    if (activeLocation && activeLocation !== "void") {
      setOpenLocations((prev) =>
        prev.map((loc) => {
          if (loc.id === activeLocation) {
            const newStability = Math.max(0, loc.stability - Math.floor(Math.random() * 15 + 10))

            if (newStability <= 0) {
              setTimeout(() => {
                setOpenLocations((current) => current.filter((l) => l.id !== activeLocation))
                setActiveTab("portal")
                setActiveLocation(null)
                addLogEntry(
                  "The portal collapses! You are forced back to the portal nexus.",
                  "portal"
                )
              }, 1000)
            }

            return { ...loc, stability: newStability }
          }
          return loc
        })
      )
    }

    const outcome = choice.outcome
    const newStats = { ...baseStats }
    let newInventory = [...inventory]

    if (outcome.healthChange) {
      newStats.health = Math.max(
        0,
        Math.min(playerStats.maxHealth, newStats.health + outcome.healthChange)
      )
    }
    if (outcome.goldChange) {
      newStats.gold = Math.max(0, newStats.gold + outcome.goldChange)
    }
    if (outcome.experienceChange) {
      newStats.experience += outcome.experienceChange
      if (newStats.experience >= newStats.level * 100) {
        newStats.level += 1
        newStats.maxHealth += 10
        newStats.health = newStats.maxHealth
        newStats.attack += 2
        newStats.defense += 1
        addLogEntry(`Level up! You are now level ${newStats.level}`, "level")
      }
    }
    if (outcome.itemGained) {
      newInventory.push(outcome.itemGained)
      addLogEntry(`Gained: ${outcome.itemGained.name}`, "item")
    }
    if (outcome.itemLost) {
      newInventory = newInventory.filter((item) => item.id !== outcome.itemLost)
      addLogEntry(`Lost: ${inventory.find((i) => i.id === outcome.itemLost)?.name}`, "item")
    }

    setBaseStats(newStats)
    setInventory(newInventory)

    addLogEntry(outcome.message, outcome.entity, outcome.entityRarity)

    setTimeout(async () => {
      if (activeLocation === "void") {
        // Generate AI narrative for The Void
        try {
          const response = await fetch("/api/generate-narrative", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ playerStats: newStats }),
          })

          if (!response.ok) {
            throw new Error("Failed to generate narrative")
          }

          const { event } = await response.json()
          setCurrentEvent(event)
          addLogEntry(
            event.description,
            event.entity,
            event.entityRarity,
            event.choices,
            event.entityData
          )
        } catch (error) {
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

  const handleOpenMap = (mapItem: InventoryItem) => {
    if (!mapItem.mapData) return

    const newLocation: Location = {
      id: Math.random().toString(36).substr(2, 9),
      name: mapItem.mapData.locationName,
      entrancesRemaining: mapItem.mapData.entrances,
      maxEntrances: mapItem.mapData.entrances,
      rarity: mapItem.mapData.rarity,
      stability: 100,
    }

    setOpenLocations((prev) => [...prev, newLocation])
    setInventory((prev) => prev.filter((item) => item.id !== mapItem.id))
    setModalOpen(false)
  }

  const handleEnterLocation = (locationId: string) => {
    const location = openLocations.find((loc) => loc.id === locationId)
    if (!location) return

    setActiveLocation(locationId)
    setActiveTab(locationId)

    const firstEvent = generateEvent(playerStats, inventory)
    setCurrentEvent(firstEvent)
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

    try {
      const response = await fetch("/api/generate-narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerStats }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate narrative")
      }

      const { event } = await response.json()
      setCurrentEvent(event)
      addLogEntry(
        event.description,
        event.entity,
        event.entityRarity,
        event.choices,
        event.entityData
      )
    } catch (error) {
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
      <div className="my-3 p-4 bg-secondary/30 rounded border border-accent/30 animate-in fade-in duration-300">
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

    if (effect.type === "permanent") {
      setBaseStats((prev) => ({
        ...prev,
        attack: prev.attack + (effect.statChanges.attack || 0),
        defense: prev.defense + (effect.statChanges.defense || 0),
        maxHealth: prev.maxHealth + (effect.statChanges.maxHealth || 0),
      }))
      addLogEntry(`You consumed ${item.name}. Its effects are permanent!`, item.name, item.rarity)
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
    try {
      const response = await fetch("/api/generate-portrait", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `${portraitPrompt}, fantasy portrait, detailed face, mystical atmosphere`,
        }),
      })
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
        console.log("[v0] Portrait generated and added to gallery:", newPortrait)
        console.log("[v0] Total portraits in gallery:", generatedPortraits.length + 1)
      }
    } catch (error) {
      console.error("[v0] Failed to generate portrait:", error)
    }
    setIsGeneratingPortrait(false)
  }

  const handleSelectPortrait = (portraitId: string) => {
    const portrait = generatedPortraits.find((p) => p.id === portraitId)
    if (portrait) {
      setPlayerPortrait(portrait.imageUrl)
    }
  }

  const handleGenerateItem = async () => {
    if (!itemPrompt.trim()) return

    setIsGeneratingItem(true)
    try {
      console.log("[v0] Generating item with prompt:", itemPrompt)
      const response = await fetch("/api/generate-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: itemPrompt }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate item")
      }

      const { item } = await response.json()
      console.log("[v0] Item generated:", item)

      // Add the generated item to inventory
      setInventory((prev) => [...prev, item])
      addLogEntry(`Generated: ${item.name} (${item.rarity})`, item.name, item.rarity)

      // Clear the prompt
      setItemPrompt("")
    } catch (error) {
      console.error("[v0] Failed to generate item:", error)
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

  return (
    <div className="h-screen w-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="fixed top-6 left-6 text-2xl font-light tracking-wider text-accent font-inter">
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
                  className="p-4 bg-secondary/20 rounded border border-border/30 hover:border-accent/50 transition-all cursor-pointer"
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
                    className="p-4 bg-secondary/20 rounded border border-border/30 hover:border-accent/50 transition-all cursor-pointer"
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
                              className="justify-start text-left h-auto py-2 px-3 hover:bg-accent/10 hover:text-accent transition-all font-light text-sm"
                              onClick={() => handleChoice(choice)}
                            >
                              <span className="text-accent mr-2">›</span>
                              {choice.text}
                            </Button>
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
                                  className="justify-start text-left h-auto py-2 px-3 hover:bg-accent/10 hover:text-accent transition-all font-light text-sm"
                                  onClick={() => handleChoice(choice)}
                                >
                                  <span className="text-accent mr-2">›</span>
                                  {choice.text}
                                </Button>
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
                </TabsList>

                {/* AI Tools Tab */}
                <TabsContent
                  value="ai-tools"
                  className="flex-1 overflow-y-auto overflow-x-hidden mt-0 min-w-0 w-full hide-scrollbar"
                >
                  <div className="flex flex-col gap-6">
                    {/* AI Item Generator */}
                    <div className="pb-6 border-b border-border/30">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
                        AI Item Generator (Groq)
                      </div>

                      <div className="flex flex-col gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground mb-2 block">
                            Item Description
                          </label>
                          <Input
                            value={itemPrompt}
                            onChange={(e) => setItemPrompt(e.target.value)}
                            placeholder="e.g., a legendary fire sword with high attack"
                            className="bg-secondary/20 border-border/30 text-foreground"
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
                          className="bg-accent hover:bg-accent/80 text-background"
                        >
                          {isGeneratingItem ? "Generating..." : "Generate Item"}
                        </Button>

                        <div className="text-[10px] text-muted-foreground">
                          Powered by Groq AI. Describe any item and it will be generated with
                          appropriate stats and rarity.
                        </div>
                      </div>
                    </div>

                    {/* Portrait Generator */}
                    <div className="pb-6 border-b border-border/30">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
                        Portrait Generator (fal.ai)
                      </div>

                      <div className="flex flex-col gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground mb-2 block">
                            Character Description
                          </label>
                          <Input
                            value={portraitPrompt}
                            onChange={(e) => setPortraitPrompt(e.target.value)}
                            placeholder="e.g., Dark Wizard Witch"
                            className="bg-secondary/20 border-border/30 text-foreground"
                          />
                        </div>

                        <Button
                          onClick={handleGeneratePortrait}
                          disabled={isGeneratingPortrait}
                          className="bg-accent hover:bg-accent/80 text-background"
                        >
                          {isGeneratingPortrait ? "Generating..." : "Generate Portrait"}
                        </Button>
                      </div>
                    </div>

                    {/* Portrait Gallery */}
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
                        Portrait Gallery
                      </div>
                      {generatedPortraits.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3">
                          {generatedPortraits.map((portrait) => (
                            <div
                              key={portrait.id}
                              className={`rounded overflow-hidden border-2 cursor-pointer transition-all hover:border-accent/50 ${
                                playerPortrait === portrait.imageUrl
                                  ? "border-accent"
                                  : "border-border/30"
                              }`}
                              onClick={() => handleSelectPortrait(portrait.id)}
                            >
                              <img
                                src={portrait.imageUrl || "/placeholder.svg"}
                                alt={portrait.prompt}
                                className="w-full h-auto object-cover aspect-[2/3]"
                              />
                              <div className="p-2 bg-secondary/30">
                                <div className="text-[10px] text-muted-foreground truncate">
                                  {portrait.prompt}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground text-center py-8 bg-secondary/10 rounded border border-border/20">
                          No portraits generated yet. Generate your first portrait above!
                        </div>
                      )}
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
                    setModalContent({
                      title: item.name,
                      description: `Location: ${item.mapData.locationName}\nEntrances: ${item.mapData.entrances}\nRarity: ${item.mapData.rarity}\n\nOpen this map to unlock a portal to ${item.mapData.locationName}.`,
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
