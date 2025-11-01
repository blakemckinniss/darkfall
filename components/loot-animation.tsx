"use client"

import { useEffect, useState } from "react"
import type { InventoryItem } from "@/lib/game-engine"

/**
 * Helper function to get rarity color classes
 */
function getRarityColor(rarity: string): string {
  const colors: Record<string, string> = {
    common: "text-gray-400",
    uncommon: "text-green-400",
    rare: "text-blue-400",
    epic: "text-purple-400",
    legendary: "text-amber-400",
  }
  return colors[rarity] || "text-foreground"
}

interface LootDrop {
  id: string
  item: InventoryItem
}

/**
 * Loot drop animation component that displays items with bouncy effects
 * Legendary and epic items get extra dramatic animations
 */
export function LootAnimationContainer() {
  const [lootDrops, setLootDrops] = useState<LootDrop[]>([])

  // Global function to trigger loot animations
  useEffect(() => {
    // @ts-expect-error - Adding global function for loot animations
    window.triggerLootAnimation = (item: InventoryItem) => {
      const id = crypto.randomUUID()
      setLootDrops((prev) => [...prev, { id, item }])
    }

    return () => {
      // @ts-expect-error - Cleanup
      delete window.triggerLootAnimation
    }
  }, [])

  const handleComplete = (id: string) => {
    setLootDrops((prev) => prev.filter((drop) => drop.id !== id))
  }

  return (
    <>
      {lootDrops.map((drop) => (
        <LootDropAnimation
          key={drop.id}
          item={drop.item}
          onComplete={() => handleComplete(drop.id)}
        />
      ))}
    </>
  )
}

interface LootDropAnimationProps {
  item: InventoryItem
  onComplete?: () => void
}

function LootDropAnimation({ item, onComplete }: LootDropAnimationProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [animationPhase, setAnimationPhase] = useState<"anticipation" | "reveal" | "celebration">(
    "anticipation"
  )

  useEffect(() => {
    // Legendary items get special combo animation with phases
    if (item.rarity === "legendary") {
      // Phase 1: Anticipation (0-400ms) - Small scale pulse
      setAnimationPhase("anticipation")

      const revealTimer = setTimeout(() => {
        // Phase 2: Reveal (400-1200ms) - Big bounce from bottom
        setAnimationPhase("reveal")
      }, 400)

      const celebrationTimer = setTimeout(() => {
        // Phase 3: Celebration (1200-2000ms) - Shake and pulse
        setAnimationPhase("celebration")
      }, 1200)

      const hideTimer = setTimeout(() => {
        setIsVisible(false)
        onComplete?.()
      }, 2500) // Extended duration for legendary

      return () => {
        clearTimeout(revealTimer)
        clearTimeout(celebrationTimer)
        clearTimeout(hideTimer)
      }
    } else {
      // Non-legendary items use simple animations
      setAnimationPhase("reveal")
      const duration = item.rarity === "epic" ? 1500 : 1200

      const timer = setTimeout(() => {
        setIsVisible(false)
        onComplete?.()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [item.rarity, onComplete])

  if (!isVisible) return null

  // Get animation class based on rarity and phase (for legendary combo)
  const getAnimationClass = () => {
    if (item.rarity === "legendary") {
      // Legendary combo animation with phases
      if (animationPhase === "anticipation") {
        // Phase 1: Small pulse to build anticipation
        return "animate-pulse scale-95 opacity-0 animate-in fade-in duration-300"
      }
      if (animationPhase === "reveal") {
        // Phase 2: Dramatic entrance from bottom
        return "slide-from-bottom scale-100"
      }
      // Phase 3: Celebration shake and pulse
      return "animate-shake scale-110"
    }
    if (item.rarity === "epic") {
      // Epic: Strong bounce with pulse
      return "animate-[bounce_0.7s_ease-out,pulse-subtle_0.6s_ease-in-out_0.7s]"
    }
    if (item.rarity === "rare") {
      // Rare: Medium bounce
      return "animate-bounce duration-[600ms]"
    }
    // Common/Uncommon: Subtle bounce
    return "slide-from-bottom"
  }

  // Get glow effect based on rarity and phase
  const getGlowEffect = () => {
    if (item.rarity === "legendary") {
      // Legendary glow intensifies during celebration phase
      if (animationPhase === "celebration") {
        return "drop-shadow-[0_0_32px_currentColor] animate-pulse [animation-duration:0.5s]"
      }
      if (animationPhase === "reveal") {
        return "drop-shadow-[0_0_24px_currentColor]"
      }
      // Subtle glow during anticipation
      return "drop-shadow-[0_0_12px_currentColor]"
    }
    switch (item.rarity) {
      case "epic":
        return "drop-shadow-[0_0_16px_currentColor] animate-pulse [animation-duration:2s]"
      case "rare":
        return "drop-shadow-[0_0_8px_currentColor]"
      default:
        return ""
    }
  }

  return (
    <div
      className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 ${getAnimationClass()}`}
    >
      <div
        className={`text-3xl font-bold font-mono ${getRarityColor(item.rarity)} ${getGlowEffect()}`}
        style={{
          textShadow: "0 4px 8px rgba(0,0,0,0.8)",
        }}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="text-xs text-foreground/70 uppercase tracking-widest">
            {item.rarity} {item.type}
          </div>
          <div>{item.name}</div>
        </div>
      </div>
    </div>
  )
}
