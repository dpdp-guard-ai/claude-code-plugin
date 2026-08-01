---
name: dpdp-operations
description: CLI interface to DPDPGuard MCP server for querying posture scores, overdue DSRs, and managing proposals
triggers:
  - dpdp operations
  - dpdp score
  - posture score
  - dsr list
---

# DPDPGuard Remote MCP Terminal Assistant

Terminal interface wrapping the remote **DPDPGuard MCP Server** (`/mcp/v1`).

## Available MCP Operations (100% Free)

- `posture_gaps_list` — List active compliance gaps across infrastructure and code.
- `compliance_score_get` — Fetch composite compliance health score (0-100).
- `dsr_overdue_list` — List overdue Data Subject Rights requests with deadline countdowns.
- `breach_timeline_assemble` — Fetch event logs for active security incidents.
- `ropa_list` — List Record of Processing Activities entries.
- `dsr_acknowledge_propose` — Create proposal for DSR acknowledgment (requires DPO approval).
- `notice_draft_propose` — Propose updated privacy notice version.
