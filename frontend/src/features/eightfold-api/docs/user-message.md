# UserMessage

Eightfold core entity. User Messages description

## Operations

| Op | Method | Path | Caller ID |
|----|--------|------|-----------|
| getById | GET | `/user-messages/{userMessageId}` | `user-messages-get-by-id` |
| batchFetch | POST | `/user-messages/batch-fetch` | `user-messages-batch-fetch` |
| list | GET | `/user-messages` | `user-messages-list-search` |

## Hooks

- `useUserMessage(id)` — fetch single (op: `getById`)
- `useUserMessages(filters?)` — paginated list (op: `list`)
- `useBatchFetchUserMessages(ids)` — batch read max 100 (op: `batchFetch`)

## Services (non-React contexts)

- `getUserMessage` — op: `getById`
- `listUserMessages` — op: `list`
- `batchFetchUserMessages` — op: `batchFetch`

## Example

```ts
import { useUserMessages } from "@/features/eightfold-api";

const { data, isLoading } = useUserMessages();
```
