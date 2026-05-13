# Demand

Eightfold core entity. employee description.

## Operations

| Op | Method | Path | Caller ID |
|----|--------|------|-----------|
| listSearch | GET | `/employees/{profileId}/matched-demands` | `employee-matched-demands-list-search` |
| list | GET | `/demands` | `demands-list-search` |

## Hooks

- `useDemands(filters?)` — paginated list (op: `list`)
- `useListSearchDemand(args?: { path?, query? }, options?)` — GET `/employees/{profileId}/matched-demands` (op: `listSearch`)

## Services (non-React contexts)

- `listDemands` — op: `list`
- `listSearchDemand(args?: { path?, query?, body? })` — op: `listSearch` (GET `/employees/{profileId}/matched-demands`)

## Example

```ts
import { useDemands } from "@/features/eightfold-api";

const { data, isLoading } = useDemands();
```
