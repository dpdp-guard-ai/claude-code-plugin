---
name: dpdp-integration
description: Guided integration of the DPDPGuard SDK into an existing application — framework detection, provider wiring, credential setup, and baseline consent/DSR scaffolding across web, mobile, and backend stacks.
triggers:
  - dpdp integrate
  - add dpdpguard
  - setup sdk
  - integrate privacy
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Bash
---

# SDK Integration

Wire DPDPGuard into an existing application without disrupting its
conventions.

## Before generating anything

**Read the project first.** The most common failure here is scaffolding that
looks generic and lands badly — a Tailwind component in a CSS-modules project,
a default-export in a codebase that uses named exports, JavaScript in a
TypeScript-strict repo.

1. **Detect the stack.** Read the manifest — `package.json`, `pubspec.yaml`,
   `build.gradle`, `Package.swift`, `go.mod`, `requirements.txt`,
   `pyproject.toml`.
2. **Detect conventions.** Open two or three existing components or handlers.
   Note module system, TypeScript strictness, styling approach, directory
   layout, test framework, and error-handling idiom. Match all of it.
3. **Check what exists.** Grep for `consent|privacy|cookie|gdpr|dpdp`. Never
   generate a second consent system alongside a working one — integrate with
   what is there.
4. **Confirm the package actually exists** at the version you intend to add.
   Run `npm view @dpdpguard/sdk version` (or the ecosystem equivalent) rather
   than writing a version string from memory into a manifest.

## Supported stacks

| Layer | Frameworks |
|---|---|
| Web | React, Next.js (App + Pages Router), Remix, Vue, Nuxt, Angular, Svelte/SvelteKit |
| Mobile | React Native, Flutter, iOS (Swift), Android (Kotlin) |
| Backend | Node (Express, Fastify, Hono, NestJS), Python (FastAPI, Django), Go |

For anything not listed, integrate against the HTTP API directly rather than
claiming SDK support that does not exist.

## Integration steps

1. **Install** the SDK with the project's own package manager — detect it from
   the lockfile (`package-lock.json` → npm, `yarn.lock` → yarn,
   `pnpm-lock.yaml` → pnpm, `bun.lock` → bun). Using the wrong one creates a
   second lockfile and a confusing diff.

2. **Configure credentials.** Client key in the app config; **server key never
   reaches the client bundle.**
   - Add to `.env.example` with placeholder values, always.
   - Add to `.env` only if the user supplies real values, and confirm `.env` is
     gitignored before writing.
   - In Next.js/Vite, remember that `NEXT_PUBLIC_`/`VITE_` prefixes ship the
     value to the browser. A server key behind a public prefix is a credential
     leak — check the prefix on every variable you add.

3. **Mount the provider** at the app root, outside the router, so consent state
   is available to every route. For SSR frameworks, confirm the provider is
   client-side where it touches browser storage.

4. **Gate the tags.** Move analytics and pixel initialisation behind the
   consent check. This is the step that makes the integration real — an SDK
   installed while `gtag` still fires unconditionally in the root layout has
   changed nothing.

5. **Scaffold the baseline**, using the dedicated skills rather than improvising:
   - consent banner and notice → `dpdp-consent-builder`
   - rights portal and handlers → `dpdp-dsr-setup`

6. **Verify** — build, typecheck, and lint using the project's own scripts.
   Report the actual output. If the build breaks, fix it before handing over;
   do not report success on an unbuilt integration.

## Configuration file

Generate `.dpdpguard.yaml` if absent:

```yaml
version: 2
organization:
  id: ""
  name: ""
  sector: ""
  isSignificantDataFiduciary: false      # affects DPO and DPIA obligations

regulations: [dpdp, gdpr, ccpa, pdpa]

audit:
  severity_threshold: medium
  ci_fail_on: high
  exclude_paths: ["node_modules/", "dist/", "build/", "*.test.*"]

consent:
  default_locale: en
  supported_locales: [en]                # only locales actually translated

telemetry:
  enabled: true                          # anonymised rule-hit metrics
```

Set `supported_locales` to what is genuinely translated. Listing 22 locales
that fall back to English creates a misleading language switcher.

Tell the user explicitly that telemetry defaults on and how to disable it
(`telemetry.enabled: false` or `DPDPGUARD_TELEMETRY=false`). Do not let a
data-privacy tool enable outbound telemetry silently — surface it at the moment
you write the config.

## Handover report

State plainly:

- Files created and modified
- Environment variables added, and which are public vs server-only
- Build/typecheck/lint result — actual output, not a claim
- **What is not yet done**: purposes not wired, tags still ungated, notice text
  needing legal review, locales not translated

## Boundaries

- Never commit real credentials. `.env.example` gets placeholders.
- Never write a server-side key into a client-exposed variable.
- Never overwrite an existing consent implementation without asking.
- Never invent SDK APIs. If unsure of a method signature, read the installed
  package's types under `node_modules/@dpdpguard/sdk` rather than guessing —
  scaffolding that calls methods which do not exist is worse than none.
