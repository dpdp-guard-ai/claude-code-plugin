---
name: dpdp-score
description: Fetch live compliance posture score and open gaps from the DPDPGuard MCP server
argument-hint: "[--gaps-only] [--severity critical|high|medium]"
triggers:
  - /dpdp-score
allowed-tools:
  - Read
  - Bash
---

Fetch live compliance posture using the **dpdp-operations** skill.

Arguments: `$ARGUMENTS`

## Steps

1. Verify the MCP server is configured and reachable. If it is not, say so
   plainly and stop. **Never synthesise a score or gap list** — fabricated
   compliance numbers get pasted into board decks.
2. Call `capabilities_list` first — tool availability depends on scopes, plan
   tier, and feature flags. Then call `posture_get` and `posture_gaps_list`.
3. Render the summary card, then the gaps grouped by severity, filtered by
   `--severity` if given. With `--gaps-only`, skip the score.
4. Timestamp the output with when the data was fetched.

## Output

```
DPDPGuard Posture · fetched <ISO timestamp>

  Compliance score    72 / 100     ▼ 4 since last week
  Open gaps           11           (2 critical · 4 high · 5 medium)
  Overdue DSRs        3            oldest: 6 days past deadline
  Active incidents    0

  Critical gaps
  ─────────────
  1. No erasure job bound to `user_events`        DPDP §8(7)
  2. Analytics initialises before consent check   DPDP §6(1)
```

## Rules

- Lead with anything overdue or breaching, regardless of what the score is
  doing. A rising score with a breached DSR deadline is not improvement.
- Never state that a score means the organisation "is compliant" — compliance
  is determined against the statute by a regulator, not by a dashboard.
- Attribute each figure to the tool that returned it. If asked to explain a
  change and the breakdown does not support attribution, say so.
- Never print an API key.
