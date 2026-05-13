# CareerNavigator

Eightfold careerhub entity. Auto-generated docs for `career_navigator`.

## Operations

| Op | Method | Path | Caller ID |
|----|--------|------|-----------|
| getById | GET | `/career-navigator/recommended-paths/{userEmail}` | `career-navigator-search` |
| list | GET | `/career-navigator/recommended-courses/{userEmail}` | `career-navigator-recommended-courses-list` |

## Hooks

- `useCareerNavigator(id)` — fetch single (op: `getById`)
- `useCareerNavigators(filters?)` — paginated list (op: `list`)

## Services (non-React contexts)

- `getCareerNavigator` — op: `getById`
- `listCareerNavigators` — op: `list`

## Example

```ts
import { useCareerNavigators } from "@/features/eightfold-api";

const { data, isLoading } = useCareerNavigators();
```
