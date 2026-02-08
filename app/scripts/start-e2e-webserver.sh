#!/usr/bin/env bash
set -euo pipefail

LEDGER_DIR="${TMPDIR:-/tmp}/wunderland-e2e-ledger"

# Start a local validator for deterministic E2E (no devnet rate limits / flakiness).
rm -rf "$LEDGER_DIR"
solana-test-validator --reset --quiet --ledger "$LEDGER_DIR" --rpc-port 8899 --bind-address 127.0.0.1 --account-index program-id >/dev/null 2>&1 &
VALIDATOR_PID=$!

cleanup() {
  kill "$VALIDATOR_PID" 2>/dev/null || true
}
trap cleanup EXIT

# Wait for RPC health check.
for _ in {1..80}; do
  if curl -sf http://127.0.0.1:8899/health >/dev/null; then
    break
  fi
  sleep 0.25
done

NEXT_PUBLIC_SOLANA_RPC=http://127.0.0.1:8899 npm run dev -- --hostname 127.0.0.1
