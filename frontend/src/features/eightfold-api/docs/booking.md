# Booking

Eightfold resource_management entity. API endpoints for Resource Management Booking Entity

## Operations

| Op | Method | Path | Caller ID |
|----|--------|------|-----------|
| list | GET | `/bookings` | `bookings-list-search` |

## Hooks

- `useBookings(filters?)` — paginated list (op: `list`)

## Services (non-React contexts)

- `listBookings` — op: `list`

## Example

```ts
import { useBookings } from "@/features/eightfold-api";

const { data, isLoading } = useBookings();
```
