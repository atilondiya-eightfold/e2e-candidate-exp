# User

Eightfold core entity. user endpoints

## Operations

| Op | Method | Path | Caller ID |
|----|--------|------|-----------|
| getById | GET | `/users/{userId}` | `user-get-by-id` |
| delete | DELETE | `/users/{userId}` | `user-delete` |
| patch | PATCH | `/users/{userId}` | `user-patch` |
| list | GET | `/users` | `users-list-search` |
| create | POST | `/users` | `user-create` |
| batchFetch | POST | `/users/batch-fetch` | `user-batch-fetch` |

## Hooks

- `useUser(id)` — fetch single (op: `getById`)
- `useUsers(filters?)` — paginated list (op: `list`)
- `useBatchFetchUsers(ids)` — batch read max 100 (op: `batchFetch`)
- `useCreateUser()` — mutation (op: `create`)
- `usePatchUser()` — mutation (op: `patch`)
- `useDeleteUser()` — mutation (op: `delete`)

## Services (non-React contexts)

- `getUser` — op: `getById`
- `listUsers` — op: `list`
- `batchFetchUsers` — op: `batchFetch`
- `createUser` — op: `create`
- `patchUser` — op: `patch`
- `deleteUser` — op: `delete`

## Example

```ts
import { useUsers } from "@/features/eightfold-api";

const { data, isLoading } = useUsers();
```
