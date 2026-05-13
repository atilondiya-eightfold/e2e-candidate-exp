# ProfileEventCalendar

Eightfold events entity. Event Activity description

## Operations

| Op | Method | Path | Caller ID |
|----|--------|------|-----------|
| list | GET | `/event-candidate-activities` | `event-candidate-activities-list-search` |

## Hooks

- `useProfileEventCalendars(filters?)` — paginated list (op: `list`)

## Services (non-React contexts)

- `listProfileEventCalendars` — op: `list`

## Example

```ts
import { useProfileEventCalendars } from "@/features/eightfold-api";

const { data, isLoading } = useProfileEventCalendars();
```
