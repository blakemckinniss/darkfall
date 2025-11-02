---
description: Audit game balance and entity statistics
---

# Game Balance Audit

Analyze game mechanics and entity balance for fairness and fun.

## Analysis Areas

1. **Entity Statistics** (`lib/game-engine.ts`)
   - Review enemy health, damage, and XP rewards
   - Check treasure value ranges
   - Analyze consumable effectiveness
   - Verify rarity tier distribution

2. **Event Probability**
   - Review weighted probability in `generateEvent()`
   - Check location-based event distribution
   - Verify progression difficulty curve

3. **Equipment System**
   - Check stat bonuses are balanced
   - Review rarity tier value ranges (common: 5-20, legendary: 100-150)
   - Analyze slot distribution (weapon, armor, accessory)

4. **AI-Generated Items**
   - Review item generation rarity tiers
   - Check stat ranges are appropriate
   - Verify value calculations

5. **Player Progression**
   - Analyze XP requirements vs. enemy rewards
   - Check stat scaling
   - Review unlock progression

Provide recommendations for balance improvements with specific numbers.
