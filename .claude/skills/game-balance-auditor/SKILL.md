---
name: game-balance-auditor
description: Analyzes and validates game balance across all entities checking stat consistency, economy fairness, difficulty progression, and drop rates. Use when reviewing game balance, checking for overpowered items, or auditing entity stats before release.
allowed-tools: Read, mcp__serena__find_symbol, mcp__serena__search_for_pattern, mcp__serena__get_symbols_overview
---

# Game Balance Auditor

Performs comprehensive balance analysis on Blackfell game entities to ensure fair gameplay, consistent progression, and economic stability.

## Audit Categories

### 1. Stat Range Compliance
Verifies all entities follow rarity-based stat ranges:

**Ranges by Rarity**:
- Common: Value 5-20, Stats +1 to +3, Enemy HP 20-40
- Uncommon: Value 20-40, Stats +3 to +6, Enemy HP 40-60
- Rare: Value 40-70, Stats +6 to +10, Enemy HP 60-90
- Epic: Value 70-100, Stats +10 to +15, Enemy HP 90-130
- Legendary: Value 100-150, Stats +15 to +25, Enemy HP 130-200

**Flags**:
- Stats outside rarity range
- Inconsistent rarity assignment
- Power creep indicators

### 2. Economy Balance
Analyzes gold economy across enemies, treasures, and shops:

**Check**:
- Enemy gold drops vs. treasure values
- Progression of wealth acquisition
- Gold-to-power ratios
- Inflation indicators

**Ratios**:
- Enemy kill gold ≈ 0.5-1.5x enemy health/10
- Treasure value ≈ 2-4x total stat bonuses × 5
- Consumable value ≈ 1-2x immediate benefit

### 3. Difficulty Progression
Ensures smooth difficulty curve across locations:

**Check**:
- Location level requirements
- Enemy stats per location tier
- Treasure availability
- Stat scaling consistency

**Curve**:
- Early game (Level 1-3): Common/Uncommon
- Mid game (Level 4-7): Uncommon/Rare
- Late game (Level 8-12): Rare/Epic
- End game (Level 13+): Epic/Legendary

### 4. Drop Rate Fairness
Validates rarity distribution and event probabilities:

**Check**:
- Rarity distribution (should favor common > legendary)
- Event type distribution (combat, treasure, exploration)
- Encounter choice balance
- Reward-to-risk ratios

**Expected Distribution**:
- Common: 40-50%
- Uncommon: 25-30%
- Rare: 15-20%
- Epic: 5-10%
- Legendary: 1-5%

### 5. Power Outliers
Identifies overpowered or underpowered entities:

**Check**:
- Items with excessive stat bonuses
- Enemies with imbalanced HP/attack ratios
- Consumables with game-breaking effects
- Accessories that outclass weapons/armor

**Flags**:
- Total stats > 1.5x rarity max
- Single stat > 2x rarity max
- Permanent buffs > Epic rarity

## Instructions

### 1. Determine Audit Scope
From user request:
- **Full audit**: Check all entities across all categories
- **Targeted audit**: Specific entity type or rarity tier
- **Economy focus**: Gold/value analysis only
- **New content review**: Audit recently added entities

### 2. Load Entity Data
Use ENTITIES registry to gather data:

```typescript
// Get all entities by type
const enemies = ENTITIES.byType("enemy")
const treasures = ENTITIES.byType("treasure")
const consumables = ENTITIES.byType("consumable")

// Or by rarity
const legendaries = ENTITIES.byRarity("legendary")

// Get stats
const stats = ENTITIES.stats()
```

### 3. Run Stat Range Analysis
For each entity:

```typescript
function checkStatRanges(entity: Entity): Issue[] {
  const issues: Issue[] = []
  const ranges = RARITY_RANGES[entity.rarity]

  if (entity.entityType === "enemy") {
    if (entity.health < ranges.health[0] || entity.health > ranges.health[1]) {
      issues.push({
        severity: "medium",
        entity: entity.id,
        issue: `Health ${entity.health} outside ${entity.rarity} range ${ranges.health}`
      })
    }
    // Check attack, gold, exp...
  }

  if (entity.entityType === "treasure") {
    const totalStats = Object.values(entity.stats || {}).reduce((a, b) => a + b, 0)
    if (totalStats > ranges.maxStats) {
      issues.push({
        severity: "high",
        entity: entity.id,
        issue: `Total stats ${totalStats} exceeds ${entity.rarity} max ${ranges.maxStats}`
      })
    }
  }

  return issues
}
```

### 4. Analyze Economy
Check gold/value relationships:

```typescript
function analyzeEconomy(entities: Entity[]) {
  // Enemy gold drops
  const enemyGold = enemies.map(e => ({
    id: e.id,
    gold: e.gold,
    health: e.health,
    ratio: e.gold / (e.health / 10)
  }))

  // Find outliers (ratio > 2x or < 0.5x)
  const outliers = enemyGold.filter(e => e.ratio > 2 || e.ratio < 0.5)

  // Treasure values
  const treasureValues = treasures.map(t => ({
    id: t.id,
    value: t.value,
    totalStats: Object.values(t.stats || {}).reduce((a, b) => a + b, 0),
    valuePerStat: t.value / totalStats
  }))

  // Expected: 2-4 gold per stat point
  const valueOutliers = treasureValues.filter(t => t.valuePerStat < 2 || t.valuePerStat > 4)

  return { enemyOutliers: outliers, treasureOutliers: valueOutliers }
}
```

### 5. Check Difficulty Curve
Analyze progression:

```typescript
function checkDifficultyCurve(enemies: Enemy[], locations: Location[]) {
  // Group enemies by typical encounter location
  const byLocation = locations.map(loc => {
    const locationEnemies = enemies.filter(e =>
      e.tags?.includes(loc.name.toLowerCase())
    )

    const avgHealth = average(locationEnemies.map(e => e.health))
    const avgAttack = average(locationEnemies.map(e => e.attack))

    return {
      location: loc.name,
      level: loc.requiredLevel,
      avgHealth,
      avgAttack,
      count: locationEnemies.length
    }
  })

  // Check for jumps > 50% between adjacent levels
  const jumps = byLocation.slice(1).map((loc, i) => ({
    from: byLocation[i].location,
    to: loc.location,
    healthJump: (loc.avgHealth - byLocation[i].avgHealth) / byLocation[i].avgHealth,
    attackJump: (loc.avgAttack - byLocation[i].avgAttack) / byLocation[i].avgAttack
  }))

  const bigJumps = jumps.filter(j => j.healthJump > 0.5 || j.attackJump > 0.5)
  return bigJumps
}
```

### 6. Validate Rarity Distribution
Check distribution matches expected:

```typescript
function checkRarityDistribution(entities: Entity[]) {
  const counts = {
    common: 0,
    uncommon: 0,
    rare: 0,
    epic: 0,
    legendary: 0
  }

  entities.forEach(e => counts[e.rarity]++)

  const total = entities.length
  const distribution = {
    common: counts.common / total,
    uncommon: counts.uncommon / total,
    rare: counts.rare / total,
    epic: counts.epic / total,
    legendary: counts.legendary / total
  }

  // Flag if legendary > 10% or common < 30%
  const issues = []
  if (distribution.legendary > 0.10) {
    issues.push("Too many legendary items (>10%)")
  }
  if (distribution.common < 0.30) {
    issues.push("Too few common items (<30%)")
  }

  return { distribution, issues }
}
```

### 7. Generate Report
Compile findings into structured report:

```markdown
# Game Balance Audit Report

## Summary
- Total Entities Audited: X
- Issues Found: Y
- Critical: Z
- Recommendations: W

## Stat Range Compliance
[List entities outside ranges]

## Economy Analysis
[Gold/value outliers]

## Difficulty Progression
[Level curve issues]

## Rarity Distribution
[Distribution table and issues]

## Power Outliers
[Overpowered/underpowered entities]

## Recommendations
1. [Action items]
2. [Balance adjustments]
3. [Further investigation]
```

## Example Audit

**User Request**: "Check if any items are overpowered"

**Audit Process**:

```typescript
// 1. Load all treasures
const treasures = ENTITIES.byType("treasure")

// 2. Calculate power scores
const powerScores = treasures.map(t => {
  const stats = t.stats || {}
  const totalStats = Object.values(stats).reduce((sum, val) => sum + (val || 0), 0)

  // Expected max by rarity
  const maxStats = {
    common: 9,      // 3 stats × 3 max
    uncommon: 18,   // 3 stats × 6 max
    rare: 30,       // 3 stats × 10 max
    epic: 45,       // 3 stats × 15 max
    legendary: 75   // 3 stats × 25 max
  }

  const expectedMax = maxStats[t.rarity]
  const powerRatio = totalStats / expectedMax

  return {
    id: t.id,
    name: t.name,
    rarity: t.rarity,
    totalStats,
    expectedMax,
    powerRatio,
    overpowered: powerRatio > 1.2  // 20% over expected
  }
})

// 3. Find overpowered items
const overpowered = powerScores.filter(t => t.overpowered)

// 4. Report
if (overpowered.length > 0) {
  console.log("⚠️ Overpowered Items Found:")
  overpowered.forEach(item => {
    console.log(`  - ${item.name} (${item.rarity}): ${item.totalStats} stats (${Math.round(item.powerRatio * 100)}% of expected max)`)
  })
} else {
  console.log("✓ All items within balance ranges")
}
```

**Example Output**:
```
⚠️ Overpowered Items Found:
  - Dragon's Fury Sword (epic): 52 stats (116% of expected max)
  - Titan's Plate Armor (legendary): 95 stats (127% of expected max)

Recommendations:
1. Reduce Dragon's Fury Sword total stats from 52 to ~40-45
2. Reduce Titan's Plate Armor total stats from 95 to ~65-75
3. Consider splitting high bonuses across multiple stat categories
```

## Report Severity Levels

- **Critical**: Game-breaking imbalance (ratio > 2x)
- **High**: Significant imbalance (ratio > 1.5x)
- **Medium**: Notable discrepancy (ratio > 1.2x)
- **Low**: Minor inconsistency (ratio > 1.1x)
- **Info**: Statistical observation (no action needed)

## Files to Reference

- **Entity Registry**: `lib/entities/index.ts`
- **Canonical Entities**: `lib/entities/canonical/*.ts`
- **Schemas**: `lib/entities/schemas.ts`
- **Game Engine**: `lib/game-engine.ts`

## Best Practices

1. **Run audits before releases**: Catch issues before players do
2. **Focus on player experience**: Balance isn't just numbers
3. **Consider context**: Early-game items should be weaker
4. **Iterate gradually**: Small adjustments are safer
5. **Document assumptions**: Explain reasoning in reports
6. **Track changes**: Note what was adjusted and why
