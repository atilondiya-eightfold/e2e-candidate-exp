# ProfileTag

Eightfold core entity. Profile tag description

## Operations

| Op | Method | Path | Caller ID |
|----|--------|------|-----------|
| getById | GET | `/profile-tags/{profileTagId}` | `profile-tag-get-by-id` |
| batchFetch | POST | `/profile-tags/batch-fetch` | `profile-tag-batch-fetch` |
| list | GET | `/profile-tags` | `profile-tags-list-search` |

## Hooks

- `useProfileTag(id)` — fetch single (op: `getById`)
- `useProfileTags(filters?)` — paginated list (op: `list`)
- `useBatchFetchProfileTags(ids)` — batch read max 100 (op: `batchFetch`)

## Services (non-React contexts)

- `getProfileTag` — op: `getById`
- `listProfileTags` — op: `list`
- `batchFetchProfileTags` — op: `batchFetch`

## Example

```ts
import { useProfileTags } from "@/features/eightfold-api";

const { data, isLoading } = useProfileTags();
```
