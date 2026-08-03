---
name: dpdp-child-protection
description: Age assurance, verifiable parental consent, and tracking suppression for minors under DPDP Act §9 and GDPR Art.8. Use when building age gates, parental consent flows, or suppressing behavioural tracking and targeted ads for child accounts.
triggers:
  - dpdp child
  - minor protection
  - age verification
  - parental consent
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
---

# Child Data Protection

Implement DPDP Act §9 and GDPR Art.8 controls for processing children's
personal data.

## The rules that actually bind

**Age thresholds differ by regime, and you must handle the stricter one.**

| Regime | Threshold | Requirement |
|---|---|---|
| DPDP §9 | Under **18** | Verifiable parental consent before any processing |
| GDPR Art.8 | Under **16** (member states may lower to 13) | Parental authorisation for information society services offered directly to a child |
| COPPA (US) | Under **13** | Verifiable parental consent |

For a service reaching Indian users, 18 is the operative threshold. This is
much higher than most product teams assume — flag it early, because it changes
the design of the whole signup flow.

**§9(3) is an absolute prohibition, not a consent question.** Tracking,
behavioural monitoring, and targeted advertising directed at children are
prohibited outright. Parental consent does **not** unlock them. If a developer
asks how to get consent for ad targeting on a minor account, the answer is that
no consent makes it lawful.

**§9(2)** additionally bars processing likely to cause any detrimental effect
on the well-being of a child.

## Workflow

1. **Determine whether §9 is in scope.** Does the service plausibly reach
   under-18s? Consumer apps, games, education, and social features almost
   always do. A B2B internal tool usually does not. State the conclusion and
   the reasoning.

2. **Map the child data surface.** Grep for existing signals — `age`, `dob`,
   `birth`, `minor`, `child`, `parent`, `guardian`, `school`, `grade`. Find
   every analytics and ad SDK initialisation, because each is a §9(3) exposure
   point.

3. **Design the age gate** (below).

4. **Design parental consent** if minors are in scope (below).

5. **Build the suppression layer** — this is the part teams get wrong.

6. **Verify** against the checklist and report residual gaps honestly.

## Age assurance

Collect the **minimum** needed to establish the threshold. Age assurance
creates its own data-minimisation problem: a DOB field to protect children is
itself new personal data about children.

Preference order:

1. **Birth year only** where a year is sufficient to clear the threshold
   unambiguously. Less precise, less identifying.
2. **Full DOB** where the boundary matters and year alone is ambiguous.
3. **Third-party age assurance** (DigiLocker, an age-estimation provider) where
   self-declaration is insufficient for the risk level.

Rules for the gate:

- **Neutral presentation.** Do not indicate which answer unlocks more of the
  product — a gate that signals "18+ gets the full experience" trains children
  to lie and is not a good-faith gate.
- **No pre-filled default** that clears the threshold.
- **Do not retain raw DOB** past the derivation if you only need the flag.
  Store `ageBand` / `isMinor` and discard the input where the product permits.
- **Persist the decision** server-side. A client-side `isMinor` flag is a
  suggestion, not a control.
- **Re-evaluate on birthday.** A minor becomes an adult; the flag must age out
  or it silently over-restricts and, worse, an adult flagged at signup stays
  mis-scoped forever.

## Verifiable parental consent

"Verifiable" is the operative word. A checkbox saying "I am a parent" is not
verification and will not survive scrutiny.

Acceptable approaches, in rough order of assurance:

1. Government-backed identity verification (DigiLocker) linking the adult to
   the child.
2. Signed consent through a verified channel with a corroborating factor.
3. Email or SMS confirmation to a parent-supplied address **plus** an
   independent factor — a nominal card transaction, a callback, or a
   knowledge-based check. Email alone is not verification; the child can supply
   their own address.

Implementation requirements:

- Consent record links `childSubjectId` → `parentSubjectId` with the
  verification method, evidence reference, and timestamp.
- The parent can **withdraw** at any time, and withdrawal must be as easy as
  granting.
- Withdrawal triggers the same processing stop as any consent withdrawal.
- Re-verify on material purpose change — consent to an education feature does
  not extend to a new social feature.
- Parental consent expires or is re-confirmed periodically; a consent captured
  when the child was 8 should not silently govern them at 16.

## Tracking suppression

This is where implementations fail. Suppression must happen **before** the SDK
loads, not after.

Wrong — the pixel has already fired and the identifier is already sent:

```js
initAnalytics()
if (user.isMinor) analytics.disable()
```

Right — nothing initialises until the account status is known:

```js
if (accountStatus === 'unknown') return          // fail closed
if (accountStatus === 'minor') return            // §9(3): never initialise
initAnalytics()
```

Requirements:

- **Fail closed.** Unknown age is treated as minor until established.
  Defaulting unknown to adult means every pre-authentication visitor is
  tracked, which is exactly the population that includes unverified children.
- **Suppress at load, not at runtime.** No script tag, no pixel, no `gtag`
  bootstrap on a minor path.
- **Cover server-side too.** Conversion APIs, server-side tagging, and
  warehouse exports are §9(3) surfaces as much as browser pixels.
- **Suppress derived profiling.** Recommendation models, lookalike audience
  exports, and engagement-optimisation loops trained on minor accounts are
  behavioural monitoring.
- **Do not exempt "essential" analytics.** Product analytics that build a
  behavioural profile of a child are within the prohibition regardless of
  internal categorisation.

## Verification checklist

- [ ] Age determined before any non-essential processing
- [ ] Unknown age fails closed to minor treatment
- [ ] Minor status stored server-side, not client-only
- [ ] Parental consent uses a genuinely verifiable method
- [ ] Parent↔child link recorded with method and evidence reference
- [ ] Parental withdrawal implemented and as easy as granting
- [ ] No analytics/ad SDK initialises on a minor path — verified by reading the
      load path, not by trusting a config flag
- [ ] Server-side tracking and exports also suppressed
- [ ] No lookalike/audience export includes minor accounts
- [ ] Minor flag re-evaluates as the child ages
- [ ] Raw DOB discarded where only the band is needed

## Boundaries

- Never generate code that targets ads at, or behaviourally profiles, a known
  minor. If asked, explain that §9(3) admits no consent-based exception and
  offer the compliant alternative (contextual, non-profiling).
- Do not assert that a service is out of scope for §9 on the developer's
  say-so. Record the basis for the conclusion.
- §9(4) permits the Central Government to exempt classes of fiduciaries or
  relax the threshold by notification. Do not rely on an exemption unless the
  user identifies the specific notification that covers them.
