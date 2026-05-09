# Quickstart: AI Investigation Modes

**Feature**: 004-investigation-modes | **Date**: 2026-05-08

## Prerequisites

- Existing fraud-ai-demo running locally (func start + vite dev + Azurite)
- At least one Run with generated data and detection results
- Foundry endpoint configured in `local.settings.json`

## Testing the New Modes

### 1. Mode Switching (UI)

1. Navigate to a case detail page (any case from a run)
2. Observe the horizontal tab bar at the top of the AI Investigation panel
3. Click each tab: **Single Agent**, **Consensus**, **Debate**, **Junior → Senior**
4. Verify only the active mode's configuration panel is visible
5. Verify each mode shows its strategy description and visual differentiation

### 2. Debate Mode

1. Select the **Debate** tab
2. Choose a model (e.g., GPT-5.4) and set temperature
3. Click **Run Debate Investigation**
4. Wait for both agents to complete (~30-120s)
5. Observe:
   - Fraud-leaning agent's reasoning and verdict
   - Non-fraud-leaning agent's reasoning and verdict
   - Arbiter's final verdict with agreements/disagreements
6. Click **View Prompts** to see the bias instructions for each agent

### 3. Junior → Senior Mode

1. Select the **Junior → Senior** tab
2. Set temperature (models are pre-configured)
3. Click **Run Investigation**
4. Observe:
   - Junior agent result with confidence score
   - If confidence > 85%: result displayed directly, "No escalation needed" indicator
   - If confidence ≤ 85%: escalation indicator, then senior agent result
5. Try multiple cases to see both escalation and non-escalation paths

### 4. Existing Modes (Regression Check)

1. Select **Single Agent** tab — verify model selection, temperature, streaming tool traces all work as before
2. Select **Consensus** tab — verify 3-model parallel run and arbiter verdict work as before

## API Testing (curl)

### Debate

```bash
curl -X POST http://localhost:7071/api/runs/{runId}/cases/{caseId}/debate \
  -H "Content-Type: application/json" \
  -d '{"temperature": 0.7, "model": "gpt-5.4"}'
```

### Junior → Senior

```bash
curl -X POST http://localhost:7071/api/runs/{runId}/cases/{caseId}/junior-senior \
  -H "Content-Type: application/json" \
  -d '{"temperature": 0.7}'
```

## Key Implementation Notes

- New endpoints follow the `ConsensusCaseFunction` pattern (transient, no persistence)
- Debate agents run in parallel (same as Consensus models)
- Junior → Senior is sequential by design (junior must complete before escalation decision)
- All modes share the same tools, case input format, and base prompt structure
- Bias instructions for Debate mode are additive to the base system prompt
