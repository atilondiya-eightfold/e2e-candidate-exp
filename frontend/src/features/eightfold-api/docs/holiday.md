# Holiday

Eightfold resource_management entity. API endpoints for Resource Management Holiday Entity

## Operations

| Op | Method | Path | Caller ID |
|----|--------|------|-----------|
| list | GET | `/holidays` | `holidays-list-search` |

## Hooks

- `useHolidays(filters?)` — paginated list (op: `list`)

## Services (non-React contexts)

- `listHolidays` — op: `list`

## Example

```ts
import { useHolidays } from "@/features/eightfold-api";

const { data, isLoading } = useHolidays();
```
