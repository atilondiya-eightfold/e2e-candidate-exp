# EventCandidateActivity

Eightfold events entity. Event Activity description

## Operations

| Op | Method | Path | Caller ID |
|----|--------|------|-----------|
| getById | GET | `/event-candidate-activities/{eventActivityId}` | `event-candidate-activity-get-by-id` |
| batchFetch | POST | `/event-candidate-activities/batch-fetch` | `event-candidate-activity-batch-fetch` |

## Hooks

- `useEventCandidateActivity(id)` — fetch single (op: `getById`)
- `useBatchFetchEventCandidateActivities(ids)` — batch read max 100 (op: `batchFetch`)

## Services (non-React contexts)

- `getEventCandidateActivity` — op: `getById`
- `batchFetchEventCandidateActivities` — op: `batchFetch`

## Example

```ts
import { useEventCandidateActivity } from "@/features/eightfold-api";

const { data, isLoading } = useEventCandidateActivity(id);
```
