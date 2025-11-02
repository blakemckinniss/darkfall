"use client"

import React from "react"
import { cn } from "@/lib/utils"
import type { Rarity, TextEffect } from "@/lib/entities/schemas"
import { RARITY_COLORS } from "@/lib/entities"

interface EntityTextProps {
  children: string
  rarity?: Rarity
  textEffect?: TextEffect
  className?: string
  withGlow?: boolean
}

/**
 * EntityText - Centralized component for rendering entity names with consistent styling
 *
 * Features:
 * - Rarity-based color defaults
 * - Advanced text effects (shimmer, gradient, glow, per-letter)
 * - Respects prefers-reduced-motion for accessibility
 * - Pure CSS animations for performance
 *
 * @param children - The entity name text to render
 * @param rarity - Entity rarity (common, uncommon, rare, epic, legendary)
 * @param textEffect - Optional advanced text effect configuration
 * @param className - Additional CSS classes
 * @param withGlow - Add glow effect (default: false)
 */
export function EntityText({
  children,
  rarity = "common",
  textEffect,
  className,
  withGlow = false,
}: EntityTextProps) {
  // Check if user prefers reduced motion
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false)

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [])

  // Fallback to rarity-based colors if no textEffect
  if (!textEffect || textEffect.type === "default" || prefersReducedMotion) {
    return <span className={cn(getRarityColorClass(rarity, withGlow), className)}>{children}</span>
  }

  // Render based on effect type
  switch (textEffect.type) {
    case "shimmer":
      return (
        <ShimmerText rarity={rarity} textEffect={textEffect} {...(className && { className })}>
          {children}
        </ShimmerText>
      )

    case "gradient":
      return (
        <GradientText rarity={rarity} textEffect={textEffect} {...(className && { className })}>
          {children}
        </GradientText>
      )

    case "glow":
      return (
        <GlowText rarity={rarity} textEffect={textEffect} {...(className && { className })}>
          {children}
        </GlowText>
      )

    case "per-letter":
      return (
        <PerLetterText rarity={rarity} textEffect={textEffect} {...(className && { className })}>
          {children}
        </PerLetterText>
      )

    default:
      return (
        <span className={cn(getRarityColorClass(rarity, withGlow), className)}>{children}</span>
      )
  }
}

/**
 * Get rarity-based color class with optional glow
 */
function getRarityColorClass(rarity: Rarity, withGlow: boolean): string {
  const colorClass = RARITY_COLORS[rarity]
  const baseClass = colorClass ? `${colorClass} font-semibold` : "text-foreground font-semibold"

  if (withGlow) {
    if (rarity === "legendary") {
      return `${baseClass} drop-shadow-[0_0_12px_currentColor] animate-pulse`
    } else if (rarity === "epic") {
      return `${baseClass} drop-shadow-[0_0_8px_currentColor] animate-pulse [animation-duration:3s]`
    } else if (rarity === "rare") {
      return `${baseClass} drop-shadow-[0_0_4px_currentColor]`
    }
  }

  return baseClass
}

/**
 * ShimmerText - Animated shimmer effect with moving gradient
 */
function ShimmerText({
  children,
  rarity,
  textEffect,
  className,
}: {
  children: string
  rarity: Rarity
  textEffect: TextEffect
  className?: string
}) {
  const colors = textEffect?.colors || [RARITY_COLORS[rarity]]
  const duration = textEffect?.animationDuration || "3s"
  const intensity = textEffect?.intensity || "medium"

  const gradientStops =
    colors.length === 1
      ? `${colors[0]}, ${colors[0]}, white, ${colors[0]}, ${colors[0]}`
      : colors.join(", ")

  const gradientSize = intensity === "strong" ? "200%" : intensity === "subtle" ? "150%" : "175%"

  return (
    <span
      className={cn(
        "inline-block bg-clip-text text-transparent font-semibold",
        "animate-shimmer bg-gradient-to-r",
        textEffect?.customClass,
        className
      )}
      style={{
        backgroundImage: `linear-gradient(90deg, ${gradientStops})`,
        backgroundSize: `${gradientSize} 100%`,
        animationDuration: duration,
      }}
    >
      {children}
    </span>
  )
}

/**
 * GradientText - Animated gradient blend with color transitions
 */
function GradientText({
  children,
  rarity,
  textEffect,
  className,
}: {
  children: string
  rarity: Rarity
  textEffect: TextEffect
  className?: string
}) {
  const colors = textEffect?.colors || [RARITY_COLORS[rarity]]
  const duration = textEffect?.animationDuration || "5s"

  const gradientStops = colors.length === 1 ? `${colors[0]}, ${colors[0]}` : colors.join(", ")

  return (
    <span
      className={cn(
        "inline-block bg-clip-text text-transparent font-semibold",
        "animate-gradient bg-gradient-to-r",
        textEffect?.customClass,
        className
      )}
      style={{
        backgroundImage: `linear-gradient(90deg, ${gradientStops})`,
        backgroundSize: "200% 200%",
        animationDuration: duration,
      }}
    >
      {children}
    </span>
  )
}

/**
 * GlowText - Enhanced glow effect with pulse
 */
function GlowText({
  children,
  rarity,
  textEffect,
  className,
}: {
  children: string
  rarity: Rarity
  textEffect: TextEffect
  className?: string
}) {
  const colorClass = textEffect?.colors?.[0] || RARITY_COLORS[rarity]
  const intensity = textEffect?.intensity || "medium"
  const duration = textEffect?.animationDuration || "2s"

  const glowStrength =
    intensity === "strong" ? "0_0_20px" : intensity === "subtle" ? "0_0_6px" : "0_0_12px"

  return (
    <span
      className={cn(colorClass, "font-semibold animate-pulse", textEffect?.customClass, className)}
      style={{
        filter: `drop-shadow(${glowStrength} currentColor)`,
        animationDuration: duration,
      }}
    >
      {children}
    </span>
  )
}

/**
 * PerLetterText - Per-letter color mixing with staggered colors
 */
function PerLetterText({
  children,
  rarity,
  textEffect,
  className,
}: {
  children: string
  rarity: Rarity
  textEffect: TextEffect
  className?: string
}) {
  const colors = textEffect?.colors || [RARITY_COLORS[rarity]]
  const letters = children.split("")

  return (
    <span className={cn("font-semibold", textEffect?.customClass, className)}>
      { }
      {letters.map((letter, index) => {
        const colorClass = colors[index % colors.length]
        return (
          <span key={`${letter}-${index}`} className={colorClass}>
            {letter}
          </span>
        )
      })}
    </span>
  )
}
