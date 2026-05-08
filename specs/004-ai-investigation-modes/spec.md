# Feature Specification: AI Investigation Modes

**Feature Branch**: `004-ai-investigation-modes`  
**Created**: 2026-05-08  
**Status**: Draft  
**Input**: User description: "Add formal AI Investigation Modes to the fraud investigation demo framework."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Debate Mode Investigation (Priority: P1)

A demo presenter selects "Debate" mode from the investigation mode picker in the UI. They configure a model and temperature, then submit a fraud case for investigation. Two AI agents independently analyze the case — one biased toward identifying fraud, the other biased toward legitimate explanations. After both agents complete their independent reviews, an arbiter agent evaluates both arguments and produces a final determination using the shared output model. The presenter can view each agent's reasoning, evidence summary, and recommendation, as well as the arbiter's final verdict.

**Why this priority**: Debate mode is the most visually compelling new mode for demos, showcasing adversarial AI reasoning. It introduces the most novel architectural pattern (opposing bias instructions + arbitration) and provides the highest demo impact.

**Independent Test**: Can be fully tested by selecting Debate mode, submitting a case, and verifying that two opposing analyses and one arbiter determination are returned with the standard output schema.

**Acceptance Scenarios**:

1. **Given** a user is on the investigation page, **When** they select "Debate" mode, configure a model and temperature, and submit a case, **Then** the system runs two biased investigators and one arbiter, returning a final determination with confidence, reasoning, evidence summary, and recommended next steps.
2. **Given** the Debate mode is active, **When** the user views the mode panel, **Then** they can see the fraud-leaning prompt, the non-fraud-leaning prompt, and the arbiter prompt in scrollable code-style containers.
3. **Given** Debate mode is selected, **When** a case is submitted, **Then** Agent 1 (fraud-leaning) and Agent 2 (non-fraud-leaning) execute independently and in isolation before their findings are passed to the arbiter.

---

### User Story 2 - Junior → Senior Escalation Investigation (Priority: P1)

A demo presenter selects "Junior → Senior" mode. They configure a temperature and submit a case. A junior investigator (cheaper/faster model) reviews the case first and produces a preliminary determination with a confidence score. If the confidence exceeds a configurable threshold, the junior result is returned directly. If confidence is below the threshold, the case is escalated to a senior investigator (highest-quality model) who receives the original case details plus the junior findings and produces the final determination using the shared output model.

**Why this priority**: This mode demonstrates a cost-optimization and escalation pattern that is highly relevant to real-world AI deployment scenarios. It is equally important as Debate for feature completeness.

**Independent Test**: Can be fully tested by submitting cases that produce both high-confidence (no escalation) and low-confidence (escalation) outcomes, verifying correct routing behavior.

**Acceptance Scenarios**:

1. **Given** a user selects "Junior → Senior" mode and submits a case, **When** the junior investigator's confidence exceeds the escalation threshold, **Then** the junior result is returned directly as the final determination.
2. **Given** a user selects "Junior → Senior" mode and submits a case, **When** the junior investigator's confidence is below the escalation threshold, **Then** the case is escalated to the senior investigator who produces the final determination.
3. **Given** Junior → Senior mode is active, **When** the user views the mode panel, **Then** they can see the junior and senior prompts, and the escalation threshold is visible.

---

### User Story 3 - Mode Selection and UI Navigation (Priority: P2)

A demo presenter opens the investigation page and sees all four investigation modes clearly labeled: Single Agent, Consensus, Debate, and Junior → Senior. They can switch between modes easily. Only the active mode's configuration panel is visible; inactive mode panels are hidden. Each mode panel displays relevant model settings, temperature controls, and prompt/instruction visibility in scrollable containers.

**Why this priority**: The UI must support all modes with clear navigation and visual differentiation for the demo to be effective, but it builds upon the core mode logic.

**Independent Test**: Can be tested by navigating between all four modes and verifying that the correct configuration panel, prompts, and visual elements appear for each mode.

**Acceptance Scenarios**:

1. **Given** the user is on the investigation page, **When** they view the mode selector, **Then** all four modes (Single Agent, Consensus, Debate, Junior → Senior) are clearly labeled and selectable.
2. **Given** a mode is selected, **When** the user switches to a different mode, **Then** only the newly selected mode's configuration panel is visible and the previous mode's panel is hidden.
3. **Given** a mode panel is visible, **When** the user inspects it, **Then** it displays the active prompts/instructions in scrollable code-style containers, with clear labels distinguishing system instructions, investigator prompts, arbiter prompts, and bias instructions where applicable.

---

### User Story 4 - Visual Differentiation of Modes (Priority: P3)

Each investigation mode has a visually distinct presentation that explains its investigation strategy. Single Agent shows a simple investigator workflow. Consensus shows multiple investigators plus an arbiter. Debate shows opposing viewpoints plus a judge. Junior → Senior shows an escalation pipeline. Lightweight workflow visuals or icons help users quickly understand the strategy.

**Why this priority**: Visual differentiation enhances demo quality and comprehension but is a polish layer on top of functional mode support.

**Independent Test**: Can be tested by selecting each mode and verifying that distinct visual elements, icons, or workflow diagrams are displayed.

**Acceptance Scenarios**:

1. **Given** the user selects each mode in turn, **When** they view the mode panel, **Then** each mode displays a visually distinct workflow representation (e.g., icon, diagram, or label) that clearly communicates the investigation strategy.

---

### Edge Cases

- What happens when a Debate mode agent fails or times out? The system should return an error indicating which agent failed, without partial results.
- What happens when the Junior → Senior escalation threshold is set to 0% or 100%? At 0%, all cases escalate to senior. At 100%, no cases escalate.
- What happens when the user switches modes mid-investigation? Any in-progress investigation should be unaffected; mode switching only applies to new investigations.
- How does the system handle identical model selections across Debate agents? Both agents should still execute independently with their respective bias instructions.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support four investigation modes: Single Agent, Consensus, Debate, and Junior → Senior.
- **FR-002**: All investigation modes MUST return the same standardized output schema containing: determination, confidence, reasoning, evidence summary, and recommended next steps.
- **FR-003**: Debate mode MUST use three agents: a fraud-leaning investigator, a non-fraud-leaning investigator, and an arbiter.
- **FR-004**: Debate mode agents MUST execute independently and in isolation before their findings are passed to the arbiter.
- **FR-005**: Debate mode fraud-leaning agent MUST use modified instructions that bias it toward identifying possible fraud.
- **FR-006**: Debate mode non-fraud-leaning agent MUST use modified instructions that bias it toward finding legitimate explanations and avoiding false positives.
- **FR-007**: Debate mode arbiter MUST receive the original case details and both agents' findings, and produce a final determination using the shared output model.
- **FR-008**: Debate mode MUST allow the user to select a model and temperature, applied to all three agents.
- **FR-009**: Junior → Senior mode MUST use two sequential agents: a junior investigator (cheaper/faster model) followed by a conditional senior investigator (highest-quality model).
- **FR-010**: Junior → Senior mode MUST implement escalation logic based on a configurable confidence threshold.
- **FR-011**: Junior → Senior mode escalation threshold MUST be set to a relatively generous value so ambiguous cases are escalated frequently during demos.
- **FR-012**: Junior → Senior mode junior and senior models MUST be hardcoded/configured internally.
- **FR-013**: Junior → Senior mode MUST allow the user to configure temperature from the UI.
- **FR-014**: If the junior investigator's confidence exceeds the threshold, the system MUST return the junior result directly without invoking the senior investigator.
- **FR-015**: If the junior investigator's confidence is below the threshold, the system MUST escalate to the senior investigator, passing original case details and junior findings.
- **FR-016**: Single Agent and Consensus modes MUST remain functionally unchanged.
- **FR-017**: All modes MUST use the same case input format, prompt structure, tools, and output schema as existing modes.
- **FR-018**: The UI MUST display all four modes with clear labels and easy switching.
- **FR-019**: The UI MUST show only the active mode's configuration panel; inactive panels MUST be hidden.
- **FR-020**: Each mode panel MUST display active prompts/instructions in scrollable code-style containers.
- **FR-021**: Each mode panel MUST clearly distinguish system instructions, investigator prompts, arbiter prompts, and bias instructions where applicable.
- **FR-022**: Single Agent mode MUST expose selectable model and temperature controls.
- **FR-023**: Debate mode MUST expose selectable model and temperature controls.
- **FR-024**: Consensus mode models MUST be hardcoded internally, with optional temperature control.
- **FR-025**: Junior → Senior mode models MUST be hardcoded internally, with temperature configurable from the UI.
- **FR-026**: Each mode MUST have a visually distinct presentation that explains its investigation strategy.
- **FR-027**: The UI MUST use lightweight workflow visuals or icons to differentiate modes.

### Key Entities

- **Investigation Mode**: Represents a distinct AI investigation strategy (Single Agent, Consensus, Debate, Junior → Senior). Each mode defines its agent configuration, prompt structure, and execution flow.
- **Agent**: An AI investigator instance within a mode. Characterized by its role (e.g., fraud-leaning, non-fraud-leaning, junior, senior, arbiter), instructions, model assignment, and temperature.
- **Investigation Result**: The standardized output produced by any mode, containing determination, confidence, reasoning, evidence summary, and recommended next steps.
- **Escalation Threshold**: A configurable confidence value used in Junior → Senior mode to determine whether to return the junior result or escalate to the senior investigator.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can select and run all four investigation modes from the UI within 3 clicks of reaching the investigation page.
- **SC-002**: All four modes return results conforming to the same standardized output schema with no missing fields.
- **SC-003**: Debate mode produces three distinct agent outputs (two opposing analyses and one arbiter verdict) visible to the user.
- **SC-004**: Junior → Senior mode correctly routes cases based on the escalation threshold — returning junior results for high-confidence cases and escalating for low-confidence cases in at least 90% of test runs.
- **SC-005**: Mode switching in the UI hides all inactive mode panels and displays only the selected mode's configuration within 1 second.
- **SC-006**: Each mode panel displays all relevant prompts and instructions in scrollable containers without truncation.
- **SC-007**: Demo presenters can understand each mode's investigation strategy within 10 seconds of viewing the mode panel, aided by visual workflow representations.
- **SC-008**: Existing Single Agent and Consensus mode functionality remains unchanged after the addition of new modes, verified by existing test cases passing.

## Assumptions

- The existing shared output model/schema already includes fields for determination, confidence, reasoning, evidence summary, and recommended next steps — or can be extended without breaking existing modes.
- The existing tool infrastructure (case input, prompts, tools) is reusable across all new modes without modification.
- The demo environment has access to multiple AI models (including cheaper/faster models for junior and high-quality models for senior/arbiter roles).
- Junior → Senior escalation threshold defaults to a generous value (e.g., 85% confidence) to ensure frequent escalation during demos; this value is configurable.
- Debate mode agents use the same underlying model by default (as selected by the user), differentiated only by their bias instructions.
- Consensus mode model configuration remains internal and is not affected by this feature.
- The existing UI framework supports tabbed or segmented mode selection patterns.
- Performance is acceptable for demo purposes; production-level scaling and latency optimization are out of scope.
