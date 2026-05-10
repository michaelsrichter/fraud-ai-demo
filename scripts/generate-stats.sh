#!/usr/bin/env bash
# generate-stats.sh — generates frontend/src/generated/stats.json
# Run before build/deploy to embed live repo stats into the homepage.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT_DIR="$REPO_ROOT/frontend/src/generated"
OUT_FILE="$OUT_DIR/stats.json"

mkdir -p "$OUT_DIR"

cd "$REPO_ROOT"

# Git stats
FIRST_COMMIT_DATE=$(git log --reverse --format="%ai" | head -1 | cut -d' ' -f1)
TOTAL_COMMITS=$(git rev-list --count HEAD)
DAYS_SINCE_FIRST=$(( ($(date +%s) - $(date -d "$FIRST_COMMIT_DATE" +%s)) / 86400 ))

# Lines of code (source only, no tests/specs/infra/docs)
BACKEND_LOC=$(find backend/src -name '*.cs' | xargs cat 2>/dev/null | wc -l)
FRONTEND_LOC=$(find frontend/src -name '*.ts' -o -name '*.tsx' | xargs cat 2>/dev/null | wc -l)
TOTAL_LOC=$((BACKEND_LOC + FRONTEND_LOC))

# Test counts
BACKEND_TESTS=$(grep -r '\[Fact\]\|\[Theory\]' backend/tests --include='*.cs' -c 2>/dev/null | awk -F: '{s+=$2} END {print s+0}')
FRONTEND_TESTS=$(grep -r 'it(\|test(' frontend/tests --include='*.ts' --include='*.tsx' -c 2>/dev/null | awk -F: '{s+=$2} END {print s+0}')
TOTAL_TESTS=$((BACKEND_TESTS + FRONTEND_TESTS))

# Spec count
SPEC_COUNT=$(find specs -maxdepth 1 -mindepth 1 -type d | wc -l)

# Write JSON
cat > "$OUT_FILE" <<EOF
{
  "firstCommitDate": "$FIRST_COMMIT_DATE",
  "daysSinceFirstCommit": $DAYS_SINCE_FIRST,
  "totalCommits": $TOTAL_COMMITS,
  "linesOfCode": $TOTAL_LOC,
  "backendLoc": $BACKEND_LOC,
  "frontendLoc": $FRONTEND_LOC,
  "totalTests": $TOTAL_TESTS,
  "backendTests": $BACKEND_TESTS,
  "frontendTests": $FRONTEND_TESTS,
  "specCount": $SPEC_COUNT,
  "generatedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

echo "Stats generated: $OUT_FILE"
cat "$OUT_FILE"
