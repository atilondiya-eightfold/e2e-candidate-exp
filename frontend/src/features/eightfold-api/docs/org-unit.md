# OrgUnit

Eightfold t3s entity. API endpoints for Org Unit Entity

## Operations

| Op | Method | Path | Caller ID |
|----|--------|------|-----------|
| list | GET | `/org-units` | `org-units-list-search` |
| listSearch | GET | `/foundational-data` | `foundational-data-list-search` |

## Hooks

- `useOrgUnits(filters?)` — paginated list (op: `list`)
- `useListSearchOrgUnit(args?: { path?, query? }, options?)` — GET `/foundational-data` (op: `listSearch`)

## Services (non-React contexts)

- `listOrgUnits` — op: `list`
- `listSearchOrgUnit(args?: { path?, query?, body? })` — op: `listSearch` (GET `/foundational-data`)

## Example

```ts
import { useOrgUnits } from "@/features/eightfold-api";

const { data, isLoading } = useOrgUnits();
```
