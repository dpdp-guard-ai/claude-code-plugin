#!/bin/sh
# PII Commit Guard — DPDPGuard PreToolUse hook (POSIX sh)
#
# Blocks `git commit` when the staged diff contains raw PII, identity numbers,
# or hardcoded secrets.
#
# Contract (Claude Code PreToolUse):
#   - the hook payload arrives as JSON on STDIN, not as argv
#   - exit 0 => allow;  exit 2 => block and send stderr back to Claude
#   - any other exit code is a non-blocking error
#
# A command may be passed as $1 instead of stdin for testing.
#
# Escape hatch: add `dpdpguard:allow` to a line to exempt it (e.g. fixtures).

set -u

PAYLOAD=""
COMMAND=""

if [ "$#" -gt 0 ]; then
  COMMAND="$1"
else
  # Reading stdin can block if nothing is piped; the hook runner always pipes.
  PAYLOAD=$(cat 2>/dev/null || true)
fi

# --- extract .tool_input.command from the payload -------------------------

if [ -z "$COMMAND" ] && [ -n "$PAYLOAD" ]; then
  if command -v jq >/dev/null 2>&1; then
    COMMAND=$(printf '%s' "$PAYLOAD" | jq -r '.tool_input.command // empty' 2>/dev/null || true)
  elif command -v python3 >/dev/null 2>&1; then
    COMMAND=$(printf '%s' "$PAYLOAD" | python3 -c 'import json,sys
try:
    print(json.load(sys.stdin).get("tool_input", {}).get("command", ""))
except Exception:
    pass' 2>/dev/null || true)
  else
    # Last-resort extraction. Handles the common single-line case only.
    COMMAND=$(printf '%s' "$PAYLOAD" \
      | tr -d '\n' \
      | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\(\([^"\\]\|\\.\)*\)".*/\1/p' 2>/dev/null || true)
  fi
fi

# A guard that cannot read its input must not brick every Bash call. Fail open:
# this is defence in depth, not the only control.
[ -n "$COMMAND" ] || exit 0

# --- only care about commits ----------------------------------------------

# Matches `git commit`, and `git <global-opts> commit` (e.g. `git -C path commit`,
# `git -c user.name=x commit`). Deliberately narrow so that commands merely
# containing the word "commit" (`git log --grep commit`) do not trigger a scan.
GIT_GLOBAL_OPT='(-[cC][[:space:]]+[^[:space:]]+|--?[-a-zA-Z]+(=[^[:space:]]*)?)'
echo "$COMMAND" \
  | grep -Eq "(^|[;&|[:space:]])git([[:space:]]+${GIT_GLOBAL_OPT})*[[:space:]]+commit([[:space:]]|$)" \
  || exit 0

if echo "$COMMAND" | grep -Eq '(^|[[:space:]])--no-verify([[:space:]]|$)'; then
  echo "[DPDPGuard] Blocked: --no-verify bypasses the commit-time compliance checks." >&2
  echo "[DPDPGuard] Fix the underlying finding rather than skipping verification." >&2
  exit 2
fi

# --- collect added lines from the staged diff ------------------------------

# Prefer the project root when the hook runner supplies it. Staying in the
# current directory is an acceptable fallback, so a failed cd is not fatal.
if [ -n "${CLAUDE_PROJECT_DIR:-}" ] && [ -d "${CLAUDE_PROJECT_DIR}" ]; then
  cd "$CLAUDE_PROJECT_DIR" || true
fi

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

ADDED=$(git diff --cached --unified=0 --no-color 2>/dev/null \
  | grep '^+' \
  | grep -v '^+++' \
  | grep -v 'dpdpguard:allow' || true)

[ -n "$ADDED" ] || exit 0

FINDINGS=""

# check <regex> <label> <citation>  — case-insensitive, matches added lines
check() {
  # -e is required: several patterns begin with '-' and would parse as flags.
  if printf '%s\n' "$ADDED" | grep -Eiq -e "$1"; then
    FINDINGS="${FINDINGS}  - $2 ($3)
"
  fi
}

# Personal data written to a log or print statement
check 'console\.(log|info|warn|error|debug)[^;]*\b(email|e-mail|phone|mobile|aadhaar|aadhar|passport|ssn|password|otp|token|dob|date_of_birth)\b' \
  'personal data in a console statement' 'DPDP §8(5) / GDPR Art.32'
check '(logger|log|logging)\.(log|info|warn|warning|error|debug)[^;]*\b(email|phone|mobile|aadhaar|aadhar|passport|ssn|password|otp|dob)\b' \
  'personal data in a logger call' 'DPDP §8(5) / GDPR Art.32'
check '(print|println|printf|fmt\.Print[a-z]*|System\.out\.print[a-z]*)[^;]*\b(aadhaar|aadhar|passport|ssn|password|otp)\b' \
  'personal data in a print statement' 'DPDP §8(5)'

# Identity numbers appearing as literals
check '\b[2-9][0-9]{3}[ -]?[0-9]{4}[ -]?[0-9]{4}\b' \
  'possible Aadhaar number literal' 'DPDP §8(5)'
check '\b[A-Z]{5}[0-9]{4}[A-Z]\b' \
  'possible PAN literal' 'DPDP §8(5)'
check '\b[0-9]{3}-[0-9]{2}-[0-9]{4}\b' \
  'possible US SSN literal' 'CCPA §1798.150'

# Credentials and keys
check '-----BEGIN [A-Z ]*PRIVATE KEY-----' \
  'private key material' 'DPDP §8(5) / GDPR Art.32'
check '\b(sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|gho_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,})\b' \
  'hardcoded provider credential' 'DPDP §8(5)'
check '\b(api[_-]?key|secret|passwd|password|auth[_-]?token)\b[[:space:]]*[:=][[:space:]]*["'"'"'][A-Za-z0-9_\-]{16,}["'"'"']' \
  'hardcoded secret assignment' 'DPDP §8(5)'

# Personal data in a URL query string
check '[?&](email|phone|mobile|aadhaar|aadhar|otp|token|ssn)=' \
  'personal data in a URL query parameter' 'DPDP §8(5) / GDPR Art.5(1)(f)'

if [ -n "$FINDINGS" ]; then
  echo "[DPDPGuard] Commit blocked — the staged diff appears to contain personal data or credentials:" >&2
  printf '%s' "$FINDINGS" >&2
  echo "" >&2
  echo "Review with: git diff --cached" >&2
  echo "Redact the values, or mark an intentional line with 'dpdpguard:allow'." >&2
  exit 2
fi

exit 0
