# Local setup

## Prerequisites

- .NET SDK 8.0+ (the workspace targets `net8.0` for stability with the Functions
  Worker SDK; deployment uses Azure Functions runtime v4 on Linux Flex
  Consumption).
- Node.js 20+
- [Azurite](https://learn.microsoft.com/azure/storage/common/storage-use-azurite)
  storage emulator
- Azure Functions Core Tools v4 (`func --version`)
- Azure CLI (`az`) and `azd` for cloud deployment

## Run the backend

```bash
cd backend/src/Functions
cp local.settings.template.json local.settings.json   # first time only
func start
```

`local.settings.json` is git-ignored. To enable AI investigation locally, set
`Foundry__Endpoint` to your Azure OpenAI resource URL and ensure
`az login` has signed you in (the worker uses `DefaultAzureCredential`).

## Run the frontend

```bash
cd frontend
npm install
npm run gen:api      # regenerate src/api/types.ts from contracts/
npm run dev
```

Vite proxies `/api/*` to `http://localhost:7071`.

## Run unit tests

```bash
dotnet test backend/fraud-ai-demo.slnx
npm --prefix frontend test -- --run
```

## VS Code shortcut (recommended)

Open the Command Palette (`Ctrl+Shift+P` / `⌘⇧P`) → **Tasks: Run Task** →
pick **🚀 Dev: All**.

This launches three color-coded, side-by-side terminals in a single panel group:

| Terminal | Icon | Color | What it runs |
|---|---|---|---|
| 🗄️ Azurite | `database` | cyan | Local storage emulator (`npx azurite`) |
| ⚡ Functions API | `zap` | green | `func start` in `backend/src/Functions` |
| 🌐 Vite Frontend | `globe` | magenta | `npm run dev` in `frontend/` |

The tasks start in sequence — Azurite first, then the Functions host, then
Vite — so the backend can connect to storage on startup. Each terminal has its
own dedicated panel so you can watch all three logs at once.

Once running, open **http://localhost:5173** (Vite dev server). API calls to
`/api/*` are proxied to the Functions host on port 7071.

## Foundry Toolbox (Code Interpreter)

The AI agent uses the Foundry Code Interpreter via a
[Foundry Toolbox](https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/tools/toolbox)
exposed as an MCP endpoint. The Foundry Hub, Project (`fraud-demo`), and
Toolbox (`fraud-ai-tools` with Code Interpreter) are already provisioned in the
same resource group (`rg-fraud-demo`) as the other Azure resources.

- **Project endpoint**: `https://frauddemoshi4qxw6ais.services.ai.azure.com/api/projects/fraud-demo`
- **Toolbox name**: `fraud-ai-tools`
- **Toolbox portal**: [Open in Foundry](https://ai.azure.com/nextgen/r/Aq4j21SkQkueo-IZA6khHg,rg-fraud-demo,,frauddemoshi4qxw6ais,fraud-demo/build/toolboxes/fraud-ai-tools)

The consumer MCP endpoint uses the versionless URL pattern
(`{project}/toolboxes/{name}/mcp?api-version=v1`) which always serves the
default toolbox version. All requests include the required
`Foundry-Features: Toolboxes=V1Preview` header.

### Local development with Code Interpreter

The `local.settings.json` already has the correct values:

```json
{
  "Foundry__ProjectEndpoint": "https://frauddemoshi4qxw6ais.services.ai.azure.com/api/projects/fraud-demo",
  "Foundry__ToolboxName": "fraud-ai-tools"
}
```

Ensure you are signed in via `az login` — the `DefaultAzureCredential` will
use your CLI token for Foundry Toolbox auth (scope `https://ai.azure.com/.default`).

If the toolbox is not configured or unavailable, the agent gracefully proceeds
with the data retrieval tool only.
