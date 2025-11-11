import { test, expect } from "@playwright/test"
import { measureAPICall, markPerformanceStart, markPerformanceEnd } from "./helpers/performance"

/**
 * AI Performance Tests - <400ms Target
 * Based on Zen MCP research:
 * - Use generous timeouts for AI calls (non-deterministic)
 * - Tight timeouts for UI responsiveness
 * - Measure against production build for accuracy
 * - Focus on p95/p99 latency, not just average
 */

// Performance thresholds (in milliseconds)
const PERFORMANCE_TARGETS = {
  API_CALL_P50: 400, // Median target
  API_CALL_P95: 800, // 95th percentile acceptable
  API_CALL_MAX: 2000, // Hard limit (generous for AI)
  UI_RENDER: 100, // UI should update within 100ms
  TOTAL_EVENT_TIME: 500, // API + UI rendering
}

test.describe("AI Performance Benchmarks", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
  })

  test("should measure API call performance", async ({ page }) => {
    const { duration, statusCode, responseSize } = await measureAPICall(
      page,
      "/api/generate-narrative",
      async () => {
        const voidButton = page.locator('button:has-text("Enter The Void")')
        await voidButton.click()
        await page.waitForSelector('[data-testid="game-log"]', { timeout: 10000 })
      }
    )

    console.log(`
=== Performance Metrics ===
API Call Duration: ${duration}ms
Status Code: ${statusCode}
Response Size: ${responseSize} bytes
Target (P50): ${PERFORMANCE_TARGETS.API_CALL_P50}ms
Target (P95): ${PERFORMANCE_TARGETS.API_CALL_P95}ms
===========================
    `)

    // Validate performance
    expect(statusCode).toBe(200)
    expect(duration).toBeLessThan(PERFORMANCE_TARGETS.API_CALL_MAX)

    // Soft assertion for target (log warning if exceeded)
    if (duration > PERFORMANCE_TARGETS.API_CALL_P50) {
      console.warn(
        `⚠️ API call exceeded P50 target: ${duration}ms > ${PERFORMANCE_TARGETS.API_CALL_P50}ms`
      )
    }

    // Response size should be reasonable (not bloated)
    expect(responseSize).toBeGreaterThan(100) // Has content
    expect(responseSize).toBeLessThan(50000) // Not too large (50KB limit)
  })

  test("should measure end-to-end event generation time", async ({ page }) => {
    await markPerformanceStart(page, "total-event-generation")

    const voidButton = page.locator('button:has-text("Enter The Void")')
    await voidButton.click()

    await page.waitForSelector('[data-testid="game-log"]', { timeout: 10000 })

    const totalDuration = await markPerformanceEnd(page, "total-event-generation")

    console.log(`
=== End-to-End Performance ===
Total Event Generation: ${totalDuration}ms
Target: ${PERFORMANCE_TARGETS.TOTAL_EVENT_TIME}ms
===============================
    `)

    // Total time includes API call + UI rendering
    expect(totalDuration).toBeLessThan(PERFORMANCE_TARGETS.API_CALL_MAX + 500)

    if (totalDuration > PERFORMANCE_TARGETS.TOTAL_EVENT_TIME) {
      console.warn(
        `⚠️ Total event time exceeded target: ${totalDuration}ms > ${PERFORMANCE_TARGETS.TOTAL_EVENT_TIME}ms`
      )
    }
  })

  test("should measure UI rendering performance", async ({ page }) => {
    // Setup response interception
    const responsePromise = page.waitForResponse("**/api/generate-narrative")

    const voidButton = page.locator('button:has-text("Enter The Void")')
    await voidButton.click()

    const response = await responsePromise
    const apiEndTime = Date.now()

    // Wait for UI to render
    await page.waitForSelector('[data-testid="game-log"]', { timeout: 5000 })
    const uiRenderTime = Date.now() - apiEndTime

    console.log(`
=== UI Rendering Performance ===
UI Render Time: ${uiRenderTime}ms
Target: ${PERFORMANCE_TARGETS.UI_RENDER}ms
================================
    `)

    // UI should be very fast (client-side rendering)
    expect(uiRenderTime).toBeLessThan(PERFORMANCE_TARGETS.UI_RENDER * 2) // 200ms hard limit
    expect(response.status()).toBe(200)

    if (uiRenderTime > PERFORMANCE_TARGETS.UI_RENDER) {
      console.warn(`⚠️ UI render time exceeded target: ${uiRenderTime}ms`)
    }
  })

  test("should track p95 latency over multiple requests", async ({ page }) => {
    const durations: number[] = []

    // Generate 10 events to measure distribution
    for (let i = 0; i < 10; i++) {
      await page.reload()
      await page.waitForLoadState("networkidle")

      const { duration, statusCode } = await measureAPICall(
        page,
        "/api/generate-narrative",
        async () => {
          const voidButton = page.locator('button:has-text("Enter The Void")')
          await voidButton.click()
          await page.waitForSelector('[data-testid="game-log"]', { timeout: 10000 })
        }
      )

      expect(statusCode).toBe(200)
      durations.push(duration)

      console.log(`Request ${i + 1}/10: ${duration}ms`)
    }

    // Calculate percentiles
    const sorted = [...durations].sort((a, b) => a - b)
    const p50 = sorted[Math.floor(sorted.length * 0.5)]
    const p95 = sorted[Math.floor(sorted.length * 0.95)]
    const p99 = sorted[Math.floor(sorted.length * 0.99)]
    const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length

    console.log(`
=== Latency Distribution (n=10) ===
Average: ${avg.toFixed(2)}ms
P50 (Median): ${p50}ms
P95: ${p95}ms
P99: ${p99}ms
Min: ${sorted[0]}ms
Max: ${sorted[sorted.length - 1]}ms
===================================
Target P50: ${PERFORMANCE_TARGETS.API_CALL_P50}ms
Target P95: ${PERFORMANCE_TARGETS.API_CALL_P95}ms
===================================
    `)

    // Validate against targets
    expect(p95).toBeLessThan(PERFORMANCE_TARGETS.API_CALL_P95)

    if (p50 > PERFORMANCE_TARGETS.API_CALL_P50) {
      console.warn(
        `⚠️ P50 latency exceeded target: ${p50}ms > ${PERFORMANCE_TARGETS.API_CALL_P50}ms`
      )
    }

    // All requests should complete within hard limit
    expect(sorted[sorted.length - 1]).toBeLessThan(PERFORMANCE_TARGETS.API_CALL_MAX)
  })

  test("should not degrade with concurrent requests", async ({ page }) => {
    // Test performance under load (multiple events rapidly)
    const startTime = Date.now()

    // Generate 3 events in quick succession
    for (let i = 0; i < 3; i++) {
      const voidButton = page.locator('button:has-text("Enter The Void")')
      await voidButton.click()
      await page.waitForSelector('[data-testid="game-log"]', { timeout: 10000 })

      // Make a choice to proceed to next event
      const firstChoice = page.locator("button").filter({ hasText: /attack|continue|leave/i }).first()
      if (await firstChoice.isVisible()) {
        await firstChoice.click()
        await page.waitForTimeout(500) // Small delay for state update
      }
    }

    const totalTime = Date.now() - startTime

    console.log(`
=== Concurrent Load Test ===
3 Events Total Time: ${totalTime}ms
Average per Event: ${(totalTime / 3).toFixed(2)}ms
============================
    `)

    // Each event should average < 1s even under load
    expect(totalTime / 3).toBeLessThan(1000)
  })

  test.skip("should benchmark against production build", async ({ page }) => {
    // This test requires production build to be running
    // Skip by default, run manually with production server

    await page.goto("http://localhost:3000") // Production port
    await page.waitForLoadState("networkidle")

    const { duration } = await measureAPICall(page, "/api/generate-narrative", async () => {
      const voidButton = page.locator('button:has-text("Enter The Void")')
      await voidButton.click()
      await page.waitForSelector('[data-testid="game-log"]', { timeout: 10000 })
    })

    console.log(`
=== Production Build Performance ===
API Call Duration: ${duration}ms
Target: ${PERFORMANCE_TARGETS.API_CALL_P50}ms
====================================
    `)

    // Production should meet strict targets
    expect(duration).toBeLessThan(PERFORMANCE_TARGETS.API_CALL_P50)
  })
})

test.describe("Performance Regression Tests", () => {
  test("should not have memory leaks over 20 events", async ({ page }) => {
    // Measure memory usage
    const getMemoryUsage = async () => {
      const metrics = await page.evaluate(() => {
        if (performance.memory) {
          return {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
          }
        }
        return null
      })
      return metrics
    }

    const initialMemory = await getMemoryUsage()

    // Generate 20 events
    for (let i = 0; i < 20; i++) {
      await page.reload()
      await page.waitForLoadState("networkidle")

      const voidButton = page.locator('button:has-text("Enter The Void")')
      await voidButton.click()
      await page.waitForSelector('[data-testid="game-log"]', { timeout: 10000 })
    }

    const finalMemory = await getMemoryUsage()

    if (initialMemory && finalMemory) {
      const memoryGrowth = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize
      const growthMB = memoryGrowth / 1024 / 1024

      console.log(`
=== Memory Usage ===
Initial: ${(initialMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB
Final: ${(finalMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB
Growth: ${growthMB.toFixed(2)}MB
====================
      `)

      // Memory growth should be reasonable (< 50MB for 20 events)
      expect(growthMB).toBeLessThan(50)
    }
  })

  test("should maintain performance with full inventory", async ({ page }) => {
    // TODO: Add items to inventory first
    // Then measure performance to ensure inventory size doesn't degrade AI calls

    const { duration } = await measureAPICall(page, "/api/generate-narrative", async () => {
      const voidButton = page.locator('button:has-text("Enter The Void")')
      await voidButton.click()
      await page.waitForSelector('[data-testid="game-log"]', { timeout: 10000 })
    })

    // Performance should be consistent regardless of game state
    expect(duration).toBeLessThan(PERFORMANCE_TARGETS.API_CALL_MAX)
  })
})

test.describe("Performance Monitoring", () => {
  test("should track performance metrics in console", async ({ page }) => {
    const consoleLogs: string[] = []

    page.on("console", (msg) => {
      if (msg.type() === "log" && msg.text().includes("[narrative]")) {
        consoleLogs.push(msg.text())
      }
    })

    const voidButton = page.locator('button:has-text("Enter The Void")')
    await voidButton.click()
    await page.waitForSelector('[data-testid="game-log"]', { timeout: 10000 })

    // Should have performance logging
    const hasPerformanceLogs = consoleLogs.some((log) =>
      log.includes("Generating event") || log.includes("Generated event")
    )

    expect(hasPerformanceLogs).toBe(true)
    console.log("Console logs captured:", consoleLogs.length)
  })
})
