# Connectors

Eightfold connectors entity. API endpoints for connectors

## Operations

| Op | Method | Path | Caller ID |
|----|--------|------|-----------|
| list | GET | `/integrations` | `list-integrations` |
| listToken | GET | `/oauth-access-token` | `get-connectors-oauth-access-token` |
| create | POST | `/sync_status` | `connections-sync-status` |

## Hooks

- `useConnectorses(filters?)` — paginated list (op: `list`)
- `useCreateConnectors()` — mutation (op: `create`)
- `useListTokenConnectors(args?: { path?, query? }, options?)` — GET `/oauth-access-token` (op: `listToken`)

## Services (non-React contexts)

- `listConnectorses` — op: `list`
- `createConnectors` — op: `create`
- `listTokenConnectors(args?: { path?, query?, body? })` — op: `listToken` (GET `/oauth-access-token`)

## Example

```ts
import { useConnectorses } from "@/features/eightfold-api";

const { data, isLoading } = useConnectorses();
```
