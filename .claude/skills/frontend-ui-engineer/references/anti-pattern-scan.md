# Anti-Pattern Scan (shared)

This is the **single source of truth** for the 5-point React anti-pattern scan. Both `frontend-ui-engineer` (self-check before handoff) and `quality-assurance` (cross-check pre-flight) run the scans below.

Every command uses portable ERE (`grep -rEn` / `rg`) — no BRE alternation (`\|`), no PCRE-only flags (`grep -oP`). File iteration uses a pure-bash loop so the check works identically on macOS (BSD grep) and Linux (GNU grep).

Run all 5 scans. A scan **passes** when it returns empty output, OR every hit has been reviewed and justified in the handoff notes. Any unreviewed hit blocks handoff.

---

## 1. `useState` initializer with `useQuery` data

Catches: `useState(() => buildFromApiData(assessment))` where `assessment` comes from a `useQuery` hook. The initializer runs once on first render with `undefined`; subsequent `useQuery` data arrivals never update the derived state.

```bash
grep -rEn "useState.*=>.*(data\.|build.*data|transform|parse)" frontend/src/routes/ frontend/src/features/
```

Review each hit. If the initializer references `data` from a `useQuery` hook, it is **WRONG**. Correct pattern: `useState({})` + a `useEffect` that sets state when data arrives.

---

## 2. `useState` initializer reading from async props

Catches: `useState(props.answer)` where the parent passes props derived from a pending query. First render sees `undefined`; later values never flow in.

```bash
grep -rEn "useState\((answer|response|draft|saved)" frontend/src/
```

Review: if the prop is `undefined` on first render (because the parent is still loading), this is a bug. Convert to lifted state or sync with `useEffect`.

---

## 3. Mock data imports in production pages

Catches: leftover dev-only imports that should have been replaced by API hooks.

```bash
grep -rEn "from .@/mocks|from .*mock|MOCK_|mockData|sampleData" frontend/src/routes/ frontend/src/features/
```

MUST return empty. Any match is a handoff blocker.

---

## 4. Hardcoded placeholder strings

Catches: `"TODO"`, `"Coming soon"`, `"Not implemented"`, `"placeholder"` left in production pages.

```bash
grep -rEn "'TODO'|\"TODO\"|'Coming soon'|\"Coming soon\"|'Not implemented'|'placeholder'" frontend/src/routes/ frontend/src/features/
```

Review each hit. Production code must not contain placeholder text. Exception: visible copy deliberately marked "TBD" with an accompanying `UNGREPPABLE` tag in the story acceptance criteria.

---

## 5. Forms without a validation schema (P1)

Catches: a form with a submit handler that has no Zod schema, no imported shared schema, and no sibling `schema.ts`.

```bash
for f in $(grep -rln "onSubmit\|handleSubmit" frontend/src/routes/ frontend/src/features/); do
  if ! grep -q "zodResolver\|z\.\|zod" "$f" && ! [ -f "$(dirname "$f")/schema.ts" ]; then
    echo "FORM LACKS VISIBLE ZOD INTEGRATION (verify manually): $f"
  fi
done
```

Priority: **P1**. The detector flags files without visible Zod usage and without a sibling `schema.ts`. A file can still be validated via `react-hook-form`'s `validate` option, a custom Yup schema, or an imported schema from a non-sibling path — any hit is a manual verify, not an auto-block.

---

## Scan Output Template

When reporting scan results, use this table format. Every hit is either "empty" (scan passed) or reviewed with a one-line justification.

```
ANTI-PATTERN SCAN -- <skill> -- <phase/feature>
| # | Check                                | Hits | Outcome                                    |
|---|--------------------------------------|------|--------------------------------------------|
| 1 | useState with useQuery data          | 0    | PASS                                       |
| 2 | useState with async props            | 1    | REVIEWED: parent guarantees non-null prop  |
| 3 | Mock imports in production           | 0    | PASS                                       |
| 4 | Hardcoded placeholder strings        | 0    | PASS                                       |
| 5 | Forms without visible Zod (P1)       | 2    | REVIEWED: both use shared ../schemas.ts    |
```

Empty output is the target. Reviewed-and-justified hits are acceptable; unreviewed hits block handoff.
