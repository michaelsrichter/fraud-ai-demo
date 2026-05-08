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
