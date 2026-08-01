---
name: dpdp-score
description: Fetch live posture health score and posture gaps from DPDPGuard MCP server
triggers:
  - /dpdp-score
allowed_tools:
  - Read
  - Bash
---

# /dpdp-score

Queries the remote DPDPGuard MCP server to display live posture compliance score and active posture gaps.

## Usage

```bash
/dpdp-score
```

## Behavior

Invokes `posture_gaps_list` and `compliance_score_get` via MCP and formats findings into a terminal summary card.
