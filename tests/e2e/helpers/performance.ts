import type { Page } from "@playwright/test"

export interface PerformanceMeasurement {
  name: string
  duration: number
  startTime: number
  entryType: string
}

export interface AIPerformanceMetrics {
  apiCallDuration: number
  totalEventGeneration: number
  measurements: PerformanceMeasurement[]
}

/**
 * Capture high-resolution performance metrics using PerformanceObserver
 * Based on Zen MCP research: Use PerformanceObserver API for accurate timing
 */
export async function capturePerformanceMetrics(
  page: Page,
  operation: () => Promise<void>
): Promise<AIPerformanceMetrics> {
  // Setup PerformanceObserver before operation
  await page.evaluate(() => {
    // Clear existing marks/measures
    performance.clearMarks()
    performance.clearMeasures()

    // Store measurements in window for retrieval
    ;(window as any).__performanceMeasurements = []

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        ;(window as any).__performanceMeasurements.push({
          name: entry.name,
          duration: entry.duration,
          startTime: entry.startTime,
          entryType: entry.entryType,
        })
      }
    })

    observer.observe({ entryTypes: ["measure", "navigation", "resource"] })
  })

  // Execute the operation
  await operation()

  // Retrieve measurements
  const measurements = await page.evaluate(() => {
    return (window as any).__performanceMeasurements || []
  })

  // Calculate metrics
  const apiCallMeasure = measurements.find(
    (m: PerformanceMeasurement) => m.name === "ai-narrative-generation"
  )
  const totalMeasure = measurements.find(
    (m: PerformanceMeasurement) => m.name === "total-event-generation"
  )

  return {
    apiCallDuration: apiCallMeasure?.duration || 0,
    totalEventGeneration: totalMeasure?.duration || 0,
    measurements,
  }
}

/**
 * Mark the start of a performance measurement
 */
export async function markPerformanceStart(page: Page, name: string): Promise<void> {
  await page.evaluate((markName) => {
    performance.mark(`${markName}-start`)
  }, name)
}

/**
 * Mark the end and measure duration
 */
export async function markPerformanceEnd(page: Page, name: string): Promise<number> {
  const duration = await page.evaluate((markName) => {
    performance.mark(`${markName}-end`)
    performance.measure(markName, `${markName}-start`, `${markName}-end`)

    const measure = performance.getEntriesByName(markName, "measure")[0]
    return measure?.duration || 0
  }, name)

  return duration
}

/**
 * Intercept and measure API call performance
 */
export async function measureAPICall(
  page: Page,
  apiPattern: string,
  operation: () => Promise<void>
): Promise<{ duration: number; statusCode: number; responseSize: number }> {
  let apiDuration = 0
  let statusCode = 0
  let responseSize = 0

  // Setup request/response tracking
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes(apiPattern),
    { timeout: 10000 }
  )

  const startTime = Date.now()
  await operation()

  const response = await responsePromise
  apiDuration = Date.now() - startTime
  statusCode = response.status()

  const body = await response.text()
  responseSize = new Blob([body]).size

  return { duration: apiDuration, statusCode, responseSize }
}

/**
 * Generate performance summary report
 */
export function generatePerformanceReport(metrics: AIPerformanceMetrics): string {
  const { apiCallDuration, totalEventGeneration, measurements } = metrics

  const report = [
    "=== Performance Report ===",
    `API Call Duration: ${apiCallDuration.toFixed(2)}ms`,
    `Total Event Generation: ${totalEventGeneration.toFixed(2)}ms`,
    `Total Measurements: ${measurements.length}`,
    "",
    "Top 5 Slowest Operations:",
    ...measurements
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5)
      .map((m, i) => `  ${i + 1}. ${m.name}: ${m.duration.toFixed(2)}ms`),
  ]

  return report.join("\n")
}
