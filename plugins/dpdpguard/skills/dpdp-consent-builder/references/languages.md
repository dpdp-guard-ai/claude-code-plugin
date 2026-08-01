# Eighth Schedule Languages

DPDP Act §5(3) entitles a data principal to receive the notice in English or in
any language listed in the **Eighth Schedule to the Constitution of India**.

## The 22 languages

| # | Language | Code | Script | Direction |
|---|---|---|---|---|
| 1 | Assamese | `as` | Bengali–Assamese | LTR |
| 2 | Bengali | `bn` | Bengali–Assamese | LTR |
| 3 | Bodo | `brx` | Devanagari | LTR |
| 4 | Dogri | `doi` | Devanagari | LTR |
| 5 | Gujarati | `gu` | Gujarati | LTR |
| 6 | Hindi | `hi` | Devanagari | LTR |
| 7 | Kannada | `kn` | Kannada | LTR |
| 8 | Kashmiri | `ks` | Perso-Arabic (also Devanagari) | **RTL** |
| 9 | Konkani | `kok` | Devanagari | LTR |
| 10 | Maithili | `mai` | Devanagari | LTR |
| 11 | Malayalam | `ml` | Malayalam | LTR |
| 12 | Manipuri (Meitei) | `mni` | Meitei Mayek / Bengali | LTR |
| 13 | Marathi | `mr` | Devanagari | LTR |
| 14 | Nepali | `ne` | Devanagari | LTR |
| 15 | Odia | `or` | Odia | LTR |
| 16 | Punjabi | `pa` | Gurmukhi | LTR |
| 17 | Sanskrit | `sa` | Devanagari | LTR |
| 18 | Santali | `sat` | Ol Chiki | LTR |
| 19 | Sindhi | `sd` | Perso-Arabic (also Devanagari) | **RTL** |
| 20 | Tamil | `ta` | Tamil | LTR |
| 21 | Telugu | `te` | Telugu | LTR |
| 22 | Urdu | `ur` | Perso-Arabic | **RTL** |

Plus `en` (English) as the statutory alternative — 23 locales in total.

## Implementation notes

**Direction.** Kashmiri, Sindhi, and Urdu are right-to-left in their
Perso-Arabic scripts. Set `dir="rtl"` on the notice container for these
locales and verify the consent banner layout does not break — button order
mirrors, and any icon with directional meaning must flip.

**Fonts.** Ol Chiki (Santali) and Meitei Mayek (Manipuri) are not present in
most default system font stacks. Either bundle a webfont (Noto Sans Ol Chiki,
Noto Sans Meetei Mayek) or the text renders as tofu boxes. Check this — a
notice that renders as empty rectangles has not been provided in that language
in any meaningful sense.

**Scope.** Do not claim support for a language whose strings are not actually
translated. If the language switcher lists all 22 but 19 fall back to English,
the switcher is misleading. List only what is translated, and let the rest be
requestable.

## Suggested file layout

```
locales/
├── en/notice.json      # source of truth, authored with counsel
├── hi/notice.json
├── ta/notice.json
└── _meta.json          # which locales are review-complete
```

`_meta.json` tracks translation state so the switcher can render only
completed locales:

```jsonc
{
  "en": { "status": "approved", "reviewedBy": "counsel", "version": "2026-08-01" },
  "hi": { "status": "approved", "reviewedBy": "counsel", "version": "2026-08-01" },
  "ta": { "status": "draft",    "reviewedBy": null,     "version": "2026-08-01" }
}
```

Only `approved` locales should be selectable in production.

## Minimum viable localisation

Full 22-language coverage is expensive. A defensible reduced scope:

1. English + Hindi at launch (§5(3) is satisfied on request, not necessarily
   upfront for every language).
2. Add languages by actual user geography — check your own region analytics.
3. Provide a documented request channel for any Eighth Schedule language not
   yet translated, and honour it.

State this trade-off to the user rather than silently shipping 3 of 22 while
the UI implies 22.
