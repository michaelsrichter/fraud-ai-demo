# SSE Event Contract: Investigation Streaming

**Feature**: 003-agent-tools
**Endpoint**: `POST /api/runs/{runId}/cases/{caseId}/investigate/stream`
**Protocol**: Server-Sent Events (SSE) over HTTP

## Request

Same as the existing `POST /api/runs/{runId}/cases/{caseId}/investigate`:

```
POST /api/runs/{runId}/cases/{caseId}/investigate/stream
Content-Type: application/json
Accept: text/event-stream
```

```json
{
  "modelDeploymentName": "string (optional, defaults to Foundry__ModelDeploymentName)",
  "temperature": "number (optional, 0.0-2.0)",
  "allowConfidenceScores": "boolean (optional, default false)"
}
```

## Response

```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

## Event Types

### `tool_call`

Emitted after each tool invocation completes. Zero or more per investigation.

```
event: tool_call
data: <ToolInvocation JSON>

```

**ToolInvocation schema**:
```json
{
  "toolName": "string",
  "parameters": "string (JSON)",
  "responseSummary": "string",
  "responseData": "string | null (truncated to 1000 chars)",
  "reasoning": "string | null",
  "latencyMs": "integer",
  "succeeded": "boolean"
}
```

### `complete`

Emitted once when the investigation completes successfully. Terminal event.

```
event: complete
data: <AiInvestigationResult JSON>

```

**AiInvestigationResult schema**:
```json
{
  "recordId": "string (GUID)",
  "runId": "string (GUID)",
  "requestedUtc": "string (ISO 8601)",
  "completedUtc": "string (ISO 8601) | null",
  "status": "\"Succeeded\" | \"Unavailable\"",
  "verdict": "\"Likely\" | \"Unlikely\" | \"Inconclusive\" | null",
  "rationale": "string | null",
  "keySignals": ["string"] | null,
  "recommendedAction": "string | null",
  "unavailableReason": "string | null",
  "toolTrace": [<ToolInvocation>] | null
}
```

### `error`

Emitted if the investigation fails. Terminal event.

```
event: error
data: <AiInvestigationResult JSON with status="Unavailable">

```

## Event Ordering

```
[tool_call]*  →  (complete | error)
```

1. Zero or more `tool_call` events arrive as the agent uses tools
2. Exactly one terminal event (`complete` or `error`)
3. The stream closes after the terminal event

## Error Conditions

| HTTP Status | Condition |
|---|---|
| 200 + `error` event | Investigation timeout, AI service error, malformed response |
| 404 | Run or case not found (returned as JSON, not SSE) |
| 500 | Unexpected server error (stream may close without terminal event) |

## Client Implementation Notes

- Use `fetch` + `ReadableStream`, not `EventSource` (POST not supported by EventSource)
- Parse SSE frames by splitting accumulated text on `\n\n` boundaries
- Extract event type from `event:` line and payload from `data:` line
- Build up tool trace incrementally in React state on each `tool_call` event
- Replace loading state with final result on `complete` event
- Handle stream close without terminal event as a timeout/network error
