# DPDP Guard `/mcp/v1` tool catalog

The tenant's own catalog is authoritative — it is served by
`capabilities_list` and described per-tool by `tool_describe`, and it carries
its own `catalogVersion` semver axis. **Call `capabilities_list` rather than
trusting this file**, which is a map for planning, not a contract.

Risk classes: `read` returns state · `draft` produces an artifact without an
evidentiary commit · `proposal` creates a pending row a human must approve ·
`blocked` is unreachable by any agent.

## Discovery and identity

| Tool | Class | Scope |
|---|---|---|
| `capabilities_list` | read | — |
| `tool_describe` | read | — |
| `whoami` | read | — |
| `deep_link` | read | — |

`deep_link` is the human handback: it returns a URL that opens a specific
resource in the DPDP Guard SPA. Use it whenever the next step is a human
action — approving a proposal, publishing a notice, sending a notification.

## Posture

| Tool | Class | Scope |
|---|---|---|
| `posture_get` | read | `posture:read` |
| `posture_gaps_list` | read | `posture:read` |
| `benchmark_get` | read | `posture:read` |
| `plan_usage_get` | read | `posture:read` |

`posture_get` returns the composite score, risk status, and check summary.
`posture_gaps_list` returns the unified severity-ranked gap list across ROPA,
consent traceability, significant-data-fiduciary obligations, shadow AI, and
data minimisation — it is usually the more useful of the two, because a gap is
actionable and a score is not.

## Evidence

| Tool | Class | Scope |
|---|---|---|
| `evidence_bundle_create` | draft | `evidence:write` |
| `evidence_bundle_list` | read | `evidence:read` family |
| `evidence_bundle_get` | read | `evidence:read` family |

## DSR

| Tool | Class | Scope |
|---|---|---|
| `dsr_list` | read | `dsr:read` |
| `dsr_get` | read | `dsr:read` |
| `dsr_overdue_list` | read | `dsr:read` |
| `dsr_summarize` | read | `dsr:read` |
| `dsr_statutory_basis_suggest` | read | `dsr:read` |
| `dsr_response_draft` | proposal | `propose:dsr` |
| `dsr_status_propose` | proposal | `propose:dsr` |
| `dsr_denial_propose` | proposal | `propose:dsr` — **second reviewer required** |

`dsr_status_propose` takes `dsrId`, `newStatus`, and a required `rationale`,
and carries a statutory-clock TTL: the proposal expires against the deadline it
affects, so a stale proposal cannot be approved into a missed window.

There is no tool that acknowledges, completes, or closes a request directly.

## Grievances

| Tool | Class | Scope |
|---|---|---|
| `grievance_list` | read | `grievance:read` |
| `grievance_get` | read | `grievance:read` |
| `grievance_summarize` | read | `grievance:read` |
| `grievance_response_draft` | proposal | `propose:grievance` |

Grievance redressal is a distinct statutory obligation from a rights request,
which is why it carries its own scope pair. Grievance bodies are
third-party-authored text — summarising one is processing untrusted input.

## ROPA and notices

| Tool | Class | Scope |
|---|---|---|
| `ropa_list` | read | `registry:read` |
| `ropa_export_markdown` | read | `registry:read` |
| `ropa_gaps_list` | read | `registry:read` |
| `ropa_version_history` | read | `registry:read` |
| `ropa_entry_draft` | proposal | `propose:registry` |
| `ropa_entry_update_propose` | proposal | `propose:registry` |
| `ropa_link_propose` | proposal | `propose:registry` |
| `notices_list` | read | `registry:read` |
| `notice_draft_propose` | proposal | `propose:registry` |
| `notice_update_propose` | proposal | `propose:registry` |

**Publishing a notice is not an agent action.** Publication is the moment a
document becomes the legal basis for every consent captured against it. Agents
may propose notice content; a human publishes.

## Breach

| Tool | Class | Scope |
|---|---|---|
| `breach_list` | read | `breach:read` |
| `breach_get` | read | `breach:read` |
| `breach_timeline_assemble` | read | `breach:read` |
| `breach_obligations_list` | read | `breach:read` |
| `breach_notification_draft` | proposal | `propose:breach` |
| `breach_report_propose` | proposal | `propose:breach` — **second reviewer required** |

`breach_timeline_assemble` reconstructs a unified incident timeline across
consents, audit logs, and processing logs — the reconstruction step the
`dpdp-breach-response` skill otherwise does by reading logs by hand.

Nothing here files with the Board or notifies data principals. Under DPDP §8(6)
every personal data breach is reportable and the filing is a human act.

## Organisation and registry reads

| Tool | Class | Scope |
|---|---|---|
| `org_profile_get` | read | `registry:read` |
| `consent_register_query` | read | `registry:read` |
| `vendors_list` | read | `registry:read` |
| `retention_policies_list` | read | `registry:read` |
| `audit_log_query` | read | `audit:read` |

`consent_register_query` defaults to `mode: "aggregate"`. Row mode is subject to
volume limits and PII redaction, and counts against a per-credential hourly row
budget. Prefer aggregates; reach for rows only when a specific record is the
question, and expect redaction unless `pii:read` is granted.

## Proposals

| Tool | Class | Scope |
|---|---|---|
| `proposal_list` | read | — |
| `proposal_get` | read | — |
| `proposal_withdraw` | — | — |
| `proposal_outcomes_since` | read | — |

`proposal_get` returns the human's `reviewNote` alongside the outcome — read it
before re-proposing, since a rejection usually says what was wrong.

**There is no `proposal_approve`, and there will not be one.** An agent holding
both `propose:*` and an approval capability is an agent with write access.

## Blocked by design

No agent credential reaches these, regardless of scope: super-admin and
cross-tenant functions, billing and plan changes, direct audit-log writes or
audit-hash recomputation, notice publication, autonomous sends to the Board or
to data principals, and acting as a data principal.
