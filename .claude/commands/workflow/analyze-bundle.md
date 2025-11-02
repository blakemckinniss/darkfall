---
description: Analyze bundle size and identify optimization opportunities
---

# Bundle Size Analysis

Analyze the production bundle to identify large dependencies and optimization opportunities.

## Your Task

1. **Build Production Bundle:**
   - Run `pnpm build` to generate production artifacts
   - Capture build output with size information

2. **Analyze Bundle Composition:**
   - Identify the largest chunks and their sizes
   - List the biggest dependencies by size
   - Check for duplicate dependencies

3. **Identify Optimization Opportunities:**
   - Large dependencies that could be code-split
   - Unused dependencies that could be removed
   - Heavy components that should be lazy-loaded
   - Opportunities for tree-shaking improvements

4. **Provide Recommendations:**
   - Prioritized list of optimization actions
   - Estimated size savings for each recommendation
   - Implementation complexity (easy/medium/hard)

**Analysis Areas:**
- Client-side JavaScript bundle size
- Individual page chunk sizes
- Shared runtime chunks
- CSS bundle size
- Third-party dependencies impact

**Report Format:**
```
## Bundle Size Analysis

### Current State
- Total bundle size: [size]
- Largest chunks: [list]
- Largest dependencies: [list]

### Optimization Opportunities
1. [Opportunity] - Est. savings: [size] - Effort: [easy/medium/hard]
2. [Opportunity] - Est. savings: [size] - Effort: [easy/medium/hard]

### Recommendations
[Prioritized action items]
```

**Important:**
- Focus on meaningful optimizations (>10KB savings)
- Consider lazy loading for game features not needed on initial load
- Check if shadcn/ui components can be tree-shaken better
- Identify opportunities for route-based code splitting
