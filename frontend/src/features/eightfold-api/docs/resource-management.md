# ResourceManagement

Eightfold core entity. API endpoints for entity comments — currently supports only the Demand entity

## Operations

| Op | Method | Path | Caller ID |
|----|--------|------|-----------|
| getById | GET | `/comments/{commentId}` | `comment-get-by-id` |
| list | GET | `/comments` | `comments-list` |
| listType | GET | `/ext-entity-comments/{entityType}/{extEntityId}` | `comments-get-by-ext-entity-id-and-type` |
| listType2 | GET | `/entity-comments/{entityType}/{entityId}` | `comments-get-by-entity-id-and-type` |
| delete | DELETE | `/entity-comments/{entityType}/{entityId}` | `delete-entity-comments-by-entity-id` |
| batchGetByIdsIds | POST | `/entity-comments-batch-fetch` | `batch-get-by-entity-ids` |
| batchGetByIdsIds2 | POST | `/ext-entity-comments-batch-fetch` | `batch-get-by-external-entity-ids` |

## Hooks

- `useResourceManagement(id)` — fetch single (op: `getById`)
- `useResourceManagements(filters?)` — paginated list (op: `list`)
- `useDeleteResourceManagement()` — mutation (op: `delete`)
- `useListTypeResourceManagement(args?: { path?, query? }, options?)` — GET `/ext-entity-comments/{entityType}/{extEntityId}` (op: `listType`)
- `useListType2ResourceManagement(args?: { path?, query? }, options?)` — GET `/entity-comments/{entityType}/{entityId}` (op: `listType2`)
- `useBatchGetByIdsIdsResourceManagement(options?)` — POST `/entity-comments-batch-fetch` (op: `batchGetByIdsIds`)
- `useBatchGetByIdsIds2ResourceManagement(options?)` — POST `/ext-entity-comments-batch-fetch` (op: `batchGetByIdsIds2`)

## Services (non-React contexts)

- `getResourceManagement` — op: `getById`
- `listResourceManagements` — op: `list`
- `deleteResourceManagement` — op: `delete`
- `listTypeResourceManagement(args?: { path?, query?, body? })` — op: `listType` (GET `/ext-entity-comments/{entityType}/{extEntityId}`)
- `listType2ResourceManagement(args?: { path?, query?, body? })` — op: `listType2` (GET `/entity-comments/{entityType}/{entityId}`)
- `batchGetByIdsIdsResourceManagement(args?: { path?, query?, body? })` — op: `batchGetByIdsIds` (POST `/entity-comments-batch-fetch`)
- `batchGetByIdsIds2ResourceManagement(args?: { path?, query?, body? })` — op: `batchGetByIdsIds2` (POST `/ext-entity-comments-batch-fetch`)

## Example

```ts
import { useResourceManagements } from "@/features/eightfold-api";

const { data, isLoading } = useResourceManagements();
```
