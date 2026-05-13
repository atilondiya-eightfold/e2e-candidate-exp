# EntityChangelog

Eightfold core entity. Modified entity ids description.

## Operations

| Op | Method | Path | Caller ID |
|----|--------|------|-----------|
| list | GET | `/changelog/{entityType}` | `changelog-modified-entity-ids` |

## Hooks

- `useEntityChangelogs(filters?)` — paginated list (op: `list`)

## Services (non-React contexts)

- `listEntityChangelogs` — op: `list`

## Example

```ts
import { useEntityChangelogs } from "@/features/eightfold-api";

const { data, isLoading } = useEntityChangelogs();
```
