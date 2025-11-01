"use client"

import { useEffect, useState } from "react"
import type { DamageSource } from "@/lib/animations"
import { getDamageDirection, getDamageStyle, getDirectionalSlide } from "@/lib/animations"

interface FloatingNumberProps {
  value: number
  source: DamageSource
  onComplete?: () => void
}

export function FloatingNumber({ value, source, onComplete }: FloatingNumberProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Fade out and complete after animation
    const timer = setTimeout(() => {
      setIsVisible(false)
      onComplete?.()
    }, 1000)

    return () => clearTimeout(timer)
  }, [onComplete])

  const direction = getDamageDirection(source)
  const animation = getDirectionalSlide(direction)
  const style = getDamageStyle(source, value)

  if (!isVisible) return null

  return (
    <div
      className={`fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 ${animation.className} ${style.animation}`}
    >
      <div
        className={`text-4xl font-bold font-mono ${style.color}`}
        style={{
          filter: style.shadow,
          textShadow: "0 2px 4px rgba(0,0,0,0.8)",
        }}
      >
        {value > 0 ? `+${value}` : value}
      </div>
    </div>
  )
}

interface FloatingIndicator {
  id: string
  value: number
  source: DamageSource
}

/**
 * Container for managing multiple floating numbers
 */
export function FloatingNumberContainer() {
  const [indicators, setIndicators] = useState<FloatingIndicator[]>([])

  // Global function to trigger floating numbers
  useEffect(() => {
    // @ts-expect-error - Adding global function for floating numbers
    window.showFloatingNumber = (value: number, source: DamageSource) => {
      const id = crypto.randomUUID()
      setIndicators((prev) => [...prev, { id, value, source }])
    }

    return () => {
      // @ts-expect-error - Cleanup
      delete window.showFloatingNumber
    }
  }, [])

  const handleComplete = (id: string) => {
    setIndicators((prev) => prev.filter((indicator) => indicator.id !== id))
  }

  return (
    <>
      {indicators.map((indicator) => (
        <FloatingNumber
          key={indicator.id}
          value={indicator.value}
          source={indicator.source}
          onComplete={() => handleComplete(indicator.id)}
        />
      ))}
    </>
  )
}
