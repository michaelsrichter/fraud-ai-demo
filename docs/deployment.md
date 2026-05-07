# Deployment

This project deploys end-to-end via the Azure Developer CLI (`azd`).

## First deploy

```bash
azd auth login
azd init                # only if not already linked to an environment
azd env new fraud-demo  # or any name
azd up                  # provisions infra + deploys app
```

`azd up` runs `infra/main.bicep` at subscription scope:

- Resource group `rg-{environmentName}`
- Storage account (StorageV2, RA-LRS, no shared-key access)
- Microsoft Foundry / Azure OpenAI account with a `gpt-fraud-investigator`
  deployment
- Linux Flex Consumption Function App (system-assigned MI)
- Azure Static Web App (Standard tier, linked backend)
- Application Insights + Log Analytics workspace
- Role assignments for the Function App MI **and** the deploying user
  (`principalId`) — Storage Blob/Table Data Contributor + Cognitive Services
  OpenAI User. Both can run the demo locally against the cloud resources.

## Subsequent deploys

```bash
azd deploy           # re-package + push code only
azd provision        # re-apply infra
```

## Pipeline

```bash
azd pipeline config
```

This wires up GitHub Actions OIDC (`.github/workflows/ci-cd.yml`) so pushes to
`main` trigger build, test, infra-update, and code deploy. The CI workflow
greps every `*.csproj` for `-(preview|rc|alpha|beta)` suffixes and fails the
build if any are found (Constitution III).

## Teardown

```bash
azd down --purge --force
```

This deletes the resource group **and** purges the soft-deleted Cognitive
Services account so the deployment name is reusable.
