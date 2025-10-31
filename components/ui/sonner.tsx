"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  // Build props object with proper types for exactOptionalPropertyTypes
  const sonnerProps = {
    ...Object.fromEntries(
      Object.entries(props).filter(([key, value]) => key !== "theme" && value !== undefined)
    ),
    theme: theme as ToasterProps["theme"],
    className: "toaster group",
    style: {
      "--normal-bg": "var(--popover)",
      "--normal-text": "var(--popover-foreground)",
      "--normal-border": "var(--border)",
    } as React.CSSProperties,
  } as ToasterProps

  return <Sonner {...sonnerProps} />
}

export { Toaster }
