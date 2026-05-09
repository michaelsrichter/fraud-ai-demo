# Feature Specification: AI Investigation Modes

**Feature Branch**: `004-investigation-modes`
**Created**: 2026-05-08
**Status**: Draft
**Input**: User description: "Add formal AI Investigation Modes to the fraud investigation demo framework"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Mode Selection & Switching (Priority: P1)

A demo presenter opens a case detail page and sees all four investigation modes clearly labeled. They can switch between modes and only see the active mode's configuration and controls. Each mode visually communicates its investigation strategy at a glance.

**Why this priority**: Mode selection is the entry point for all investigation workflows. Without clear mode switching, none of the new modes are accessible.

**Independent Test**: Can be tested by navigating to any case detail, switching between all four modes, and confirming that only the active mode panel is visible and each mode is clearly labeled with its strategy.

**Acceptance Scenarios**:

1. **Given** a user is on a case detail page, **When** the page loads, **Then** all four investigation modes are displayed as selectable options: Single Agent, Consensus, Debate, Junior → Senior.
2. **Given** a user views the mode selector, **When** they select a different mode, **Then** the active mode panel is shown with its configuration controls and all other mode panels are hidden.
3. **Given** a user switches modes, **When** the new mode panel appears, **Then** each mode includes a brief description of its investigation strategy and a lightweight visual or icon distinguishing it from other modes.

---

### User Story 2 — Debate Mode Investigation (Priority: P1)

A demo presenter selects the Debate mode, configures a model and temperature, and launches an investigation. Two opposing agents (fraud-leaning and non-fraud-leaning) independently review the case. An arbiter agent then evaluates both arguments and produces a final determination using the shared output schema.

**Why this priority**: Debate mode is the most visually compelling new mode and demonstrates the power of adversarial AI reasoning, making it the highest-value new feature for demos.

**Independent Test**: Can be tested by selecting Debate mode on any case, running the investigation, and verifying that both opposing agents' findings and the arbiter's final verdict are displayed.

**Acceptance Scenarios**:

1. **Given** Debate mode is selected, **When** the user configures model and temperature and initiates an investigation, **Then** two agents (fraud-leaning and non-fraud-leaning) independently review the case using the same tools and case details.
2. **Given** both debate agents have completed their reviews, **When** the arbiter receives their findings along with the original case details, **Then** the arbiter produces a final determination including verdict, reasoning, confidence level, and evidence summary using the shared output schema.
3. **Given** the Debate investigation completes, **When** the results are displayed, **Then** the user sees: Agent 1's reasoning and recommendation, Agent 2's reasoning and recommendation, and the arbiter's final determination clearly distinguishing the opposing viewpoints.
4. **Given** Debate mode is selected, **When** the user views the prompt/instruction section, **Then** system instructions, investigator prompts, bias instructions for each agent, and arbiter prompts are each clearly distinguished in a scrollable container.

---

### User Story 3 — Junior → Senior Escalation Investigation (Priority: P2)

A demo presenter selects the Junior → Senior mode and launches an investigation. A junior agent (cheaper model) reviews the case first. If the junior's confidence exceeds a threshold, the result is returned directly. If below the threshold, the case escalates to a senior agent (premium model) who produces the final determination.

**Why this priority**: This mode demonstrates practical cost optimization and escalation patterns that are immediately relatable to enterprise audiences. It is slightly lower priority than Debate because it is less visually dramatic.

**Independent Test**: Can be tested by running Junior → Senior investigations on multiple cases and verifying that high-confidence cases return the junior result directly while low-confidence cases escalate to the senior agent.

**Acceptance Scenarios**:

1. **Given** Junior → Senior mode is selected and an investigation is launched, **When** the junior agent reviews the case, **Then** the junior produces a preliminary determination with a confidence score and reasoning summary.
2. **Given** the junior agent's confidence score exceeds the configured escalation threshold, **When** the workflow evaluates the result, **Then** the junior's result is returned as the final result and the senior agent is not invoked.
3. **Given** the junior agent's confidence score is below the escalation threshold, **When** escalation occurs, **Then** the senior agent receives the original case details and the junior's findings and produces a final determination using the shared output schema.
4. **Given** a Junior → Senior investigation completes via escalation, **When** the results are displayed, **Then** the user sees the junior's preliminary assessment, the escalation reason, and the senior's final determination.
5. **Given** a Junior → Senior investigation completes without escalation, **When** the results are displayed, **Then** the user sees the junior's result and a clear indication that the case did not require escalation.

---

### User Story 4 — Prompt & Instruction Visibility (Priority: P2)

A demo presenter wants to understand what instructions each agent receives. Within each mode panel, they can view the active prompts and instructions in a scrollable, code-style container. Different instruction types (system instructions, investigator prompts, arbiter prompts, bias instructions) are clearly distinguished.

**Why this priority**: Transparency into AI prompts is essential for demo credibility and educational value, but it is supportive of the core investigation flows rather than a prerequisite.

**Independent Test**: Can be tested by expanding the prompt viewer in each mode and verifying that all relevant prompts are displayed with clear labels.

**Acceptance Scenarios**:

1. **Given** any investigation mode is active, **When** the user opens the prompt/instruction viewer, **Then** the active prompts and instructions for that mode are displayed in a scrollable, code-style container.
2. **Given** the Debate mode prompt viewer is open, **When** the user reviews the instructions, **Then** bias instructions for the fraud-leaning agent, bias instructions for the non-fraud-leaning agent, and the arbiter prompt are each clearly labeled and distinguishable.
3. **Given** the Junior → Senior mode prompt viewer is open, **When** the user reviews the instructions, **Then** the junior investigator prompt and the senior investigator prompt are each clearly labeled.

---

### User Story 5 — Existing Modes Remain Unchanged (Priority: P1)

Single Agent and Consensus modes continue to function exactly as they do today. Their workflows, inputs, outputs, and UI behavior are preserved without regression.

**Why this priority**: Existing functionality must not break. The demo relies on these modes being stable for presentations.

**Independent Test**: Can be tested by running Single Agent and Consensus investigations on existing cases and verifying results match current behavior.

**Acceptance Scenarios**:

1. **Given** Single Agent mode is selected, **When** the user selects a model, configures temperature, and runs an investigation, **Then** the investigation completes and returns results using the shared output schema, identical to current behavior.
2. **Given** Consensus mode is selected, **When** the user runs a consensus investigation, **Then** three models run in parallel, the arbiter produces a final verdict, and results are displayed in the existing side-by-side format.

---

### Edge Cases

- What happens when a debate agent fails or times out while the other succeeds? The arbiter should still attempt to produce a verdict from available findings, noting the missing perspective.
- What happens when the junior agent in Junior → Senior mode returns a confidence score exactly at the threshold? The case should escalate (threshold is exclusive — confidence must exceed the threshold to skip escalation).
- What happens when the senior agent is unavailable in Junior → Senior mode? Return the junior's result with a note that escalation was attempted but the senior model was unavailable.
- What happens when all debate agents fail? Return an unavailable status consistent with the shared output schema.
- What happens if the user switches modes while an investigation is in progress? The in-progress investigation should be allowed to complete or be cancelled, and the UI should not show stale results from a different mode.

## Requirements *(mandatory)*

### Functional Requirements

#### Mode Framework

- **FR-001**: System MUST support exactly four investigation modes: Single Agent, Consensus, Debate, and Junior → Senior.
- **FR-002**: All investigation modes MUST return results conforming to a single, shared output schema that includes: determination/verdict, confidence, reasoning, evidence summary (key signals), and recommended next steps (recommended action).
- **FR-003**: All investigation modes MUST use the same case input format, the same available tools, and the same base prompt structure.

#### Debate Mode

- **FR-010**: System MUST support a Debate investigation mode with three agents: a fraud-leaning investigator, a non-fraud-leaning investigator, and an arbiter.
- **FR-011**: The fraud-leaning investigator MUST use modified instructions that bias the agent toward identifying possible fraud while using the same tools and case details as all other modes.
- **FR-012**: The non-fraud-leaning investigator MUST use modified instructions that bias the agent toward finding legitimate explanations and avoiding false positives while using the same tools and case details.
- **FR-013**: Both debate investigators MUST execute independently, in isolation, and in parallel before the arbiter runs.
- **FR-014**: The arbiter MUST receive the original case details and both investigators' findings (reasoning, evidence summary, and recommendation) and produce a final determination using the shared output schema. The arbiter MUST use a decisive tone — picking the stronger argument and committing to a verdict, consistent with the Consensus arbiter style.
- **FR-015**: The user MUST be able to select the model and temperature for Debate mode. The selected model applies to both debate agents and the arbiter.

#### Junior → Senior Mode

- **FR-020**: System MUST support a Junior → Senior investigation mode with two sequential agents: a junior investigator and a senior investigator.
- **FR-021**: The junior investigator MUST use a cheaper/faster model and produce a preliminary determination with a confidence score and reasoning summary.
- **FR-022**: If the junior investigator's confidence score exceeds a configurable escalation threshold, the system MUST return the junior's result directly without invoking the senior investigator.
- **FR-023**: If the junior investigator's confidence score does not exceed the escalation threshold, the system MUST escalate to the senior investigator, passing the original case details and the junior's findings.
- **FR-024**: The senior investigator MUST use the latest/highest-quality available model and produce the final determination using the shared output schema.
- **FR-025**: The escalation threshold MUST default to 0.85 (85% confidence) so that only very high-confidence junior results skip escalation and the majority of demo cases (~60-70%) showcase the full escalation pipeline.
- **FR-026**: Junior and senior models MUST be configured internally (not user-selectable). Temperature MUST remain configurable from the UI.

#### UI & Configuration

- **FR-030**: The UI MUST display all four investigation modes as a horizontal tab bar at the top of the AI Investigation panel, allowing single-click switching between modes.
- **FR-031**: Only the active mode's configuration panel and content MUST be visible; inactive mode panels MUST be hidden.
- **FR-032**: Each mode panel MUST expose relevant configuration controls:
  - Single Agent: selectable model, selectable temperature
  - Debate: selectable model, selectable temperature
  - Consensus: temperature control (models internally configured)
  - Junior → Senior: temperature control (models internally configured)
- **FR-033**: Each mode panel MUST include a prompt/instruction viewer displaying active prompts in a scrollable, code-style container with clear labels distinguishing instruction types (system instructions, investigator prompts, arbiter prompts, bias instructions).
- **FR-034**: Each mode MUST include visual differentiation (icons, labels, brief descriptions) that communicates its investigation strategy at a glance.

#### Backward Compatibility

- **FR-040**: Single Agent mode MUST continue to function identically to the current implementation, including model selection, temperature control, streaming tool traces, and result display.
- **FR-041**: Consensus mode MUST continue to function identically to the current implementation, including parallel model execution, arbiter reasoning, and side-by-side result display.

### Key Entities

- **Investigation Mode**: A named investigation strategy (Single Agent, Consensus, Debate, Junior → Senior) that defines the agent topology, execution flow, and configuration options.
- **Investigation Result**: The unified output from any investigation mode, containing verdict, confidence, reasoning, evidence summary, and recommended action.
- **Debate Agent**: An AI investigator with biased instructions (either fraud-leaning or non-fraud-leaning) that independently reviews a case before arbitration.
- **Arbiter**: An AI agent that evaluates findings from multiple investigators and produces a final, authoritative determination.
- **Escalation Threshold**: A configurable confidence score boundary that determines whether the Junior → Senior workflow returns the junior's result or escalates to the senior agent.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can select and switch between all four investigation modes within 2 seconds, with only the active mode's panel visible.
- **SC-002**: Debate mode investigations complete successfully, producing opposing viewpoints from two agents and a final arbiter verdict, at least 90% of the time when the underlying models are available.
- **SC-003**: Junior → Senior mode correctly escalates cases below the confidence threshold to the senior agent and returns junior results directly for cases above the threshold.
- **SC-004**: All four investigation modes return results conforming to the shared output schema, ensuring consistent downstream display and processing.
- **SC-005**: Existing Single Agent and Consensus mode functionality passes all current tests with no regressions.
- **SC-006**: A demo presenter can explain and demonstrate all four modes within a single case review, completing the full demonstration in under 10 minutes.
- **SC-007**: Prompt/instruction viewers for each mode correctly display all relevant agent instructions with clear labels distinguishing instruction types.

## Clarifications

### Session 2026-05-08

- Q: What confidence score threshold should trigger escalation in Junior → Senior mode? → A: 0.85 (85%) — generous enough to frequently trigger escalation during demos without making the junior agent seem pointless.
- Q: Should Debate and Junior → Senior results be persisted or transient? → A: Transient (like Consensus) — no persistence to the run repository, displayed in UI only.
- Q: Should the two debate agents run in parallel or sequentially? → A: Parallel — consistent with Consensus mode's pattern, halves wall-clock time.
- Q: What UI pattern should be used for mode selection? → A: Horizontal tab bar at the top of the AI Investigation panel — immediately visible, single-click switching, scales well to 4 items.
- Q: Should the Debate arbiter be decisive or balanced? → A: Decisive — pick the stronger argument, commit to a verdict, consistent with the Consensus arbiter style.

## Assumptions

- The existing Microsoft Foundry integration and AI model access will be reused for all new modes.
- The existing shared output schema (verdict, rationale, key signals, recommended action, tool trace) is sufficient for all modes and does not require breaking changes. Confidence scoring will be added as an optional field if not already present.
- The existing `IAiInvestigator` interface and `AgentInvestigator` implementation can be extended or wrapped to support biased prompts and sequential workflows.
- The demo is intended for presentation purposes, so occasional model failures are acceptable as long as the UI gracefully handles them.
- Debate and Junior → Senior mode results are transient (not persisted to the run repository), consistent with the Consensus mode pattern. Results are displayed in the UI only.
- The escalation threshold for Junior → Senior mode is a server-side configuration, not exposed for user adjustment in the UI.
- Models like "gpt-5.4-mini" are suitable as the junior model and "gpt-5.4" as the senior model, matching the existing model registry.
- The Debate mode's bias instructions are additive modifications to the existing base investigation prompt, not entirely separate prompts.
