# Insight

Eightfold insights entity. Insights endpoints giving information about candidates for positions. 
Note: A new parameter 'distributionFieldsLimit' is added which specifies the count of top <distributionFieldsLimit> values of a particular field.

## Operations

| Op | Method | Path | Caller ID |
|----|--------|------|-----------|
| list | GET | `/profile-insights` | `profile-insights-list-search` |
| create | POST | `/talent-traits` | `talent-traits-insights-create` |
| listEmployeesDiversityInsights | GET | `/diversity/employees` | `employees-diversity-insights-list` |

## Hooks

- `useInsights(filters?)` — paginated list (op: `list`)
- `useCreateInsight()` — mutation (op: `create`)
- `useListEmployeesDiversityInsights(args?: { path?, query? }, options?)` — GET `/diversity/employees` (op: `listEmployeesDiversityInsights`)

## Services (non-React contexts)

- `listInsights` — op: `list`
- `createInsight` — op: `create`
- `listEmployeesDiversityInsights(args?: { path?, query?, body? })` — op: `listEmployeesDiversityInsights` (GET `/diversity/employees`)

## Example

```ts
import { useInsights } from "@/features/eightfold-api";

const { data, isLoading } = useInsights();
```
