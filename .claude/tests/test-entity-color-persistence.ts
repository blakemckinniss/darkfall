/**
 * Test script to verify entity color persistence to localStorage
 * Run in browser console: node --loader tsx .claude/tests/test-entity-color-persistence.ts
 */

import { ENTITIES as _ENTITIES } from "../../lib/entities"

// Simulate browser environment
if (typeof window === "undefined") {
  console.log("⚠️  This test must be run in a browser environment (game UI)")
  console.log("To test color persistence:")
  console.log("1. Open the game in your browser")
  console.log("2. Open DevTools Console")
  console.log("3. Run this test code:")
  console.log(`
// Create AI entity with custom color
const testEntity = {
  id: "enemy:test_fire_demon",
  entityType: "enemy",
  name: "Test Fire Demon",
  health: 50,
  attack: 15,
  gold: 30,
  exp: 40,
  rarity: "rare",
  icon: "ra-fire",
  color: "text-red-500",  // Custom color
  tags: ["fire", "demon", "test"]
}

// Add to registry
const result = ENTITIES.addAI(testEntity, { ttl: 3600000 }) // 1 hour TTL
console.log("Entity added:", result)

// Save to localStorage
ENTITIES.save()

// Verify it saved
const stored = localStorage.getItem("blackfell:entities:dynamic")
const parsed = JSON.parse(stored)
console.log("Stored entities:", parsed)

// Find our test entity
const savedEntity = parsed.find(e => e.id === "enemy:test_fire_demon")
console.log("Saved entity with color:", savedEntity)
console.log("Color preserved:", savedEntity?.color === "text-red-500" ? "✓ YES" : "✗ NO")

// Reload from localStorage
const reloaded = ENTITIES.get("enemy:test_fire_demon")
console.log("Reloaded entity:", reloaded)
console.log("Color after reload:", reloaded?.color)

// Cleanup
ENTITIES.remove("enemy:test_fire_demon")
ENTITIES.save()
console.log("✓ Test entity removed")
  `)
  process.exit(0)
}

export {}
