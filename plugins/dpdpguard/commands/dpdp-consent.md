---
name: dpdp-consent
description: Generate a DPDP-compliant consent banner, preference centre, and privacy notice
argument-hint: "[--purposes analytics,marketing] [--locales en,hi,ta]"
triggers:
  - /dpdp-consent
allowed-tools:
  - Read
  - Grep
  - Glob
  - Write
  - Edit
---

Scaffold consent UI and a privacy notice using the **dpdp-consent-builder**
skill.

Arguments: `$ARGUMENTS`

## Steps

1. **Detect the stack and its conventions.** Read the manifest, then open two
   or three existing components. Match the framework, module style, styling
   system, and TypeScript strictness. Do not introduce a new UI library.

2. **Check for an existing consent implementation** (grep
   `consent|cookie|banner|gdpr`). If one exists, report which of the seven
   design rules it breaks and patch it in place rather than generating a second
   parallel system.

3. **Confirm the purpose list** with the user unless `--purposes` was given.
   Do not invent purposes.

4. **Collect the notice facts**: fiduciary legal name, registered address,
   grievance officer contact, retention period per purpose, and whether data
   leaves India. Resolve them tenant-first (`org_profile_get`), then
   `.dpdpguard.yaml`, then the user — do not ask the user to restate what the
   tenant already holds. For anything no source supplies, emit an explicit
   `TODO(dpdp):` marker — never plausible filler.

5. **Generate** the consent state module, banner + preference centre, and the
   notice route.

6. **Show where the tag gate goes.** Point at the exact analytics
   initialisation that must move behind the consent check.

7. **Report** every `TODO(dpdp):`, every purpose left unwired, and state that
   the notice text needs legal review before it ships.

## Non-negotiable in generated code

- Nothing pre-selected; non-essential purposes default to `false`
- Reject-all reachable in one click from the first layer, at equal prominence
- One toggle per purpose — never bundled
- A persistent withdrawal entry point
- Dismissing or scrolling never records consent
- No tag or pixel executes before a decision
- Consent record captures purpose, timestamp, notice version, language, method

## Rules

- Only list locales in the switcher that are genuinely translated.
- Do not machine-translate notice body text — generate the locale scaffolding
  and leave the legal text for professional translation.
- Generated notice text is a drafting aid, not legal advice. Say so.
