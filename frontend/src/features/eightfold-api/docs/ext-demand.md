# ExtDemand

Eightfold resource_management entity. API endpoints for Resource Management External Demand Entity

## Operations

| Op | Method | Path | Caller ID |
|----|--------|------|-----------|
| list | GET | `/ext-systems/resourcing/ext-demands` | `ext-demands-list-search` |

## Hooks

- `useExtDemands(filters?)` — paginated list (op: `list`)

## Services (non-React contexts)

- `listExtDemands` — op: `list`

## Example

```ts
import { useExtDemands } from "@/features/eightfold-api";

const { data, isLoading } = useExtDemands();
```
