# Employee

Eightfold core entity. Employee role

## Operations

| Op | Method | Path | Caller ID |
|----|--------|------|-----------|
| getByIdRole | GET | `/employee-roles/{roleId}` | `role-get-by-id` |
| createRole | POST | `/employee-roles` | `role-create` |
| getById | GET | `/employees/{profileId}` | `employee-get-by-profile-id` |
| patch | PATCH | `/employees/{profileId}` | `employee-patch` |
| update | PUT | `/employees/{profileId}` | `employee-update` |
| create | POST | `/employees` | `employee-create` |
| list | GET | `/employees` | `employees-list` |
| batchFetch | POST | `/employees/batch-fetch` | `employee-batch-fetch` |
| listEmployeesRecommendedMentors | GET | `/employees/{profileId}/recommended-mentors` | `employees-recommended-mentors-list` |
| listEmployeesRoleMatchScore | GET | `/employees/role-match-score` | `employees-role-match-score-list` |

## Hooks

- `useEmployee(id)` — fetch single (op: `getById`)
- `useEmployees(filters?)` — paginated list (op: `list`)
- `useBatchFetchEmployees(ids)` — batch read max 100 (op: `batchFetch`)
- `useCreateEmployee()` — mutation (op: `create`)
- `useUpdateEmployee()` — mutation (op: `update`)
- `usePatchEmployee()` — mutation (op: `patch`)
- `useGetByIdRoleEmployee(args?: { path?, query? }, options?)` — GET `/employee-roles/{roleId}` (op: `getByIdRole`)
- `useCreateRoleEmployee(options?)` — POST `/employee-roles` (op: `createRole`)
- `useListEmployeesRecommendedMentors(args?: { path?, query? }, options?)` — GET `/employees/{profileId}/recommended-mentors` (op: `listEmployeesRecommendedMentors`)
- `useListEmployeesRoleMatchScore(args?: { path?, query? }, options?)` — GET `/employees/role-match-score` (op: `listEmployeesRoleMatchScore`)

## Services (non-React contexts)

- `getEmployee` — op: `getById`
- `listEmployees` — op: `list`
- `batchFetchEmployees` — op: `batchFetch`
- `createEmployee` — op: `create`
- `updateEmployee` — op: `update`
- `patchEmployee` — op: `patch`
- `getByIdRoleEmployee(args?: { path?, query?, body? })` — op: `getByIdRole` (GET `/employee-roles/{roleId}`)
- `createRoleEmployee(args?: { path?, query?, body? })` — op: `createRole` (POST `/employee-roles`)
- `listEmployeesRecommendedMentors(args?: { path?, query?, body? })` — op: `listEmployeesRecommendedMentors` (GET `/employees/{profileId}/recommended-mentors`)
- `listEmployeesRoleMatchScore(args?: { path?, query?, body? })` — op: `listEmployeesRoleMatchScore` (GET `/employees/role-match-score`)

## Example

```ts
import { useEmployees } from "@/features/eightfold-api";

const { data, isLoading } = useEmployees();
```
