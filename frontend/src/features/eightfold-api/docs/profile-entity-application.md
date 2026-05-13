# ProfileEntityApplication

Eightfold core entity. Entity Profile Application description

## Operations

| Op | Method | Path | Caller ID |
|----|--------|------|-----------|
| getById | GET | `/entity-profile-applications/{entityType}/{applicationId}` | `entity-profile-application-get-by-id` |
| batchFetch | POST | `/entity-profile-applications/{entityType}/batch-fetch` | `entity-profile-application-batch-fetch` |
| list | GET | `/entity-profile-applications/{entityType}` | `entity-profile-applications-list-search` |

## Hooks

- `useProfileEntityApplication(id)` — fetch single (op: `getById`)
- `useProfileEntityApplications(filters?)` — paginated list (op: `list`)
- `useBatchFetchProfileEntityApplications(ids)` — batch read max 100 (op: `batchFetch`)

## Services (non-React contexts)

- `getProfileEntityApplication` — op: `getById`
- `listProfileEntityApplications` — op: `list`
- `batchFetchProfileEntityApplications` — op: `batchFetch`

## Example

```ts
import { useProfileEntityApplications } from "@/features/eightfold-api";

const { data, isLoading } = useProfileEntityApplications();
```
