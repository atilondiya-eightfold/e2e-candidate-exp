# UserCalendar

Eightfold core entity. User Calendar Event description

## Operations

| Op | Method | Path | Caller ID |
|----|--------|------|-----------|
| getById | GET | `/user-calendar-events/{userCalendarEventId}` | `user-calendar-event-get-by-id` |
| batchFetch | POST | `/user-calendar-events/batch-fetch` | `user-calendar-event-batch-fetch` |
| list | GET | `/user-calendar-events` | `user-calendar-events-list-search` |

## Hooks

- `useUserCalendar(id)` — fetch single (op: `getById`)
- `useUserCalendars(filters?)` — paginated list (op: `list`)
- `useBatchFetchUserCalendars(ids)` — batch read max 100 (op: `batchFetch`)

## Services (non-React contexts)

- `getUserCalendar` — op: `getById`
- `listUserCalendars` — op: `list`
- `batchFetchUserCalendars` — op: `batchFetch`

## Example

```ts
import { useUserCalendars } from "@/features/eightfold-api";

const { data, isLoading } = useUserCalendars();
```
