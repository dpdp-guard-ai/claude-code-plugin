---
name: dpdp-consent-builder
description: Generates DPDP-compliant consent banners, granular purpose toggles, and privacy notices localised into the 22 Eighth Schedule Indian languages. Use when building or fixing a cookie banner, consent flow, or privacy notice page.
triggers:
  - dpdp consent
  - build consent
  - generate banner
  - privacy notice
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
---

# Consent & Notice Builder

Generate consent UI and privacy notices that satisfy DPDP Act §5–§6, GDPR
Art.7, CCPA §1798.120, and PDPA §19.

## Non-negotiable design rules

These are the rules the audit engine checks for. Any component you generate
must satisfy all of them, and you should refuse to generate a component that
knowingly breaks one:

1. **Nothing is pre-selected.** Every non-essential purpose starts `false`.
   Essential/strictly-necessary processing is not consented to at all — it is
   disclosed, not toggled.
2. **Reject is as easy as accept.** Same visual weight, same click depth, same
   surface. One click to reject all, on the first layer.
3. **Purposes are separate.** One toggle per purpose. Never join purposes with
   "and" behind one control.
4. **Withdrawal is as easy as giving.** A persistent entry point (settings
   link, footer link, or reopen handle) that reaches the same panel.
5. **No implied consent.** Scrolling, dismissing, or continuing to browse never
   counts as acceptance. There is no `X` that means "accept".
6. **Nothing fires before the decision.** Tags, pixels, and non-essential
   cookies stay unloaded until consent is recorded.
7. **The decision is logged.** Persist purpose, timestamp, notice version,
   language, and method — DPDP §6(1) puts the burden of proof on the fiduciary.

## Workflow

1. **Detect the stack.** Read `package.json` / `pubspec.yaml` / `go.mod` and
   look at existing component conventions before writing anything. Match the
   project's framework, styling system (Tailwind / CSS modules / styled
   components), and TypeScript strictness. Do not introduce a new UI library.

2. **Find what already exists.** Grep for `consent|cookie|banner|gdpr|privacy`.
   If a banner is already there, prefer fixing it in place over generating a
   parallel one — report which of the seven rules it breaks and patch those.

3. **Confirm the purpose list with the user.** Do not invent purposes. Ask
   which of these apply, and whether any are load-bearing:
   `essential` (always on, disclosed only), `analytics`, `marketing`,
   `personalisation`, `third-party-sharing`.

4. **Collect the notice facts.** A notice cannot be generated from guesswork.
   Ask for, or read from `.dpdpguard.yaml`: fiduciary legal name, registered
   address, DPO/grievance officer contact, retention periods per purpose, and
   whether personal data leaves India. If the user cannot supply a field, emit
   an explicit `TODO(dpdp):` marker rather than plausible filler — a notice with
   invented retention periods is worse than one with visible gaps.

5. **Generate.** Consent state module, banner/preferences component, and the
   notice route. Use `references/notice-checklist.md` for required disclosures
   and `references/languages.md` for locale handling.

6. **Wire the tag gate.** Consent that does not actually gate the tags is
   decorative. Show the user exactly where the analytics initialisation must
   move to.

7. **Report what remains.** List every `TODO(dpdp):`, every purpose left
   unwired, and state plainly that the notice text needs legal review before
   it ships.

## Consent record shape

Persist a record per decision. This is the evidence artefact:

```jsonc
{
  "subjectId": "usr_123",          // or an anonymous cookie ID pre-login
  "purposes": {
    "analytics": true,
    "marketing": false
  },
  "noticeVersion": "2026-08-01",   // must match the notice actually shown
  "language": "hi",                // language the notice was displayed in
  "method": "banner_explicit",     // banner_explicit | preferences | api
  "timestamp": "2026-08-01T10:30:00Z",
  "ipCountry": "IN"                // coarse region only, never a full IP
}
```

Withdrawal writes a **new** record with the purpose set to `false`. Never
mutate or delete the prior record — the history is the audit trail.

## Localisation

DPDP §5(3) gives the data principal the right to access the notice in English
or any of the 22 Eighth Schedule languages. See `references/languages.md` for
the full list with locale codes.

**Do not machine-translate the notice body.** Generate the locale scaffolding,
key structure, and language switcher; leave the legal text for professional
translation. A mistranslated purpose description is a compliance defect, and it
is one that will not be caught by review in a language the team does not read.
Mark untranslated strings so they are visibly missing rather than silently
falling back to English.

## Verify before you finish

- [ ] Every non-essential toggle defaults to `false`
- [ ] Reject-all is reachable in one click from the first layer
- [ ] Withdrawal entry point exists and reaches the preferences panel
- [ ] No tag, pixel, or non-essential cookie executes before a decision
- [ ] Consent record captures purpose, version, language, method, timestamp
- [ ] Notice covers every item in `references/notice-checklist.md`
- [ ] Dismiss/close does not record consent
- [ ] Banner is keyboard-navigable and screen-reader labelled

## Boundaries

Generated notice text is a **drafting aid, not legal advice**. Say so when you
hand it over. The fiduciary's counsel owns the final wording.
