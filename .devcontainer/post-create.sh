#!/usr/bin/env bash
set -euo pipefail

echo "==> Installing frontend dependencies..."
cd frontend
npm ci
cd ..

echo "==> Restoring .NET backend..."
cd backend
dotnet restore
cd ..

echo "==> Setting up local.settings.json (if missing)..."
SETTINGS_FILE="backend/src/Functions/local.settings.json"
TEMPLATE_FILE="backend/src/Functions/local.settings.template.json"
if [[ ! -f "$SETTINGS_FILE" ]] && [[ -f "$TEMPLATE_FILE" ]]; then
  cp "$TEMPLATE_FILE" "$SETTINGS_FILE"
  echo "    Copied template → local.settings.json (update with your values)"
fi

echo "==> Done! Run the 'Dev: All' task (Ctrl+Shift+P → Tasks: Run Task → 🚀 Dev: All) to start."
