# Playwright E2E Tests for AI Integration

## Overview

This test suite validates the AI narrative generation system integration and performance. Tests follow best practices from Zen MCP research and Playwright documentation.

## Test Structure

```
tests/e2e/
├── helpers/
│   ├── performance.ts    # PerformanceObserver utilities
│   └── validation.ts     # AI response structure validation
├── ai-integration.spec.ts    # Structure & integration tests
├── ai-performance.spec.ts    # Performance benchmarks (<400ms target)
└── README.md
```

## Key Principles

### 1. Validate Structure, Not Content
AI responses are non-deterministic. Tests validate:
- ✅ Response structure (fields, types, constraints)
- ✅ Game rules (stat ranges, rarity distribution)
- ❌ Specific narrative text (too brittle)

### 2. Performance Measurement
- **PerformanceObserver API** for high-resolution timing
- **P50/P95 targets**: 400ms / 800ms (AI calls are variable)
- **Generous timeouts**: 10s for AI, 100ms for UI
- **Production build testing**: Most accurate measurements

### 3. Test Isolation
- Mock API responses for structure tests
- Live API for performance tests
- Independent test cases (no shared state)

## Running Tests

```bash
# All E2E tests
npm run test:e2e

# Only integration tests
npm run test:e2e:integration

# Only performance tests
npm run test:e2e:performance

# Interactive UI mode
npm run test:e2e:ui

# Debug mode (step through)
npm run test:e2e:debug

# Headed mode (see browser)
npm run test:e2e:headed

# View last report
npm run test:e2e:report
```

## Performance Targets

| Metric | Target (P50) | Acceptable (P95) | Hard Limit |
|--------|-------------|------------------|------------|
| API Call | 400ms | 800ms | 2000ms |
| UI Render | 100ms | 200ms | 500ms |
| Total E2E | 500ms | 1000ms | 2500ms |

## Test Categories

### Integration Tests (`ai-integration.spec.ts`)
- ✅ Valid narrative structure
- ✅ Combat event validation
- ✅ Shop event with inventory
- ✅ Treasure event with choices
- ✅ Shrine event with offers
- ✅ Entity registration
- ✅ Error handling & fallbacks
- ✅ Event variety over samples

### Performance Tests (`ai-performance.spec.ts`)
- ⏱️ API call latency
- ⏱️ End-to-end event generation
- ⏱️ UI rendering time
- ⏱️ P95 latency distribution
- ⏱️ Concurrent request handling
- ⏱️ Memory leak detection
- ⏱️ Performance regression tracking

## Writing New Tests

### Example: Structure Validation
```typescript
test("should validate new event type", async ({ page }) => {
  // Mock API response
  await page.route("**/api/generate-narrative", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ event: mockEvent }),
    })
  })

  // Trigger event
  await page.click('button:has-text("Enter The Void")')
  await page.waitForSelector('[data-testid="game-log"]')

  // Validate structure
  validateNarrativeStructure(mockEvent)
})
```

### Example: Performance Test
```typescript
test("should measure feature performance", async ({ page }) => {
  const { duration, statusCode } = await measureAPICall(
    page,
    "/api/generate-narrative",
    async () => {
      // Trigger operation
      await page.click('button:has-text("Action")')
      await page.waitForSelector('[data-testid="result"]')
    }
  )

  expect(statusCode).toBe(200)
  expect(duration).toBeLessThan(TARGET_MS)
})
```

## Debugging Failed Tests

### 1. View Test Report
```bash
npm run test:e2e:report
```

### 2. Run in UI Mode
```bash
npm run test:e2e:ui
```

### 3. Debug Specific Test
```bash
npx playwright test --debug -g "test name"
```

### 4. Headed Mode (See Browser)
```bash
npm run test:e2e:headed
```

### 5. Check Traces
Failed tests automatically capture:
- Screenshots
- Video recordings
- Network logs
- Console output

## CI/CD Integration

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Troubleshooting

### Test Timeouts
- AI calls are variable (200ms - 2s typical)
- Use generous timeouts (10s) for AI operations
- Check API key is set: `GROQ_API_KEY`

### Flaky Tests
- Always validate structure, never exact content
- Use `waitForSelector` with explicit timeout
- Check for race conditions in async operations

### Performance Variations
- Warm up: First request is slower (cold start)
- Network: Use production build for accurate measurement
- Load: Run performance tests in isolation

## Resources

- [Playwright Docs](https://playwright.dev/)
- [Next.js Testing Guide](https://nextjs.org/docs/testing)
- [PerformanceObserver API](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver)
- Zen MCP Research: `/docs/ADR.md` (AI testing best practices)

## Contributing

When adding tests:
1. Follow existing patterns (structure vs content)
2. Add helper functions for reusable logic
3. Document performance targets
4. Test both success and error cases
5. Use descriptive test names
