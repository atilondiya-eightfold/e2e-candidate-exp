# AsyncApiStatus

Eightfold core entity. returns the status and encoded entity id for the async api calls that were made, status can be PASS, IN PROGRESS, FAIL or PASS_SKIPPED in the past 3 days

## Operations

| Op | Method | Path | Caller ID |
|----|--------|------|-----------|
| getById | GET | `/transactions/{transactionId}` | `transaction-get-by-id` |

## Hooks

- `useAsyncApiStatus(id)` — fetch single (op: `getById`)

## Services (non-React contexts)

- `getAsyncApiStatus` — op: `getById`

## Example

```ts
import { useAsyncApiStatus } from "@/features/eightfold-api";

const { data, isLoading } = useAsyncApiStatus(id);
```
