---
name: dpdp-integrate
description: Guided DPDPGuard SDK integration — detect the stack, wire the provider, scaffold consent and DSR
argument-hint: "[--framework react|next|vue|flutter|node|django] [--skip-scaffold]"
triggers:
  - /dpdp-integrate
allowed-tools:
  - Read
  - Grep
  - Glob
  - Write
  - Edit
  - Bash
---

Integrate the DPDPGuard SDK using the **dpdp-integration** skill.

Arguments: `$ARGUMENTS`

## Steps

1. **Detect the stack** from the manifest (`package.json`, `pubspec.yaml`,
   `go.mod`, `pyproject.toml`, `build.gradle`, `Package.swift`), unless
   `--framework` was supplied. State what you detected and wait for correction
   if the signal was ambiguous.

2. **Learn the conventions.** Open two or three existing components or
   handlers. Match module system, TypeScript strictness, styling approach,
   directory layout, and error-handling idiom.

3. **Detect the package manager from the lockfile** before installing. Using
   the wrong one creates a second lockfile.

4. **Resolve the stack to a real package** with the **dpdp-sdk-selector** skill,
   then verify the version exists (`npm view <pkg> version` or the ecosystem
   equivalent) rather than writing a remembered version string. There is no
   `@dpdpguard/sdk`; the real packages are `@dpdpguard/js`,
   `@dpdpguard/react-native`, `@dpdpguard/server`, `dpdpguard-sdk` (PyPI),
   `ai.dpdpguard:consent-sdk` / `:server-sdk`, `DPDPGuardConsent` (SPM), and
   `dpdpguard_flutter`.

5. **Install and wire the provider** at the app root, outside the router.

6. **Configure credentials.** Placeholders into `.env.example` always. Real
   values into `.env` only if supplied, and only after confirming `.env` is
   gitignored. Check every variable's prefix — a server key behind
   `NEXT_PUBLIC_`/`VITE_` ships to the browser.

7. **Gate the tags.** Move analytics and pixel initialisation behind the
   consent check. An SDK installed while `gtag` still fires unconditionally has
   changed nothing.

8. **Generate `.dpdpguard.yaml`** if absent. Tell the user that telemetry
   defaults on and how to turn it off — do not let a privacy tool enable
   outbound telemetry silently.

9. **Scaffold the baseline** via `/dpdp-consent` and the `dpdp-dsr-setup`
   skill, unless `--skip-scaffold`.

10. **Verify** with the project's own build, typecheck, and lint scripts.
    Report the actual output. Fix breakage before handing over.

## Handover report

- Files created and modified
- Environment variables added, flagged public vs server-only
- Build/typecheck/lint result — real output, not a claim
- **What is not done**: purposes unwired, tags still ungated, notice text
  pending legal review, locales untranslated

## Rules

- Never commit real credentials.
- Never overwrite an existing consent implementation without asking.
- Never invent SDK APIs — read the installed package's types instead of
  guessing at method signatures.
