# Feature Specification: AI Agent Tools for Fraud Investigation

**Feature Branch**: `003-agent-tools`
**Created**: 2026-05-08
**Status**: Draft
**Input**: User description: "Give AI investigation agents two tools: (1) a data retrieval tool to query the full Run from Azure Storage with filtering/slicing, and (2) Microsoft Foundry's Python Code Interpreter for complex analysis. Update system prompts to explain and encourage tool use. Show tool invocations and reasoning in the UI. The arbiter agent does NOT get tools — it only reasons over other agents' results."

## Clarifications

### Session 2026-05-08

- Q: Should the 30s investigation timeout be extended for tool-augmented investigations? → A: Yes, extend to 60s for tool-augmented investigations to accommodate multiple tool calls (data retrieval + Code Interpreter).
- Q: How should the data retrieval tool manage context budget given large payloads? → A: Default to compact summaries (record count, aggregates, top-N records by anomaly score); agent can request full records in a follow-up call using a `detail` parameter.
- Q: Should the data retrieval tool be an HTTP endpoint or an in-process function? → A: Both — expose as an HTTP endpoint (the agent framework calls it via function-calling over HTTP), which also makes it available for future cross-service use. An in-process optimization can be added later. The Run is NOT held in memory in Azure Functions across requests; however, within a single investigation, the Run loaded by `InvestigateAsync` MAY be passed to the tool via closure to avoid redundant blob reads during the agent's tool-calling loop.
- Q: Should the spec mandate Code Interpreter provisioning or make it best-effort? → A: Mandate provisioning in Bicep — add the required Foundry Agent/Hub resources. The project owner will assist with any portal-side provisioning steps if needed.
- Q: Should the tool trace capture the model's intermediate reasoning between tool calls, or just inputs/outputs? → A: Capture everything the framework exposes — intermediate reasoning messages between tool calls if available, plus all tool call inputs and outputs.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Agent retrieves Run data to deepen investigation (Priority: P1)

When the presenter triggers an AI investigation (single-model or consensus),
each investigator agent can autonomously call a data retrieval tool to pull
additional context from the full Run stored in Azure Storage. For example,
the agent might request all expenses from the same vendor across the entire
dataset, or fetch the employee's full 90-day history filtered by category.
The tool returns decompressed, filtered JSON so the agent can reason over a
richer slice of data than the initial prompt provides. The agent may call
the tool multiple times in a single investigation to progressively refine
its analysis.

**Why this priority**: Without data retrieval, the agent is limited to the
fixed context injected into the prompt. Giving it the ability to pull
additional slices of the Run data makes investigations dramatically more
insightful and mirrors how a real fraud analyst works — starting with an
alert and drilling into the data.

**Independent Test**: The presenter invokes "Investigate with AI" on a
case. In the UI, the tool-use trace shows the agent called the data
retrieval tool at least once (e.g., "Fetched 12 expenses from vendor
OffshoreLLC"), and the agent's rationale references data from that tool
call (not just the initial prompt context).

**Acceptance Scenarios**:

1. **Given** an AI investigation is triggered on a case, **When** the agent
   decides it needs more data, **Then** it calls the Run data retrieval tool
   with filter parameters (e.g., `employeeId`, `vendor`, `category`,
   `dateRange`, `band`) and receives a filtered subset of the Run's expense
   records, detection results, and employee data as readable JSON.
2. **Given** the agent calls the data retrieval tool, **When** the tool
   returns results, **Then** the agent incorporates the retrieved data into
   its reasoning and the final rationale references specific findings from
   the tool call.
3. **Given** the agent calls the data retrieval tool multiple times in one
   investigation, **When** each call uses different filter parameters,
   **Then** each call returns the correct filtered subset and the agent
   builds a cumulative analysis across calls.
4. **Given** the data retrieval tool is called with filters that match zero
   records, **When** the tool returns an empty result, **Then** the agent
   handles this gracefully and notes the absence of matching data in its
   reasoning.

---

### User Story 2 — Agent runs Python code to perform complex analysis (Priority: P2)

When the agent determines that a quantitative analysis would strengthen its
investigation (e.g., computing statistical outlier scores, running a custom
comparison across vendor categories, or calculating temporal patterns), it
can invoke the Microsoft Foundry Python Code Interpreter tool. The agent
writes Python code, the code executes in a sandboxed environment, and the
output is returned to the agent for incorporation into its verdict.

**Why this priority**: The Code Interpreter unlocks analysis that cannot be
expressed in natural language alone — statistical tests, custom aggregations,
temporal pattern detection. This is the differentiator that makes the AI
investigation feel like a real analyst rather than a summarizer.

**Independent Test**: The presenter invokes an investigation on a case with
ambiguous signals. In the UI tool trace, the agent called the Code
Interpreter (e.g., "Executed Python: computed Benford's Law digit
distribution for vendor"), and the rationale cites a quantitative finding
from the code execution.

**Acceptance Scenarios**:

1. **Given** an AI investigation is triggered, **When** the agent decides a
   quantitative analysis would help, **Then** it writes Python code and
   submits it to the Foundry Code Interpreter tool, which executes the code
   in a sandboxed environment and returns the output.
2. **Given** the Code Interpreter returns output (text, numbers, or error
   messages), **When** the agent processes the result, **Then** it
   incorporates the findings into its rationale and key signals.
3. **Given** the Code Interpreter execution fails (syntax error, timeout,
   or sandbox restriction), **When** the error is returned to the agent,
   **Then** the agent acknowledges the failure in its reasoning and
   continues the investigation without the code result — the investigation
   does not fail entirely.

---

### User Story 3 — UI displays tool invocation trace and reasoning (Priority: P2)

When an investigation completes, the case detail UI shows not just the final
verdict and rationale but also a trace of every tool the agent invoked during
the investigation — what it requested, what it got back, and how it reasoned
about the results. This transparency lets the presenter walk the audience
through the agent's decision-making process step by step.

**Why this priority**: Tool use is only impressive if the audience can see
it happening. Without the trace, the tools are invisible and the demo loses
its "open the hood" appeal.

**Independent Test**: After an investigation that used at least one tool,
the case detail view shows a collapsible "Agent Reasoning Trace" section
with timestamped entries showing each tool call, its parameters, a summary
of the response, and the agent's interpretation.

**Acceptance Scenarios**:

1. **Given** an investigation used the data retrieval tool, **When** the
   presenter views the case detail, **Then** the tool trace section shows:
   the tool name, the filter parameters sent, the number of records
   returned, and a snippet of the agent's reasoning about the results.
2. **Given** an investigation used the Code Interpreter, **When** the
   presenter views the case detail, **Then** the tool trace shows: the
   Python code submitted, the execution output (truncated if long), and the
   agent's interpretation of the results.
3. **Given** an investigation used no tools (the agent decided the initial
   context was sufficient), **When** the presenter views the case detail,
   **Then** the tool trace section shows "No tools invoked — agent used
   initial context only" or is absent.
4. **Given** a consensus investigation ran 3 models, **When** the presenter
   views the consensus results, **Then** each model's panel shows its own
   independent tool trace.

---

### User Story 4 — System prompts guide agents to use tools effectively (Priority: P1)

The system prompt for every investigator agent (across all labs) is updated
to describe the available tools, explain when and why to use them, and
encourage their use. The agent should understand that it can retrieve
additional Run data and execute Python analysis, and should be prompted to
do so when the initial context is ambiguous.

**Why this priority**: Co-equal with Story 1 — tools are useless if the
agent doesn't know they exist or isn't motivated to use them. The system
prompt is the primary lever for tool adoption.

**Independent Test**: When an agent is invoked on a case with ambiguous
signals (e.g., a Medium-band case with mixed z-scores), it uses at least
one tool in the majority of investigations.

**Acceptance Scenarios**:

1. **Given** the system prompt is loaded for an investigator agent, **When**
   the prompt is inspected (via "Preview AI prompt"), **Then** it contains
   descriptions of both available tools (data retrieval and Code
   Interpreter), including example use cases and guidance on when to use
   each.
2. **Given** the arbiter agent's system prompt, **When** inspected, **Then**
   it does NOT contain tool descriptions and does NOT instruct the arbiter
   to use tools — the arbiter only reasons over the other agents' results.

---

### Edge Cases

- **Tool timeout**: If the data retrieval tool or Code Interpreter takes
  longer than 15 seconds, the agent should abandon that tool call and
  continue the investigation with available context. The overall
  investigation timeout is **60 seconds** for tool-augmented investigations
  (extended from the base 30s in spec 001 to accommodate multiple tool calls).
- **Large data slices**: If the agent requests a filter that matches
  thousands of records, the tool should truncate to a configurable maximum
  (e.g., 500 records) and indicate truncation in the response.
- **Code Interpreter unavailability**: If the Foundry Code Interpreter is
  not provisioned or fails to initialize, the agent should still function
  with only the data retrieval tool — the investigation should not fail.
- **Sensitive data in Code Interpreter**: The Code Interpreter must not
  receive ground-truth labels (`IsInjectedFraud`, `InjectedPattern`) — the
  same data-model invariant from spec 001 applies to tool inputs.
- **Recursive tool calls**: The agent should be limited to a maximum number
  of tool calls per investigation (e.g., 10) to prevent runaway loops.
- **Lab-specific endpoints**: The data retrieval tool endpoint is specific
  to each lab (Expenses lab for now). Future labs will have their own
  endpoints with lab-specific schemas and filter parameters.

## Requirements *(mandatory)*

### Functional Requirements

#### Data Retrieval Tool

- **FR-001**: The system MUST provide a data retrieval tool that AI
  investigator agents can invoke to query the full Run from Azure Storage.
  The tool MUST decompress the gzip JSON blob and return human-readable
  JSON to the agent.
- **FR-002**: The data retrieval tool MUST accept filter parameters to
  return only a slice of the data. For the Expenses lab, supported filters
  MUST include: `employeeId`, `vendor`, `category`, `band` (confidence
  band), `dateRange` (start/end), `minAmount` / `maxAmount`, `limit`
  (max records returned, default 100, max 500), and `detail` (boolean,
  default false). When `detail` is false, the tool returns a **compact
  summary**: total match count, aggregate statistics (mean/median/min/max
  amount, distinct vendors, distinct categories), and the top 10 records
  ranked by anomaly confidence score. When `detail` is true, the tool
  returns full records up to `limit`.
- **FR-003**: The tool MUST be exposed as a dedicated HTTP endpoint
  specific to each lab (e.g., `/api/runs/{runId}/tools/expenses/query`).
  The agent framework invokes it via function-calling over HTTP. The
  endpoint is also available for future cross-service use. The endpoint
  MUST load the Run from Azure Blob Storage (decompressing the gzip blob)
  on each call — the Run is NOT assumed to be held in memory.
- **FR-004**: The tool response MUST include: a metadata object with
  total match count, returned count, truncated flag, and whether the
  response is compact or detailed. In **compact mode** (default): aggregate
  statistics and top-N records by anomaly score. In **detail mode**: full
  matching expense records (with amounts, vendors, categories, dates),
  associated employee profiles, and associated detection results
  (confidence scores, bands, contributing features).
- **FR-005**: The tool MUST NOT include `IsInjectedFraud` or
  `InjectedPattern` in any response — the same data-model invariant from
  the Expenses lab spec applies. This applies to both the data retrieval
  tool responses AND any data the agent passes to the Code Interpreter
  via tool calls. The system MUST strip these fields before they can
  reach any tool input.
- **FR-006**: The agent MUST be able to call the data retrieval tool
  multiple times within a single investigation, with different filter
  parameters each time.

#### Code Interpreter Tool

- **FR-007**: The system MUST integrate Microsoft Foundry's Python Code
  Interpreter as a tool available to investigator agents. The agent writes
  Python code, submits it to the Code Interpreter, and receives the
  execution output.
- **FR-008**: The Code Interpreter tool MUST execute in a sandboxed
  environment provided by Microsoft Foundry. The required Foundry
  infrastructure (AI Hub, Agent setup, or equivalent) MUST be provisioned
  via Bicep templates as part of the deployment. If the Code Interpreter
  requires portal-side provisioning steps that cannot be automated in
  Bicep, these MUST be documented in `docs/setup.md`.
- **FR-009**: If the Code Interpreter is unavailable (not provisioned,
  quota exceeded, or initialization failure), the investigation MUST
  continue without it. The agent should note the unavailability and proceed
  with the data retrieval tool and initial context only.

#### Agent Framework Integration

- **FR-010**: Both tools MUST be registered with the Microsoft Agent
  Framework's function-calling mechanism so the agent can invoke them
  autonomously during an investigation. The agent decides when and whether
  to use each tool.
- **FR-011**: Tool definitions (name, description, parameter schema) MUST
  be included in the agent configuration for every investigator agent
  across all labs. The arbiter agent MUST NOT have any tools registered.
- **FR-012**: Each tool invocation MUST be logged with: tool name,
  parameters sent, response summary (record count or output length),
  latency, and success/failure status.
- **FR-013**: The maximum number of tool calls per investigation MUST be
  configurable (default: 10). If the agent exceeds this limit, the
  framework should stop tool execution and prompt the agent to finalize
  its verdict with available context.
- **FR-021**: The investigation timeout MUST be extended to **60 seconds**
  for tool-augmented investigations (up from the base 30s) to accommodate
  multiple tool calls. Individual tool calls should target < 5 seconds
  each, with a 15-second hard cap per tool call.

#### System Prompt Updates

- **FR-014**: The investigator agent system prompt MUST describe both
  available tools with: tool name, what it does, parameter schema, example
  use cases, and guidance on when to use each tool.
- **FR-015**: The system prompt MUST encourage tool use — specifically
  stating that the agent should use the data retrieval tool to examine
  broader patterns and the Code Interpreter for quantitative analysis when
  signals are ambiguous.
- **FR-016**: The arbiter agent system prompt MUST NOT mention or
  encourage tool use. It should only reference the individual model
  results it receives as input.

#### UI Tool Trace

- **FR-017**: The AI investigation result returned to the frontend MUST
  include a structured tool trace: an ordered list of tool invocations
  with tool name, parameters, response summary, and the agent's
  interpretation of each result. The trace MUST also capture any
  intermediate reasoning messages the model produces between tool calls
  (if the Agent Framework exposes them). If the framework does not expose
  intermediate reasoning, the trace includes only tool call inputs and
  outputs alongside the final rationale.
- **FR-018**: The case detail UI MUST render the tool trace as a
  collapsible section within the AI verdict panel. Each tool invocation
  should be displayed as a distinct step with clear visual hierarchy.
- **FR-019**: For consensus investigations, each model's panel MUST
  display its own independent tool trace.
- **FR-020**: If the Code Interpreter was used, the UI MUST display the
  submitted Python code in a code block and the execution output (truncated
  with "show more" if over 500 characters).

### Key Entities

- **ToolInvocation**: A single tool call made by an agent during an
  investigation. Contains: tool name, parameters (JSON), response summary,
  response data (truncated), latency, success/failure status, and the
  agent's stated reasoning for making the call.
- **ToolTrace**: An ordered list of `ToolInvocation` entries for a single
  agent investigation. Attached to the `AiInvestigationResult`.
- **RunDataQuery**: The filter parameters for the data retrieval tool.
  Lab-specific — the Expenses lab query includes `employeeId`, `vendor`,
  `category`, `band`, `dateRange`, `minAmount`, `maxAmount`, `limit`.
- **RunDataQueryResult**: The tool response containing filtered records,
  associated employees and detection results, plus metadata (total count,
  returned count, truncated flag).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: When investigating a Medium-band case with ambiguous signals,
  the agent uses at least one tool in at least 70% of investigations
  (measured over 20 consecutive investigations with default temperature).
- **SC-002**: Investigation quality improves with tools — agents with tool
  access produce rationales that reference specific data points from tool
  calls (vendor patterns, employee history, statistical findings) rather
  than generic observations.
- **SC-003**: The data retrieval tool responds within 2 seconds for filters
  matching up to 500 records from a 5,000-record Run.
- **SC-004**: The complete tool-augmented investigation (including tool
  calls) completes within the **60-second** timeout (FR-021) in at least 90%
  of cases.
- **SC-005**: The UI tool trace is visible and understandable to a
  non-technical demo audience — each step shows what the agent did, what
  it found, and why it matters.
- **SC-006**: The arbiter agent never invokes tools — verified by
  inspecting consensus results across 10 investigations.

## Assumptions

- **Microsoft Foundry Code Interpreter provisioning**: The Code
  Interpreter requires Foundry Agent/Hub infrastructure beyond the
  existing AI Services account. The required resources MUST be provisioned
  in Bicep. Any portal-side steps that cannot be automated will be handled
  by the project owner and documented in `docs/setup.md`.
- **Existing infrastructure reuse**: The data retrieval tool reads from the
  same Azure Blob Storage container (`runs/`) already provisioned for the
  Expenses lab. No new storage resources are needed.
- **Agent Framework tool support**: The Microsoft Agent Framework GA
  (`Microsoft.Agents.AI`) supports function-calling / tool registration.
  The agent autonomously decides tool invocations based on the conversation
  context and tool definitions.
- **Cross-lab applicability**: The tool registration pattern is designed to
  be reusable across all labs. Each lab provides its own data retrieval
  endpoint with lab-specific filter schemas, but the Code Interpreter tool
  is shared across all labs.
- **No tool use for arbiter**: The arbiter agent operates solely on the
  outputs of the other agents. It does not have tool access and does not
  need it — its job is meta-reasoning, not primary investigation.
- **Existing investigation timeout**: The investigation timeout is
  extended to **60 seconds** for tool-augmented investigations (up from
  30s in spec 001) to accommodate multiple tool calls. Individual tool
  calls should target < 5 seconds each.
- **Scope**: This spec covers tool integration for the Expenses lab as the
  first implementation. Future labs will follow the same pattern with
  lab-specific data retrieval endpoints.
