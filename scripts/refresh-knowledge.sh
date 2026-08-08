#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# DENTOVERSE — NOVA AI · KNOWLEDGE REFRESH WRAPPER
# ───────────────────────────────────────────────────────────────
# One-shot helper to keep Nova's knowledge base current.
#
#   • Detects newly added / changed / removed PDFs and resources.
#   • Rebuilds /assets/data/nova-knowledge.json.
#   • Writes a transparent report under scripts/reports/.
#
# Usage
#   ./scripts/refresh-knowledge.sh        # one-shot refresh
#   ./scripts/refresh-knowledge.sh --cron # cron-friendly (silent on no-op)
#   ./scripts/refresh-knowledge.sh --force # always rebuild
#
# Designed & Produced by Abdel Rahman Teba © ®
# ═══════════════════════════════════════════════════════════════
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 2

MODE="${1:-manual}"

case "$MODE" in
  --cron)  ARGS="cron";;
  --force) ARGS="force";;
  *)       ARGS="manual";;
esac

# Make sure Node is available.
if ! command -v node >/dev/null 2>&1; then
  echo "[refresh] node not found — skipping refresh" >&2
  exit 1
fi

echo "[refresh] Starting Nova knowledge refresh (mode=$ARGS) …"
node scripts/nova-watch.js "$ARGS"
RC=$?
echo "[refresh] Finished with exit code $RC"
exit $RC
