# Implementation Plan: AI Agent Tools for Fraud Investigation

**Branch**: `003-agent-tools` | **Date**: 2026-05-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-agent-tools/spec.md`

## Summary

Extend the existing AI fraud investigation agents with two tools:

1. **Run Data Retrieval Tool** — a lab-specific HTTP endpoint
   (`/api/runs/{runId}/tools/expenses/query`) that loads the compressed Run
   blob from Azure Storage, decompresses it, applies filters (employee, vendor,
   category, band, date range, amount range), and returns either a compact
   summary (default: aggregates + top-10 by anomaly score) or full filtered
   records (via `detail=true`). Registered as a function-calling tool with the
   Microsoft Agent Framework so the agent can invoke it autonomously.

2. **Code Interpreter Tool** — Microsoft Foundry's Python Code Interpreter,
   accessed via a **Foundry Toolbox** exposed as an MCP (Model Context Protocol)
   endpoint. The C# agent connects to the toolbox using `MCPStreamableHTTPTool`
   (ported from the Python reference pattern), which lets the model write and
   execute Python code in a sandboxed environment for statistical analysis,
   pattern detection, and data visualization.

Both tools are registered with every investigator agent but NOT the arbiter.
The system prompt is updated to describe tools and encourage their use. All
tool invocations are captured in a structured `ToolTrace` returned to the
frontend, which renders them in a collapsible "Agent Reasoning Trace" panel.

## Technical Context

**Language/Version**:
- Backend: C# / .NET 9.0 (Azure Functions isolated worker) — same as spec 001
- Frontend: TypeScript 5.x on React 18 with Vite 5

**Primary Dependencies** (new for this feature):
- Backend: `Microsoft.Agents.AI.Tools` (GA — function-calling tool registration),
  `ModelContextProtocol` (C# MCP SDK for Foundry toolbox connection),
  existing `Azure.Storage.Blobs` for Run data retrieval
- Frontend: no new deps — uses existing React components + recharts

**Existing Dependencies** (unchanged):
- `Microsoft.Agents.AI`, `Microsoft.Agents.AI.OpenAI`, `Azure.Identity`,
  `Azure.Storage.Blobs`, `Azure.Data.Tables`, `Microsoft.ML`

**Storage**: No new storage resources. Data retrieval tool reads from the
existing `runs/` blob container.

**Testing**:
- Backend: `xunit` + `Moq` + `FluentAssertions` (same pattern)
- Frontend: `vitest` + `@testing-library/react`

**Target Platform**: Same as spec 001 — Azure Functions Flex Consumption +
Azure Static Web Apps + Microsoft Foundry AI Services

**Project Type**: Extension to existing web application

**Performance Goals**:
- Data retrieval tool: < 2s for 500 records from a 5,000-record Run (SC-003)
- Full tool-augmented investigation: ≤ 60s (FR-021, extended from 30s)
- Individual tool call: < 5s target, 15s hard cap

**Constraints**:
- Managed Identity + RBAC only (Constitution IV)
- GA Agent Framework only (Constitution III) — MCP toolbox is GA in Foundry
- No ground-truth labels in tool responses (FR-005)
- Arbiter agent: NO tools (FR-011, FR-016)
- Max 10 tool calls per investigation (FR-013)

## Constitution Check

| # | Principle | Status | How this plan satisfies it |
|---|---|---|---|
| I | Platform & Deployment | **PASS** | New endpoint is an Azure Function; Foundry Toolbox provisioned in Bicep |
| II | Source Control & CI/CD | **PASS** | Same CI pipeline; new tests added |
| III | AI & Agent Framework | **PASS** | Tool registration via GA `Microsoft.Agents.AI`; Code Interpreter via Foundry Toolbox MCP (GA); no preview SDKs |
| IV | Security & Identity | **PASS** | Data retrieval uses existing `DefaultAzureCredential`; Toolbox auth uses bearer token from `DefaultAzureCredential` with `https://ai.azure.com/.default` scope |
| V | Code Quality & Architecture | **PASS** | Data retrieval behind `IRunDataQueryService` interface; tool registration in `AgentInvestigator`; clean separation |
| VI | Testing | **PASS** | Unit tests for data query service, tool registration, tool trace capture |
| VII | Documentation | **PASS** | Updated docs for new endpoint, tool architecture |
| VIII | Observability & Reliability | **PASS** | Tool invocations logged with latency/status; graceful degradation if Code Interpreter unavailable (FR-009) |
| IX | Configuration | **PASS** | Toolbox URL, max tool calls configurable via app settings |
| X | Performance | **PASS** | 60s timeout; compact summaries for context budget; < 2s data retrieval |
| XI | Dev Experience | **PASS** | Toolbox testable locally via `az login` credential |
| XII | Library-First | **PASS** | MCP SDK for toolbox; no custom protocol implementation |

**Result**: PASS — no Complexity Tracking entries required.

## Project Structure

### New/Modified Files

```text
backend/src/
├── Application/
│   ├── Abstractions/
│   │   └── IRunDataQueryService.cs          # NEW — interface for data retrieval tool
│   ├── Dtos/
│   │   ├── RunDataQueryDto.cs               # NEW — filter parameters
│   │   ├── RunDataQueryResultDto.cs         # NEW — tool response (compact + detail)
│   │   └── ToolInvocationDto.cs             # NEW — tool trace entry
│   └── Services/
│       └── RunDataQueryService.cs           # NEW — filter/aggregate logic
├── Domain/
│   └── Entities/
│       └── AiInvestigationResult.cs         # MODIFIED — add ToolTrace field
├── Infrastructure/
│   └── Ai/
│       ├── AgentInvestigator.cs             # MODIFIED — register tools, capture trace, 60s timeout
│       └── FoundryToolboxClient.cs          # NEW — MCP client for Foundry Toolbox
├── Functions/
│   └── Endpoints/
│       ├── ExpenseDataQueryFunction.cs      # NEW — /api/runs/{runId}/tools/expenses/query
│       └── ConsensusCaseFunction.cs         # MODIFIED — 60s timeout

frontend/src/
├── api/
│   └── runsClient.ts                        # MODIFIED — add ToolTrace types
├── components/
│   ├── AiVerdictPanel.tsx                   # MODIFIED — render tool trace
│   └── ToolTracePanel.tsx                   # NEW — collapsible tool trace component

infra/modules/
├── foundry.bicep                            # MODIFIED — add Foundry Project + Toolbox
└── rbac.bicep                               # MODIFIED — add toolbox RBAC if needed
```

## Key Technical Decisions

### R1. Data Retrieval Tool — HTTP Function + Function-Calling Registration

**Decision**: Implement as an Azure Function HTTP endpoint
(`/api/runs/{runId}/tools/expenses/query`) that loads the Run blob,
applies filters, and returns JSON. Register the tool with the Agent
Framework via `AIFunction` / `ChatOptions.Tools` so the model can call
it autonomously during conversation.

**Architecture**:
1. `ExpenseDataQueryFunction` — HTTP trigger, loads Run from blob, delegates
   to `RunDataQueryService` for filtering/aggregation
2. `RunDataQueryService` — pure logic: accepts `(Run, RunDataQuery)`,
   returns `RunDataQueryResult`. Strips `IsInjectedFraud`/`InjectedPattern`.
3. Agent tool registration: In `AgentInvestigator`, register an `AIFunction`
   wrapping the query logic. The function receives the `RunId` from closure
   (captured when the investigation starts) and calls `RunDataQueryService`
   in-process — avoiding an HTTP round-trip during the agent loop.

**Why in-process for the agent loop**: Even though FR-003 requires an HTTP
endpoint (for future cross-service use), the agent uses the same
`RunDataQueryService` logic in-process during the investigation. The Run is
loaded once by `InvestigateAsync` at investigation start and passed to the
tool closure — this avoids repeated blob reads during the agent's tool-calling
loop. The Run is NOT held in memory across requests, only within a single
investigation's lifetime (per the reconciled spec clarification).

**Compact vs Detail mode** (FR-002, FR-004):
- Compact (default): `{ metadata, aggregates: { meanAmount, medianAmount,
  minAmount, maxAmount, distinctVendors, distinctCategories }, topRecords: [...top 10 by score] }`
- Detail: `{ metadata, records: [...full filtered records with employees + detection] }`

### R2. Code Interpreter — Foundry Toolbox via MCP

**Decision**: Connect to the Foundry Toolbox's MCP endpoint using the C# MCP
SDK (`ModelContextProtocol` package). The toolbox contains the Code Interpreter
tool provisioned in the Foundry project.

**C# adaptation from the Python reference**:

The Python reference uses:
```python
_toolbox = MCPStreamableHTTPTool(name=toolbox_name, url=toolbox_url, http_client=http_client)
_agent = chat_client.as_agent(tools=[_toolbox])
```

In C#, the equivalent is:
1. Create an `HttpClient` with bearer token auth (`DefaultAzureCredential`
   with scope `https://ai.azure.com/.default`)
2. Use the C# MCP SDK to connect to the toolbox MCP endpoint:
   `{projectEndpoint}/toolboxes/{name}/versions/{version}/mcp?api-version=v1`
3. List available tools from the MCP server
4. Register them as `AITool` instances with the `ChatClientAgent`

**Toolbox URL pattern**:
```
https://{aiServicesName}.services.ai.azure.com/api/projects/{projectName}/toolboxes/{toolboxName}/versions/{version}/mcp?api-version=v1
```

**Configuration** (app settings):
- `Foundry__ProjectEndpoint` — e.g., `https://frauddemoshi4qxw6ais.services.ai.azure.com/api/projects/fraud-demo`
- `Foundry__ToolboxName` — e.g., `fraud-ai-tools`
- `Foundry__ToolboxVersion` — e.g., `1`

**Auth**: Bearer token from `DefaultAzureCredential` with scope
`https://ai.azure.com/.default`, injected via a delegating handler on the
`HttpClient`. Same pattern as the Python `_ToolboxAuth` class.

**Graceful degradation** (FR-009): If the toolbox connection fails (MCP
handshake timeout, 401/403, toolbox not found), the agent proceeds with
only the data retrieval tool. The failure is logged and a note is added
to the tool trace.

### R3. Agent Tool Registration & Trace Capture

**Decision**: Register tools with `ChatOptions.Tools` when constructing the
`ChatClientAgent`. Capture tool invocations by intercepting the agent's
conversation history after `RunAsync` completes.

**Tool registration**:
```csharp
var tools = new List<AITool>();
// 1. Data retrieval tool (in-process, wraps RunDataQueryService)
tools.Add(AIFunctionFactory.Create(queryRunData, "query_expense_data", "Query filtered expense data from the run"));
// 2. Code Interpreter tools (from MCP toolbox, if available)
if (mcpTools != null) tools.AddRange(mcpTools);

var chatOptions = new ChatOptions { Tools = tools, ToolMode = ChatToolMode.Auto };
var agent = new ChatClientAgent(chatClient, instructions: systemPrompt);
var response = await agent.RunAsync(prompt, chatOptions, cancellationToken: cts.Token);
```

**Trace capture**: After `RunAsync`, iterate through `response.Messages` to
extract tool call entries (function calls + function results) and any
intermediate assistant messages. Build `ToolTrace` from these.

**Max tool calls** (FR-013): Set `chatOptions.MaxOutputTokens` and implement
a call counter in the tool wrapper that returns a "max calls reached" message
after 10 invocations.

### R4. System Prompt Updates

**Decision**: Extend the existing system prompt with a new "AVAILABLE TOOLS"
section that describes both tools, their parameters, and usage guidance.

The prompt addition will be appended after the existing FEATURE MEANINGS
section and before the JSON output format:

```text
AVAILABLE TOOLS:
You have access to the following tools. USE THEM to strengthen your analysis.

1. query_expense_data — Query filtered expense data from the run dataset.
   Use this to examine broader patterns: all expenses from the same vendor,
   the employee's full history, expenses in a specific category, etc.
   Parameters: employeeId, vendor, category, band, dateRangeStart, dateRangeEnd,
   minAmount, maxAmount, limit (default 100), detail (default false).
   - Use detail=false first to get a compact summary, then detail=true if you
     need specific records.

2. code_interpreter — Execute Python code for complex analysis.
   Use this for statistical tests, temporal pattern analysis, Benford's law,
   distribution comparisons, or any quantitative analysis that would strengthen
   your investigation.

TOOL USAGE GUIDANCE:
- ALWAYS use query_expense_data to examine the vendor's history across the
  full dataset — is this vendor used by other employees? How many times?
- ALWAYS use query_expense_data to look at the employee's full expense
  history — are there patterns of threshold gaming or weekend submissions?
- Use code_interpreter when you need to compute statistics, run comparisons,
  or detect temporal patterns that can't be expressed in natural language.
- You may call tools multiple times with different parameters.
- Start with compact summaries, then drill into details as needed.
```

### R5. ToolTrace Data Model Extension

**Decision**: Add a `ToolTrace` property to `AiInvestigationResult`.

```csharp
public IReadOnlyList<ToolInvocation>? ToolTrace { get; }
```

Where `ToolInvocation` is:
```csharp
public sealed record ToolInvocation(
    string ToolName,
    string Parameters,       // JSON string of the call parameters
    string ResponseSummary,  // "12 records returned" or "Python output: 42 lines"
    string? ResponseData,    // Truncated response (first 1000 chars)
    string? Reasoning,       // Agent's intermediate reasoning (if captured)
    long LatencyMs,
    bool Succeeded
);
```

This is nullable on `AiInvestigationResult` — existing results without tools
have `ToolTrace = null`. The frontend checks for null/empty to decide whether
to show the trace panel.

### R6. Frontend ToolTrace Panel

**Decision**: New `ToolTracePanel` component, rendered inside `AiVerdictPanel`
as a collapsible section. Each `ToolInvocation` is a card showing:
- Tool icon + name
- Parameters (collapsible JSON)
- Response summary (always visible)
- Agent reasoning (if present)
- Code block for Code Interpreter (syntax-highlighted Python)
- Execution output (truncated with "show more")

For consensus, each model's column in the side-by-side grid includes its
own `ToolTracePanel`.

### R7. Infrastructure — Foundry Project + Toolbox

**Decision**: Extend `infra/modules/foundry.bicep` to provision:
1. A **Foundry AI Hub** (if not already present — may need
   `Microsoft.MachineLearningServices/workspaces` of kind `Hub`)
2. A **Foundry Project** linked to the AI Services account
3. A **Toolbox** with the Code Interpreter tool

The exact Bicep resource types depend on the current GA Foundry API. If
toolbox provisioning is not yet available in Bicep, the toolbox creation
will be documented as a portal step in `docs/setup.md` per the clarification.

**App settings additions**:
- `Foundry__ProjectEndpoint`
- `Foundry__ToolboxName`
- `Foundry__ToolboxVersion`

## Complexity Tracking

> No violations — no entries required.