---
description: Analyze application performance and suggest optimizations
---

# Performance Audit

Identify performance bottlenecks and optimization opportunities.

## Analysis Areas

1. **Component Performance**
   - Review `components/dungeon-crawler.tsx` for unnecessary re-renders
   - Check for missing React.memo or useMemo optimizations
   - Analyze state update patterns

2. **Bundle Size**
   - Check Next.js bundle analyzer output
   - Identify large dependencies
   - Suggest code splitting opportunities

3. **API Performance**
   - Review AI generation endpoints for optimization
   - Check for unnecessary API calls
   - Suggest caching strategies

4. **localStorage Performance**
   - Review game state save/load frequency
   - Check for excessive serialization
   - Suggest debouncing or throttling

5. **Rendering Performance**
   - Check entity highlighting/rendering efficiency
   - Review drag-and-drop performance
   - Analyze image loading strategy

Provide specific recommendations with code examples.
