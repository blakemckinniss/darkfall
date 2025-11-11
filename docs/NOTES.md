# Critical Items Log

Auto-generated log of all critical (76-100) documentation, technical debt, and next step items.

---

## 2025-11-01 10:25 - [NEXT]
- ⭐85 Update Parser Regex - Implement the simplified `[emoji]\d+` pattern for emoji stripping

## 2025-11-01 10:45 - [NEXT]
- ⭐85 Consider non-AI cleanup approach using simple heuristics (age-based, keyword matching)

## 2025-11-01 11:00 - [DOCS]
- 🔴85 Update CLAUDE.md with new hook documentation tracking features (ADR.md, CLAUDE.md, NOTES.md monitoring)

## 2025-11-01 11:15 - [DOCS]
- 🔴90 Update CLAUDE.md with Critical Reflection Questions feature in prompt-validator.sh hook

## 2025-11-01 11:15 - [NEXT]
- ⭐85 Restart Claude Code to activate the enhanced hook with dynamic question generation

## 2025-11-01 11:20 - [DOCS]
- 🔴80 Update README.md examples to be project-agnostic for hook reusability across different codebases

## 2025-11-01 11:30 - [DOCS]
- 🔴90 Update CLAUDE.md - prompt-validator.sh hook is now fully project-agnostic with generic questions

## 2025-11-01 11:30 - [NEXT]
- ⭐90 Test hook portability by copying to a different project type (API, CLI, etc.) to validate generic questions work universally

## 2025-11-01 11:45 - [DOCS]
- 🔴85 Update my internal response pattern - Next Steps must be actionable tasks, not questions
- 🔴90 Update CLAUDE.md with session-start.sh now being fully project-agnostic with multi-language support

## 2025-11-01 11:45 - [DEBT]
- 🔴80 Pattern inconsistency in responses - I've been asking permission in Next Steps instead of stating tasks

## 2025-11-01 11:45 - [NEXT]
- ⭐90 Refactor session-start.sh to be project-agnostic with smart package manager detection
- ⭐85 Move CLAUDE.md guidelines from hardcoded strings to reading actual CLAUDE.md file

## 2025-11-01 11:36 - [NEXT]
- ⭐85 Restart Claude Code for the MCP server to be recognized (claude code or restart your session)

## 2025-11-01 11:48 - [NEXT]
- ⭐90 Restart Claude Code to activate the updated hooks with new Zen MCP requirements

## 2025-11-01 12:10 - [DOCS]
- 🔴80 Update .claude/hooks/README.md to document the new outdated knowledge detection feature

## 2025-11-01 12:10 - [NEXT]
- ⭐85 Update .claude/hooks/README.md with outdated knowledge detection documentation

## 2025-11-02 - [NEXT]
- ⭐90 Start with Phase 1A - Portal progress tracking provides immediate UX improvement (Est: 30 mins, zero balance impact, high visual value)
- ⭐85 Implement Multi-Choice Treasures - Highest gameplay impact for effort (Est: 2 hours, uses existing systems, player agency >>> RNG)

## 2025-11-02 17:30 - [DOCS]
- 🔴80 Update ADR.md with portal traversal enhancement decisions (Phases 1A, 1B)

## 2025-11-02 17:30 - [NEXT]
- ⭐95 Complete Phase 1B treasure choice integration with AI-generated portal events
- ⭐85 Test Phase 1A portal progress tracking with real portal traversal
- ⭐80 Test AI treasure choice generation and validate balance
- ⭐78 Continue with Phase 2 (portal-scoped consumables) in follow-up session
## 2025-11-02 17:40 - [DOCS]
- 🔴80 Update ADR.md with ADR-014 (Portal-Scoped State Management & Buff Lifecycle) - Comprehensive architectural decisions for Phase 2+3 implementation validated by Zen MCP Opus 4 at 92% confidence
- 🔴78 Update TODO.md with Zen MCP implementation guidance - Detailed Phase 2 implementation strategy with code snippets, edge case handling, and acceptance criteria

## 2025-11-02 17:40 - [NEXT]
- ⭐95 Implement Phase 2 Portal Session State Management - Add portalSessions: Record<locationId, PortalSession> to dungeon-crawler.tsx and GameState interface
- ⭐90 Implement Phase 2 Buff Lifecycle Management - Update handleUseConsumable and handleChoice for portal-scoped buff apply/clear logic
- ⭐85 Create 5 Portal-Scoped Consumables - Add Portal Anchor, Dimensional Ward, Explorer's Blessing, Cavern Blessing, Portal Resilience to canonical consumables
- ⭐80 Implement Portal Buff UI - Add active buff display below progress bar in portal UI
- ⭐80 Test Phase 2 with Playwright MCP - Automated testing for buff application, persistence, collapse cleanup, and multiple portal edge cases

## 2025-11-02 19:30 - [NEXT]
- ⭐85 Test Phase 2 portal-scoped consumables via Playwright MCP - Open portal, use consumable, verify stats increase, exit portal, verify buff cleared
- ⭐80 Implement Phase 3.2: Artifact drop logic - Create checkPortalExclusiveDrop() function, match portal theme, check globallyUnique, roll drop chance
- ⭐75 Implement Phase 3.3: Artifact acquisition tracking - Update handleTreasureChoice, add to obtainedArtifacts, prevent duplicates

## 2025-11-02 21:05 - [NEXT]
- ⭐90 Commit the changes - All validation passing, implementation complete, ready for git commit

## 2025-11-02 21:17 - [DEBT]
- 🔴80 Race condition in shop purchase tracking - Rapid clicks bypass purchasedItems check due to async state updates

## 2025-11-02 21:17 - [NEXT]
- ⭐95 Fix purchase tracking race condition - Add useRef to track pending purchases or implement debouncing
- ⭐90 Commit all changes - Technical debt fixes + model update ready for git commit

## 2025-11-02 17:34 - [NEXT]
- ⭐95 Start dev server and visually test EntityText component with all 5 effect types in browser
- ⭐90 Test Groq API endpoint - Send test request to /api/generate-text-effect with sample entity data
- ⭐85 Integrate Groq text effect generation into generate-narrative route for AI-generated entities
## 2025-11-02 23:15 - [NEXT]
- ⭐95 Complete Phase 3 Integration (1-2 hours) - Wire artifact drop logic into treasure generation system
- ⭐85 Implement Artifact Collection UI (30-60 mins) - Add visual artifact tracking in Developer panel
- ⭐80 Test Artifact Drop System - Validate drop mechanics across all 6 portal themes

## 2025-11-02 23:15 - [DOCS]
- 🔴78 Document Phase 2 in ADR.md - Add architectural decision record for portal-scoped consumables
- 🔴76 Document Phase 3 in ADR.md - Add portal-exclusive artifacts architecture and drop logic

## 2025-11-02 23:15 - [DEBT]
- 🟠65 Manual Testing Required for Phase 2 - Portal-scoped consumables verified via code but not gameplay tested

## 2025-11-02 19:05 - [DOCS]
- 🔴80 Update docs/ADR.md - Document Phase 0 "Procedural Skeleton + AI Flesh" architecture decision, event generation pipeline redesign, performance targets (<400ms), and fallback strategy

## 2025-11-02 19:05 - [NEXT]
- ⭐90 Test Phase 0 Integration - Start dev server and test portal event generation with real Groq API calls
- ⭐85 Performance Validation - Generate 10+ events and measure actual response times vs <400ms target

## 2025-11-02 19:50 - [DOCS]
- 🔴80 Update docs/ADR.md - Document Phase 0 test results, actual performance (754ms avg), 49.5% improvement over old system, and revised optimization plan for Phase 2

## 2025-11-02 19:50 - [DEBT]
- 🔴76 Performance Target Missed - 754ms average exceeds <400ms target by 354ms; requires Phase 2 caching and prompt optimization to achieve target

## 2025-11-02 19:50 - [NEXT]
- ⭐95 Optimize AI Prompts - Reduce token count in /api/generate-flavor to target <200 tokens per response for faster generation
- ⭐90 Implement Phase 2 Entity Cache - Cache procedural entities to eliminate Groq calls for repeated entities (target: 30% cache hit rate)
- ⭐85 Add Token Counting Metrics - Monitor actual AI response sizes to validate optimization efforts


## 2025-01-10 14:30 - [DOCS]
- 🔴80 docs/ADR.md - Document complete confidence calibration system architecture, mathematical framework, and integration decision

## 2025-01-10 14:30 - [NEXT]
- ⭐95 Restart Claude Code - Required to activate the new hook configuration
- ⭐90 Install Python dependencies - Run `pip install scipy scikit-learn numpy` for full functionality
- ⭐85 Test with real prompts - Verify hooks trigger correctly and rubric requirements display
- ⭐80 Week 4: Calibration + Pilot - Run synthetic bootstrap, pilot testing, tune thresholds, generate calibration report

## 2025-11-11 04:35 - [DOCS]
- 🔴80 docs/ADR.md - Document Zen MCP conflict detector enhancements: caching strategy, retry logic, continuation_id usage

## 2025-11-11 04:35 - [NEXT]
- ⭐95 Commit the confidence calibration system - 33 uncommitted files ready for version control
- ⭐90 Test Zen MCP integration live - Verify actual API calls work with caching and retries
- ⭐85 Add cache size limits - Implement max 100 entries with LRU eviction policy
