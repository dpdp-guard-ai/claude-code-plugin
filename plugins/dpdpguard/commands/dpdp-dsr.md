---
name: dpdp-dsr
description: List, inspect, and act on Data Subject Rights requests via the DPDPGuard MCP server
argument-hint: "[overdue|list|show <id>|acknowledge <id>]"
triggers:
  - /dpdp-dsr
allowed-tools:
  - Read
  - Bash
---

Work the DSR queue using the **dpdp-operations** skill.

Arguments: `$ARGUMENTS`

## Subcommands

- `overdue` (default when no argument) — call `dsr_overdue_list` and show the
  queue sorted by how far past deadline each request is.
- `list` — the full open queue with `dueAt` and days remaining.
- `show <id>` — detail for one request.
- `acknowledge <id>` — create a `dsr_acknowledge_propose` proposal.

## Steps

1. Verify the MCP server is configured and reachable. If it is not, say so and
   stop — **never synthesise DSR data**. Fabricated queue state hides real
   breached deadlines.
2. Call the read tool for the subcommand.
3. Format the queue with the most overdue request first. Show `dueAt`, the
   regime driving the deadline, and days over or remaining.
4. If anything is past its deadline, lead with that. A summary that opens with
   totals and buries a breached deadline has inverted the priority.

## For `acknowledge`

1. Show the exact proposal payload and ask for explicit confirmation.
2. On confirmation, call `dsr_acknowledge_propose`.
3. Report the result as **"proposal created, pending DPO approval"** — never as
   "acknowledged" or "responded". A user who believes a request has been
   answered when only a draft exists may miss a statutory deadline.

## Rules

- Reference requests by ID. Never print the requester's name, email, or any
  personal data from a DSR record into chat.
- Never mark a request completed from this command.
- Deadlines come from the server. If a request has no `dueAt`, flag it as a
  data-quality defect — an untracked deadline is one that will be missed.
