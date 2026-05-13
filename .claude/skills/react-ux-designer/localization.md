# Localization Rules

**Always localize date, time, number, and currency formatting.** Never hardcode a locale string like `"en-US"` to `Intl.*` or `toLocale*` methods. The boilerplate ships with `react-i18next` configured (`i18next-browser-languagedetector` picks up the user's preferred locale); your formatting code must use the same source.

This applies to mock screens too. The prototype is reviewed by stakeholders in many regions; a hardcoded `"en-US"` formatter renders dates as `Nov 14, 2022` for a German reviewer who expects `14.11.2022` — a small detail that signals "this isn't actually localized."

---

## The Rule

Pass `undefined` as the locale to inherit from the runtime, OR explicitly pass the active i18next language.

```ts
// ❌ WRONG — hardcoded English
date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
date.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

// ✅ ACCEPTABLE — defers to browser/user locale
date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" })

// ✅ BEST — coupled to the i18next language so it stays in sync with UI strings
import i18n from "@/common/i18n"
date.toLocaleDateString(i18n.language, { year: "numeric", month: "short", day: "numeric" })
new Intl.NumberFormat(i18n.language, { style: "currency", currency: "USD" })
```

The "BEST" form is preferred in features/components. The "ACCEPTABLE" form is fine for shared utilities that don't have access to i18n context.

---

## Coverage — every formatting call

| API | Wrong | Right |
|---|---|---|
| `Date.prototype.toLocaleDateString` | `("en-US", opts)` | `(undefined, opts)` or `(i18n.language, opts)` |
| `Date.prototype.toLocaleTimeString` | `("en-US", opts)` | `(undefined, opts)` or `(i18n.language, opts)` |
| `Date.prototype.toLocaleString` | `("en-US", opts)` | `(undefined, opts)` or `(i18n.language, opts)` |
| `Number.prototype.toLocaleString` | `("en-US", opts)` | `(undefined, opts)` or `(i18n.language, opts)` |
| `Intl.DateTimeFormat` | `new Intl.DateTimeFormat("en-US", opts)` | `new Intl.DateTimeFormat(undefined, opts)` |
| `Intl.NumberFormat` | `new Intl.NumberFormat("en-US", opts)` | `new Intl.NumberFormat(undefined, opts)` |
| `Intl.RelativeTimeFormat` | `new Intl.RelativeTimeFormat("en", ...)` | `new Intl.RelativeTimeFormat(undefined, ...)` |
| `Intl.PluralRules` | `new Intl.PluralRules("en", ...)` | `new Intl.PluralRules(undefined, ...)` |

---

## Reference: format-helper module

The canonical format helpers ship with the boilerplate at **[`boilerplate/frontend/src/common/format.ts`](../../../boilerplate/frontend/src/common/format.ts)**. After project setup copies the boilerplate into `frontend/`, the helpers are importable as `@/common/format`.

```ts
// In any feature/component
import {
  formatDate,
  formatDateTime,
  formatCurrency,
  formatNumber,
  formatFileSize,
} from '@/common/format'

formatDate('2026-04-15')                       // locale-aware date
formatDate('2026-04-15', { relative: true })   // "in 2 days" within a 30-day window
formatDateTime('2026-04-15T09:30:00Z')         // date + time
formatCurrency(125_000, 'USD')                 // pass tenant currency, don't rely on default
formatFileSize(2_457_600)                      // "2.3 MB"
```

**Always import from `@/common/format`** instead of calling `toLocale*` / `Intl.*` directly. This keeps locale handling in one place — change the resolver once and every formatter follows. If you need a new format (relative time spans, percentages, units), add it to that module rather than rolling a one-off helper inside a feature.

If you find yourself reaching for `toLocaleDateString(...)` inline, stop and import from `@/common/format` instead. If the helper you need doesn't exist yet, add it there.

---

## UI strings (for completeness)

Strings rendered to the user should also be wrapped with `useTranslation()` in production code. In mock screens, you can leave English strings inline — but never hardcode region-specific formatting (dates, currency) anywhere.

```tsx
// In production code (and ideally in mock screens too):
import { useTranslation } from 'react-i18next'

function Header(): ReactElement {
  const { t } = useTranslation()
  return <h1>{t('directory.title')}</h1>
}
```

---

## Currency code default

When the displayed currency isn't user-personal (e.g. company-wide compensation field), default to the tenant's currency — not `"USD"`. For mock data, choose a currency that matches the tenant location (e.g. `"GBP"` for a London office). The `formatCurrency` signature above accepts a `currency` argument so callers pass the right code per record.

---

## Verification

Quick check before handoff: grep your screens for hardcoded locale strings.

```bash
grep -rn '"en-US"\|"en-GB"\|"en"' frontend/src --include='*.ts' --include='*.tsx'
```

Should return zero hits in your code (excluding `i18next` setup files). If anything matches, fix it before forger reviews.
