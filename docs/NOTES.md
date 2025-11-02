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
