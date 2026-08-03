---
name: dpdp-sdk-selector
description: Choose the correct DPDP Guard component for a given stack — embeddable consent widget, JS/React Native/native mobile SDKs, server SDKs, the published API contract, or the MCP agent surface — before any integration work begins. Use when deciding how an application should talk to DPDP Guard, or when an existing integration targets a package that does not exist.
triggers:
  - which dpdpguard sdk
  - dpdpguard sdk options
  - dpdp guard component
  - choose dpdp integration
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# Choosing a DPDP Guard Component

DPDP Guard is not a single SDK. It is a platform with **five distinct
integration surfaces**, each with its own credential class, its own release
cadence, and its own set of things it can and cannot do. Picking the wrong one
produces an integration that compiles and still leaves the fiduciary's
obligations unmet.

Run this skill **before** `dpdp-integration`, `dpdp-server-sdk`,
`dpdp-consent-widget`, or `dpdp-mcp-connect`. It decides which of them applies.

## There is no package called `@dpdpguard/sdk`

If the user, or an existing file in the repo, refers to `@dpdpguard/sdk`, that
package does not exist. Say so and resolve to a real one from the table below
rather than installing a name that will 404 — or, worse, resolve to somebody
else's squatted package.

The authoritative list of shipped packages, their registries, and their current
versions lives in `references/component-matrix.md`. Read it before naming a
package or a version. Versions move; **verify against the registry** (`npm view
<pkg> version`, `pip index versions dpdpguard-sdk`, the Maven Central artifact
page) rather than writing a remembered string into a manifest.

## The five surfaces

| Surface | Credential | Use it for |
|---|---|---|
| **Embeddable widget** (`consent.js`) | none — public org/domain id | A website that needs a consent banner and tracker auto-blocking with no build step |
| **Client SDKs** (React Native, Android, iOS, Flutter; `@dpdpguard/js` for public reads) | brokered principal token, or anonymous | In-app consent capture, on-device tracker gating, DSR/grievance/nomination filing by the data principal |
| **Server SDKs** (`@dpdpguard/server`, `dpdpguard-sdk`, `ai.dpdpguard:server-sdk`, `@dpdpguard/convex`) | service API key | Server-side consent gating before processing, token brokering, webhook receipt, audit-hash verification |
| **Contract** (`@dpdpguard/contract`) | n/a | Generating a typed client for a language with no official SDK; pinning the wire shape; error-catalog handling |
| **MCP agent surface** (`/mcp/v1`) | scoped agent key or delegated OAuth grant | An agent (Claude Code, Cowork) reading compliance posture and raising proposals for human approval |

Two selections are easy to get wrong and worth checking explicitly:

- **A Convex backend takes `@dpdpguard/convex`, not `@dpdpguard/server`.** It is
  a Convex Component — reactive local caching, webhook routes mounted for you,
  isolated schema, and Web Crypto so it runs in the V8 runtime.
- **`@dpdpguard/js` is the public, unauthenticated slice only.** Org, notices,
  banner config, anonymous consent. DSR, grievances, nominations, and token
  brokering are `@dpdpguard/server`. Choosing js for a rights portal produces an
  integration that cannot file anything.

These are not alternatives to one another in the general case. A typical
production integration uses **three at once**: widget or client SDK for
capture, server SDK for enforcement and webhooks, MCP for the DPO's agent
workflow.

## Decision procedure

1. **Read the repo before asking anything.** Identify every deployable in the
   workspace — check for `package.json`, `pubspec.yaml`, `build.gradle{,.kts}`,
   `Package.swift`, `go.mod`, `pyproject.toml`, `requirements.txt`, `*.csproj`.
   A monorepo usually needs a different answer per app.

2. **Classify each deployable** as one of: static site / SSR web app / SPA /
   native mobile app / backend service / data or ML pipeline. State the
   classification and the file that told you.

3. **Map to a surface** using the table above and the matrix in
   `references/component-matrix.md`.

4. **Check the language actually has an official SDK.** If it does not — Go,
   Ruby, PHP, .NET, Rust — do **not** hand-roll a client and do not claim SDK
   support that does not exist. Route to `dpdp-contract-conformance`, which
   generates a typed client from `@dpdpguard/contract`'s OpenAPI spec.

5. **Name the credential class for each surface you selected**, and state
   explicitly which ones must never appear in a client bundle. This is the step
   that prevents the most common serious defect in a DPDP Guard integration.

6. **Report the plan before writing any code**, then hand off to the specific
   integration skill.

## Credential classes — never conflate them

The platform enforces four credential classes at the resolver. Conflating them
is a security defect, not a style issue.

| Class | Prefix / form | Reaches | Never |
|---|---|---|---|
| Service API key | `dpdpg_live_…` | `/api/v1`, `/cm/v1` | in a browser bundle, mobile binary, or `NEXT_PUBLIC_`/`VITE_`/`EXPO_PUBLIC_` variable; cannot reach `/mcp/v1` |
| Brokered principal token | short-lived bearer, minted by `POST /api/v1/auth/broker-token` | one data principal's own records | minted client-side — the fiduciary's backend mints it with the service key |
| Scoped agent key | `dpdpg_agent_…` | `/mcp/v1` only | cannot reach `/api/v1` or `/cm/v1`; must carry an expiry |
| Delegated grant | OAuth 2.1 + PKCE bearer | `/mcp/v1` as one named human | cannot widen that human's role |

A brokered token is minted **server-side** from the fiduciary's own stable user
id (`externalId`). If a proposed design has a mobile app holding a service API
key to mint its own tokens, stop and say so: that ships an org-wide credential
to every device, and it is the failure this broker exists to prevent.

## What each surface cannot do

State these limits when recommending, because a team that discovers them late
rebuilds:

- **Widget:** web only. No native app coverage, no server-side enforcement.
  Consent it captures is real and audited; enforcement of that consent in the
  fiduciary's own backend is not something the widget can do.
- **Client SDKs:** cannot enforce consent for processing that happens on the
  server. On-device gating stops the device's own trackers; it says nothing
  about a nightly batch job.
- **Server SDKs:** no UI. They do not render a banner or a preference centre.
- **MCP surface:** no tool commits an evidentiary or outward-facing write. Every
  state change is a proposal a named human approves in the UI, and approval is
  deliberately not an MCP tool. Do not design a workflow that assumes an agent
  can file with the Board or send to a data principal.
- **All of them:** none of them make an organisation compliant. They are
  machinery for meeting specific obligations under the DPDP Act 2023 and the
  DPDP Rules; whether the obligations are met is assessed against the statute.

## Output

Produce a short integration plan, not a survey:

```
Deployables found
  apps/web        Next.js 15 (App Router)     → @dpdpguard/js + gate tags at root layout
  apps/mobile     Flutter 3.24                 → dpdpguard_flutter (pub.dev)
  services/api    FastAPI (Python 3.12)        → dpdpguard-sdk (PyPI) — enforcement + webhooks
  services/worker Go 1.23                      → no official SDK; generate from @dpdpguard/contract

Credentials
  DPDPGUARD_API_KEY        server-only   services/api, services/worker
  DPDPGUARD_ORG_ID         public        apps/web, apps/mobile
  (no client ever holds the service key; apps/mobile brokers via services/api)

Next: run dpdp-integration for apps/web, dpdp-server-sdk for services/api.
```

Then stop and let the user confirm before scaffolding.

## Boundaries

- Never install or reference a package you have not confirmed exists.
- Never recommend a component by capability you have not verified in
  `references/component-matrix.md` or in the installed package's own types.
- Never put a service API key behind a public environment-variable prefix.
- Recommending a component is an engineering decision, not a compliance
  determination. Say which obligation each component helps meet and which ones
  remain the fiduciary's to satisfy elsewhere.
