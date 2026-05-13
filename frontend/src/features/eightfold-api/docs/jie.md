# Jie

Eightfold JIE entity. JIE roles

## Operations

| Op | Method | Path | Caller ID |
|----|--------|------|-----------|
| getById | GET | `/roles/{roleId}` | `JIE_role-get-by-id` |
| update | PUT | `/roles/{roleId}` | `JIE_role-update` |
| delete | DELETE | `/roles/{roleId}` | `JIE_role-delete` |
| listJIEInsights | GET | `/insights` | `JIE-insights-list` |
| create | POST | `/roles` | `JIE_role-create` |
| list | GET | `/roles` | `JIE_role-list` |

## Hooks

- `useJie(id)` — fetch single (op: `getById`)
- `useJies(filters?)` — paginated list (op: `list`)
- `useCreateJie()` — mutation (op: `create`)
- `useUpdateJie()` — mutation (op: `update`)
- `useDeleteJie()` — mutation (op: `delete`)
- `useListJIEInsights(args?: { path?, query? }, options?)` — GET `/insights` (op: `listJIEInsights`)

## Services (non-React contexts)

- `getJie` — op: `getById`
- `listJies` — op: `list`
- `createJie` — op: `create`
- `updateJie` — op: `update`
- `deleteJie` — op: `delete`
- `listJIEInsights(args?: { path?, query?, body? })` — op: `listJIEInsights` (GET `/insights`)

## Example

```ts
import { useJies } from "@/features/eightfold-api";

const { data, isLoading } = useJies();
```
