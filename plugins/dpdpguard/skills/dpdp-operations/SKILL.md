---
name: dpdp-operations
description: Query the DPDPGuard MCP server for live compliance posture — posture gaps, compliance score, overdue DSR queue, RoPA entries — and raise proposals for state-changing operations that need DPO approval.
triggers:
  - dpdp operations
  - dpdp score
  - posture score
  - dsr list
allowed-tools:
  - Read
  - Bash
---

# DPDPGuard Operations

Interface to the remote DPDPGuard MCP server for live compliance state.

## Read/write split

This is the governing distinction for this skill.

**Read operations** return current state. Call them freely.

| Tool | Returns |
|---|---|
| `compliance_score_get` | Composite posture score with per-domain breakdown |
| `posture_gaps_list` | Open compliance gaps across code and infrastructure |
| `dsr_overdue_list` | DSR requests past or approaching their deadline |
| `breach_timeline_assemble` | Event log for an active incident |
| `ropa_list` | Record of Processing Activities entries |

**Proposal operations** do not perform an action. They create a proposal that a
human DPO approves or rejects out of band.

| Tool | Proposes |
|---|---|
| `dsr_acknowledge_propose` | Acknowledgement of a DSR request |
| `notice_draft_propose` | A new privacy notice version |
| `breach_dpb_notify_propose` | A Data Protection Board breach intimation |

**Never describe a proposal as a completed action.** After calling one, report
that a proposal was created and is pending DPO approval — never "acknowledged
the request" or "notified the Board". A user who believes the Board has been
notified when only a draft exists may miss a statutory deadline. This is the
most consequential way this skill can mislead someone.

Confirm with the user before creating any proposal, and show the exact payload
first.

## Workflow

1. **Check connectivity.** If the MCP server is unconfigured or unreachable,
   say so plainly and stop. Do not synthesise plausible-looking posture data —
   fabricated compliance numbers are worse than no numbers, because they get
   pasted into board decks.
2. **Call the read tools** needed for the question. Prefer one targeted call
   over sweeping everything.
3. **Format** as below.
4. **Attribute every figure** to the tool that returned it and the time it was
   fetched.

## Output format

```
DPDPGuard Posture · fetched 2026-08-01T10:30:00+05:30

  Compliance score    72 / 100     ▼ 4 since last week
  Open gaps           11           (2 critical · 4 high · 5 medium)
  Overdue DSRs        3            oldest: 6 days past deadline
  Active incidents    0

  Critical gaps
  ─────────────
  1. No erasure job bound to `user_events`        DPDP §8(7)
  2. Analytics initialises before consent check   DPDP §6(1)

  Overdue DSRs
  ────────────
  dsr_01H8X…   erasure     due 2026-07-26   6d late
  dsr_01H8Y…   access      due 2026-07-29   3d late
```

Lead with what is overdue or breaching. A posture summary that opens with a
healthy-looking score and buries three breached DSR deadlines has inverted the
priority.

## Interpreting the score

The composite score is a management indicator, not a compliance determination.
When reporting it:

- Never say a score means the organisation "is compliant". Compliance is
  determined against the statute by a regulator, not by a dashboard.
- A rising score with an overdue DSR queue is not improvement. Call out the
  breach regardless of the trend.
- If asked to explain a change, attribute it to specific gaps that opened or
  closed, or say the breakdown does not support attribution.

## Boundaries

- Read tools are safe. Proposal tools always need explicit user confirmation.
- Never report a proposal as an executed action.
- Never fabricate posture data when the server is unreachable.
- Never paste raw personal data from DSR records into chat — reference requests
  by ID, not by subject identity.
- Credentials come from the environment. Never print an API key, and never
  write one into a file.
