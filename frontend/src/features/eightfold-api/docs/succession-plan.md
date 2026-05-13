# SuccessionPlan

Eightfold careerhub entity. API endpoints for Eightfold succession plan entity

## Operations

| Op | Method | Path | Caller ID |
|----|--------|------|-----------|
| getById | GET | `/succession_plans/{positionId}` | `succession-plan-get-by-position-id` |
| delete | DELETE | `/succession_plans/{positionId}` | `succession-plan-delete` |
| patch | PATCH | `/succession_plans/{positionId}` | `succession-plan-patch` |
| listSuccessors | GET | `/succession_plans/{positionId}/recommended_successors` | `succession-plan-recommended-successors` |
| list | GET | `/succession_plans` | `succession-plan-list` |
| create | POST | `/succession_plans` | `succession-plan-create` |
| listIncumbent | GET | `/succession_plans/{positionId}/incumbents` | `succession-plan-incumbent-list` |
| createSuccessor | POST | `/succession_plans/{positionId}/successors` | `succession-plan-successor-create` |
| patchSuccessor | PATCH | `/succession_plans/{positionId}/successors/{profileId}` | `succession-plan-successor-patch` |
| deleteSuccessor | DELETE | `/succession_plans/{positionId}/successors/{profileId}` | `succession-plan-successor-delete` |
| createCaretaker | POST | `/succession_plans/{positionId}/caretakers` | `succession-plan-caretaker-create` |
| deleteCaretaker | DELETE | `/succession_plans/{positionId}/caretakers/{profileId}` | `succession-plan-caretaker-delete` |

## Hooks

- `useSuccessionPlan(id)` — fetch single (op: `getById`)
- `useSuccessionPlans(filters?)` — paginated list (op: `list`)
- `useCreateSuccessionPlan()` — mutation (op: `create`)
- `usePatchSuccessionPlan()` — mutation (op: `patch`)
- `useDeleteSuccessionPlan()` — mutation (op: `delete`)
- `useListSuccessorsSuccessionPlan(args?: { path?, query? }, options?)` — GET `/succession_plans/{positionId}/recommended_successors` (op: `listSuccessors`)
- `useListIncumbentSuccessionPlan(args?: { path?, query? }, options?)` — GET `/succession_plans/{positionId}/incumbents` (op: `listIncumbent`)
- `useCreateSuccessorSuccessionPlan(options?)` — POST `/succession_plans/{positionId}/successors` (op: `createSuccessor`)
- `usePatchSuccessorSuccessionPlan(options?)` — PATCH `/succession_plans/{positionId}/successors/{profileId}` (op: `patchSuccessor`)
- `useDeleteSuccessorSuccessionPlan(options?)` — DELETE `/succession_plans/{positionId}/successors/{profileId}` (op: `deleteSuccessor`)
- `useCreateCaretakerSuccessionPlan(options?)` — POST `/succession_plans/{positionId}/caretakers` (op: `createCaretaker`)
- `useDeleteCaretakerSuccessionPlan(options?)` — DELETE `/succession_plans/{positionId}/caretakers/{profileId}` (op: `deleteCaretaker`)

## Services (non-React contexts)

- `getSuccessionPlan` — op: `getById`
- `listSuccessionPlans` — op: `list`
- `createSuccessionPlan` — op: `create`
- `patchSuccessionPlan` — op: `patch`
- `deleteSuccessionPlan` — op: `delete`
- `listSuccessorsSuccessionPlan(args?: { path?, query?, body? })` — op: `listSuccessors` (GET `/succession_plans/{positionId}/recommended_successors`)
- `listIncumbentSuccessionPlan(args?: { path?, query?, body? })` — op: `listIncumbent` (GET `/succession_plans/{positionId}/incumbents`)
- `createSuccessorSuccessionPlan(args?: { path?, query?, body? })` — op: `createSuccessor` (POST `/succession_plans/{positionId}/successors`)
- `patchSuccessorSuccessionPlan(args?: { path?, query?, body? })` — op: `patchSuccessor` (PATCH `/succession_plans/{positionId}/successors/{profileId}`)
- `deleteSuccessorSuccessionPlan(args?: { path?, query?, body? })` — op: `deleteSuccessor` (DELETE `/succession_plans/{positionId}/successors/{profileId}`)
- `createCaretakerSuccessionPlan(args?: { path?, query?, body? })` — op: `createCaretaker` (POST `/succession_plans/{positionId}/caretakers`)
- `deleteCaretakerSuccessionPlan(args?: { path?, query?, body? })` — op: `deleteCaretaker` (DELETE `/succession_plans/{positionId}/caretakers/{profileId}`)

## Example

```ts
import { useSuccessionPlans } from "@/features/eightfold-api";

const { data, isLoading } = useSuccessionPlans();
```
