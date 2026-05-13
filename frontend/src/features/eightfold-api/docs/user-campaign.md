# UserCampaign

Eightfold core entity. User Campaigns description

## Operations

| Op | Method | Path | Caller ID |
|----|--------|------|-----------|
| getById | GET | `/user-campaigns/{userCampaignId}` | `user-campaigns-get-by-id` |
| batchFetch | POST | `/user-campaigns/batch-fetch` | `user-campaigns-batch-fetch` |
| list | GET | `/user-campaigns` | `user-campaigns-list-search` |

## Hooks

- `useUserCampaign(id)` — fetch single (op: `getById`)
- `useUserCampaigns(filters?)` — paginated list (op: `list`)
- `useBatchFetchUserCampaigns(ids)` — batch read max 100 (op: `batchFetch`)

## Services (non-React contexts)

- `getUserCampaign` — op: `getById`
- `listUserCampaigns` — op: `list`
- `batchFetchUserCampaigns` — op: `batchFetch`

## Example

```ts
import { useUserCampaigns } from "@/features/eightfold-api";

const { data, isLoading } = useUserCampaigns();
```
