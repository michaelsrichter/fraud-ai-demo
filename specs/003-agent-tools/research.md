# Phase 0 — Research

**Feature**: AI Agent Tools for Fraud Investigation
**Date**: 2026-05-08
**Inputs**: [spec.md](./spec.md), [plan.md](./plan.md), [Constitution v1.1.0](../../.specify/memory/constitution.md)

---

## R1. Microsoft Agent Framework — Tool/Function-Calling in C#

**Decision**: Use `AIFunctionFactory.Create()` from `Microsoft.Extensions.AI`
to register tools as `AIFunction` instances. Pass them via `ChatOptions.Tools`
when invoking the `ChatClientAgent`.

**How it works**:
- `AIFunctionFactory.Create(Delegate, name, description)` wraps a C# method
  as an `AIFunction` that the model can call via function-calling.
- The agent framework handles the tool-calling loop: model requests a tool
  call → framework executes the function → result is sent back to the model
  → model continues reasoning.
- `ChatOptions.ToolMode = ChatToolMode.Auto` lets the model decide when to
  use tools.

**Trace capture**: After `agent.RunAsync()`, the response contains the full
conversation history including tool call messages (`ChatMessage` with
`Role = Tool`). These can be iterated to build the `ToolTrace`.

**Alternatives considered**:
- **Custom HTTP-based tool dispatch**: Would require the agent to call an
  HTTP endpoint for each tool, adding network latency. In-process is faster
  and the Run data is already loaded.
- **OpenAI Assistants API tools**: Different API surface, not compatible with
  `ChatClientAgent` from `Microsoft.Agents.AI`.

---

## R2. Foundry Toolbox MCP Connection in C#

**Decision**: Use the C# `ModelContextProtocol` NuGet package (GA) to connect
to the Foundry Toolbox MCP endpoint. The toolbox exposes the Code Interpreter
as an MCP tool that the agent can invoke.

**Connection pattern** (adapted from Python reference):
```csharp
var tokenProvider = new AzureTokenProvider(credential, "https://ai.azure.com/.default");
var httpClient = new HttpClient(new BearerTokenHandler(tokenProvider));
var mcpClient = new McpClient(toolboxUrl, httpClient);
await mcpClient.ConnectAsync();
var tools = await mcpClient.ListToolsAsync(); // Returns AITool[]
```

**Toolbox URL**:
```
{projectEndpoint}/toolboxes/{toolboxName}/versions/{version}/mcp?api-version=v1
```

**Auth**: Bearer token from `DefaultAzureCredential` with scope
`https://ai.azure.com/.default`. Injected via a custom `DelegatingHandler`
on the `HttpClient`, mirroring the Python `_ToolboxAuth` pattern.

**Graceful degradation**: If `McpClient.ConnectAsync()` fails, log a warning
and proceed with only the data retrieval tool. The agent's system prompt
will note that the Code Interpreter is unavailable.

**Alternatives considered**:
- **Direct REST calls to Code Interpreter API**: More brittle, requires
  hand-rolling the tool schema. MCP SDK handles this.
- **Python sidecar for Code Interpreter**: Violates the .NET-only constraint
  and adds deployment complexity.

---

## R3. Data Retrieval Tool — Compact vs Detail Mode

**Decision**: The data retrieval tool supports two modes controlled by the
`detail` boolean parameter:

**Compact mode** (default, `detail=false`):
```json
{
  "metadata": { "totalMatches": 47, "returnedCount": 10, "truncated": true, "mode": "compact" },
  "aggregates": {
    "meanAmount": 542.30,
    "medianAmount": 423.15,
    "minAmount": 12.50,
    "maxAmount": 2150.00,
    "distinctVendors": 8,
    "distinctCategories": 4,
    "distinctEmployees": 12
  },
  "topRecords": [ /* top 10 by anomaly confidence score */ ]
}
```

**Detail mode** (`detail=true`):
```json
{
  "metadata": { "totalMatches": 47, "returnedCount": 47, "truncated": false, "mode": "detail" },
  "records": [ /* full expense records with employee + detection */ ]
}
```

**Rationale**: Compact mode keeps token usage low (~500 tokens for 10 records
vs ~5000 for 100 full records). The agent can request compact first to
understand the landscape, then drill into details for specific subsets.

---

## R4. Investigation Timeout Extension

**Decision**: Extend the `CancellationTokenSource` timeout from 30s to 60s
when tools are registered. The timeout is set in `AgentInvestigator` based
on whether tools are available.

**Individual tool call timeout**: Each tool function wrapper includes a
15-second timeout. If the tool takes longer, it returns a timeout error
message to the agent (not an exception), so the agent can continue.

**Max tool calls**: A counter in the tool wrapper increments on each call.
After 10 calls (configurable), the wrapper returns "Maximum tool calls
reached. Please finalize your verdict with available information." This
is a soft limit — the agent can still produce its verdict.

---

## R5. Foundry Infrastructure — Project + Toolbox Provisioning

**Decision**: The Foundry Toolbox requires:
1. An AI Hub (`Microsoft.MachineLearningServices/workspaces` kind `Hub`)
2. A Foundry Project linked to the Hub + AI Services account
3. A Toolbox with Code Interpreter tool

**Bicep approach**: If the `Microsoft.MachineLearningServices` Bicep API
supports toolbox creation, provision everything in Bicep. If toolbox
creation requires the portal or CLI, document the manual steps in
`docs/setup.md` and automate as much as possible in Bicep.

**App settings** (added to `functions.bicep`):
```
Foundry__ProjectEndpoint = foundryProject.properties.endpoint
Foundry__ToolboxName = 'fraud-ai-tools'
Foundry__ToolboxVersion = '1'
```

**Alternatives considered**:
- **Skip Bicep, use portal only**: Violates Constitution I (all infra in Bicep)
- **Use AI Services directly without Hub/Project**: Code Interpreter is only
  available through the Foundry Project/Toolbox path

---

## Outstanding NEEDS CLARIFICATION

None. All Technical Context items are resolved.

---

## R6. SSE Streaming from Azure Functions (.NET Isolated Worker)

**Decision**: Use `HttpResponseData` with chunked transfer encoding to
implement Server-Sent Events from a new streaming endpoint.

**Implementation pattern**:
1. New endpoint: `POST /api/runs/{runId}/cases/{caseId}/investigate/stream`
2. Set response headers: `Content-Type: text/event-stream`,
   `Cache-Control: no-cache`, `Connection: keep-alive`
3. Write SSE-formatted events (`data: {...}\n\n`) to the response body stream
   as tool invocations complete
4. Flush after each event to ensure immediate delivery
5. Write a final `event: complete` with the full `AiInvestigationResult`
6. Close the stream

**Why this works**: Azure Functions .NET isolated worker supports streaming
HTTP responses via the writable `HttpResponseData.Body` stream. Azure
Functions Flex Consumption supports long-running HTTP requests (up to 230s
default timeout), which exceeds our 60s investigation timeout.

**Rationale**:
- No new packages required — `HttpResponseData` with `Stream` is built-in
- SSE is simpler than WebSocket for unidirectional server→client streaming
- The existing non-streaming endpoint remains for backward compatibility

**Alternatives considered**:
1. **WebSocket**: More complex to set up in Azure Functions; requires
   persistent connection management; overkill for unidirectional streaming
2. **Polling**: Client polls a status endpoint every N seconds; simpler but
   adds latency and doesn't meet the "real-time" clarification requirement
3. **Azure SignalR Service**: Full-featured but adds infrastructure for a
   single use case

---

## R7. SSE Event Format and Frontend Consumption

**Decision**: Named SSE events with JSON payloads, consumed via `fetch` +
`ReadableStream` (not `EventSource`, which only supports GET).

**Event types**:
- `event: tool_call\ndata: {toolInvocation JSON}\n\n` — after each tool call
- `event: complete\ndata: {AiInvestigationResult JSON}\n\n` — final result
- `event: error\ndata: {error JSON}\n\n` — if investigation fails

**Frontend consumption**:
```typescript
async function streamInvestigation(
  runId: string, caseId: string, options: InvestigateOptions,
  onToolCall: (inv: ToolInvocation) => void,
  onComplete: (result: AiInvestigationResult) => void,
  onError: (err: Error) => void
): Promise<void> {
  const res = await fetch(`/api/runs/${runId}/cases/${caseId}/investigate/stream`, {
    method: 'POST', body: JSON.stringify(options), headers: { 'Content-Type': 'application/json' }
  });
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  // Parse SSE frames by splitting on \n\n boundaries
  // Dispatch by event type
}
```

**Rationale**: `EventSource` API only supports GET requests; our endpoint
requires POST with a JSON body. `fetch` + `ReadableStream` is supported in
all modern browsers and handles POST naturally.

---

## R8. Callback Mechanism for Tool Event Streaming

**Decision**: Add `IProgress<ToolInvocation>` parameter to `InvestigateAsync`.

**Pattern**:
- `InvestigateAsync(..., IProgress<ToolInvocation>? progress = null, ...)`
- Inside each tool delegate, after recording the invocation, call
  `progress?.Report(invocation)`
- SSE endpoint creates a `Progress<ToolInvocation>` that writes to the
  response stream
- Existing non-streaming endpoint passes `null` — no behavior change

**Rationale**: `IProgress<T>` is idiomatic .NET for progress reporting.
Optional parameter preserves backward compatibility. Thread-safe by design.

**Alternatives considered**:
1. `Action<ToolInvocation>` callback — less idiomatic
2. `IObservable<ToolInvocation>` — requires Rx, overkill
3. `Channel<ToolInvocation>` — good for producer-consumer but adds complexity

---

## R9. Consensus Investigation Streaming

**Decision**: Defer consensus SSE streaming to a future iteration.

The consensus endpoint runs 3 models in parallel + arbiter sequentially.
Streaming 3 interleaved tool traces requires multiplexing with model IDs —
significantly more complex. For this spec:
- Single-model investigation: SSE streaming (new)
- Consensus investigation: Return full result post-completion (existing)
- The frontend already renders per-model tool traces in consensus results

**Rationale**: Consensus is used less frequently; the audience sees individual
model streaming first, then consensus as a reveal. Model-multiplexed SSE can
be added later by extending the event schema with a `modelId` field.

---

## R10. Existing Infrastructure Completeness Audit

| Requirement | Status | Gap |
|---|---|---|
| FR-001–FR-006: Data retrieval tool | ✅ Built | `RunDataQueryService` + in-process tool |
| FR-007–FR-009: Code Interpreter | ✅ Built | `FoundryToolboxClient` via MCP |
| FR-010–FR-013: Agent framework | ✅ Built | Tool registration, limits, logging |
| FR-014–FR-016: System prompts | ✅ Built | Investigator has tools, arbiter does not |
| FR-017: Tool trace + **streaming** | ⚠️ Gap | Trace collected but **no SSE streaming** |
| FR-018: UI trace + **progressive** | ⚠️ Gap | `ToolTracePanel` renders post-completion only |
| FR-019–FR-020: Consensus + Code UI | ✅ Built | Per-model traces, Python code blocks |
| FR-021: 60s timeout | ✅ Built | `ToolAugmentedTimeoutBudget` |

**Key implementation gaps**:
1. SSE streaming endpoint for single-model investigation (FR-017)
2. `IProgress<ToolInvocation>` callback in `AgentInvestigator` (FR-017)
3. Frontend SSE client consuming the stream (FR-017)
4. Progressive `ToolTracePanel` rendering during investigation (FR-018)
5. Standalone HTTP endpoint for data retrieval tool (FR-003, future use)
