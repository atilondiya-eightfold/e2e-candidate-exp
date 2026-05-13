# AtsCandidate

Eightfold core entity. candidate description.

## Operations

| Op | Method | Path | Caller ID |
|----|--------|------|-----------|
| getById | GET | `/ats-systems/{systemId}/ats-candidates/{atsCandidateId}` | `ats-candidate-get-by-id` |
| update | PUT | `/ats-systems/{systemId}/ats-candidates/{atsCandidateId}` | `ats-candidate-update` |
| patch | PATCH | `/ats-systems/{systemId}/ats-candidates/{atsCandidateId}` | `ats-candidate-patch` |
| list | GET | `/ats-systems/{systemId}/ats-candidates` | `ats-candidates-list-search` |
| create | POST | `/ats-systems/{systemId}/ats-candidates` | `ats-candidate-create` |

## Hooks

- `useAtsCandidate(id)` — fetch single (op: `getById`)
- `useAtsCandidates(filters?)` — paginated list (op: `list`)
- `useCreateAtsCandidate()` — mutation (op: `create`)
- `useUpdateAtsCandidate()` — mutation (op: `update`)
- `usePatchAtsCandidate()` — mutation (op: `patch`)

## Services (non-React contexts)

- `getAtsCandidate` — op: `getById`
- `listAtsCandidates` — op: `list`
- `createAtsCandidate` — op: `create`
- `updateAtsCandidate` — op: `update`
- `patchAtsCandidate` — op: `patch`

## Example

```ts
import { useAtsCandidates } from "@/features/eightfold-api";

const { data, isLoading } = useAtsCandidates();
```
