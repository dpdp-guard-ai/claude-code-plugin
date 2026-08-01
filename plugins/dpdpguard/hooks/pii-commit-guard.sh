#!/bin/sh
# POSIX-compliant PII Commit Guard Hook for DPDPGuard
# Blocks accidental commit of raw PII or hardcoded secrets

COMMAND="$1"

# Check if command is a git commit attempt
echo "$COMMAND" | grep -E -q 'git commit' || exit 0

# Check for --no-verify attempt
if echo "$COMMAND" | grep -q '\--no-verify'; then
  echo "[DPDPGuard Security] Error: --no-verify is prohibited under DPDP Act compliance policies." >&2
  exit 1
fi

# Check staged diff for raw PII patterns
STAGED_DIFF=$(git diff --cached 2>/dev/null)

if echo "$STAGED_DIFF" | grep -E -i 'console\.log\(.*(email|password|token|aadhaar|phone|ssn)' >/dev/null 2>&1; then
  echo "[DPDPGuard Audit] Error: Potential PII exposure in console logging detected in staged files." >&2
  echo "[DPDPGuard Audit] Please redact PII before committing (DPDP Act §8(5) / GDPR Art.32 violation)." >&2
  exit 1
fi

exit 0
