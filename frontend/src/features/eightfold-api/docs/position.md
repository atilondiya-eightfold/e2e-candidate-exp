# Position

Eightfold core entity. position description.

## Operations

| Op | Method | Path | Caller ID |
|----|--------|------|-----------|
| listSearch | GET | `/profiles/{profileId}/matched-positions` | `profile-matched-positions-list-search` |
| getById | GET | `/positions/{positionId}` | `position-get-by-id` |
| update | PUT | `/positions/{positionId}` | `position-update` |
| patch | PATCH | `/positions/{positionId}` | `position-patch` |
| list | GET | `/positions` | `positions-list-search` |
| create | POST | `/positions` | `position-create` |
| batchFetch | POST | `/positions/batch-fetch` | `position-batch-fetch` |

## Hooks

- `usePosition(id)` — fetch single (op: `getById`)
- `usePositions(filters?)` — paginated list (op: `list`)
- `useBatchFetchPositions(ids)` — batch read max 100 (op: `batchFetch`)
- `useCreatePosition()` — mutation (op: `create`)
- `useUpdatePosition()` — mutation (op: `update`)
- `usePatchPosition()` — mutation (op: `patch`)
- `useListSearchPosition(args?: { path?, query? }, options?)` — GET `/profiles/{profileId}/matched-positions` (op: `listSearch`)

## Services (non-React contexts)

- `getPosition` — op: `getById`
- `listPositions` — op: `list`
- `batchFetchPositions` — op: `batchFetch`
- `createPosition` — op: `create`
- `updatePosition` — op: `update`
- `patchPosition` — op: `patch`
- `listSearchPosition(args?: { path?, query?, body? })` — op: `listSearch` (GET `/profiles/{profileId}/matched-positions`)

## Example

```ts
import { usePositions } from "@/features/eightfold-api";

const { data, isLoading } = usePositions();
```
