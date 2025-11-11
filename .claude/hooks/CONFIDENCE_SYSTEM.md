# Confidence Calibration System

Complete reference documentation for the confidence calibration system.

## Overview

The confidence calibration system transforms AI confidence from theatrical certainty into scientific measurement using:
- Mathematical probability calibration (Platt Scaling + Bayesian bounds)
- Conflict detection (Zen MCP + NLI heuristics)
- Risk-based gating (tripwires + budget constraints)
- Comprehensive rubric output (claims + evidence + metrics)

## Architecture

### Components

**Week 1: Core Mathematical Models**
- `task_classifier.py` - 4-class task classification (atomic, routine, open_world, risky)
- `confidence_model.py` - Logistic regression model (10 metrics → p_raw)
- `impact_model.py` - 3-axis impact assessment (blast, reversibility, exposure)
- `beta_bounds.py` - Bayesian credible intervals (Beta posteriors)
- `calibration_engine.py` - Platt Scaling + Isotonic Regression
- `synthetic-bootstrap.py` - Cold start data generation (100 seed entries)

**Week 2: Conflict Detection + Risk Management**
- `conflict_detector_zen.py` - Zen MCP integration for intelligent conflict detection
- `nli_heuristics.py` - Lightweight fallback conflict detection
- `tripwires.py` - 5 critical safety rules (force conservative actions)
- `verification_budget.py` - Hard constraints (action/time limits, tool whitelist)
- `action_gates.py` - Risk-based decision making (proceed/caution/ask/stop)

**Week 3: JSON Schema + Hook Integration**
- `rubric_schema.py` - Extended JSON structure (GPT-5 framework)
- `confidence-classifier.sh` - UserPromptSubmit hook (task classification)
- `confidence-auditor.py` - PostToolUse hook (rubric audit + gating)

### Data Flow

```
UserPrompt
    ↓
confidence-classifier.sh → Task Classification
    ↓
Claude works on task
    ↓
confidence-auditor.py → Rubric Audit
    ↓                      ├─ Conflict Detection
    ↓                      ├─ Confidence Calibration
    ↓                      ├─ Tripwire Evaluation
    ↓                      ├─ Budget Checking
    ↓                      └─ Gate Decision
    ↓
Gate: proceed/caution/ask/stop
```

## Task Classification

### 4 Task Classes

**Atomic** (95% success rate)
- Simple queries, documentation lookups
- Budget: 5 actions, 30s, minimal tools
- Example: "What does a transmission do?"

**Routine** (80% success rate)
- Standard development tasks
- Budget: 10 actions, 120s, standard tools
- Example: "Fix the login button color"

**Open World** (65% success rate)
- External dependencies, uncertain outcomes
- Budget: 15 actions, 300s, includes WebSearch (mandatory)
- Example: "Research EV impact on transmission repair profitability"

**Risky** (50% success rate)
- High-impact changes, irreversible operations
- Budget: 20 actions, 600s, requires dry_run + backup
- Example: "Migrate database to new schema in production"

### 5-Axis Metrics

Every task is characterized on 5 axes:
- **Novelty**: 0.0 (familiar) → 1.0 (never done before)
- **Externality**: 0.0 (internal) → 1.0 (external dependencies)
- **Blast Radius**: 0.0 (isolated) → 1.0 (system-wide impact)
- **Reversibility**: 0.0 (irreversible) → 1.0 (easily rolled back)
- **Exposure**: 0.0 (dev/local) → 1.0 (production full traffic)

## Confidence Model

### 10 Metrics

**Positive Contributions:**
1. `spec_completeness` (w=0.18) - How complete is the specification?
2. `context_grounding` (w=0.14) - How well grounded in codebase context?
3. `tooling_path` (w=0.16) - Clear path to verification tools?
4. `empirical_verification` (w=0.22) - Was it empirically tested? [highest weight]
5. `source_diversity` (w=0.10) - Multiple independent sources? [open_world only]
6. `time_relevance` (w=0.06) - How recent is information? [open_world only]
7. `reproducibility` (w=0.12) - Can results be reproduced?

**Negative Contributions (Risks):**
8. `assumption_risk` (w=-0.10) - Unverified assumptions?
9. `contradiction_risk` (w=-0.12) - Conflicting evidence?
10. `novelty_penalty` (w=-0.06) - Unfamiliar territory?

### Calculation

```python
# Step 1: Evidence score
z = w0 + w1*spec + w2*context + ... + prior[task_class]

# Step 2: Sigmoid transformation
p_raw = 1 / (1 + exp(-z))

# Step 3: Calibration (Platt Scaling)
p_correct_mean = calibrate(p_raw, bucket, history)

# Step 4: Conservative lower bound (Beta posterior)
p_correct_low = Beta.ppf(0.10, α+successes, β+failures)
```

### Task Priors

- Atomic: +1.5 (sigmoid ≈ 0.82)
- Routine: +0.5 (sigmoid ≈ 0.62)
- Open World: -0.5 (sigmoid ≈ 0.38)
- Risky: -1.0 (sigmoid ≈ 0.27)

## Tripwires

### 5 Critical Safety Rules

**1. Single-Source Empirical (Open World)**
- Trigger: open_world + empirical + 1 source
- Action: Cap p_correct_low ≤ 0.70
- Rationale: Single-source verification in uncertain domain insufficient

**2. No Dry-Run/Backup (Risky)**
- Trigger: risky + no dry_run + no backup + low reversibility
- Action: STOP
- Rationale: High-impact changes require safety measures

**3. High Blast Radius + Weak Tests**
- Trigger: blast_radius > 0.6 + weak_tests
- Action: ASK
- Rationale: Wide-reaching changes need adequate test coverage

**4. NLI Contradiction ≥ Medium**
- Trigger: contradiction_risk ≥ 0.25
- Action: ASK
- Rationale: Conflicting evidence requires resolution

**5. OOD Stack Without Sandbox**
- Trigger: unfamiliar_stack + production + no_sandbox
- Action: ASK
- Rationale: Unfamiliar technology in production is risky

## Gate Decisions

### Risk-Based Thresholds

```
Expected Risk = impact × (1 - p_correct_low)

< 2%    → PROCEED (automatic, very low risk)
2-8%    → CAUTION (log + rollback plan)
8-20%   → ASK (user approval required)
> 20%   → STOP (do not proceed)
```

Violations (tripwires, budget) override risk-based thresholds.

### Gate Actions

**PROCEED**
- Safe to continue automatically
- No special precautions needed

**CAUTION**
- Proceed but log action
- Prepare rollback plan
- Monitor for issues

**ASK**
- Present risk assessment to user
- Get explicit approval
- Ensure rollback mechanism ready

**STOP**
- Do not proceed
- Reduce impact or improve confidence
- Reconsider approach

## JSON Rubric Structure

Complete rubric output (see `example_rubric.json`):

```json
{
  "task_summary": "Brief task description",
  "task_class": "open_world",
  "axes": { "novelty": 0.6, "externality": 0.8, ... },
  "claims": [
    { "id": "c1", "text": "...", "type": "empirical", "evidence_ids": ["e1", "e2"] }
  ],
  "evidence": [
    { "id": "e1", "kind": "web", "where": "URL", "quote": "...", "credibility": 0.95 }
  ],
  "checks": [
    { "name": "pnpm tsc --noEmit", "result": "pass" }
  ],
  "assumptions": [
    { "text": "...", "risk": "medium" }
  ],
  "conflicts": [
    { "between": ["e1", "e3"], "severity": "low", "description": "..." }
  ],
  "metrics": {
    "spec_completeness": 0.8,
    "context_grounding": 0.7,
    ...
  },
  "confidence": {
    "p_raw": 0.78,
    "p_correct_mean": 0.72,
    "p_correct_low": 0.58,
    "bucket": "open_world|node|medium_novelty|external|good_tests"
  },
  "risk": {
    "impact": 0.12,
    "expected_risk": 0.05
  },
  "budgets": { ... },
  "gate": "caution",
  "attribution": [
    { "feature": "empirical_verification", "contribution": 0.22 }
  ],
  "rationale": "Clear explanation of confidence and gate decision",
  "timestamp": "2025-01-10T12:00:00Z"
}
```

## Usage

### Enabling the System

1. Install dependencies:
   ```bash
   pip install scipy scikit-learn numpy
   ```

2. Configure hooks in `.claude/settings.json`:
   ```json
   {
     "hooks": {
       "UserPromptSubmit": [".claude/hooks/confidence-classifier.sh"],
       "PostToolUse": [".claude/hooks/confidence-auditor.py"]
     }
   }
   ```

3. Restart Claude Code

### Interpreting Results

**High Confidence (p_correct_mean ≥ 0.85)**
- Strong evidence backing
- Multiple independent sources
- Empirical verification passed
- Gate: likely PROCEED or CAUTION

**Medium Confidence (0.65-0.84)**
- Some evidence gaps
- Moderate assumptions
- Gate: likely CAUTION or ASK

**Low Confidence (< 0.65)**
- Weak evidence
- High uncertainty
- Gate: likely ASK or STOP

**Conservative Bound (p_correct_low)**
- 90% credible interval lower bound
- Used for risk calculation
- Accounts for model uncertainty

## Calibration

### Cold Start

System ships with 100 synthetic history entries across 4 task classes:
- Atomic: 40 entries (95% success)
- Routine: 30 entries (80% success)
- Open_world: 20 entries (65% success)
- Risky: 10 entries (50% success)

### Calibration Methods

**< 20 samples**: No calibration (use p_raw)
**20-49 samples**: Platt Scaling (robust for small data)
**50+ samples**: Isotonic Regression (captures complex curves)

### Monitoring

Track calibration metrics:
- **Brier Score** < 0.15 (lower is better)
- **False Confidence Rate** < 5% (claimed 90%+ but wrong)
- **Calibration Error** < ±10% per bucket

Generate reliability tables:
```
Predicted | Actual | Count | Delta
90-100%  | 92%    | 23    | -2% ✓
80-89%   | 81%    | 31    | +1% ✓
70-79%   | 68%    | 18    | +2% ✓
```

## Files

### Core Models (`lib/`)
- `task_classifier.py` (174 lines)
- `confidence_model.py` (228 lines)
- `impact_model.py` (338 lines)
- `beta_bounds.py` (200 lines)
- `calibration_engine.py` (365 lines)
- `conflict_detector_zen.py` (372 lines)
- `nli_heuristics.py` (349 lines)
- `tripwires.py` (320 lines)
- `verification_budget.py` (330 lines)
- `action_gates.py` (259 lines)
- `rubric_schema.py` (400 lines)

### Hooks
- `confidence-classifier.sh` (UserPromptSubmit)
- `confidence-auditor.py` (PostToolUse)
- `synthetic-bootstrap.py` (data generation)

### Data
- `synthetic_history_seed.jsonl` (100 seed entries, 27 KB)
- `confidence_history.jsonl` (auto-created, appended on each use)
- `calibration_buckets.json` (bucket statistics)
- `example_rubric.json` (reference example)

### Tests
- `test_confidence_pipeline.py` (Week 1 end-to-end)
- `test_week2_integration.py` (Week 2 integration)

## Troubleshooting

### "scipy not available"
Install: `pip install scipy`
Fallback: Uses simple conservative factor (p_raw * 0.75)

### "sklearn not available"
Install: `pip install scikit-learn numpy`
Fallback: Uses empirical calibration (bin-based)

### Low confidence despite strong evidence
- Check contradiction_risk (conflicts detected?)
- Check assumption_risk (unverified assumptions?)
- Check bucket history (sufficient calibration data?)

### Gate decision seems wrong
- Review tripwire violations (overrides risk calculation)
- Check budget violations (forces conservative actions)
- Verify impact calculation (blast_radius, reversibility, exposure)

### Rubric not appearing
- Check hook configuration in `.claude/settings.json`
- Verify hooks are executable (`chmod +x`)
- Restart Claude Code

## Best Practices

1. **Always output complete rubric** - Missing fields break audit
2. **Be honest about assumptions** - Don't hide uncertainty
3. **Cite evidence properly** - Include source, quote, credibility
4. **Run empirical checks** - Tests, builds, type-checks count heavily
5. **Address conflicts explicitly** - Don't ignore contradictions
6. **Respect tripwires** - They catch dangerous patterns
7. **Update history outcomes** - Mark success/failure for calibration

## References

- GPT-5 Mathematical Framework (consultation: 2025-01-10)
- Zen MCP Integration Pattern
- Platt Scaling: Platt (1999), "Probabilistic Outputs for SVMs"
- Isotonic Regression: Zadrozny & Elkan (2002)
- Beta-Binomial Model: Gelman et al., "Bayesian Data Analysis"
