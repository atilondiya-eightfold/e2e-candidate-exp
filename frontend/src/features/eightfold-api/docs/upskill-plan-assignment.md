# UpskillPlanAssignment

Eightfold careerhub entity. Auto-generated docs for `upskill_plan_assignment`.

## Operations

| Op | Method | Path | Caller ID |
|----|--------|------|-----------|
| list | GET | `/{profileEncId}/upskill-plan-assignment` | `upskill-plan-assignment-list` |
| getById | GET | `/{profileEncId}/upskill-plan-assignment/{planId}` | `upskill-plan-assignment-get-by-id` |

## Hooks

- `useUpskillPlanAssignment(id)` — fetch single (op: `getById`)
- `useUpskillPlanAssignments(filters?)` — paginated list (op: `list`)

## Services (non-React contexts)

- `getUpskillPlanAssignment` — op: `getById`
- `listUpskillPlanAssignments` — op: `list`

## Example

```ts
import { useUpskillPlanAssignments } from "@/features/eightfold-api";

const { data, isLoading } = useUpskillPlanAssignments();
```
