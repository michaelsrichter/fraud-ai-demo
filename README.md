# AI-Powered Internal Expense Fraud Demo

A synthetic, presenter-friendly demo that contrasts deterministic ML.NET
anomaly detection with an AI agent investigator backed by Microsoft Foundry
(AI Services). Generate an expense dataset, dial fraud intensity and
per-pattern weights up or down, see records bucket into High / Medium / Low
confidence bands, then drill into any case and ask the AI for a structured
verdict with rationale — choosing from multiple deployed models.

## Stack

- **Backend**: .NET 8 isolated Azure Functions (Linux Flex Consumption),
  ML.NET RandomizedPca anomaly detection, `Microsoft.Agents.AI` 1.0.0 GA
  ChatClientAgent over Microsoft Foundry AI Services (multiple models).
- **Frontend**: React 18 + Vite + TypeScript + TanStack Query + recharts +
  zod.
- **Storage**: Azure Storage (gzip JSON blobs in `runs/` + `RunIndex` table).
- **Auth**: `DefaultAzureCredential` everywhere. No connection strings.
- **Infra**: Bicep at subscription scope, deployed via `azd up`.

## Quick start

See [docs/setup.md](docs/setup.md) for the full local walkthrough and
[docs/deployment.md](docs/deployment.md) for `azd up`.

## Documentation

- [Architecture](docs/architecture.md)
- [Setup](docs/setup.md)
- [Deployment](docs/deployment.md)
- [Components](docs/components.md)
- [API](docs/api.md)

## Demo narrative

1. Pick the **Low** preset → click **Generate** → ~5 000 records score with a
   small High-band slice.
2. Switch to a **High — Vendor** or **High — Frequency** preset → click
   **Generate** → the High band visibly grows.
3. Drill into any High case → review contributing features (amount Z, vendor
   rarity, weekend submission, etc.).
4. Click **Investigate with AI** → receive a structured verdict (Likely /
   Unlikely / Inconclusive) with rationale, key signals, and a recommended
   action — persisted onto the originating Run.

If Foundry is unconfigured or unreachable, the AI panel shows an
**Unavailable** state and the rest of the demo continues working.
