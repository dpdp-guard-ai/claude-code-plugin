---
name: dpdp-connect
description: Connect this workspace to a DPDPGuard tenant — pick the SDK or component for each deployable, and wire up the MCP agent surface
argument-hint: "[mcp|sdk|all] [--tenant https://<deployment>.convex.site]"
triggers:
  - /dpdp-connect
allowed-tools:
  - Read
  - Grep
  - Glob
  - Write
  - Edit
  - Bash
---

Connect this workspace to DPDPGuard. Use the **dpdp-sdk-selector** skill to
choose components and the **dpdp-mcp-connect** skill to wire the agent surface.
Follow those skills rather than improvising a setup.

Arguments: `$ARGUMENTS`

## Modes

- `sdk` — resolve every deployable in the workspace to the right DPDPGuard
  component and report the integration plan. Does not install anything.
- `mcp` — configure MCP access to the tenant's `/mcp/v1` agent surface.
- `all` (default) — both, `sdk` first.

## Steps

1. **Inventory the workspace.** Find every deployable via its manifest and
   classify each one. In a monorepo the answer usually differs per app — say so
   rather than picking one answer for the repo.

2. **Resolve components.** Map each deployable to a real, published package.
   There is no `@dpdpguard/sdk`. Verify anything you name against its registry
   before writing it into a manifest.

3. **Name the credential class per surface** and state which values must never
   reach a client bundle. A service API key behind `NEXT_PUBLIC_`/`VITE_`/
   `EXPO_PUBLIC_` is a credential leak, not a config choice.

4. **For `mcp`:** ask for the tenant base URL — it is per-deployment and cannot
   be guessed. Recommend a **delegated OAuth grant** for interactive sessions
   and a scoped agent key only for unattended ones. Request the narrowest scope
   set that covers the intended work.

5. **Verify** with `capabilities_list` and report what the credential can
   actually reach. Capability is a runtime property of scopes, plan tier, and
   feature flags — the catalog alone does not answer it.

6. **Report the plan and stop.** Do not install packages or write credentials
   without explicit confirmation.

## Rules

- Never write a real key or token into a file — environment variables only, and
  placeholders in `.env.example`.
- Never print an API key or bearer token, including in a config diff.
- Never claim SDK support for a language that has none. Route it to
  `dpdp-contract-conformance` for a generated client instead.
- If the workspace has a backend, say plainly that a client-only integration
  leaves server-side enforcement, token brokering, and withdrawal propagation
  unimplemented.
- Connecting components is engineering work, not a compliance determination.
