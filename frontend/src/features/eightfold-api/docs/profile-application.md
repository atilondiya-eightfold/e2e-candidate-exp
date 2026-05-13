# ProfileApplication

Eightfold core entity. Profile Application description

## Operations

| Op | Method | Path | Caller ID |
|----|--------|------|-----------|
| getById | GET | `/profile-applications/{profileApplicationId}` | `profile-application-get-by-id` |
| batchFetch | POST | `/profile-applications/batch-fetch` | `profile-application-batch-fetch` |
| list | GET | `/profile-applications` | `profile-applications-list-search` |

## Hooks

- `useProfileApplication(id)` — fetch single (op: `getById`)
- `useProfileApplications(filters?)` — paginated list (op: `list`)
- `useBatchFetchProfileApplications(ids)` — batch read max 100 (op: `batchFetch`)

## Services (non-React contexts)

- `getProfileApplication` — op: `getById`
- `listProfileApplications` — op: `list`
- `batchFetchProfileApplications` — op: `batchFetch`

## Example

```ts
import { useProfileApplications } from "@/features/eightfold-api";

const { data, isLoading } = useProfileApplications();
```
