#!/bin/bash
#
# Confidence Classifier Hook (UserPromptSubmit)
#
# Triggered: Before Claude receives each user prompt
# Purpose: Classify task and set verification budget requirements
#
# Actions:
# 1. Classify task into: atomic, routine, open_world, risky
# 2. Display rubric requirements to Claude
# 3. Show verification budget and mandatory artifacts
# 4. Set expectations for confidence system usage

set -euo pipefail

# Read stdin (hook receives JSON with prompt, etc.)
INPUT=$(cat)

# Extract prompt from JSON (using jq if available, fallback to basic parsing)
if command -v jq >/dev/null 2>&1; then
    PROMPT=$(echo "$INPUT" | jq -r '.prompt // empty')
else
    # Fallback: basic grep (fragile but works for simple cases)
    PROMPT=$(echo "$INPUT" | grep -o '"prompt"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/"prompt"[[:space:]]*:[[:space:]]*"\(.*\)"/\1/')
fi

# If no prompt extracted, exit gracefully
if [ -z "$PROMPT" ]; then
    echo '{"hookSpecificOutput": {"hookEventName": "UserPromptSubmit", "additionalContext": ""}}'
    exit 0
fi

# Simple heuristic task classification based on keywords
classify_task() {
    local prompt="$1"
    local prompt_lower=$(echo "$prompt" | tr '[:upper:]' '[:lower:]')

    # RISKY: Database, production, deployment, migration keywords
    if echo "$prompt_lower" | grep -qE '\b(production|prod|deploy|migration|database|drop|delete|rm -rf|irreversible)\b'; then
        echo "risky"
        return
    fi

    # OPEN_WORLD: External APIs, research, web scraping, new tech
    if echo "$prompt_lower" | grep -qE '\b(api|external|integration|research|investigate|explore|new|latest|web|fetch|scrape)\b'; then
        echo "open_world"
        return
    fi

    # ATOMIC: Simple queries, documentation, explanations
    if echo "$prompt_lower" | grep -qE '\b(what|how|explain|describe|define|list|show)\b' && ! echo "$prompt_lower" | grep -qE '\b(implement|build|create|add|modify)\b'; then
        echo "atomic"
        return
    fi

    # Default: ROUTINE
    echo "routine"
}

TASK_CLASS=$(classify_task "$PROMPT")

# Generate appropriate context based on task class
generate_context() {
    local task_class="$1"

    cat <<EOF
## 🎯 Confidence Calibration System Active

**Task Classification: ${task_class^^}**

You MUST output a complete confidence rubric for this task. The rubric includes:

### Required Components:

1. **Task Summary & Classification**
   - Brief task description
   - Confirmed task class: $task_class

2. **Multi-Axis Metrics**
   - Novelty: 0.0 (familiar) - 1.0 (never done)
   - Externality: 0.0 (internal) - 1.0 (external deps)
   - Blast Radius: 0.0 (isolated) - 1.0 (system-wide)
   - Reversibility: 0.0 (irreversible) - 1.0 (easy rollback)
   - Exposure: 0.0 (dev/local) - 1.0 (production)

3. **Claims & Evidence**
   - List all claims made
   - Back each claim with evidence (web, code, tool, empirical)
   - Evidence must include: source, quote, credibility, timestamp

4. **Verification**
   - Checks performed (tests, build, type-check)
   - Assumptions made (with risk level)
   - Conflicts detected (if any)

5. **Confidence Metrics** (10 metrics)
   - spec_completeness, context_grounding, tooling_path
   - empirical_verification, source_diversity, time_relevance
   - reproducibility, assumption_risk, contradiction_risk, novelty_penalty

6. **Confidence Results**
   - p_raw (uncalibrated)
   - p_correct_mean (calibrated)
   - p_correct_low (conservative lower bound)

7. **Risk Assessment**
   - Impact score [0, 1]
   - Expected risk = impact × (1 - p_correct_low)

8. **Gate Decision**
   - proceed, caution, ask, or stop
   - Based on expected risk and violations

9. **Rationale**
   - Clear explanation of confidence level
   - Why this gate decision was chosen

EOF

    # Add task-class specific requirements
    case "$task_class" in
        atomic)
            cat <<EOF

### Verification Budget (Atomic):
- Max actions: 5
- Max time: 30 seconds
- Allowed tools: Read, Grep, Glob
- Mandatory: None

**Expected confidence: p_correct_mean ≥ 0.85**

EOF
            ;;
        routine)
            cat <<EOF

### Verification Budget (Routine):
- Max actions: 10
- Max time: 120 seconds
- Allowed tools: Read, Grep, Glob, Bash, WebSearch
- Mandatory: None

**Expected confidence: p_correct_mean ≥ 0.75**

EOF
            ;;
        open_world)
            cat <<EOF

### Verification Budget (Open World):
- Max actions: 15
- Max time: 300 seconds
- Allowed tools: Read, Grep, Glob, Bash, WebSearch, WebFetch
- **Mandatory: WebSearch** (must search for external info)

**Expected confidence: p_correct_mean ≥ 0.65**
**Source diversity: ≥2 independent sources required**

EOF
            ;;
        risky)
            cat <<EOF

### Verification Budget (Risky):
- Max actions: 20
- Max time: 600 seconds
- Allowed tools: Read, Grep, Glob, Bash, WebSearch
- **Mandatory: dry_run AND backup** (safety measures required)

**Expected confidence: p_correct_mean ≥ 0.70**
**Reversibility: Must be ≥ 0.5 OR have backup plan**

⚠️ **RISKY TASK**: Extra scrutiny required. Tripwires active.

EOF
            ;;
    esac

    cat <<EOF

### Output Format:

At the end of your response, output a JSON code block with the complete rubric:

\`\`\`json
{
  "task_summary": "Brief description",
  "task_class": "$task_class",
  "axes": { "novelty": 0.0, ... },
  "claims": [...],
  "evidence": [...],
  "checks": [...],
  "assumptions": [...],
  "conflicts": [...],
  "metrics": { "spec_completeness": 0.0, ... },
  "confidence": { "p_raw": 0.0, "p_correct_mean": 0.0, "p_correct_low": 0.0, "bucket": "..." },
  "risk": { "impact": 0.0, "expected_risk": 0.0 },
  "budgets": { ... },
  "gate": "proceed|caution|ask|stop",
  "attribution": [...],
  "rationale": "...",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
\`\`\`

See \`.claude/hooks/example_rubric.json\` for a complete example.

---

EOF
}

CONTEXT=$(generate_context "$TASK_CLASS")

# Output hook response (additionalContext is shown to Claude)
cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": $(echo "$CONTEXT" | jq -Rs .)
  }
}
EOF
