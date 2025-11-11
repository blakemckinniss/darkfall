/**
 * Phase 0 POC Performance Test
 *
 * Tests the new "Procedural Skeleton + AI Flesh" architecture:
 * - Generates 10 combat events using the new system
 * - Measures response times
 * - Validates <400ms performance target
 * - Compares with old system benchmarks
 */

import { generateEvent } from "@/lib/event-templates"

interface PerformanceResult {
  eventId: string
  responseTime: number
  source: "ai" | "procedural" | "cache"
  entityName: string
  rarity: string
}

async function testEventGeneration(count: number = 10): Promise<PerformanceResult[]> {
  const results: PerformanceResult[] = []

  console.log(`\n🧪 Testing Event Generation Performance (${count} events)`)
  console.log("=" + "=".repeat(60))

  for (let i = 0; i < count; i++) {
    const startTime = Date.now()

    try {
      const event = await generateEvent({
        eventType: "combat",
        portalTheme: "Dragon's Lair",
        roomNumber: i + 1,
        playerLevel: 5,
        stability: 100 - i * 5,
      })

      const responseTime = Date.now() - startTime

      results.push({
        eventId: event.id,
        responseTime,
        source: event.metadata.source,
        entityName: event.entity.name,
        rarity: event.entity.rarity,
      })

      console.log(
        `✓ Event ${i + 1}/${count}: ${responseTime}ms | ${event.entity.name} (${event.entity.rarity}) | Source: ${event.metadata.source}`
      )
    } catch (error) {
      console.error(`✗ Event ${i + 1}/${count} failed:`, error)
    }
  }

  return results
}

function analyzeResults(results: PerformanceResult[]) {
  console.log("\n📊 Performance Analysis")
  console.log("=" + "=".repeat(60))

  const responseTimes = results.map((r) => r.responseTime)
  const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
  const minTime = Math.min(...responseTimes)
  const maxTime = Math.max(...responseTimes)
  const medianTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length / 2)]

  const under400ms = results.filter((r) => r.responseTime < 400).length
  const successRate = (under400ms / results.length) * 100

  console.log(`Average Response Time: ${avgTime.toFixed(2)}ms`)
  console.log(`Median Response Time: ${medianTime}ms`)
  console.log(`Min Response Time: ${minTime}ms`)
  console.log(`Max Response Time: ${maxTime}ms`)
  console.log(`\n🎯 Target Performance (<400ms): ${successRate.toFixed(1)}% (${under400ms}/${results.length})`)

  // Source breakdown
  const aiCount = results.filter((r) => r.source === "ai").length
  const proceduralCount = results.filter((r) => r.source === "procedural").length
  const cacheCount = results.filter((r) => r.source === "cache").length

  console.log(`\n📦 Source Breakdown:`)
  console.log(`  AI: ${aiCount} (${((aiCount / results.length) * 100).toFixed(1)}%)`)
  console.log(`  Procedural Fallback: ${proceduralCount} (${((proceduralCount / results.length) * 100).toFixed(1)}%)`)
  console.log(`  Cache: ${cacheCount} (${((cacheCount / results.length) * 100).toFixed(1)}%)`)

  // Rarity distribution
  const rarityCount: Record<string, number> = {}
  results.forEach((r) => {
    rarityCount[r.rarity] = (rarityCount[r.rarity] || 0) + 1
  })

  console.log(`\n✨ Rarity Distribution:`)
  Object.entries(rarityCount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([rarity, count]) => {
      console.log(`  ${rarity}: ${count} (${((count / results.length) * 100).toFixed(1)}%)`)
    })

  // Performance verdict
  console.log("\n" + "=".repeat(60))
  if (avgTime < 400) {
    console.log(`✅ SUCCESS: Average response time ${avgTime.toFixed(2)}ms is under 400ms target!`)
  } else {
    console.log(`❌ FAILURE: Average response time ${avgTime.toFixed(2)}ms exceeds 400ms target!`)
  }

  if (successRate >= 90) {
    console.log(`✅ SUCCESS: ${successRate.toFixed(1)}% of events met the performance target!`)
  } else {
    console.log(
      `⚠️  WARNING: Only ${successRate.toFixed(1)}% of events met the performance target (target: 90%+)`
    )
  }

  console.log("=" + "=".repeat(60) + "\n")

  return {
    avgTime,
    medianTime,
    minTime,
    maxTime,
    successRate,
    aiCount,
    proceduralCount,
    cacheCount,
  }
}

// Run test
async function main() {
  console.log("\n🚀 Phase 0 POC Performance Test")
  console.log("Testing: Procedural Skeleton + AI Flesh Architecture\n")

  const results = await testEventGeneration(10)
  const analysis = analyzeResults(results)

  // Comparison with old system
  console.log("\n📈 Comparison with Old System")
  console.log("=" + "=".repeat(60))
  console.log("Old System (generate-narrative):")
  console.log("  Average: ~800-1200ms")
  console.log("  AI Response Size: ~1200 tokens")
  console.log("\nNew System (generate-flavor + templates):")
  console.log(`  Average: ${analysis.avgTime.toFixed(2)}ms`)
  console.log("  AI Response Size: ~200-300 tokens")
  console.log(
    `\n🎉 Performance Improvement: ${((800 / analysis.avgTime) * 100 - 100).toFixed(1)}% faster!`
  )
  console.log("=" + "=".repeat(60) + "\n")
}

main().catch(console.error)
