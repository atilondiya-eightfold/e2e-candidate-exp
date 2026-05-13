# Event

Eightfold events entity. Planned events endpoint

## Operations

| Op | Method | Path | Caller ID |
|----|--------|------|-----------|
| list | GET | `/planned-events` | `planned-events-list-search` |
| batchFetch | POST | `/planned-events/batch-fetch` | `planned-event-batch-fetch` |
| getById | GET | `/planned-events/{plannedEventId}` | `planned-event-get-by-id` |

## Hooks

- `useEvent(id)` — fetch single (op: `getById`)
- `useEvents(filters?)` — paginated list (op: `list`)
- `useBatchFetchEvents(ids)` — batch read max 100 (op: `batchFetch`)

## Services (non-React contexts)

- `getEvent` — op: `getById`
- `listEvents` — op: `list`
- `batchFetchEvents` — op: `batchFetch`

## Example

```ts
import { useEvents } from "@/features/eightfold-api";

const { data, isLoading } = useEvents();
```
