# HrisEmployee

Eightfold core entity. HRIS Employees.

## Operations

| Op | Method | Path | Caller ID |
|----|--------|------|-----------|
| patch | PATCH | `/hris-systems/{systemId}/ext-employees/{employeeId}` | `employee-patch-hris` |
| update | PUT | `/hris-systems/{systemId}/ext-employees/{employeeId}` | `employee-update-hris` |
| getById | GET | `/hris-systems/{systemId}/hris-employees/{uniqueIdentifier}` | `hris-employee-get-by-id` |
| list | GET | `/hris-systems/{systemId}/hris-employees` | `hris-employees-list` |

## Hooks

- `useHrisEmployee(id)` — fetch single (op: `getById`)
- `useHrisEmployees(filters?)` — paginated list (op: `list`)
- `useUpdateHrisEmployee()` — mutation (op: `update`)
- `usePatchHrisEmployee()` — mutation (op: `patch`)

## Services (non-React contexts)

- `getHrisEmployee` — op: `getById`
- `listHrisEmployees` — op: `list`
- `updateHrisEmployee` — op: `update`
- `patchHrisEmployee` — op: `patch`

## Example

```ts
import { useHrisEmployees } from "@/features/eightfold-api";

const { data, isLoading } = useHrisEmployees();
```
