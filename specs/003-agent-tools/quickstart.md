# Quickstart — Agent Tools

**Feature**: AI Agent Tools for Fraud Investigation
**Audience**: Developer extending the existing fraud demo with tool-augmented agents

## Prerequisites

Everything from the [main quickstart](../../docs/setup.md), plus:

| Tool | Why |
|---|---|
| Azure CLI `az login` | `DefaultAzureCredential` for both AI Services + Foundry Toolbox auth |
| Foundry Project | Must have a Foundry Project with a Code Interpreter toolbox provisioned |

## New App Settings

Add to `backend/src/Functions/local.settings.json`:

```json
{
  "Foundry__ProjectEndpoint": "https://<ai-services-name>.services.ai.azure.com/api/projects/<project-name>",
  "Foundry__ToolboxName": "fraud-ai-tools",
  "Foundry__ToolboxVersion": "1"
}
```

These are in addition to the existing `Foundry__Endpoint` and
`Foundry__ModelDeploymentName` settings.

## Testing Tools Locally

1. Start the dev environment as usual (`azurite` + `func start` + `npm run dev`)
2. Generate a Run in the UI
3. Click a case → "Investigate with AI"
4. The agent should now use tools — check the "Agent Reasoning Trace"
   section in the verdict panel
5. The data retrieval tool is always available locally (reads from Azurite)
6. The Code Interpreter requires a live Foundry Toolbox (not emulatable)

## New Endpoint

```
POST /api/runs/{runId}/tools/expenses/query
```

Body: `RunDataQuery` JSON. Can be tested directly:

```bash
curl -X POST http://localhost:7071/api/runs/{runId}/tools/expenses/query \
  -H "Content-Type: application/json" \
  -d '{"vendor": "OffshoreLLC", "detail": false}'
```

## Streaming Investigation Endpoint (SSE)

```
POST /api/runs/{runId}/cases/{caseId}/investigate/stream
Content-Type: application/json
Accept: text/event-stream
```

Body (same as the non-streaming endpoint):
```json
{
  "modelDeploymentName": "gpt-5.4",
  "temperature": 0.7,
  "allowConfidenceScores": false
}
```

Test with `curl`:
```bash
curl -N -X POST http://localhost:7071/api/runs/{runId}/cases/{caseId}/investigate/stream \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"modelDeploymentName": "gpt-5.4"}'
```

The `-N` flag disables output buffering so you see events as they arrive.

### Event format

```
event: tool_call
data: {"toolName":"query_expense_data","parameters":"...","responseSummary":"47 matches","latencyMs":312,"succeeded":true}

event: tool_call
data: {"toolName":"code_interpreter_0","parameters":"...","responseSummary":"Output: 15 lines","latencyMs":4200,"succeeded":true}

event: complete
data: {"recordId":"...","status":"Succeeded","verdict":"Likely","rationale":"...","toolTrace":[...]}
```

### Frontend usage

The frontend uses `fetch` + `ReadableStream` (not `EventSource`, which only
supports GET). The `streamInvestigation()` helper in `runsClient.ts` provides
callbacks for `onToolCall`, `onComplete`, and `onError`.

## Verifying Tool Use

1. Generate a Run with default settings (5,000 records, 15% intensity)
2. Navigate to a **Medium** band case (these have ambiguous signals)
3. Click "Investigate with AI"
4. Watch the tool trace panel update in real time:
   - First: `query_expense_data` calls (vendor history, employee history)
   - Then: `code_interpreter` if the agent decides quantitative analysis helps
5. Final verdict appears with the complete rationale citing tool results

If the Code Interpreter is not provisioned, the agent will only use the data
retrieval tool — this is expected behavior (FR-009).
