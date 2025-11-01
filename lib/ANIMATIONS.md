# Animation System Guide

This guide explains how to use the animation presets library (`lib/animations.ts`) and directional animations in the Blackfell dungeon crawler.

## Quick Start

```typescript
import {
  easeOutElastic,
  getDamageDirection,
  getDamageStyle,
  calculateStaggerDelay,
  getAnimationPreset
} from '@/lib/animations'
```

## Easing Functions

### Available Easing Functions

1. **easeOutQuad** - Smooth, gentle deceleration
   - Use for: General UI transitions, subtle movements
   - Duration: 150-300ms

2. **easeOutElastic** - Spring physics with bounce
   - Use for: Number changes, rewards, level ups
   - Duration: 300-400ms
   - **Currently used in:** `AnimatedNumber` component

3. **easeOutCubic** - More pronounced deceleration
   - Use for: Important notifications, card reveals
   - Duration: 300-400ms

4. **easeOutBounce** - Fun, game-like bounce
   - Use for: Collectibles, achievements, loot drops
   - Duration: 400-600ms

5. **easeOutBack** - Slight overshoot, then settle
   - Use for: Modals, drawers, emphasis
   - Duration: 300-500ms

6. **easeOutExpo** - Dramatic deceleration
   - Use for: Damage effects, critical hits, dramatic reveals
   - Duration: 400-600ms

### Usage Example

```typescript
const animate = () => {
  const progress = Math.min(elapsed / duration, 1)
  const easedProgress = easeOutElastic(progress)
  const currentValue = startValue + (endValue - startValue) * easedProgress
  setValue(currentValue)
}
```

## Directional Animations

### Damage Direction System

The library automatically determines animation direction based on damage source:

```typescript
import { getDamageDirection, getDamageStyle } from '@/lib/animations'

// Get direction for enemy attack
const direction = getDamageDirection('enemy') // Returns 'right'

// Get styling for damage number
const style = getDamageStyle('enemy', -15) // Returns red color, shadow, animation
```

### Damage Sources

- **enemy**: Slides from right → Enemies attack from the side
- **environment**: Slides from top → Environmental damage from above
- **self**: Center fade → Self-inflicted doesn't move
- **heal**: Center pulse → Healing effects glow in place

### CSS Classes Available

Apply these classes for directional animations:

- `.slide-from-right` - Slides in from right (enemy attacks)
- `.slide-from-top` - Slides in from top (environmental)
- `.slide-from-left` - Slides in from left
- `.slide-from-bottom` - Slides in from bottom
- `.animate-shake` - Shakes for critical damage (>20 damage)
- `.animate-pulse-subtle` - Subtle pulse for healing

### Example Usage in Component

```typescript
<div
  className={getDamageStyle('enemy', -25).color}
  style={{
    textShadow: getDamageStyle('enemy', -25).shadow
  }}
>
  -25 HP
</div>
```

## Stagger Timing

### Adaptive Stagger Delay

The system automatically adjusts animation delays based on the number of items:

```typescript
import { calculateStaggerDelay } from '@/lib/animations'

// For 3 choices: 50ms delay per choice
const delay = calculateStaggerDelay(3) // Returns 50

// For 10 choices: 20ms delay per choice (keeps total under 200ms)
const delay = calculateStaggerDelay(10) // Returns 20
```

### Current Implementation

```typescript
// In dungeon-crawler.tsx - choice buttons
{entry.choices.map((choice, choiceIndex) => {
  const delayPerChoice = Math.min(50, 200 / entry.choices.length)
  return (
    <Button
      className="choice-stagger"
      style={{ animationDelay: `${choiceIndex * delayPerChoice}ms` }}
    >
      {choice.text}
    </Button>
  )
})}
```

## Animation Presets

Pre-configured animation settings for common use cases:

```typescript
import { ANIMATION_PRESETS, getAnimationPreset } from '@/lib/animations'

// Get preset by name
const quickPreset = getAnimationPreset('quick')
// Returns: { duration: 150, easing: easeOutQuad, className: 'transition-all duration-150' }

// Apply to element
<div className={quickPreset.className}>
  Content
</div>
```

### Available Presets

- **quick**: 150ms, easeOutQuad - Fast, snappy interactions
- **standard**: 300ms, easeOutCubic - Standard UI transitions
- **playful**: 400ms, easeOutElastic - Playful, bouncy animations
- **dramatic**: 500ms, easeOutExpo - Dramatic reveals
- **smooth**: 600ms, easeOutBack - Smooth, gentle movements

## Accessibility

### Reduced Motion Support

All animations automatically respect user preferences:

```typescript
import { prefersReducedMotion, getAnimationDuration } from '@/lib/animations'

// Check if user prefers reduced motion
if (prefersReducedMotion()) {
  // Skip animations
}

// Get adjusted duration (0 if reduced motion preferred)
const duration = getAnimationDuration(300) // Returns 0 or 300
```

### CSS Media Query

The system includes automatic reduced motion support:

```css
@media (prefers-reduced-motion: reduce) {
  .choice-stagger,
  .animate-shake,
  .animate-pulse-subtle,
  .slide-from-right,
  .slide-from-top,
  .slide-from-left,
  .slide-from-bottom {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
```

## Best Practices

### 1. Choose the Right Easing

- **UI interactions** → easeOutQuad (quick, smooth)
- **Rewards/level ups** → easeOutElastic (bouncy, exciting)
- **Damage** → easeOutExpo (dramatic, impactful)
- **Modals** → easeOutBack (emphasis with overshoot)

### 2. Duration Guidelines

- **Micro-interactions**: 100-200ms
- **Standard transitions**: 200-400ms
- **Dramatic effects**: 400-600ms
- **Never exceed**: 800ms (feels sluggish)

### 3. Stagger Timing

- **2-4 items**: 50ms delay
- **5-8 items**: 30-40ms delay
- **9+ items**: 20-25ms delay
- **Total animation**: Keep under 300ms

### 4. Directional Feedback

- Use consistent directions for same event types
- Enemy attacks → always from right
- Environmental → always from top
- Make damage feel impactful with shake for crits

### 5. Performance

- Use `will-change: transform` for frequent animations
- Avoid animating `width`, `height`, `top`, `left`
- Prefer `transform` and `opacity`
- Test on mobile devices

## Examples

### Animated Stat Change with Direction

```typescript
import { getDamageDirection, getDirectionalSlide } from '@/lib/animations'

const handleDamage = (source: DamageSource, amount: number) => {
  const direction = getDamageDirection(source)
  const animation = getDirectionalSlide(direction)

  // Apply animation className to damage number
  setDamageIndicator({
    amount,
    className: animation.className
  })
}
```

### Custom Animation with Preset

```typescript
import { getAnimationPreset } from '@/lib/animations'

const LootCard = () => {
  const preset = getAnimationPreset('playful')

  return (
    <div className={`${preset.className} hover:scale-105`}>
      Legendary Sword
    </div>
  )
}
```

### Contextual Number Animation

```typescript
import { easeOutElastic, easeOutExpo } from '@/lib/animations'

const animateNumber = (isGain: boolean) => {
  // Use bouncy animation for gains, dramatic for losses
  const easing = isGain ? easeOutElastic : easeOutExpo
  // ... animation logic
}
```

## Performance Budget

### Simultaneous Animations

The game uses multiple concurrent animation systems. To maintain 60fps performance, the following budget guidelines apply:

#### Active Animation Limits

- **Floating Numbers**: Max 5 simultaneous (auto-cleanup after 1s)
- **Loot Drops**: Max 3 simultaneous (auto-cleanup: 1.2s-2.5s based on rarity)
- **Stat Animations**: Unlimited (lightweight, uses requestAnimationFrame)
- **Choice Stagger**: Single sequence per event (max 200ms total)

#### Animation Budget by Type

1. **Floating Damage Numbers** (~1000ms each)
   - Uses: transform, opacity, filter
   - GPU layers: Yes (position: fixed)
   - Performance cost: **Low** (~2% CPU per instance)
   - Budget: 5 simultaneous = **~10% CPU**

2. **Loot Drop Animations** (1200-2500ms each)
   - Uses: transform, opacity, filter, text-shadow
   - GPU layers: Yes (position: fixed)
   - Performance cost: **Medium** (~5% CPU per instance)
   - Legendary combo: **High** (~8% CPU during celebration phase)
   - Budget: 3 simultaneous = **~15-24% CPU**

3. **Stat Number Animations** (300-400ms each)
   - Uses: CSS counter animation via requestAnimationFrame
   - GPU layers: No (inline elements)
   - Performance cost: **Very Low** (~0.5% CPU per instance)
   - Budget: Unlimited (typically <10 active)

4. **Choice Button Stagger** (up to 300ms total)
   - Uses: transform, opacity
   - GPU layers: No (flex children)
   - Performance cost: **Very Low** (~1% CPU for sequence)
   - Budget: Single sequence per event

#### Total Concurrent Budget

**Conservative estimate for worst-case scenario:**
- 5 floating numbers: 10% CPU
- 3 loot drops (1 legendary): 24% CPU
- 10 stat animations: 5% CPU
- 1 choice stagger: 1% CPU
- **Total: ~40% CPU budget**

**Remaining headroom: 60%** for game logic, rendering, React reconciliation

#### Optimization Strategies

1. **Auto-cleanup**: All animations self-remove from DOM after completion
2. **GPU acceleration**: `will-change: transform` on fixed-position elements
3. **Transform-only**: Avoid layout thrashing (no width/height/top/left changes)
4. **Staggered timing**: Never spawn >5 floating numbers in same frame
5. **Rarity-based duration**: Common items = shorter display = faster cleanup

#### Mobile Performance

On lower-end devices (tested on iPhone SE 2020, Android mid-range):
- Reduce simultaneous floating numbers to **3 max**
- Skip legendary celebration phase shake (use simple fade)
- Consider `prefers-reduced-motion` to disable all animations

#### Monitoring

Watch for performance issues:
- Frame drops below 55fps → reduce concurrent animation count
- Jank during loot drops → disable legendary combo phases
- Memory leaks → verify cleanup timers in useEffect

## Integration Checklist

- [ ] Import appropriate easing functions
- [ ] Apply directional animations for damage
- [ ] Use stagger timing for lists
- [ ] Test with reduced motion enabled
- [ ] Verify animations on mobile
- [ ] Ensure total animation time < 300ms
- [ ] Use semantic directions (enemy = right, etc.)
- [ ] Monitor concurrent animation count (stay within budget)
- [ ] Test performance on low-end devices
