"use client"

import { useEffect, useState, useRef } from "react"

interface AnimatedNumberProps {
  value: number
  className?: string
  duration?: number
}

export function AnimatedNumber({ value, className = "", duration = 300 }: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value)
  const [isAnimating, setIsAnimating] = useState(false)
  const prevValueRef = useRef(value)

  useEffect(() => {
    if (prevValueRef.current !== value) {
      setIsAnimating(true)

      // Slide animation
      const startValue = prevValueRef.current
      const endValue = value
      const startTime = Date.now()

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)

        // Spring physics easing with bounce effect
        const easeOutElastic = (t: number) => {
          const c4 = (2 * Math.PI) / 3
          return t === 0
            ? 0
            : t === 1
              ? 1
              : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
        }
        const easedProgress = easeOutElastic(progress)

        const currentValue = Math.round(startValue + (endValue - startValue) * easedProgress)
        setDisplayValue(currentValue)

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          setIsAnimating(false)
          prevValueRef.current = value
        }
      }

      requestAnimationFrame(animate)
    }
  }, [value, duration])

  return (
    <span className={`${className} ${isAnimating ? "animate-pulse-subtle" : ""}`}>
      {displayValue}
    </span>
  )
}
