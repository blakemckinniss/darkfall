/**
 * Animation Presets Library
 * Reusable easing functions and animation utilities for consistent UI feel
 */

// ============================================================================
// EASING FUNCTIONS
// ============================================================================

/**
 * Smooth quadratic easing (gentle deceleration)
 * Use for: General UI transitions, subtle movements
 */
export const easeOutQuad = (t: number): number => {
  return t * (2 - t)
}

/**
 * Spring physics with bounce effect (playful, energetic)
 * Use for: Number changes, rewards, level ups
 */
export const easeOutElastic = (t: number): number => {
  const c4 = (2 * Math.PI) / 3
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
}

/**
 * Smooth cubic easing (more pronounced deceleration)
 * Use for: Important notifications, card reveals
 */
export const easeOutCubic = (t: number): number => {
  return 1 - Math.pow(1 - t, 3)
}

/**
 * Bounce effect (fun, game-like)
 * Use for: Collectibles, achievements, loot drops
 */
export const easeOutBounce = (t: number): number => {
  const n1 = 7.5625
  const d1 = 2.75

  if (t < 1 / d1) {
    return n1 * t * t
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375
  }
}

/**
 * Back easing (slight overshoot, then settle)
 * Use for: Modals, drawers, emphasis
 */
export const easeOutBack = (t: number): number => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

/**
 * Exponential easing (dramatic deceleration)
 * Use for: Damage effects, critical hits, dramatic reveals
 */
export const easeOutExpo = (t: number): number => {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

// ============================================================================
// DIRECTIONAL ANIMATIONS
// ============================================================================

export type Direction = "top" | "right" | "bottom" | "left" | "center"

export interface DirectionalAnimation {
  translateX: string
  translateY: string
  className: string
}

/**
 * Get directional slide animation values
 * @param direction - Direction the element should slide in from
 * @param distance - Distance in pixels (default: 16)
 */
export const getDirectionalSlide = (
  direction: Direction,
  distance: number = 16
): DirectionalAnimation => {
  const animations: Record<Direction, DirectionalAnimation> = {
    top: {
      translateX: "0",
      translateY: `-${distance}px`,
      className: "slide-from-top",
    },
    right: {
      translateX: `${distance}px`,
      translateY: "0",
      className: "slide-from-right",
    },
    bottom: {
      translateX: "0",
      translateY: `${distance}px`,
      className: "slide-from-bottom",
    },
    left: {
      translateX: `-${distance}px`,
      translateY: "0",
      className: "slide-from-left",
    },
    center: {
      translateX: "0",
      translateY: "0",
      className: "fade-in",
    },
  }

  return animations[direction]
}

// ============================================================================
// DAMAGE CONTEXT ANIMATIONS
// ============================================================================

export type DamageSource = "enemy" | "environment" | "self" | "heal"

/**
 * Get animation direction based on damage source
 * Creates intuitive visual feedback for different damage types
 */
export const getDamageDirection = (source: DamageSource): Direction => {
  const directionMap: Record<DamageSource, Direction> = {
    enemy: "right", // Enemies attack from the right
    environment: "top", // Environmental damage comes from above
    self: "center", // Self-inflicted damage doesn't move
    heal: "center", // Healing effects glow in place
  }

  return directionMap[source]
}

/**
 * Get animation style for damage numbers
 */
export const getDamageStyle = (
  source: DamageSource,
  value: number
): { color: string; shadow: string; animation: string } => {
  const isHeal = source === "heal" || value > 0

  if (isHeal) {
    return {
      color: "text-green-500",
      shadow: "drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]",
      animation: "animate-pulse-subtle",
    }
  }

  // Critical damage (large negative)
  if (value < -20) {
    return {
      color: "text-red-500",
      shadow: "drop-shadow-[0_0_12px_rgba(239,68,68,0.7)]",
      animation: "animate-shake",
    }
  }

  // Regular damage
  return {
    color: "text-red-400",
    shadow: "drop-shadow-[0_0_6px_rgba(239,68,68,0.4)]",
    animation: "",
  }
}

// ============================================================================
// STAGGER TIMING UTILITIES
// ============================================================================

/**
 * Calculate adaptive stagger delay based on number of items
 * Ensures total animation doesn't exceed maxTotalTime
 *
 * @param itemCount - Number of items to stagger
 * @param minDelay - Minimum delay per item (ms)
 * @param maxTotalTime - Maximum total time for all items (ms)
 * @returns Delay per item in milliseconds
 */
export const calculateStaggerDelay = (
  itemCount: number,
  minDelay: number = 50,
  maxTotalTime: number = 200
): number => {
  if (itemCount <= 1) return 0

  // Calculate ideal delay that fits within maxTotalTime
  const idealDelay = maxTotalTime / itemCount

  // Return the larger of minDelay or idealDelay to prevent too-fast animations
  return Math.max(minDelay, idealDelay)
}

// ============================================================================
// ANIMATION PRESETS
// ============================================================================

export interface AnimationPreset {
  duration: number
  easing: (t: number) => number
  className: string
}

/**
 * Predefined animation presets for common use cases
 */
export const ANIMATION_PRESETS = {
  // Fast, snappy interactions
  quick: {
    duration: 150,
    easing: easeOutQuad,
    className: "transition-all duration-150",
  },

  // Standard UI transitions
  standard: {
    duration: 300,
    easing: easeOutCubic,
    className: "transition-all duration-300",
  },

  // Playful, bouncy animations
  playful: {
    duration: 400,
    easing: easeOutElastic,
    className: "transition-all duration-400",
  },

  // Dramatic reveals
  dramatic: {
    duration: 500,
    easing: easeOutExpo,
    className: "transition-all duration-500",
  },

  // Smooth, gentle movements
  smooth: {
    duration: 600,
    easing: easeOutBack,
    className: "transition-all duration-600",
  },
} as const

/**
 * Get animation preset by name
 */
export const getAnimationPreset = (name: keyof typeof ANIMATION_PRESETS): AnimationPreset => {
  return ANIMATION_PRESETS[name]
}

// ============================================================================
// PERFORMANCE UTILITIES
// ============================================================================

/**
 * Check if user prefers reduced motion
 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === "undefined") return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/**
 * Get animation duration with reduced motion support
 */
export const getAnimationDuration = (normalDuration: number): number => {
  return prefersReducedMotion() ? 0 : normalDuration
}
